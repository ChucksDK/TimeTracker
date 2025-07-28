'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { invoiceService, timeEntryService } from '@/lib/database'
import { formatCurrency } from '@/lib/currency'
import { format } from 'date-fns'
import { InvoicePDFDownloadButton } from '@/lib/invoicePDF'
import { Header } from '@/components/Header'
import { InvoiceEmailModal } from '@/components/InvoiceEmailModal'
import { useAuth } from '@/components/AuthProvider'
import type { Invoice, Profile } from '@/types'

export default function InvoiceViewPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showEmailModal, setShowEmailModal] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        if (user && params.id) {
          const [invoiceResult, profileResult] = await Promise.all([
            supabase
              .from('invoices')
              .select(`
                *,
                customer:customers(*),
                invoice_line_items(*)
              `)
              .eq('id', params.id as string)
              .eq('user_id', user.id)
              .single(),
            supabase.from('profiles').select('*').eq('id', user.id).single()
          ])
          
          if (invoiceResult.data) setInvoice(invoiceResult.data)
          if (profileResult.data) setProfile(profileResult.data)
          
          if (invoiceResult.error) {
            console.error('Error loading invoice:', invoiceResult.error)
          }
        }
      } catch (error) {
        console.error('Error loading invoice:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (!loading && user) {
      loadData()
    }
  }, [params.id, user, loading])

  const updateInvoiceStatus = async (status: Invoice['status']) => {
    if (!invoice || !user) return
    
    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      }
      
      // Add paid_at timestamp if marking as paid
      if (status === 'paid') {
        updateData.paid_at = new Date().toISOString()
      }
      
      const { data: updated, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoice.id)
        .eq('user_id', user.id)
        .select(`
          *,
          customer:customers(*),
          invoice_line_items(*)
        `)
        .single()
      
      if (error) {
        console.error('Error updating invoice status:', error)
        alert('Failed to update invoice status')
        return
      }
      
      if (updated) setInvoice(updated)
    } catch (error) {
      console.error('Error updating invoice status:', error)
      alert('Failed to update invoice status')
    }
  }

  const deleteInvoice = async () => {
    if (!invoice || !user) return
    
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return
    }

    try {
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
      await invoiceService.delete(invoice.id)
      
      alert('Invoice deleted successfully')
      router.push('/invoices')
    } catch (error) {
      console.error('Error deleting invoice:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to delete invoice: ${errorMessage}`)
    }
  }

  const sendInvoiceEmail = async (emailContent: { subject: string; body: string }) => {
    if (!invoice || !user) return
    
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailContent),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }
      
      const result = await response.json()
      
      // Update invoice status to 'sent' if it was 'draft'
      if (invoice.status === 'draft') {
        setInvoice({ ...invoice, status: 'sent' })
      }
      
      // Create a list of all email addresses for the success message
      const allEmails = []
      if (invoice.customer.email) allEmails.push(invoice.customer.email)
      if (invoice.customer.additional_emails) allEmails.push(...invoice.customer.additional_emails)
      
      const emailList = allEmails.length > 1 
        ? `${allEmails.slice(0, -1).join(', ')} and ${allEmails[allEmails.length - 1]}`
        : allEmails[0]
      
      alert(`Invoice sent successfully to ${emailList}!`)
    } catch (error) {
      console.error('Error sending invoice email:', error)
      alert(`Failed to send invoice: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error // Re-throw to handle in the modal
    }
  }


  // Show loading screen while auth is loading
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

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        
        <main className="flex-1 flex flex-col">
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-8">
                <h1 className="text-xl font-semibold text-gray-900">Invoice not found</h1>
                <button
                  onClick={() => router.push('/invoices')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Back to Invoices
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 flex flex-col">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <button
                  onClick={() => router.push('/invoices')}
                  className="text-blue-600 hover:text-blue-700 mb-2"
                >
                  ← Back to Invoices
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                  Invoice {invoice.invoice_number}
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
                {(invoice.customer?.email || (invoice.customer?.additional_emails && invoice.customer.additional_emails.length > 0)) && (
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Send Invoice
                  </button>
                )}
                <InvoicePDFDownloadButton
                  invoice={invoice}
                  profile={profile!}
                  currency={profile?.currency || 'USD'}
                >
                  <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                    Download PDF
                  </span>
                </InvoicePDFDownloadButton>
              </div>
            </div>

            {/* Invoice Content */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
              {/* Header Section */}
              <div className="flex justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">INVOICE</h2>
                  <div className="text-sm text-gray-600">
                    <div>Invoice #: {invoice.invoice_number}</div>
                    <div>Issue Date: {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</div>
                    <div>Due Date: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {profile?.company_name || 'Your Company'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {profile?.business_address && (
                      <div className="whitespace-pre-line">{profile.business_address}</div>
                    )}
                    {profile?.business_phone && (
                      <div>{profile.business_phone}</div>
                    )}
                    {profile?.business_email && (
                      <div>{profile.business_email}</div>
                    )}
                    {profile?.business_vat_number && (
                      <div>VAT: {profile.business_vat_number}</div>
                    )}
                    {!profile?.business_email && (
                      <div>{profile?.email}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bill To Section */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Bill To:</h3>
                <div className="text-sm text-gray-600">
                  <div className="font-medium">{invoice.customer?.company_name}</div>
                  {invoice.customer?.contact_person && (
                    <div>{invoice.customer.contact_person}</div>
                  )}
                  {invoice.customer?.email && (
                    <div>{invoice.customer.email}</div>
                  )}
                  {invoice.customer?.billing_address && (
                    <div className="whitespace-pre-line">{invoice.customer.billing_address}</div>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-semibold text-gray-900">Description</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-900">Qty</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-900">Rate</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-900">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.invoice_line_items?.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-3 text-sm text-gray-900 whitespace-pre-line">{item.description}</td>
                        <td className="py-3 text-sm text-gray-900 text-right">
                          {item.quantity.toFixed(2)}
                        </td>
                        <td className="py-3 text-sm text-gray-900 text-right">
                          {formatCurrency(item.rate, profile?.currency)}
                        </td>
                        <td className="py-3 text-sm text-gray-900 text-right">
                          {formatCurrency(item.amount, profile?.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2 text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(invoice.subtotal, profile?.currency)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span>VAT ({invoice.vat_percentage}%):</span>
                    <span>{formatCurrency(invoice.vat_amount, profile?.currency)}</span>
                  </div>
                  <div className="flex justify-between py-3 text-lg font-semibold border-t border-gray-200">
                    <span>Total:</span>
                    <span>{formatCurrency(invoice.total_amount, profile?.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes:</h3>
                  <p className="text-sm text-gray-600">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <div className="space-x-2">
                {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                  <button
                    onClick={() => updateInvoiceStatus('paid')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Mark as Paid
                  </button>
                )}
                <button
                  onClick={deleteInvoice}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Invoice
                </button>
              </div>
              
              <div className="text-sm text-gray-500">
                Created: {format(new Date(invoice.created_at), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Email Modal */}
      {showEmailModal && invoice && invoice.customer && profile && (
        <InvoiceEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          invoice={invoice}
          profile={profile}
          customer={invoice.customer}
          onSend={sendInvoiceEmail}
        />
      )}
    </div>
  )
}