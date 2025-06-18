'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useAuth } from '@/components/AuthProvider'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { Calendar } from '@/components/Calendar'
import { TimeEntryForm } from '@/components/TimeEntryForm'
import { customerService, timeEntryService } from '@/lib/database'
import { startOfWeek, endOfWeek } from 'date-fns'

export default function Home() {
  const { setCustomers, setTimeEntries, selectedWeek } = useStore()
  const { user, loading } = useAuth()
  const [dataLoading, setDataLoading] = useState(true)

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      if (!user) return
      
      try {
        setDataLoading(true)
        
        // Load customers
        const customers = await customerService.getAll(user.id)
        setCustomers(customers)
        
        // Load time entries for the current week
        const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })
        
        const timeEntries = await timeEntryService.getAll(
          user.id,
          weekStart.toISOString(),
          weekEnd.toISOString()
        )
        setTimeEntries(timeEntries)
        
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setDataLoading(false)
      }
    }

    if (!loading && user) {
      loadData()
    }
  }, [user, loading, selectedWeek, setCustomers, setTimeEntries])

  // Show loading screen while auth is loading
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading screen while data is loading
  if (dataLoading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <Calendar />
        </main>
      </div>
      
      <TimeEntryForm />
    </div>
  )
}
