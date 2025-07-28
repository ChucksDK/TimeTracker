import { supabase } from './supabase'
import { TimeEntry, Customer, Profile } from '@/types'
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  format, getWeek, getMonth, getYear, startOfDay, eachDayOfInterval, eachMonthOfInterval
} from 'date-fns'

export type TimePeriod = 'week' | 'month' | 'year' | 'custom'

export interface AnalyticsData {
  totalHours: number
  billableHours: number
  nonBillableHours: number
  revenue: number
  costs: number
  ebitda: number
  ebitdaMargin: number
  activeClients: number
  totalKilometers: number
  hoursPerClient: { 
    name: string; 
    hours: number; 
    revenue: number; 
    costs: number; 
    profit: number; 
    profitMargin: number;
    kilometers: number;
  }[]
  timeSeriesData: { 
    label: string; 
    date: string; 
    billable: number; 
    nonBillable: number; 
    revenue: number; 
    costs: number; 
    profit: number 
  }[]
  grouping: 'daily' | 'weekly' | 'monthly'
  revenueTrend: {
    current: number
    previous: number
    change: number
    changePercent: number
  }
}

export const analyticsService = {
  async getMetrics(userId: string, period: TimePeriod = 'month', customStartDate?: Date, customEndDate?: Date): Promise<AnalyticsData> {
    // Get date range based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date
    let previousStartDate: Date
    let previousEndDate: Date

    switch (period) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 })
        endDate = endOfWeek(now, { weekStartsOn: 1 })
        previousStartDate = startOfWeek(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 })
        previousEndDate = endOfWeek(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 })
        break
      case 'month':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        previousStartDate = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1))
        previousEndDate = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1))
        break
      case 'year':
        startDate = startOfYear(now)
        endDate = endOfYear(now)
        previousStartDate = startOfYear(new Date(now.getFullYear() - 1, 0))
        previousEndDate = endOfYear(new Date(now.getFullYear() - 1, 0))
        break
      case 'custom':
        if (!customStartDate || !customEndDate) {
          throw new Error('Custom dates required for custom period')
        }
        startDate = customStartDate
        endDate = customEndDate
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        previousStartDate = new Date(startDate.getTime() - daysDiff * 24 * 60 * 60 * 1000)
        previousEndDate = new Date(endDate.getTime() - daysDiff * 24 * 60 * 60 * 1000)
        break
    }

    // Fetch user profile for internal rate
    const { data: profile } = await supabase
      .from('profiles')
      .select('internal_hourly_rate, currency')
      .eq('id', userId)
      .single()

    const internalRate = profile?.internal_hourly_rate || 0

    // Fetch time entries with customer data only (no agreement data)
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select(`
        *,
        customer:customers(
          company_name,
          default_rate,
          rate_type
        )
      `)
      .eq('user_id', userId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true })

    // Fetch previous period data for comparison
    const { data: previousTimeEntries } = await supabase
      .from('time_entries')
      .select(`
        *,
        customer:customers(
          company_name,
          default_rate,
          rate_type
        )
      `)
      .eq('user_id', userId)
      .gte('start_time', previousStartDate.toISOString())
      .lte('start_time', previousEndDate.toISOString())
      .order('start_time', { ascending: true })

    if (!timeEntries) {
      return getEmptyAnalytics()
    }

    // Debug: Log entries for June 6th
    if (period === 'month') {
      const june6Entries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.start_time)
        return entryDate.getDate() === 6 && entryDate.getMonth() === 5 // June is month 5 (0-indexed)
      })
      if (june6Entries.length > 0) {
        console.log('Raw June 6th entries found:', june6Entries)
        june6Entries.forEach(entry => {
          console.log('Entry details:', {
            id: entry.id,
            start_time: entry.start_time,
            end_time: entry.end_time,
            duration_minutes: entry.duration_minutes,
            task_description: entry.task_description,
            created_at: entry.created_at
          })
        })
      }
    }

    // Calculate metrics
    let totalMinutes = 0
    let billableMinutes = 0
    let nonBillableMinutes = 0
    let totalRevenue = 0
    let totalKilometers = 0
    const clientMap = new Map<string, { 
      name: string; 
      minutes: number; 
      billableMinutes: number;
      revenue: number; 
      costs: number;
      kilometers: number;
    }>()
    const timeMap = new Map<string, { 
      billable: number; 
      nonBillable: number; 
      revenue: number; 
      costs: number 
    }>()
    
    // Track monthly customers to avoid double-counting monthly rates
    const monthlyCustomersTracked = new Set<string>()

    timeEntries.forEach((entry) => {
      totalMinutes += entry.duration_minutes
      const entryHours = entry.duration_minutes / 60
      const entryCosts = entryHours * internalRate
      
      // Track kilometers
      if (entry.drive_required && entry.kilometers) {
        totalKilometers += entry.kilometers
      }

      if (entry.is_billable) {
        billableMinutes += entry.duration_minutes
        
        // Calculate revenue based on customer rate type
        let entryRevenue = 0
        
        if (entry.customer) {
          const customerRate = entry.customer.default_rate || 0
          
          if (entry.customer.rate_type === 'monthly') {
            // For monthly customers, count the full monthly rate only once per customer per period
            const customerKey = entry.customer_id
            if (!monthlyCustomersTracked.has(customerKey)) {
              entryRevenue = customerRate
              monthlyCustomersTracked.add(customerKey)
              totalRevenue += entryRevenue
            }
          } else if (entry.customer.rate_type === 'hourly') {
            // For hourly customers, calculate based on hours * rate
            entryRevenue = entryHours * customerRate
            totalRevenue += entryRevenue
          }
        }

        // Track per-client metrics
        if (entry.customer) {
          const clientKey = entry.customer_id
          const existing = clientMap.get(clientKey) || {
            name: entry.customer.company_name,
            minutes: 0,
            billableMinutes: 0,
            revenue: 0,
            costs: 0,
            kilometers: 0
          }
          existing.minutes += entry.duration_minutes
          existing.billableMinutes += entry.duration_minutes
          existing.revenue += entryRevenue
          existing.costs += entryCosts
          if (entry.drive_required && entry.kilometers) {
            existing.kilometers += entry.kilometers
          }
          clientMap.set(clientKey, existing)
        }
      } else {
        nonBillableMinutes += entry.duration_minutes
        
        // Track costs for non-billable time by client
        if (entry.customer_id) {
          const clientKey = entry.customer_id
          const existing = clientMap.get(clientKey) || {
            name: entry.customer?.company_name || 'Unknown',
            minutes: 0,
            billableMinutes: 0,
            revenue: 0,
            costs: 0,
            kilometers: 0
          }
          existing.minutes += entry.duration_minutes
          existing.costs += entryCosts
          if (entry.drive_required && entry.kilometers) {
            existing.kilometers += entry.kilometers
          }
          clientMap.set(clientKey, existing)
        }
      }

      // Track time series data based on period
      const entryDate = new Date(entry.start_time)
      let timeKey: string
      
      if (period === 'week' || period === 'month') {
        // Group by day for week and month views
        timeKey = format(entryDate, 'yyyy-MM-dd')
      } else {
        // Group by month for year view
        timeKey = format(entryDate, 'yyyy-MM')
      }
      
      const existing = timeMap.get(timeKey) || { 
        billable: 0, 
        nonBillable: 0, 
        revenue: 0, 
        costs: 0 
      }
      
      if (entry.is_billable) {
        existing.billable += entryHours
        
        // Add revenue calculation for time series based on customer rates
        if (entry.customer) {
          const customerRate = entry.customer.default_rate || 0
          
          if (entry.customer.rate_type === 'monthly') {
            // For monthly customers, the revenue is already tracked in the main loop
            // We don't add it again here to avoid double counting
          } else if (entry.customer.rate_type === 'hourly') {
            existing.revenue += entryHours * customerRate
          }
        }
      } else {
        existing.nonBillable += entryHours
      }
      existing.costs += entryCosts
      timeMap.set(timeKey, existing)
    })

    // Convert minutes to hours
    const totalHours = totalMinutes / 60
    const billableHours = billableMinutes / 60
    const nonBillableHours = nonBillableMinutes / 60

    // Calculate costs (all hours * internal rate)
    const costs = totalHours * internalRate

    // Calculate EBITDA
    const ebitda = totalRevenue - costs
    const ebitdaMargin = totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0

    // Calculate previous period revenue
    let previousRevenue = 0
    const previousMonthlyCustomersTracked = new Set<string>()
    if (previousTimeEntries) {
      previousTimeEntries.forEach((entry) => {
        if (entry.is_billable && entry.customer) {
          const hours = entry.duration_minutes / 60
          const customerRate = entry.customer.default_rate || 0
          
          if (entry.customer.rate_type === 'monthly') {
            // For monthly customers, count the full monthly rate only once per customer per period
            const customerKey = entry.customer_id
            if (!previousMonthlyCustomersTracked.has(customerKey)) {
              previousRevenue += customerRate
              previousMonthlyCustomersTracked.add(customerKey)
            }
          } else if (entry.customer.rate_type === 'hourly') {
            // For hourly customers, calculate based on hours * rate
            previousRevenue += hours * customerRate
          }
        }
      })
    }

    // Calculate revenue trend
    const revenueTrend = {
      current: totalRevenue,
      previous: previousRevenue,
      change: totalRevenue - previousRevenue,
      changePercent: previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
    }

    // Convert maps to arrays with profitability calculations
    const hoursPerClient = Array.from(clientMap.values())
      .map(client => {
        const profit = client.revenue - client.costs
        const profitMargin = client.revenue > 0 ? (profit / client.revenue) * 100 : 0
        return {
          name: client.name,
          hours: client.minutes / 60,
          revenue: client.revenue,
          costs: client.costs,
          profit: profit,
          profitMargin: profitMargin,
          kilometers: client.kilometers
        }
      })
      .sort((a, b) => b.profit - a.profit)

    // Create complete time series with all dates/months
    let timeSeriesData: { 
      label: string; 
      date: string; 
      billable: number; 
      nonBillable: number; 
      revenue: number; 
      costs: number; 
      profit: number 
    }[] = []
    
    if (period === 'week') {
      // Show all days in the week
      const days = eachDayOfInterval({ start: startDate, end: endDate })
      timeSeriesData = days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const hours = timeMap.get(dateKey) || { billable: 0, nonBillable: 0, revenue: 0, costs: 0 }
        const profit = hours.revenue - hours.costs
        return {
          label: format(day, 'EEE d'),
          date: dateKey,
          billable: hours.billable,
          nonBillable: hours.nonBillable,
          revenue: hours.revenue,
          costs: hours.costs,
          profit: profit
        }
      })
    } else if (period === 'month') {
      // Show all days in the month
      const days = eachDayOfInterval({ start: startDate, end: endDate })
      timeSeriesData = days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const hours = timeMap.get(dateKey) || { billable: 0, nonBillable: 0, revenue: 0, costs: 0 }
        const profit = hours.revenue - hours.costs
        return {
          label: format(day, 'd'),
          date: dateKey,
          billable: hours.billable,
          nonBillable: hours.nonBillable,
          revenue: hours.revenue,
          costs: hours.costs,
          profit: profit
        }
      })
    } else {
      // Show all months in the year (Jan-Dec)
      const months = eachMonthOfInterval({ start: startDate, end: endDate })
      timeSeriesData = months.map(month => {
        const monthKey = format(month, 'yyyy-MM')
        const hours = timeMap.get(monthKey) || { billable: 0, nonBillable: 0, revenue: 0, costs: 0 }
        const profit = hours.revenue - hours.costs
        return {
          label: format(month, 'MMM'),
          date: monthKey,
          billable: hours.billable,
          nonBillable: hours.nonBillable,
          revenue: hours.revenue,
          costs: hours.costs,
          profit: profit
        }
      })
    }
    
    const grouping = period === 'week' ? 'daily' : period === 'month' ? 'daily' : 'monthly'

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      nonBillableHours: Math.round(nonBillableHours * 100) / 100,
      revenue: Math.round(totalRevenue * 100) / 100,
      costs: Math.round(costs * 100) / 100,
      ebitda: Math.round(ebitda * 100) / 100,
      ebitdaMargin: Math.round(ebitdaMargin * 100) / 100,
      activeClients: clientMap.size,
      totalKilometers: Math.round(totalKilometers * 10) / 10,
      hoursPerClient,
      timeSeriesData,
      grouping,
      revenueTrend
    }
  }
}

function getEmptyAnalytics(): AnalyticsData {
  return {
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    revenue: 0,
    costs: 0,
    ebitda: 0,
    ebitdaMargin: 0,
    activeClients: 0,
    totalKilometers: 0,
    hoursPerClient: [],
    timeSeriesData: [],
    grouping: 'daily',
    revenueTrend: {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0
    }
  }
}