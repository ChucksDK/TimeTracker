'use client'

import { useState, useEffect } from 'react'
import { CustomerModal } from './CustomerModal'
import { useStore } from '@/store/useStore'
import { useAuth } from '@/components/AuthProvider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Task } from '@/types'
import { timeEntryService, taskService } from '@/lib/database'
import { format, differenceInMinutes } from 'date-fns'

const timeEntrySchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  agreement_id: z.string().optional(),
  task_id: z.string().min(1, 'Task is required'),
  subtask: z.string().optional(),
  start_time: z.string(),
  start_hour: z.string(),
  start_minute: z.string(),
  end_time: z.string(),
  end_hour: z.string(),
  end_minute: z.string(),
  is_billable: z.boolean(),
  drive_required: z.boolean(),
  kilometers: z.number().min(0, 'Kilometers must be positive').optional(),
}).refine(
  (data) => {
    // If drive is required, kilometers must be provided and positive
    if (data.drive_required) {
      return data.kilometers !== undefined && data.kilometers > 0
    }
    // If drive is not required, kilometers should not be provided
    return data.kilometers === undefined || data.kilometers === 0
  },
  {
    message: 'Kilometers required when drive is selected',
    path: ['kilometers'],
  }
)

type TimeEntryFormData = z.infer<typeof timeEntrySchema>

export const TimeEntryForm = () => {
  const { user } = useAuth()
  const { 
    showEntryForm, 
    editingEntry, 
    customers, 
    dragStart,
    dragEnd,
    formPosition,
    setShowEntryForm, 
    setEditingEntry,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    setDragStart,
    setDragEnd,
    setIsDragging,
    setFormPosition
  } = useStore()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [selectedCustomerTasks, setSelectedCustomerTasks] = useState<Task[]>([])
  const [showNewTaskInput, setShowNewTaskInput] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      task_description: editingEntry?.task_description || '',
      customer_id: editingEntry?.customer_id || '',
      agreement_id: editingEntry?.agreement_id || '',
      start_time: '',
      start_hour: '09',
      start_minute: '00',
      end_time: '',
      end_hour: '10',
      end_minute: '00',
      is_billable: editingEntry?.is_billable ?? true,
      drive_required: editingEntry?.drive_required ?? false,
      kilometers: editingEntry?.kilometers || undefined,
    }
  })

  // Set form values when modal opens
  useEffect(() => {
    if (showEntryForm) {
      if (editingEntry) {
        // Editing existing entry
        const startTime = new Date(editingEntry.start_time)
        const endTime = new Date(editingEntry.end_time)
        
        setValue('customer_id', editingEntry.customer_id)
        setValue('agreement_id', editingEntry.agreement_id || '')
        setValue('task_id', editingEntry.task_id || '')
        setValue('subtask', editingEntry.subtask || '')
        setValue('start_time', format(startTime, 'yyyy-MM-dd'))
        setValue('start_hour', startTime.getHours().toString().padStart(2, '0'))
        setValue('start_minute', startTime.getMinutes().toString().padStart(2, '0'))
        setValue('end_time', format(endTime, 'yyyy-MM-dd'))
        setValue('end_hour', endTime.getHours().toString().padStart(2, '0'))
        setValue('end_minute', endTime.getMinutes().toString().padStart(2, '0'))
        setValue('is_billable', editingEntry.is_billable)
        setValue('drive_required', editingEntry.drive_required)
        setValue('kilometers', editingEntry.kilometers)
      } else if (dragStart && dragEnd) {
        // Creating from drag with 15-minute precision
        const startMinutes = Math.min(dragStart.minutes, dragEnd.minutes)
        const endMinutes = Math.max(dragStart.minutes, dragEnd.minutes) + 15 // Add 15 minutes to make it inclusive
        
        const startHour = Math.floor(startMinutes / 60)
        const startMin = startMinutes % 60
        const endHour = Math.floor(endMinutes / 60)
        const endMin = endMinutes % 60
        
        setValue('start_time', dragStart.date)
        setValue('start_hour', startHour.toString().padStart(2, '0'))
        setValue('start_minute', startMin.toString().padStart(2, '0'))
        setValue('end_time', dragEnd.date)
        setValue('end_hour', endHour.toString().padStart(2, '0'))
        setValue('end_minute', endMin.toString().padStart(2, '0'))
        setValue('customer_id', '')
        setValue('agreement_id', '')
        setValue('task_id', '')
        setValue('subtask', '')
        setValue('is_billable', true)
        setValue('drive_required', false)
        setValue('kilometers', undefined)
      }
    }
  }, [showEntryForm, editingEntry, dragStart, dragEnd, setValue])


  const selectedCustomerId = watch('customer_id')


  // Load tasks when customer changes
  useEffect(() => {
    const loadCustomerTasks = async () => {
      if (selectedCustomerId && user) {
        try {
          const tasksData = await taskService.getByCustomer(user.id, selectedCustomerId)
          setSelectedCustomerTasks(tasksData)
          
          // Only reset task selection when customer changes if we're NOT editing
          // When editing, we want to preserve the existing task selection
          if (!editingEntry) {
            setValue('task_id', '')
            setValue('subtask', '')
          }
          setShowNewTaskInput(false)
          setNewTaskName('')
        } catch (error) {
          console.error('Error loading tasks:', error)
        }
      } else {
        setSelectedCustomerTasks([])
      }
    }
    
    loadCustomerTasks()
  }, [selectedCustomerId, user, setValue, editingEntry])

  // When editing and tasks are loaded, make sure the task_id is set
  useEffect(() => {
    if (editingEntry && editingEntry.task_id && selectedCustomerTasks.length > 0) {
      // Check if the task exists in the loaded tasks
      const taskExists = selectedCustomerTasks.some(task => task.id === editingEntry.task_id)
      if (taskExists) {
        setValue('task_id', editingEntry.task_id)
        setValue('subtask', editingEntry.subtask || '')
      }
    }
  }, [editingEntry, selectedCustomerTasks, setValue])


  // Handle new task creation
  const handleCreateTask = async () => {
    if (!user || !selectedCustomerId || !newTaskName.trim()) return
    
    try {
      const newTask = await taskService.create({
        user_id: user.id,
        customer_id: selectedCustomerId,
        name: newTaskName.trim(),
        is_active: true
      })
      
      setSelectedCustomerTasks([...selectedCustomerTasks, newTask])
      setValue('task_id', newTask.id)
      setNewTaskName('')
      setShowNewTaskInput(false)
    } catch (error) {
      console.error('Error creating task:', error)
      setError('Failed to create task')
    }
  }

  const onSubmit = async (data: TimeEntryFormData) => {
    if (!user) return
    
    setLoading(true)
    setError(null)

    try {
      // Combine date and time fields
      const startTime = new Date(`${data.start_time}T${data.start_hour}:${data.start_minute}:00`)
      const endTime = new Date(`${data.end_time}T${data.end_hour}:${data.end_minute}:00`)
      const durationMinutes = differenceInMinutes(endTime, startTime)

      if (durationMinutes <= 0) {
        throw new Error('End time must be after start time')
      }

      const entryData = {
        user_id: user.id,
        customer_id: data.customer_id,
        agreement_id: data.agreement_id || null,
        task_id: data.task_id,
        subtask: data.subtask || null,
        task_description: '', // Required field in DB, will be removed in future migration
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        is_billable: data.is_billable,
        is_invoiced: false,
        drive_required: data.drive_required,
        kilometers: data.drive_required ? data.kilometers : null,
      }

      if (editingEntry) {
        // Update existing entry
        const updated = await timeEntryService.update(editingEntry.id, entryData)
        updateTimeEntry(editingEntry.id, updated)
      } else {
        // Create new entry
        const newEntry = await timeEntryService.create(entryData)
        addTimeEntry(newEntry)
        
        // Clear drag state immediately after creating entry so the new entry displays correctly
        // Use a small delay to ensure the store update has been processed
        setTimeout(() => {
          setDragStart(null)
          setDragEnd(null)
          setIsDragging(false)
        }, 50)
      }

      handleClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save time entry')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setShowEntryForm(false)
    setEditingEntry(null)
    setDragStart(null)
    setDragEnd(null)
    setIsDragging(false)
    setFormPosition(null)
    setError(null)
    reset()
  }

  const handleDelete = async () => {
    if (!editingEntry || !user) return
    
    if (confirm('Are you sure you want to delete this time entry?')) {
      setLoading(true)
      setError(null)
      
      try {
        await timeEntryService.delete(editingEntry.id)
        deleteTimeEntry(editingEntry.id)
        handleClose()
      } catch (err: any) {
        setError(err.message || 'Failed to delete time entry')
      } finally {
        setLoading(false)
      }
    }
  }

  if (!showEntryForm) return null

  const defaultPosition = { x: 300, y: 100 } // Fallback position
  const position = formPosition || defaultPosition

  return (
    <>
      <div 
        className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 p-6 w-96 z-50"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto'
        }}
      >
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

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              {...register('customer_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company_name}
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <p className="text-red-500 text-sm mt-1">{errors.customer_id.message}</p>
            )}
          </div>


          {selectedCustomerId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task
              </label>
              {showNewTaskInput ? (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Enter task name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={handleCreateTask}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={loading || !newTaskName.trim()}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTaskInput(false)
                      setNewTaskName('')
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <select
                    {...register('task_id')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">Select a task</option>
                    {selectedCustomerTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewTaskInput(true)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 whitespace-nowrap"
                    disabled={loading}
                  >
                    + New Task
                  </button>
                </div>
              )}
              {errors.task_id && (
                <p className="text-red-500 text-sm mt-1">{errors.task_id.message}</p>
              )}
            </div>
          )}

          {selectedCustomerId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtask (Optional)
              </label>
              <input
                {...register('subtask')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter subtask details"
                disabled={loading}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <div className="space-y-2">
                <input
                  {...register('start_time')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <div className="flex gap-2 items-center">
                  <select
                    {...register('start_hour')}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    {Array.from({length: 24}, (_, i) => (
                      <option key={i} value={i.toString().padStart(2, '0')}>
                        {i.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500">:</span>
                  <select
                    {...register('start_minute')}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <div className="space-y-2">
                <input
                  {...register('end_time')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <div className="flex gap-2 items-center">
                  <select
                    {...register('end_hour')}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    {Array.from({length: 24}, (_, i) => (
                      <option key={i} value={i.toString().padStart(2, '0')}>
                        {i.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500">:</span>
                  <select
                    {...register('end_minute')}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                {...register('is_billable')}
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">Billable</span>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                {...register('drive_required')}
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">Drive</span>
            </label>
          </div>

          {watch('drive_required') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kilometers
              </label>
              <input
                {...register('kilometers', { valueAsNumber: true })}
                type="number"
                step="0.1"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter kilometers driven"
                disabled={loading}
              />
              {errors.kilometers && (
                <p className="text-red-500 text-sm mt-1">{errors.kilometers.message}</p>
              )}
            </div>
          )}

          <div className="flex justify-between space-x-3 pt-4">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="p-2 text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                disabled={loading}
                title="New Customer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              {editingEntry && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                  disabled={loading}
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Saving...' : (editingEntry ? 'Update' : 'Create')} 
                {!loading && ' Entry'}
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {showCustomerModal && (
        <CustomerModal 
          isOpen={showCustomerModal} 
          onClose={() => setShowCustomerModal(false)} 
        />
      )}
    </>
  )
}