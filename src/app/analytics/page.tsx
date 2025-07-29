'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { analyticsService, AnalyticsData, TimePeriod } from '@/lib/analytics'
import { profileService } from '@/lib/database'
import { formatCurrency, Currency } from '@/lib/currency'
import { format } from 'date-fns'
import { Header } from '@/components/Header'
import {
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'

const KPICard = ({ title, value, subtitle, trend, currency, className = '' }: {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  currency?: Currency
  className?: string
}) => {
  const getTrendColor = () => {
    if (!trend) return ''
    return trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <p className="text-2xl font-semibold text-gray-900">
        {currency && typeof value === 'number' ? formatCurrency(value, currency) : value}
      </p>
      {subtitle && (
        <p className={`text-sm mt-1 ${getTrendColor()}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [period, setPeriod] = useState<TimePeriod>('month')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [error, setError] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  useEffect(() => {
    if (user) {
      loadAnalytics()
      loadUserCurrency()
    }
  }, [user, period])

  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        loadAnalytics()
        loadUserCurrency()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user])

  const loadUserCurrency = async () => {
    if (!user) return
    try {
      const profile = await profileService.get(user.id)
      setCurrency(profile.currency || 'USD')
    } catch (err) {
      console.error('Failed to load currency:', err)
    }
  }

  const loadAnalytics = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const data = await analyticsService.getMetrics(
        user.id, 
        period,
        period === 'custom' ? new Date(customStartDate) : undefined,
        period === 'custom' ? new Date(customEndDate) : undefined
      )
      setAnalytics(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!analytics) return

    // Prepare data for CSV
    const headers = ['Client', 'Hours', 'Revenue', 'Costs', 'Profit', 'Profit Margin', 'Transport (km)']
    const rows = analytics.hoursPerClient.map(client => [
      client.name,
      client.hours.toFixed(2),
      client.revenue.toFixed(2),
      client.costs.toFixed(2),
      client.profit.toFixed(2),
      `${client.profitMargin.toFixed(1)}%`,
      client.kilometers.toFixed(1)
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics_${period}_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleCustomDateSubmit = () => {
    if (customStartDate && customEndDate) {
      setPeriod('custom')
      setShowDatePicker(false)
      loadAnalytics()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading analytics...</div>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">{error || 'No data available'}</div>
        </div>
      </div>
    )
  }

  const billableVsNonBillable = [
    { name: 'Billable', hours: analytics.billableHours, value: analytics.billableHours },
    { name: 'Non-Billable', hours: analytics.nonBillableHours, value: analytics.nonBillableHours }
  ]

  const COLORS = ['#3B82F6', '#EF4444']

  // Prepare data for revenue/profit chart
  const revenueProfitData = analytics.timeSeriesData.map(item => ({
    ...item,
    margin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0
  }))

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 flex flex-col overflow-y-auto">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header Section */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      loadAnalytics()
                      loadUserCurrency()
                    }}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                    title="Refresh data"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  
                  <div className="relative">
                    <select
                      value={period === 'custom' ? 'custom' : period}
                      onChange={(e) => {
                        const value = e.target.value as TimePeriod
                        if (value === 'custom') {
                          setShowDatePicker(true)
                        } else {
                          setPeriod(value)
                          setShowDatePicker(false)
                        }
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                      <option value="custom">Custom Range</option>
                    </select>
                    
                    {showDatePicker && (
                      <div className="absolute right-0 mt-2 p-4 bg-white rounded-lg shadow-lg z-10 w-80">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setShowDatePicker(false)}
                              className="px-3 py-1 text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleCustomDateSubmit}
                              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards - Updated Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <KPICard
                  title="Total Revenue"
                  value={analytics.revenue}
                  currency={currency}
                  subtitle={`${analytics.revenueTrend.changePercent >= 0 ? '+' : ''}${analytics.revenueTrend.changePercent.toFixed(1)}% vs last period`}
                  trend={analytics.revenueTrend.change >= 0 ? 'up' : 'down'}
                />
                <KPICard
                  title="EBITDA"
                  value={analytics.ebitda}
                  currency={currency}
                  subtitle={`${analytics.ebitdaMargin.toFixed(1)}% margin`}
                  trend={analytics.ebitda > 0 ? 'up' : 'down'}
                />
                <KPICard
                  title="Total Hours"
                  value={analytics.totalHours}
                  subtitle={`${((analytics.billableHours / analytics.totalHours) * 100).toFixed(0)}% billable`}
                />
                <KPICard
                  title="Active Clients"
                  value={analytics.activeClients}
                  subtitle={`${formatCurrency(analytics.activeClients > 0 ? analytics.revenue / analytics.activeClients : 0, currency)} avg/client`}
                />
                <KPICard
                  title="Total Transport"
                  value={`${analytics.totalKilometers.toFixed(1)} km`}
                  subtitle={analytics.totalKilometers > 0 ? `${(analytics.totalKilometers / analytics.activeClients).toFixed(1)} km/client` : 'No driving'}
                />
              </div>

              {/* Financial Metrics Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* EBITDA Breakdown */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">EBITDA Breakdown</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Revenue</span>
                      <span className="font-semibold text-green-600">
                        +{formatCurrency(analytics.revenue, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Costs</span>
                      <span className="font-semibold text-red-600">
                        -{formatCurrency(analytics.costs, currency)}
                      </span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">EBITDA</span>
                        <span className={`text-xl font-bold ${analytics.ebitda >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(analytics.ebitda, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-500">Margin</span>
                        <span className={`text-sm font-semibold ${analytics.ebitdaMargin >= 30 ? 'text-green-600' : analytics.ebitdaMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {analytics.ebitdaMargin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hours Breakdown Pie Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Hours Breakdown</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={billableVsNonBillable}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {billableVsNonBillable.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend 
                        formatter={(value, entry) => `${value}: ${entry.payload.value.toFixed(1)}h`}
                        verticalAlign="bottom"
                        height={36}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-gray-600">Billable</span>
                      </div>
                      <span className="font-semibold">{analytics.billableHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-gray-600">Non-Billable</span>
                      </div>
                      <span className="font-semibold">{analytics.nonBillableHours.toFixed(1)}h</span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h2>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Billable Utilization</span>
                        <span className="text-sm font-semibold">
                          {analytics.totalHours > 0 ? ((analytics.billableHours / analytics.totalHours) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${analytics.totalHours > 0 ? (analytics.billableHours / analytics.totalHours) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg Hourly Revenue</span>
                        <span className="text-sm font-semibold">
                          {formatCurrency(analytics.totalHours > 0 ? analytics.revenue / analytics.totalHours : 0, currency)}/hr
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Revenue per Client</span>
                        <span className="text-sm font-semibold">
                          {formatCurrency(analytics.activeClients > 0 ? analytics.revenue / analytics.activeClients : 0, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Series Charts */}
              {analytics.timeSeriesData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Hours Trend */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {analytics.grouping === 'daily' ? 'Daily' : analytics.grouping === 'weekly' ? 'Weekly' : 'Monthly'} Hours Trend
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics.timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="billable" 
                          stroke="#3B82F6" 
                          name="Billable"
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="nonBillable" 
                          stroke="#EF4444" 
                          name="Non-Billable"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Revenue & Profit Trend */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue & Profit Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={revenueProfitData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip 
                          formatter={(value: any, name: string) => {
                            if (name === 'Margin') return `${value.toFixed(1)}%`
                            return formatCurrency(value as number, currency)
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="revenue" fill="#10B981" name="Revenue" />
                        <Bar yAxisId="left" dataKey="profit" fill="#3B82F6" name="Profit" />
                        <Line 
                          yAxisId="right" 
                          type="monotone" 
                          dataKey="margin" 
                          stroke="#F59E0B" 
                          name="Margin %" 
                          strokeWidth={2}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Client Profitability Table */}
              {analytics.hoursPerClient.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Client Profitability Analysis</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg Hourly Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Costs
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Profit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Margin
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transport
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {analytics.hoursPerClient.map((client, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {client.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {client.hours.toFixed(1)}h
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(client.revenue, currency)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {client.hours > 0 ? formatCurrency(client.revenue / client.hours, currency) : formatCurrency(0, currency)}/hr
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(client.costs, currency)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span className={client.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(client.profit, currency)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center">
                                <span className={`${client.profitMargin >= 50 ? 'text-green-600' : client.profitMargin >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {client.profitMargin.toFixed(1)}%
                                </span>
                                <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${client.profitMargin >= 50 ? 'bg-green-600' : client.profitMargin >= 20 ? 'bg-yellow-600' : 'bg-red-600'}`}
                                    style={{ width: `${Math.min(100, Math.max(0, client.profitMargin))}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {client.kilometers > 0 ? `${client.kilometers.toFixed(1)} km` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
    </div>
  )
}