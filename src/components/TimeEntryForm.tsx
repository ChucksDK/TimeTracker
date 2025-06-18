'use client'

import { useStore } from '@/store/useStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TimeEntry } from '@/types'
import { format } from 'date-fns'

const timeEntrySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  customer_id: z.string().min(1, 'Customer is required'),
  start_time: z.string(),
  end_time: z.string(),
  is_billable: z.boolean(),
  hourly_rate: z.number().optional(),
})

type TimeEntryFormData = z.infer<typeof timeEntrySchema>

export const TimeEntryForm = () => {
  const { 
    showEntryForm, 
    editingEntry, 
    customers, 
    setShowEntryForm, 
    setEditingEntry,
    addTimeEntry,
    updateTimeEntry 
  } = useStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: editingEntry ? {
      title: editingEntry.title,
      description: editingEntry.description || '',
      customer_id: editingEntry.customer_id,
      start_time: format(new Date(editingEntry.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(new Date(editingEntry.end_time), "yyyy-MM-dd'T'HH:mm"),
      is_billable: editingEntry.is_billable,
      hourly_rate: editingEntry.hourly_rate || undefined,
    } : {
      title: '',
      description: '',
      customer_id: '',
      start_time: '',
      end_time: '',
      is_billable: true,
    }
  })

  const selectedCustomerId = watch('customer_id')
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)

  const onSubmit = (data: TimeEntryFormData) => {
    const customer = customers.find(c => c.id === data.customer_id)
    if (!customer) return

    const entryData: TimeEntry = {
      id: editingEntry?.id || Math.random().toString(36).substr(2, 9),
      title: data.title,
      description: data.description || undefined,
      customer_id: data.customer_id,
      start_time: new Date(data.start_time).toISOString(),
      end_time: new Date(data.end_time).toISOString(),
      is_billable: data.is_billable,
      hourly_rate: data.hourly_rate || customer.hourly_rate,
      created_at: editingEntry?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customer
    }

    if (editingEntry) {
      updateTimeEntry(editingEntry.id, entryData)
    } else {
      addTimeEntry(entryData)
    }

    handleClose()
  }

  const handleClose = () => {
    setShowEntryForm(false)
    setEditingEntry(null)
    reset()
  }

  if (!showEntryForm) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingEntry ? 'Edit Time Entry' : 'New Time Entry'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              {...register('title')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What did you work on?"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              {...register('customer_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <p className="text-red-500 text-sm mt-1">{errors.customer_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                {...register('start_time')}
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                {...register('end_time')}
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                {...register('is_billable')}
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Billable</span>
            </label>
          </div>

          {selectedCustomer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Rate (${selectedCustomer.hourly_rate} default)
              </label>
              <input
                {...register('hourly_rate', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder={selectedCustomer.hourly_rate.toString()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              {editingEntry ? 'Update' : 'Create'} Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}