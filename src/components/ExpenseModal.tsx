'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Expense, Customer } from '@/types'
import { expenseService } from '@/lib/database'
import { useAuth } from '@/components/AuthProvider'

const expenseSchema = z.object({
  name: z.string().min(1, 'Expense name is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  expense_type: z.enum(['one-off', 'monthly']),
  category: z.string().optional(),
  customer_id: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
})

type ExpenseFormData = z.infer<typeof expenseSchema>

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  expense?: Expense | null
  customers: Customer[]
  onSuccess?: () => void
}

export const ExpenseModal = ({ isOpen, onClose, expense, customers, onSuccess }: ExpenseModalProps) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: expense?.name || '',
      amount: expense?.amount || 0,
      expense_type: expense?.expense_type || 'one-off',
      category: expense?.category || '',
      customer_id: expense?.customer_id || '',
      date: expense?.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0],
    },
  })

  useEffect(() => {
    if (expense) {
      reset({
        name: expense.name,
        amount: expense.amount,
        expense_type: expense.expense_type,
        category: expense.category || '',
        customer_id: expense.customer_id || '',
        date: expense.date.split('T')[0],
      })
    } else {
      reset({
        name: '',
        amount: 0,
        expense_type: 'one-off',
        category: '',
        customer_id: '',
        date: new Date().toISOString().split('T')[0],
      })
    }
  }, [expense, reset])

  const onSubmit = async (data: ExpenseFormData) => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    
    try {
      const expenseData = {
        ...data,
        customer_id: data.customer_id || null,
        category: data.category || null,
        date: new Date(data.date).toISOString(),
      }
      
      if (expense) {
        // Update existing expense
        await expenseService.update(expense.id, expenseData)
      } else {
        // Create new expense
        await expenseService.create({
          ...expenseData,
          user_id: user.id,
          is_active: true,
        })
      }
      
      onSuccess?.()
      onClose()
      reset()
    } catch (err: any) {
      setError(err.message || 'Failed to save expense')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!expense || !user) return
    
    if (confirm(`Are you sure you want to delete "${expense.name}"? This action cannot be undone.`)) {
      setDeleteLoading(true)
      setError(null)
      
      try {
        await expenseService.delete(expense.id)
        onSuccess?.()
        onClose()
      } catch (err: any) {
        setError(err.message || 'Failed to delete expense')
      } finally {
        setDeleteLoading(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">
          {expense ? 'Edit Expense' : 'New Expense'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expense Name *
            </label>
            <input
              {...register('name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Office Rent, Software License, etc."
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              {...register('expense_type')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="one-off">One-off</option>
              <option value="monthly">Monthly Subscription</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              {...register('category')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Software, Office, Travel, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer (Optional)
            </label>
            <select
              {...register('customer_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No specific customer</option>
              {customers.filter(customer => !customer.is_internal).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              {...register('date')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>
          
          <div className="flex justify-between space-x-3 pt-4">
            <div>
              {expense && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading || deleteLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || deleteLoading}
              >
                {loading ? 'Saving...' : (expense ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}