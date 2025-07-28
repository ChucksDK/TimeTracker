import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns'

export const HOURS = Array.from({ length: 24 }, (_, i) => i) // Full 24-hour day (0 = 12 AM, 23 = 11 PM)

export const getWeekDays = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday start
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export const formatHour = (hour: number) => {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

export const formatDate = (date: Date) => format(date, 'MMM d')

export const formatDayName = (date: Date) => format(date, 'EEE')

export const isToday = (date: Date) => isSameDay(date, new Date())

export const nextWeek = (date: Date) => addWeeks(date, 1)

export const prevWeek = (date: Date) => subWeeks(date, 1)

export const getCellId = (date: Date, hour: number) => {
  return `${format(date, 'yyyy-MM-dd')}-${hour}`
}

export const parseCellId = (cellId: string) => {
  const [dateStr, hourStr] = cellId.split('-')
  const [year, month, day] = dateStr.split('-').map(Number)
  return {
    date: new Date(year, month - 1, day),
    hour: parseInt(hourStr)
  }
}