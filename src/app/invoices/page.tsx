'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { customerService, timeEntryService, invoiceService } from '@/lib/database'
import { formatCurrency } from '@/lib/currency'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { Header } from '@/components/Header'
import { useAuth } from '@/components/AuthProvider'
import type { Customer, TimeEntry, Profile, Invoice } from '@/types'

export default function InvoicesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [dateRange, setDateRange] = useState('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [view, setView] = useState<'create' | 'list'>('list')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [detailLevel, setDetailLevel] = useState<'task' | 'subtask'>('task')

  useEffect(() => {
    const loadData = async () => {
      
      if (user) {
        try {
          const [customersData, profileData] = await Promise.all([
            customerService.getAll(user.id),
            supabase.from('profiles').select('*').eq('id', user.id).single()
          ])
          
          setCustomers(customersData)
          if (profileData.data) setProfile(profileData.data)
          
          // Try to load invoices, but handle table not existing
          try {
            const invoicesData = await invoiceService.getAll(user.id)
            setInvoices(invoicesData)
          } catch (invoiceError) {
            console.error('Error loading invoices (table may not exist):', invoiceError)
            setInvoices([])
          }
        } catch (error) {
          console.error('Error loading data:', error)
        }
      }
    }
    
    if (!loading && user) {
      loadData()
    }
  }, [user, loading])

  const getDateRange = () => {
    const now = new Date()
    
    switch (dateRange) {
      case 'week':
        return {
          start: format(startOfWeek(now), 'yyyy-MM-dd'),
          end: format(endOfWeek(now), 'yyyy-MM-dd')
        }
      case 'month':
        return {
          start: format(startOfMonth(now), 'yyyy-MM-dd'),
          end: format(endOfMonth(now), 'yyyy-MM-dd')
        }
      case 'custom':
        return {
          start: customStartDate,
          end: customEndDate
        }
      default:
        return { start: '', end: '' }
    }
  }

  const loadTimeEntries = async () => {
    if (!selectedCustomer || !user) return
    
    const { start, end } = getDateRange()
    if (!start || !end) return

    setIsLoading(true)
    try {
      const entries = await timeEntryService.getAll(user.id, start, end)
      const customerEntries = entries.filter(entry => 
        entry.customer_id === selectedCustomer && 
        entry.is_billable && 
        !entry.is_invoiced
      )
      setTimeEntries(customerEntries)
      setSelectedEntries(new Set(customerEntries.map(e => e.id)))
    } catch (error) {
      console.error('Error loading time entries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTimeEntries()
  }, [selectedCustomer, dateRange, customStartDate, customEndDate, user])

  const toggleEntrySelection = (entryId: string) => {
    const newSelected = new Set(selectedEntries)
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId)
    } else {
      newSelected.add(entryId)
    }
    setSelectedEntries(newSelected)
  }

  const calculateTotal = () => {
    const customer = customers.find(c => c.id === selectedCustomer)
    if (!customer) return 0
    
    // For monthly customers, return the fixed monthly rate
    if (customer.rate_type === 'monthly') {
      return customer.default_rate || 0
    }
    
    // For hourly customers, calculate based on selected time entries
    const selectedTimeEntries = timeEntries.filter(entry => selectedEntries.has(entry.id))
    return selectedTimeEntries.reduce((total, entry) => {
      const rate = customer.default_rate || 0
      const hours = entry.duration_minutes / 60
      return total + (hours * rate)
    }, 0)
  }

  const deleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      // First, get the invoice to find related time entries
      const invoice = await invoiceService.getById(invoiceId)
      
      // Reset time entries to not invoiced if they exist
      if (invoice.invoice_line_items && invoice.invoice_line_items.length > 0) {
        for (const lineItem of invoice.invoice_line_items) {
          if (lineItem.time_entry_ids && lineItem.time_entry_ids.length > 0) {
            for (const timeEntryId of lineItem.time_entry_ids) {
              try {
                await timeEntryService.update(timeEntryId, {
                  is_invoiced: false,
                  invoice_id: null
                })
              } catch (timeEntryError) {
                console.warn('Could not update time entry:', timeEntryId, timeEntryError)
                // Continue with deletion even if time entry update fails
              }
            }
          }
        }
      }
      
      // Delete the invoice (line items will be deleted automatically due to CASCADE)
      await invoiceService.delete(invoiceId)
      
      // Refresh invoices list
      const updatedInvoices = await invoiceService.getAll(user!.id)
      setInvoices(updatedInvoices)
      
      alert('Invoice deleted successfully')
    } catch (error) {
      console.error('Error deleting invoice:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to delete invoice: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const createInvoice = async () => {
    if (!user || !selectedCustomer || selectedEntries.size === 0) return

    setIsLoading(true)
    try {
      const customer = customers.find(c => c.id === selectedCustomer)
      if (!customer) throw new Error('Customer not found')

      const invoiceNumber = await invoiceService.generateInvoiceNumber(user.id)
      const selectedTimeEntries = timeEntries.filter(entry => selectedEntries.has(entry.id))
      
      const subtotal = calculateTotal()
      const vatPercentage = 25 // 25% VAT
      const vatAmount = subtotal * (vatPercentage / 100)
      const totalAmount = subtotal + vatAmount

      const dueDate = new Date()
      const paymentTerms = customer.payment_terms || 14 // Use customer's payment terms or default to 14
      dueDate.setDate(dueDate.getDate() + paymentTerms)

      const invoice = await invoiceService.create({
        user_id: user.id,
        customer_id: selectedCustomer,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'draft',
        subtotal,
        vat_percentage: vatPercentage,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        notes: `Invoice for services rendered during ${getDateRange().start} to ${getDateRange().end}`
      })

      // Add line items
      if (customer.rate_type === 'monthly') {
        // For monthly customers, create a single line item with task/subtask breakdown
        const totalHours = selectedTimeEntries.reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)
        const { start, end } = getDateRange()
        
        // Build description with task/subtask breakdown for monthly service
        let description = `Monthly Service - ${start} to ${end}`
        
        if (detailLevel === 'task') {
          // Group entries by task for monthly customers
          const entriesByTask = selectedTimeEntries.reduce((acc, entry) => {
            const taskName = entry.task?.name || entry.task_description || 'General Work'
            if (!acc[taskName]) {
              acc[taskName] = []
            }
            acc[taskName].push(entry)
            return acc
          }, {} as Record<string, typeof selectedTimeEntries>)

          description += '\n\nTasks completed:'
          for (const [taskName, taskEntries] of Object.entries(entriesByTask)) {
            const taskHours = taskEntries.reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)
            description += `\n  • ${taskName}: ${taskHours.toFixed(2)} hours`
          }
        } else {
          // Group entries by task with subtask details for monthly customers
          const entriesByTask = selectedTimeEntries.reduce((acc, entry) => {
            const taskName = entry.task?.name || entry.task_description || 'General Work'
            if (!acc[taskName]) {
              acc[taskName] = []
            }
            acc[taskName].push(entry)
            return acc
          }, {} as Record<string, typeof selectedTimeEntries>)

          description += '\n\nTasks completed:'
          for (const [taskName, taskEntries] of Object.entries(entriesByTask)) {
            const taskHours = taskEntries.reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)
            description += `\n\n  ${taskName}: ${taskHours.toFixed(2)} hours`
            
            // Group entries by subtask for this task
            const entriesWithSubtasks = taskEntries.filter(entry => entry.subtask)
            const entriesWithoutSubtasks = taskEntries.filter(entry => !entry.subtask)
            
            // Add subtask details
            if (entriesWithSubtasks.length > 0) {
              const subtaskGroups = entriesWithSubtasks.reduce((acc, entry) => {
                if (!acc[entry.subtask!]) {
                  acc[entry.subtask!] = []
                }
                acc[entry.subtask!].push(entry)
                return acc
              }, {} as Record<string, typeof entriesWithSubtasks>)
              
              for (const [subtaskName, subtaskEntries] of Object.entries(subtaskGroups)) {
                const subtaskHours = subtaskEntries.reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)
                description += `\n    - ${subtaskName}: ${subtaskHours.toFixed(2)} hours`
              }
            }
            
            // Add general work hours if there are entries without subtasks
            if (entriesWithoutSubtasks.length > 0) {
              const generalHours = entriesWithoutSubtasks.reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)
              description += `\n    - General work: ${generalHours.toFixed(2)} hours`
            }
          }
        }
        
        description += `\n\nTotal hours logged: ${totalHours.toFixed(2)}`
        
        await invoiceService.addLineItem({
          invoice_id: invoice.id,
          description,
          quantity: 1,
          rate: customer.default_rate || 0,
          amount: customer.default_rate || 0,
          time_entry_ids: selectedTimeEntries.map(e => e.id)
        })
      } else {
        // For hourly customers, create line items based on detail level
        if (detailLevel === 'task') {
          // Group entries by task
          const entriesByTask = selectedTimeEntries.reduce((acc, entry) => {
            // Use task name if available, otherwise use a fallback based on task_id or a generic name
            const taskName = entry.task?.name || entry.task_description || 'General Work'
            if (!acc[taskName]) {
              acc[taskName] = []
            }
            acc[taskName].push(entry)
            return acc
          }, {} as Record<string, typeof selectedTimeEntries>)

          // Create line items per task
          for (const [taskName, taskEntries] of Object.entries(entriesByTask)) {
            const totalHours = taskEntries.reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)
            const rate = customer.default_rate || 0
            const amount = totalHours * rate

            // Format description for task level only
            const description = `${taskName}\nTotal: ${totalHours.toFixed(2)} hours`

            await invoiceService.addLineItem({
              invoice_id: invoice.id,
              description,
              quantity: totalHours,
              rate,
              amount,
              time_entry_ids: taskEntries.map(e => e.id)
            })
          }
        } else {
          // Create line items with subtask details
          const entriesByTask = selectedTimeEntries.reduce((acc, entry) => {
            // Use task name if available, otherwise use a fallback
            const taskName = entry.task?.name || entry.task_description || 'General Work'
            if (!acc[taskName]) {
              acc[taskName] = []
            }
            acc[taskName].push(entry)
            return acc
          }, {} as Record<string, typeof selectedTimeEntries>)

          // Create line items per task with subtask breakdown
          for (const [taskName, taskEntries] of Object.entries(entriesByTask)) {
            const totalHours = taskEntries.reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)
            const rate = customer.default_rate || 0
            const amount = totalHours * rate

            // Build description with subtask breakdown
            let description = `${taskName}`
            
            // Group entries by subtask for this task
            const entriesWithSubtasks = taskEntries.filter(entry => entry.subtask)
            const entriesWithoutSubtasks = taskEntries.filter(entry => !entry.subtask)
            
            // Add subtask details
            if (entriesWithSubtasks.length > 0) {
              const subtaskGroups = entriesWithSubtasks.reduce((acc, entry) => {
                if (!acc[entry.subtask!]) {
                  acc[entry.subtask!] = []
                }
                acc[entry.subtask!].push(entry)
                return acc
              }, {} as Record<string, typeof entriesWithSubtasks>)
              
              description += '\nSubtasks:'
              for (const [subtaskName, subtaskEntries] of Object.entries(subtaskGroups)) {
                const subtaskHours = subtaskEntries.reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)
                description += `\n  • ${subtaskName}: ${subtaskHours.toFixed(2)} hours`
              }
            }
            
            // Add general work hours if there are entries without subtasks
            if (entriesWithoutSubtasks.length > 0) {
              const generalHours = entriesWithoutSubtasks.reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)
              description += entriesWithSubtasks.length > 0 ? 
                `\n  • General work: ${generalHours.toFixed(2)} hours` : 
                `\nGeneral work: ${generalHours.toFixed(2)} hours`
            }
            
            description += `\nTotal: ${totalHours.toFixed(2)} hours`

            await invoiceService.addLineItem({
              invoice_id: invoice.id,
              description,
              quantity: totalHours,
              rate,
              amount,
              time_entry_ids: taskEntries.map(e => e.id)
            })
          }
        }
      }

      // Mark time entries as invoiced
      for (const entry of selectedTimeEntries) {
        await timeEntryService.update(entry.id, {
          is_invoiced: true,
          invoice_id: invoice.id
        })
      }

      // Refresh invoices list
      const updatedInvoices = await invoiceService.getAll(user.id)
      setInvoices(updatedInvoices)
      setView('list')
      
      router.push(`/invoices/${invoice.id}`)
    } catch (error) {
      console.error('Error creating invoice:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      alert(`Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'paid': return 'bg-green-100 text-green-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Show loading screen while auth is loading
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (view === 'list') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        
        <main className="flex-1 flex flex-col">
          <div className="p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                <button
                  onClick={() => setView('create')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Invoice
                </button>
              </div>

              {invoices.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="text-gray-500 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                  <p className="text-gray-500 mb-4">Create your first invoice to get started</p>
                  <button
                    onClick={() => setView('create')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create First Invoice
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {invoice.customer?.company_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(invoice.total_amount, profile?.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Link
                                href={`/invoices/${invoice.id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </Link>
                              <button
                                onClick={() => deleteInvoice(invoice.id)}
                                className="text-red-600 hover:text-red-900"
                                disabled={isLoading}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 flex flex-col">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setView('list')}
                className="text-blue-600 hover:text-blue-700 mr-4"
              >
                ← Back to Invoices
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
            </div>

            {/* Customer Selection */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Select Customer</h2>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a customer...</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company_name}
                    {customer.default_rate && ` (${formatCurrency(customer.default_rate, profile?.currency)}/hour)`}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Selection */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Select Time Period</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Period
                  </label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                
                {dateRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Detail Level Selection */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Invoice Detail Level</h2>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="task"
                    checked={detailLevel === 'task'}
                    onChange={(e) => setDetailLevel(e.target.value as 'task' | 'subtask')}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium">Task Level Only</div>
                    <div className="text-sm text-gray-500">Show only main tasks on the invoice</div>
                  </div>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="subtask"
                    checked={detailLevel === 'subtask'}
                    onChange={(e) => setDetailLevel(e.target.value as 'task' | 'subtask')}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium">Task + Subtask Level</div>
                    <div className="text-sm text-gray-500">Show tasks with subtask breakdown and hours</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Time Entries */}
            {selectedCustomer && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Billable Time Entries</h2>
                
                {isLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : timeEntries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No billable time entries found for this period
                  </div>
                ) : (
                  <div className="space-y-2">
                    {timeEntries.map((entry) => {
                      const customer = customers.find(c => c.id === entry.customer_id)
                      const hours = entry.duration_minutes / 60
                      const rate = customer?.default_rate || 0
                      const isMonthly = customer?.rate_type === 'monthly'
                      const amount = isMonthly ? 0 : hours * rate

                      return (
                        <div
                          key={entry.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedEntries.has(entry.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleEntrySelection(entry.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium">
                                {entry.task?.name || entry.task_description || 'General Work'}
                                {entry.subtask && (
                                  <span className="text-sm text-gray-600 ml-2">
                                    - {entry.subtask}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {format(new Date(entry.start_time), 'MMM d, yyyy')} • 
                                {hours.toFixed(2)} hours
                                {isMonthly ? 
                                  ` • Monthly Plan: ${formatCurrency(rate, profile?.currency)}` : 
                                  ` • ${formatCurrency(rate, profile?.currency)}/hour`
                                }
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {isMonthly ? 
                                  'Monthly Plan' : 
                                  formatCurrency(amount, profile?.currency)
                                }
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedEntries.has(entry.id)}
                                onChange={() => toggleEntrySelection(entry.id)}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Invoice Summary */}
            {selectedEntries.size > 0 && (() => {
              const customer = customers.find(c => c.id === selectedCustomer)
              const isMonthly = customer?.rate_type === 'monthly'
              const selectedTimeEntries = timeEntries.filter(entry => selectedEntries.has(entry.id))
              const totalHours = selectedTimeEntries.reduce((sum, entry) => sum + (entry.duration_minutes / 60), 0)
              
              return (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">Invoice Summary</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Selected Entries:</span>
                      <span>{selectedEntries.size}</span>
                    </div>
                    {isMonthly && (
                      <div className="flex justify-between">
                        <span>Total Hours Logged:</span>
                        <span>{totalHours.toFixed(2)} hours</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>{isMonthly ? 'Monthly Rate:' : 'Subtotal:'}</span>
                      <span>{formatCurrency(calculateTotal(), profile?.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (25%):</span>
                      <span>{formatCurrency(calculateTotal() * 0.25, profile?.currency)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(calculateTotal() * 1.25, profile?.currency)}</span>
                    </div>
                    {isMonthly && (
                      <div className="text-sm text-gray-600 mt-2 pt-2 border-t">
                        <em>Monthly plan: Fixed rate regardless of hours logged</em>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Create Invoice Button */}
            <div className="flex justify-end">
              <button
                onClick={createInvoice}
                disabled={isLoading || selectedEntries.size === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}