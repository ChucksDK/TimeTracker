'use client'

import { useStore } from '@/store/useStore'
import { 
  getWeekDays, 
  formatHour, 
  formatDate, 
  formatDayName, 
  isToday, 
  HOURS
} from '@/lib/dateUtils'
import { CalendarGrid } from './CalendarGrid'
import { TimeEntry } from '@/types'
import { useMemo, useEffect, useRef } from 'react'

export const Calendar = () => {
  const { selectedWeek, timeEntries } = useStore()
  const weekDays = getWeekDays(selectedWeek)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Group time entries by date
  const entriesByDate = useMemo(() => {
    const grouped: { [key: string]: TimeEntry[] } = {}
    
    timeEntries.forEach(entry => {
      const date = new Date(entry.start_time).toDateString()
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(entry)
    })
    
    return grouped
  }, [timeEntries])

  // Scroll to 7 AM on mount and when week changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Each hour row is 64px (h-16 = 4rem = 64px)
      // Scroll to 7 AM (7 hours from midnight)
      const scrollPosition = 7 * 64
      scrollContainerRef.current.scrollTop = scrollPosition
    }
  }, [selectedWeek])

  const gridColumns = 'minmax(120px, 120px) repeat(7, 1fr)'

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Calendar Container */}
      <div className="flex-1 flex flex-col relative">
        {/* Calendar Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="grid pr-4" style={{ gridTemplateColumns: gridColumns }}>
            {/* Time column header */}
            <div className="h-16 border-r border-gray-200"></div>
            
            {/* Day headers */}
            {weekDays.map((day, index) => (
              <div key={day.toISOString()} className={`h-16 flex flex-col justify-center items-center ${index < weekDays.length - 1 ? 'border-r' : ''} border-gray-200`}>
                <div className="text-sm font-medium text-gray-900">
                  {formatDayName(day)}
                </div>
                <div className={`text-lg font-semibold mt-1 ${
                  isToday(day) ? 'text-blue-600' : 'text-gray-700'
                }`}>
                  {formatDate(day).split(' ')[1]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Body */}
        {/* Shows 10 hours by default (7 AM to 5 PM), scrollable for full 24 hours */}
        <div 
          ref={scrollContainerRef} 
          className="flex-1 overflow-y-scroll overflow-x-hidden" 
          style={{ 
            maxHeight: '640px' // 640px = 10 hours * 64px per hour
          }}
        >
          <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
            {/* Time labels column */}
            <div className="border-r border-gray-200">
              {HOURS.map((hour) => (
                <div key={hour} className="h-16 border-b border-gray-200 last:border-b-0 flex items-start justify-end pr-2 pt-1">
                  <span className="text-xs text-gray-500 font-medium">
                    {formatHour(hour)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {weekDays.map((day, index) => (
              <CalendarGrid 
                key={day.toISOString()} 
                date={day} 
                entries={entriesByDate[day.toDateString()] || []}
                isLastColumn={index === weekDays.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}