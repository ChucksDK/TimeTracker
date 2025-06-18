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
import { useMemo } from 'react'

export const Calendar = () => {
  const { selectedWeek, timeEntries } = useStore()
  const weekDays = getWeekDays(selectedWeek)
  
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Calendar Header */}
      <div className="grid grid-cols-8 border-b border-gray-200 bg-white">
        {/* Time column header */}
        <div className="h-16 border-r border-gray-200"></div>
        
        {/* Day headers */}
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="h-16 flex flex-col justify-center items-center border-r border-gray-200 last:border-r-0">
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

      {/* Calendar Body */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8">
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
          {weekDays.map((day) => (
            <CalendarGrid 
              key={day.toISOString()} 
              date={day} 
              entries={entriesByDate[day.toDateString()] || []}
            />
          ))}
        </div>
      </div>
    </div>
  )
}