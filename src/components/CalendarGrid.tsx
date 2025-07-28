'use client'

import { useStore } from '@/store/useStore'
import { HOURS } from '@/lib/dateUtils'
import { TimeEntry } from '@/types'
import { format } from 'date-fns'
import { useState, useCallback, useEffect, useRef } from 'react'
import { timeEntryService } from '@/lib/database'
import { useAuth } from '@/components/AuthProvider'

interface CalendarGridProps {
  date: Date
  entries: TimeEntry[]
  isLastColumn?: boolean
}

export const CalendarGrid = ({ date, entries, isLastColumn = false }: CalendarGridProps) => {
  const { 
    dragStart, 
    dragEnd, 
    isDragging, 
    setDragStart, 
    setDragEnd, 
    setIsDragging,
    showEntryForm,
    setShowEntryForm,
    setEditingEntry,
    setFormPosition,
    customers,
    draggingEntry,
    isDraggingEntry,
    setDraggingEntry,
    setIsDraggingEntry,
    dragOffset,
    setDragOffset,
    updateTimeEntry
  } = useStore()

  const { user } = useAuth()
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDropZone, setIsDropZone] = useState(false)
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null)
  const [isHolding, setIsHolding] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const dateString = format(date, 'yyyy-MM-dd')

  // Function to get customer color based on their index
  const getCustomerColor = (customerId: string) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    const customerIndex = customers.findIndex(c => c.id === customerId)
    if (customerIndex === -1) return '#9ca3af' // Gray for unknown customer
    return colors[customerIndex % colors.length]
  }

  const handleMouseDown = useCallback((hour: number, quarter: number = 0) => {
    setIsMouseDown(true)
    setIsDragging(true)
    const minutes = hour * 60 + quarter * 15
    const dragData = { date: dateString, hour, quarter, minutes }
    setDragStart(dragData)
    setDragEnd(dragData)
  }, [dateString, setDragStart, setDragEnd, setIsDragging])

  const handleMouseEnter = useCallback((hour: number, quarter: number = 0) => {
    if (isMouseDown && isDragging && !showEntryForm) {
      const minutes = hour * 60 + quarter * 15
      setDragEnd({ date: dateString, hour, quarter, minutes })
    }
  }, [isMouseDown, isDragging, showEntryForm, dateString, setDragEnd])

  const handleMouseUp = useCallback((event?: MouseEvent) => {
    if (isMouseDown && isDragging && dragStart && dragEnd) {
      // Only create entry if we have a valid drag
      const startMinutes = Math.min(dragStart.minutes, dragEnd.minutes)
      const endMinutes = Math.max(dragStart.minutes, dragEnd.minutes) + 15
      
      if (startMinutes !== endMinutes) {
        // Calculate form position based on the selection area
        if (gridRef.current && event) {
          const gridRect = gridRef.current.getBoundingClientRect()
          const minHour = Math.floor(startMinutes / 60)
          const hourHeight = 64 // h-16 = 64px
          const formY = gridRect.top + (minHour * hourHeight) + window.scrollY
          const formX = gridRect.right + 20 // 20px gap from calendar
          
          setFormPosition({ x: formX, y: formY })
        }
        
        // Clear mouse state immediately to prevent further dragging
        setIsMouseDown(false)
        
        // Open the time entry form with drag data (don't clear drag state yet)
        setEditingEntry(null) // Clear editing entry to indicate new entry
        setShowEntryForm(true)
      } else {
        // Clear drag state if no valid selection
        setIsMouseDown(false)
        setIsDragging(false)
        setDragStart(null)
        setDragEnd(null)
      }
    }
  }, [isMouseDown, isDragging, dragStart, dragEnd, setIsDragging, setDragStart, setDragEnd, setEditingEntry, setShowEntryForm, setFormPosition])

  const isCellInSelection = (hour: number, quarter: number = 0) => {
    if (!isDragging || !dragStart || !dragEnd || dragStart.date !== dateString) return false
    
    const cellMinutes = hour * 60 + quarter * 15
    const minMinutes = Math.min(dragStart.minutes, dragEnd.minutes)
    const maxMinutes = Math.max(dragStart.minutes, dragEnd.minutes)
    
    return cellMinutes >= minMinutes && cellMinutes <= maxMinutes
  }

  // Get all entries that should be rendered (we'll position them absolutely)
  const getAllTimeEntries = () => {
    return entries.filter(entry => {
      const startTime = new Date(entry.start_time)
      const endTime = new Date(entry.end_time)
      
      // Only show entries for the current date
      const entryDate = startTime.toDateString()
      const gridDate = date.toDateString()
      
      return entryDate === gridDate
    })
  }

  // Calculate absolute positioning for entries across the entire day grid
  const calculateAbsoluteEntryLayout = (entry: TimeEntry, allEntries: TimeEntry[]) => {
    const startTime = new Date(entry.start_time)
    const endTime = new Date(entry.end_time)
    
    // Calculate position in minutes from start of day
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes()
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes()
    
    // Calculate position as percentage of the full day grid
    const hourHeight = 64 // h-16 = 64px per hour
    const totalGridHeight = HOURS.length * hourHeight
    
    const topPixels = (startMinutes / 60) * hourHeight
    const heightPixels = ((endMinutes - startMinutes) / 60) * hourHeight
    
    // Handle overlapping entries horizontally
    const overlappingEntries = allEntries.filter(otherEntry => {
      if (otherEntry.id === entry.id) return false
      
      const otherStart = new Date(otherEntry.start_time)
      const otherEnd = new Date(otherEntry.end_time)
      const otherStartMinutes = otherStart.getHours() * 60 + otherStart.getMinutes()
      const otherEndMinutes = otherEnd.getHours() * 60 + otherEnd.getMinutes()
      
      // Check for time overlap
      return startMinutes < otherEndMinutes && endMinutes > otherStartMinutes
    })
    
    const totalOverlapping = overlappingEntries.length + 1
    const entryIndex = overlappingEntries.filter(otherEntry => {
      const otherStart = new Date(otherEntry.start_time)
      return otherStart < startTime || (otherStart.getTime() === startTime.getTime() && otherEntry.id < entry.id)
    }).length
    
    const entryWidth = 100 / totalOverlapping
    const entryLeft = entryWidth * entryIndex
    
    return {
      top: `${topPixels}px`,
      height: `${heightPixels}px`,
      width: `${entryWidth}%`,
      left: `${entryLeft}%`
    }
  }

  // Calculate layout for overlapping entries with 15-minute precision
  const calculateEntryLayout = (entry: TimeEntry, allEntriesInHour: TimeEntry[], hour: number) => {
    const startTime = new Date(entry.start_time)
    const endTime = new Date(entry.end_time)
    
    // Calculate position and size within the hour (in minutes)
    const hourStartMinutes = hour * 60 // Start of this hour in minutes from midnight
    const hourEndMinutes = (hour + 1) * 60 // End of this hour in minutes from midnight
    
    // Convert entry times to minutes from midnight
    const entryStartMinutes = startTime.getHours() * 60 + startTime.getMinutes()
    const entryEndMinutes = endTime.getHours() * 60 + endTime.getMinutes()
    
    // Clamp to this hour's boundaries
    const clampedStartMinutes = Math.max(entryStartMinutes, hourStartMinutes)
    const clampedEndMinutes = Math.min(entryEndMinutes, hourEndMinutes)
    
    // Calculate position and height as percentages of the hour
    const topPercent = ((clampedStartMinutes - hourStartMinutes) / 60) * 100
    const heightPercent = ((clampedEndMinutes - clampedStartMinutes) / 60) * 100
    
    // Handle overlapping entries horizontally
    const index = allEntriesInHour.findIndex(e => e.id === entry.id)
    const totalEntries = allEntriesInHour.length
    
    // Add spacing between entries when multiple exist
    const spacing = totalEntries > 1 ? 2 : 0 // 2% spacing between entries
    const availableWidth = 100 - (spacing * (totalEntries - 1))
    const entryWidth = availableWidth / totalEntries
    const entryLeft = (entryWidth + spacing) * index
    
    return {
      width: `${entryWidth}%`,
      left: `${entryLeft}%`,
      top: `${topPercent}%`,
      height: `${heightPercent}%`
    }
  }

  // Clean up drag state when form opens
  useEffect(() => {
    if (showEntryForm) {
      setIsMouseDown(false)
    }
  }, [showEntryForm])

  // Handle mouse events for dragging existing entries
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingEntry && dragStartPosition) {
        // Use requestAnimationFrame for smooth 1:1 tracking
        requestAnimationFrame(() => {
          setDragOffset({
            x: e.clientX - dragStartPosition.x,
            y: e.clientY - dragStartPosition.y
          })
        })

        // Check if we're over this grid for drop zone highlighting
        if (gridRef.current) {
          const rect = gridRef.current.getBoundingClientRect()
          const isOverGrid = (
            e.clientX >= rect.left && 
            e.clientX <= rect.right && 
            e.clientY >= rect.top && 
            e.clientY <= rect.bottom
          )
          setIsDropZone(isOverGrid)
        }
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (isDraggingEntry && draggingEntry) {
        // Find which calendar grid we're dropping into
        const calendarGrids = document.querySelectorAll('.calendar-grid')
        let targetDate: Date | null = null
        let targetHour = -1

        for (const grid of calendarGrids) {
          const rect = grid.getBoundingClientRect()
          if (
            e.clientX >= rect.left && 
            e.clientX <= rect.right && 
            e.clientY >= rect.top && 
            e.clientY <= rect.bottom
          ) {
            // Found the target grid, get the date from data attribute
            const dateStr = grid.getAttribute('data-date')
            if (dateStr) {
              targetDate = new Date(dateStr)
              const cellHeight = rect.height / HOURS.length
              const relativeY = e.clientY - rect.top
              targetHour = Math.floor(relativeY / cellHeight)
            }
            break
          }
        }

        if (targetDate && targetHour >= 0 && targetHour < HOURS.length) {
          // Calculate the time difference for the entry
          const originalStartHour = new Date(draggingEntry.start_time).getHours()
          const originalEndHour = new Date(draggingEntry.end_time).getHours()
          const duration = originalEndHour - originalStartHour
          
          // Create new start and end times with the target date
          const newStartTime = new Date(targetDate)
          newStartTime.setHours(targetHour, 0, 0, 0)
          const newEndTime = new Date(newStartTime)
          newEndTime.setHours(targetHour + duration, 0, 0, 0)
          
          // Update the time entry
          handleTimeEntryMove(draggingEntry.id, newStartTime, newEndTime)
        }
        
        // Reset drag state
        setDraggingEntry(null)
        setIsDraggingEntry(false)
        setDragOffset(null)
        setDragStartPosition(null)
        setIsDropZone(false)
        setIsHolding(false)
        if (holdTimer) {
          clearTimeout(holdTimer)
          setHoldTimer(null)
        }
      }
    }

    if (isDraggingEntry) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true })
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDraggingEntry, dragStartPosition, draggingEntry, setDragOffset, setDraggingEntry, setIsDraggingEntry])

  const handleTimeEntryMove = async (entryId: string, newStartTime: Date, newEndTime: Date) => {
    if (!user) return
    
    try {
      const updatedEntry = await timeEntryService.update(entryId, {
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString()
      })
      
      // Update local state
      updateTimeEntry(entryId, updatedEntry)
    } catch (error) {
      console.error('Failed to move time entry:', error)
    }
  }

  const handleEntryMouseDown = (e: React.MouseEvent, entry: TimeEntry) => {
    e.stopPropagation()
    e.preventDefault()
    
    // Clear any existing timer
    if (holdTimer) {
      clearTimeout(holdTimer)
    }
    
    // Set position for potential drag
    setDragStartPosition({ x: e.clientX, y: e.clientY })
    
    // Start hold timer (300ms to activate drag mode)
    const timer = setTimeout(() => {
      setIsHolding(true)
      setDraggingEntry(entry)
      setIsDraggingEntry(true)
      
      // Add haptic feedback or visual indication that drag is activated
      if (navigator.vibrate) {
        navigator.vibrate(50) // Small vibration on mobile devices
      }
    }, 300)
    
    setHoldTimer(timer)
  }

  const handleEntryMouseUp = (e: React.MouseEvent, entry: TimeEntry) => {
    e.stopPropagation()
    
    // Clear hold timer if mouse is released before drag activates
    if (holdTimer) {
      clearTimeout(holdTimer)
      setHoldTimer(null)
    }
    
    // If we're not in drag mode yet, treat as a click
    if (!isDraggingEntry && !isHolding) {
      setEditingEntry(entry)
      setShowEntryForm(true)
    }
    
    setIsHolding(false)
  }

  const handleEntryMouseLeave = () => {
    // Cancel hold timer if mouse leaves the element
    if (holdTimer && !isDraggingEntry) {
      clearTimeout(holdTimer)
      setHoldTimer(null)
      setIsHolding(false)
    }
  }

  return (
    <div 
      ref={gridRef} 
      className={`${isLastColumn ? '' : 'border-r'} border-gray-200 relative calendar-grid transition-colors ${
        isDropZone && isDraggingEntry ? 'bg-blue-50 border-blue-300' : ''
      }`}
      data-date={dateString}
    >
      {/* Hour grid with 15-minute subdivisions */}
      {HOURS.map((hour) => (
        <div
          key={hour}
          className={`h-16 border-b border-gray-200 last:border-b-0 cursor-pointer relative ${isDraggingEntry ? 'pointer-events-none' : ''}`}
        >
          {/* 15-minute subdivisions */}
          {[0, 1, 2, 3].map((quarter) => {
            const isSelected = isCellInSelection(hour, quarter)
            return (
              <div
                key={`${hour}-${quarter}`}
                className={`h-4 relative transition-colors ${
                  isSelected ? 'bg-blue-100' : 'hover:bg-gray-50'
                }`}
                onMouseDown={() => !isDraggingEntry && handleMouseDown(hour, quarter)}
                onMouseEnter={() => !isDraggingEntry && handleMouseEnter(hour, quarter)}
                onMouseUp={!isDraggingEntry ? (e) => handleMouseUp(e.nativeEvent) : undefined}
              >
                {/* Almost invisible lines for 15, 30, 45 minute marks */}
                {quarter > 0 && (
                  <div className="absolute top-0 left-0 right-0 h-px bg-gray-100 opacity-30"></div>
                )}
              </div>
            )
          })}
        </div>
      ))}
      
      {/* Time entries rendered absolutely positioned over the entire grid */}
      {getAllTimeEntries().map((entry) => {
        const isBeingDragged = draggingEntry && draggingEntry.id === entry.id
        const layout = calculateAbsoluteEntryLayout(entry, getAllTimeEntries())
        
        return (
          <div 
            key={entry.id}
            className={`absolute p-1 rounded text-xs text-white overflow-hidden transition-all duration-200 ${
              isBeingDragged 
                ? 'opacity-60 scale-105 shadow-xl z-50 pointer-events-none border-2 border-white' 
                : isHolding && draggingEntry?.id === entry.id && !isDraggingEntry
                ? 'scale-95 shadow-inner opacity-80 cursor-grabbing'
                : 'hover:scale-102 hover:shadow-md cursor-pointer'
            }`}
            style={{ 
              backgroundColor: getCustomerColor(entry.customer_id),
              transform: isBeingDragged && dragOffset 
                ? `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.05)` 
                : undefined,
              zIndex: isBeingDragged ? 1000 : 1,
              width: layout.width,
              left: layout.left,
              top: layout.top,
              height: layout.height
            }}
            onMouseDown={(e) => handleEntryMouseDown(e, entry)}
            onMouseUp={(e) => handleEntryMouseUp(e, entry)}
            onMouseLeave={handleEntryMouseLeave}
          >
            <div className="flex flex-col h-full">
              <div className="font-semibold truncate text-xs">
                {customers.find(c => c.id === entry.customer_id)?.company_name || 'Unknown Customer'}
              </div>
              <div className="text-xs truncate opacity-90 mt-0.5">
                {entry.task?.name || 'No task'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}