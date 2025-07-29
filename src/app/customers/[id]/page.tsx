'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { agreementService, timeEntryService, customerService } from '@/lib/database'
import { formatCurrency } from '@/lib/currency'
import { format } from 'date-fns'
import { Header } from '@/components/Header'
import { CustomerModal } from '@/components/CustomerModal'
import { useAuth } from '@/components/AuthProvider'
import type { Customer, Agreement, Profile, TimeEntry } from '@/types'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [recentTimeEntries, setRecentTimeEntries] = useState<TimeEntry[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!user || !params.id) return
      
      try {
        const [customerData, profileData] = await Promise.all([
          supabase.from('customers').select('*').eq('id', params.id).single(),
          supabase.from('profiles').select('*').eq('id', user.id).single()
        ])
        
        if (customerData.data) {
          setCustomer(customerData.data)
          
          // Load agreements for this customer
          const agreementsData = await agreementService.getByCustomer(user.id, customerData.data.id)
          setAgreements(agreementsData)
          
          // Load recent time entries for this customer (last 10)
          const timeEntriesData = await timeEntryService.getAll(user.id)
          const customerTimeEntries = timeEntriesData
            .filter(entry => entry.customer_id === customerData.data.id)
            .slice(0, 10)
          setRecentTimeEntries(customerTimeEntries)
        }
        
        if (profileData.data) setProfile(profileData.data)
      } catch (error) {
        console.error('Error loading customer details:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (!loading && user) {
      loadData()
    }
  }, [params.id, user, loading])

  const getAgreementStatusColor = (agreement: Agreement) => {
    const now = new Date()
    const endDate = agreement.end_date ? new Date(agreement.end_date) : null
    
    if (!agreement.is_active) return 'bg-gray-100 text-gray-800'
    if (endDate && endDate < now) return 'bg-red-100 text-red-800'
    return 'bg-green-100 text-green-800'
  }

  const getAgreementStatusText = (agreement: Agreement) => {
    const now = new Date()
    const endDate = agreement.end_date ? new Date(agreement.end_date) : null
    
    if (!agreement.is_active) return 'Inactive'
    if (endDate && endDate < now) return 'Expired'
    return 'Active'
  }

  const handleCustomerUpdate = async (updatedCustomer: Customer) => {
    setCustomer(updatedCustomer)
    setShowEditModal(false)
  }

  const handleDeleteCustomer = async () => {
    if (!customer || !user) return
    
    // Check if customer has time entries or agreements
    const hasData = recentTimeEntries.length > 0 || agreements.length > 0
    
    const confirmMessage = hasData 
      ? `Are you sure you want to delete "${customer.company_name}"? This will also delete all associated time entries and agreements. This action cannot be undone.`
      : `Are you sure you want to delete "${customer.company_name}"? This action cannot be undone.`
    
    if (!confirm(confirmMessage)) return
    
    setDeleteLoading(true)
    
    try {
      await customerService.delete(customer.id)
      // Navigate back to agreements page after successful deletion
      router.push('/agreements')
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert('Failed to delete customer. Please try again.')
    } finally {
      setDeleteLoading(false)
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

  if (!customer) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        
        <main className="flex-1 flex flex-col">
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-8">
                <h1 className="text-xl font-semibold text-gray-900">Customer not found</h1>
              </div>
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
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {customer.company_name}
                  </h1>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => router.push(`/agreements?view=create&customer=${customer.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Agreement
                  </button>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Edit Customer
                  </button>
                  <button
                    onClick={handleDeleteCustomer}
                    disabled={deleteLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Customer'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Details */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h2>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Company Name</label>
                        <p className="text-gray-900">{customer.company_name}</p>
                      </div>
                      
                      {customer.contact_person && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Contact Person</label>
                          <p className="text-gray-900">{customer.contact_person}</p>
                        </div>
                      )}
                      
                      {customer.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-gray-900">
                            <a href={`mailto:${customer.email}`} className="text-blue-600 hover:text-blue-700">
                              {customer.email}
                            </a>
                          </p>
                        </div>
                      )}
                      
                      {customer.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phone</label>
                          <p className="text-gray-900">
                            <a href={`tel:${customer.phone}`} className="text-blue-600 hover:text-blue-700">
                              {customer.phone}
                            </a>
                          </p>
                        </div>
                      )}
                      
                      {customer.vat_number && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">VAT Number</label>
                          <p className="text-gray-900">{customer.vat_number}</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500">Default Rate</label>
                        <p className="text-gray-900">
                          {customer.default_rate 
                            ? `${formatCurrency(customer.default_rate, profile?.currency)}/${customer.rate_type === 'hourly' ? 'hour' : 'month'}`
                            : 'Not set'
                          }
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500">Payment Terms</label>
                        <p className="text-gray-900">
                          {customer.payment_terms ? `${customer.payment_terms} days` : '14 days (default)'}
                        </p>
                      </div>
                      
                      {customer.billing_address && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Billing Address</label>
                          <p className="text-gray-900 whitespace-pre-line">{customer.billing_address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Agreements and Time Entries */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Agreements */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Agreements</h2>
                    </div>
                    
                    {agreements.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500 mb-2">
                          <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm">No agreements yet</p>
                        <button
                          onClick={() => router.push(`/agreements?customer=${customer.id}`)}
                          className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Create first agreement
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {agreements.map((agreement) => (
                          <div key={agreement.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium text-gray-900">{agreement.name}</h3>
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getAgreementStatusColor(agreement)}`}>
                                    {getAgreementStatusText(agreement)}
                                  </span>
                                </div>
                                {agreement.description && (
                                  <p className="text-sm text-gray-600 mb-2">{agreement.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span>
                                    {format(new Date(agreement.start_date), 'MMM d, yyyy')}
                                    {agreement.end_date && ` - ${format(new Date(agreement.end_date), 'MMM d, yyyy')}`}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => router.push(`/agreements?edit=${agreement.id}`)}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Time Entries */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Time Entries</h2>
                    
                    {recentTimeEntries.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500 mb-2">
                          <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm">No time entries yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentTimeEntries.map((entry) => (
                          <div key={entry.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{entry.task_description}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                  <span>{format(new Date(entry.start_time), 'MMM d, yyyy')}</span>
                                  <span>{(entry.duration_minutes / 60).toFixed(2)} hours</span>
                                  {entry.is_billable && (
                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                      Billable
                                    </span>
                                  )}
                                  {entry.is_invoiced && (
                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                      Invoiced
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      
      {/* Customer Edit Modal */}
      {showEditModal && customer && (
        <CustomerModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          customer={customer}
          onCustomerUpdate={handleCustomerUpdate}
        />
      )}
    </div>
  )
}