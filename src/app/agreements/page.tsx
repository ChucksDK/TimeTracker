'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { customerService, agreementService, invoiceService } from '@/lib/database'
import { formatCurrency } from '@/lib/currency'
import { format } from 'date-fns'
import { Header } from '@/components/Header'
import { useAuth } from '@/components/AuthProvider'
import type { Customer, Agreement, Profile, Invoice } from '@/types'

export default function OverviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Check if we're in create or edit mode
  const view = searchParams.get('view')
  const editId = searchParams.get('edit')
  const preSelectedCustomerId = searchParams.get('customer')
  const isCreateMode = view === 'create'
  const isEditMode = !!editId
  
  // Form state for creating/editing agreements
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    customer_id: preSelectedCustomerId || '',
    start_date: '',
    end_date: '',
    is_active: true
  })
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          setIsLoading(true)
          const [customersData, agreementsData, invoicesData, profileData] = await Promise.all([
            customerService.getAll(user.id),
            agreementService.getAll(user.id),
            invoiceService.getAll(user.id),
            supabase.from('profiles').select('*').eq('id', user.id).single()
          ])
          
          setCustomers(customersData)
          setAgreements(agreementsData)
          setInvoices(invoicesData)
          if (profileData.data) setProfile(profileData.data)

          // If in edit mode, load the specific agreement
          if (editId && agreementsData) {
            const agreementToEdit = agreementsData.find(a => a.id === editId)
            if (agreementToEdit) {
              setEditingAgreement(agreementToEdit)
              setFormData({
                name: agreementToEdit.name,
                description: agreementToEdit.description || '',
                customer_id: agreementToEdit.customer_id,
                start_date: agreementToEdit.start_date,
                end_date: agreementToEdit.end_date || '',
                is_active: agreementToEdit.is_active
              })
            }
          }
        } catch (error) {
          console.error('Error loading data:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }
    
    if (!loading && user) {
      loadData()
    }
  }, [user, loading, editId])

  const getStatusColor = (agreement: Agreement) => {
    const now = new Date()
    const endDate = agreement.end_date ? new Date(agreement.end_date) : null
    
    if (!agreement.is_active) return 'bg-gray-100 text-gray-800'
    if (endDate && endDate < now) return 'bg-red-100 text-red-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (agreement: Agreement) => {
    const now = new Date()
    const endDate = agreement.end_date ? new Date(agreement.end_date) : null
    
    if (!agreement.is_active) return 'Inactive'
    if (endDate && endDate < now) return 'Expired'
    return 'Active'
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setIsLoading(true)
      
      if (isEditMode && editingAgreement) {
        // Update existing agreement
        await agreementService.update(editingAgreement.id, formData)
      } else {
        // Create new agreement
        await agreementService.create({
          ...formData,
          user_id: user.id
        })
      }
      
      // Refresh agreements list
      const updatedAgreements = await agreementService.getAll(user.id)
      setAgreements(updatedAgreements)
      
      // Reset form and go back to overview
      setFormData({
        name: '',
        description: '',
        customer_id: '',
        start_date: '',
        end_date: '',
        is_active: true
      })
      setEditingAgreement(null)
      router.push('/agreements')
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} agreement:`, error)
      alert(`Failed to ${isEditMode ? 'update' : 'create'} agreement`)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {(isCreateMode || isEditMode) ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Agreement' : 'Create Agreement'}
                </h1>
                <p className="text-gray-600">
                  {isEditMode ? 'Update the agreement details' : 'Create a new agreement with a customer'}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Agreement Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter agreement name"
                    />
                  </div>

                  <div>
                    <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 mb-2">
                      Customer *
                    </label>
                    <select
                      id="customer_id"
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.company_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter agreement description"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        id="end_date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Agreement is active
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => router.push('/agreements')}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading 
                        ? (isEditMode ? 'Updating...' : 'Creating...') 
                        : (isEditMode ? 'Update Agreement' : 'Create Agreement')
                      }
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Business Overview</h1>
                <p className="text-gray-600">Manage your customers, agreements, and invoices</p>
              </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customers Section */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
                  <p className="text-sm text-gray-500">{customers.length} total</p>
                </div>
                <button
                  onClick={() => router.push('/customers')}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
              <div className="p-6">
                {customers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-2">
                      <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No customers yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customers.slice(0, 5).map((customer) => (
                      <div key={customer.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{customer.company_name}</p>
                          <p className="text-sm text-gray-500">
                            {customer.rate_type === 'hourly' ? 'Hourly' : 'Monthly'}: {formatCurrency(customer.default_rate || 0, profile?.currency)}
                          </p>
                        </div>
                        <button
                          onClick={() => router.push(`/customers/${customer.id}`)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          View
                        </button>
                      </div>
                    ))}
                    {customers.length > 5 && (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => router.push('/customers')}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          +{customers.length - 5} more
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Agreements Section */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Agreements</h2>
                  <p className="text-sm text-gray-500">{agreements.length} total</p>
                </div>
                <button
                  onClick={() => router.push('/agreements?view=create')}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
              <div className="p-6">
                {agreements.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-2">
                      <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No agreements yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agreements.slice(0, 5).map((agreement) => (
                      <div key={agreement.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-gray-900 text-sm">{agreement.name}</h3>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(agreement)}`}>
                                {getStatusText(agreement)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {agreement.customer?.company_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(agreement.start_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <button
                            onClick={() => router.push(`/agreements?edit=${agreement.id}`)}
                            className="text-blue-600 hover:text-blue-700 text-xs"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                    {agreements.length > 5 && (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => router.push('/agreements?view=list')}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          +{agreements.length - 5} more
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Invoices Section */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
                  <p className="text-sm text-gray-500">{invoices.length} total</p>
                </div>
                <button
                  onClick={() => router.push('/invoices')}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  View All
                </button>
              </div>
              <div className="p-6">
                {invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-2">
                      <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No invoices yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.slice(0, 5).map((invoice) => (
                      <div key={invoice.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-gray-900 text-sm">#{invoice.invoice_number}</h3>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getInvoiceStatusColor(invoice.status)}`}>
                                {invoice.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {invoice.customer?.company_name}
                            </p>
                            <p className="text-xs text-gray-900 font-medium">
                              {formatCurrency(invoice.total_amount, profile?.currency)}
                            </p>
                          </div>
                          <button
                            onClick={() => router.push(`/invoices/${invoice.id}`)}
                            className="text-blue-600 hover:text-blue-700 text-xs"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                    {invoices.length > 5 && (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => router.push('/invoices')}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          +{invoices.length - 5} more
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Customers</p>
                  <p className="text-2xl font-semibold text-gray-900">{customers.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Agreements</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {agreements.filter(a => a.is_active).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(
                      invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0),
                      profile?.currency
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}