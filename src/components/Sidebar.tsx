'use client'

import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { format } from 'date-fns'
import { Customer } from '@/types'
import { CustomerModal } from '@/components/CustomerModal'
import { customerService } from '@/lib/database'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export const Sidebar = () => {
  const { customers, setCustomers } = useStore()
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const router = useRouter()

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setShowCustomerModal(true)
  }

  const handleDelete = async (customerId: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        await customerService.delete(customerId)
        setCustomers(customers.filter(c => c.id !== customerId))
      } catch (error) {
        console.error('Failed to delete customer:', error)
        alert('Failed to delete customer')
      }
    }
  }

  const getCustomerColor = (index: number) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    return colors[index % colors.length]
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Navigation */}
      <div className="p-4 border-b border-gray-200">
        <nav className="space-y-1">
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-900 hover:bg-gray-100"
          >
            <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Time Tracker
          </button>
          <button
            onClick={() => router.push('/analytics')}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-900 hover:bg-gray-100"
          >
            <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </button>
          <button
            onClick={() => router.push('/invoices')}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-900 hover:bg-gray-100"
          >
            <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Invoices
          </button>
          <button
            onClick={() => router.push('/agreements')}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-900 hover:bg-gray-100"
          >
            <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Agreements
          </button>
        </nav>
      </div>

      {/* Mini Calendar Placeholder */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Calendar</h3>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {format(new Date(), 'd')}
          </div>
          <div className="text-sm text-gray-600">
            {format(new Date(), 'MMM yyyy')}
          </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="p-4 flex-1 overflow-y-auto">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Customers</h3>
        
        {customers.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">
            No customers yet.<br />
            Create your first customer to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((customer, index) => (
              <div
                key={customer.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 group"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getCustomerColor(index) }}
                />
                <Link href={`/customers/${customer.id}`} className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 cursor-pointer">
                    {customer.company_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    ${customer.default_rate || 0}/{customer.rate_type === 'hourly' ? 'hr' : 'month'}
                  </div>
                </Link>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit customer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete customer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showCustomerModal && (
        <CustomerModal
          isOpen={showCustomerModal}
          onClose={() => {
            setShowCustomerModal(false)
            setEditingCustomer(null)
          }}
          customer={editingCustomer}
        />
      )}
    </div>
  )
}