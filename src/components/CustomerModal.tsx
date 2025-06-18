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
})

type CustomerFormData = z.infer<typeof customerSchema>

interface CustomerModalProps {
  isOpen: boolean
  onClose: () => void
  customer?: Customer | null
  onSuccess?: () => void
}

export const CustomerModal = ({ isOpen, onClose, customer, onSuccess }: CustomerModalProps) => {
  const { user } = useAuth()
  const { addCustomer, setCustomers, customers } = useStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      })
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
      })
    }
  }, [customer, reset])

  const onSubmit = async (data: CustomerFormData) => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    
    try {
      if (customer) {
        // Update existing customer
        const updated = await customerService.update(customer.id, data)
        const updatedCustomers = customers.map(c => 
          c.id === updated.id ? updated : c
        )
        setCustomers(updatedCustomers)
      } else {
        // Create new customer
        const newCustomer = await customerService.create({
          ...data,
          user_id: user.id,
          default_rate: data.default_rate || 0,
        })
        addCustomer(newCustomer)
      }
      
      onSuccess?.()
      onClose()
      reset()
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