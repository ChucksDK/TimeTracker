'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Customer } from '@/types'
import { customerService } from '@/lib/database'
import { useAuth } from '@/components/AuthProvider'
import { useStore } from '@/store/useStore'

const customerSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  contact_person: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  billing_address: z.string().optional(),
  vat_number: z.string().optional(),
  default_rate: z.number().min(0, 'Rate must be positive').optional(),
  rate_type: z.enum(['hourly', 'monthly']),
  payment_terms: z.number().min(1, 'Payment terms must be at least 1 day').max(365, 'Payment terms cannot exceed 365 days').optional(),
})

type CustomerFormData = z.infer<typeof customerSchema>

interface CustomerModalProps {
  isOpen: boolean
  onClose: () => void
  customer?: Customer | null
  onSuccess?: () => void
  onCustomerUpdate?: (customer: Customer) => void
}

export const CustomerModal = ({ isOpen, onClose, customer, onSuccess, onCustomerUpdate }: CustomerModalProps) => {
  const { user } = useAuth()
  const { addCustomer, setCustomers, customers } = useStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [additionalEmails, setAdditionalEmails] = useState<string[]>(customer?.additional_emails || [])

  const addEmail = () => {
    setAdditionalEmails([...additionalEmails, ''])
  }

  const removeEmail = (index: number) => {
    setAdditionalEmails(additionalEmails.filter((_, i) => i !== index))
  }

  const updateEmail = (index: number, value: string) => {
    const updated = [...additionalEmails]
    updated[index] = value
    setAdditionalEmails(updated)
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      company_name: customer?.company_name || '',
      contact_person: customer?.contact_person || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      billing_address: customer?.billing_address || '',
      vat_number: customer?.vat_number || '',
      default_rate: customer?.default_rate || 100,
      rate_type: customer?.rate_type || 'hourly',
      payment_terms: customer?.payment_terms || 14,
    },
  })

  useEffect(() => {
    if (customer) {
      reset({
        company_name: customer.company_name,
        contact_person: customer.contact_person || '',
        email: customer.email || '',
        phone: customer.phone || '',
        billing_address: customer.billing_address || '',
        vat_number: customer.vat_number || '',
        default_rate: customer.default_rate || 100,
        rate_type: customer.rate_type,
        payment_terms: customer.payment_terms || 14,
      })
      setAdditionalEmails(customer.additional_emails || [])
    } else {
      reset({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        billing_address: '',
        vat_number: '',
        default_rate: 100,
        rate_type: 'hourly',
        payment_terms: 14,
      })
      setAdditionalEmails([])
    }
  }, [customer, reset])

  const onSubmit = async (data: CustomerFormData) => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Filter out empty additional emails
      const validAdditionalEmails = additionalEmails.filter(email => email.trim() !== '')
      
      const customerData = {
        ...data,
        additional_emails: validAdditionalEmails,
      }
      
      if (customer) {
        // Update existing customer
        const updated = await customerService.update(customer.id, customerData)
        const updatedCustomers = customers.map(c => 
          c.id === updated.id ? updated : c
        )
        setCustomers(updatedCustomers)
        
        // Call the onCustomerUpdate callback if provided
        if (onCustomerUpdate) {
          onCustomerUpdate(updated)
        }
      } else {
        // Create new customer
        const newCustomer = await customerService.create({
          ...customerData,
          user_id: user.id,
          default_rate: data.default_rate || 0,
        })
        addCustomer(newCustomer)
      }
      
      onSuccess?.()
      onClose()
      reset()
      setAdditionalEmails([])
    } catch (err: any) {
      setError(err.message || 'Failed to save customer')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">
          {customer ? 'Edit Customer' : 'New Customer'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              {...register('company_name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Acme Corporation"
            />
            {errors.company_name && (
              <p className="mt-1 text-sm text-red-600">{errors.company_name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person
            </label>
            <input
              {...register('contact_person')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Doe"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="contact@company.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          
          {/* Additional Emails Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Additional Emails
              </label>
              <button
                type="button"
                onClick={addEmail}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Email
              </button>
            </div>
            {additionalEmails.length > 0 && (
              <div className="space-y-2">
                {additionalEmails.map((email, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="additional@company.com"
                    />
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      className="p-2 text-red-500 hover:text-red-700 focus:outline-none"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {additionalEmails.length === 0 && (
              <p className="text-sm text-gray-500">No additional emails. Click "Add Email" to add more recipients for invoices.</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              {...register('phone')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="+1 234 567 8900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Address
            </label>
            <textarea
              {...register('billing_address')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="123 Main St&#10;New York, NY 10001"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VAT Number
            </label>
            <input
              {...register('vat_number')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="US123456789"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Rate
              </label>
              <input
                {...register('default_rate', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="150.00"
              />
              {errors.default_rate && (
                <p className="mt-1 text-sm text-red-600">{errors.default_rate.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate Type
              </label>
              <select
                {...register('rate_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hourly">Hourly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms (days)
              </label>
              <input
                {...register('payment_terms', { valueAsNumber: true })}
                type="number"
                min="1"
                max="365"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="14"
              />
              {errors.payment_terms && (
                <p className="text-red-500 text-sm mt-1">{errors.payment_terms.message}</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : (customer ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}