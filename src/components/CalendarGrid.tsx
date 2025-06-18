'use client'

import { useStore } from '@/store/useStore'
import { HOURS } from '@/lib/dateUtils'
import { TimeEntry } from '@/types'
import { format } from 'date-fns'
import { useState, useCallback } from 'react'

interface CalendarGridProps {
  date: Date
  entries: TimeEntry[]
}

export const CalendarGrid = ({ date, entries }: CalendarGridProps) => {
  const { 
    dragStart, 
    dragEnd, 
    isDragging, 
    setDragStart, 
    setDragEnd, 
    setIsDragging,
    setShowEntryForm,
    setEditingEntry
  } = useStore()

  const [isMouseDown, setIsMouseDown] = useState(false)
  const dateString = format(date, 'yyyy-MM-dd')

  const handleMouseDown = useCallback((hour: number) => {
    setIsMouseDown(true)
    setIsDragging(true)
    const dragData = { date: dateString, hour }
    setDragStart(dragData)
    setDragEnd(dragData)
  }, [dateString, setDragStart, setDragEnd, setIsDragging])

  const handleMouseEnter = useCallback((hour: number) => {
    if (isMouseDown && isDragging) {
      setDragEnd({ date: dateString, hour })
    }
  }, [isMouseDown, isDragging, dateString, setDragEnd])

  const handleMouseUp = useCallback(() => {
    if (isMouseDown && isDragging && dragStart && dragEnd) {
      // Only create entry if we have a valid drag
      const startHour = Math.min(dragStart.hour, dragEnd.hour)
      const endHour = Math.max(dragStart.hour, dragEnd.hour) + 1
      
      if (startHour !== endHour) {
        // Create a new time entry
        const newEntry: Partial<TimeEntry> = {
          id: Math.random().toString(36).substr(2, 9),
          title: 'New Time Entry',
          start_time: new Date(dragStart.date + 'T' + String(startHour).padStart(2, '0') + ':00:00').toISOString(),
          end_time: new Date(dragEnd.date + 'T' + String(endHour).padStart(2, '0') + ':00:00').toISOString(),
          is_billable: true,
          customer_id: '', // Will be set in form
        }
        
        setEditingEntry(newEntry as TimeEntry)
        setShowEntryForm(true)
      }
    }
    
    setIsMouseDown(false)
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }, [isMouseDown, isDragging, dragStart, dragEnd, setIsDragging, setDragStart, setDragEnd, setEditingEntry, setShowEntryForm])

  const isCellInSelection = (hour: number) => {
    if (!isDragging || !dragStart || !dragEnd || dragStart.date !== dateString) return false
    
    const minHour = Math.min(dragStart.hour, dragEnd.hour)
    const maxHour = Math.max(dragStart.hour, dragEnd.hour)
    
    return hour >= minHour && hour <= maxHour
  }

  const getTimeEntryForHour = (hour: number) => {
    return entries.find(entry => {
      const startHour = new Date(entry.start_time).getHours()
      const endHour = new Date(entry.end_time).getHours()
      return hour >= startHour && hour < endHour
    })
  }

  return (
    <div className="border-r border-gray-200 last:border-r-0 relative calendar-grid">
      {HOURS.map((hour) => {
        const entry = getTimeEntryForHour(hour)
        const isSelected = isCellInSelection(hour)
        
        return (
          <div
            key={hour}
            className={`h-16 border-b border-gray-200 last:border-b-0 cursor-pointer relative transition-colors ${
              isSelected ? 'bg-blue-100' : 'hover:bg-gray-50'
            }`}
            onMouseDown={() => handleMouseDown(hour)}
            onMouseEnter={() => handleMouseEnter(hour)}
            onMouseUp={handleMouseUp}
          >
            {entry && (
              <div 
                className="absolute inset-0 m-1 p-1 rounded text-xs text-white overflow-hidden"
                style={{ backgroundColor: entry.customer?.color || '#3b82f6' }}
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingEntry(entry)
                  setShowEntryForm(true)
                }}
              >
                <div className="font-medium truncate">{entry.title}</div>
                {entry.customer && (
                  <div className="text-xs opacity-90 truncate">{entry.customer.name}</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}