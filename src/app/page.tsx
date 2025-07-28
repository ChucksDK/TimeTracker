'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useAuth } from '@/components/AuthProvider'
import { Header } from '@/components/Header'
import { Calendar } from '@/components/Calendar'
import { TimeEntryForm } from '@/components/TimeEntryForm'
import { customerService, timeEntryService } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import { startOfWeek, endOfWeek } from 'date-fns'

export default function Home() {
  const { setCustomers, setTimeEntries, selectedWeek, customers } = useStore()
  const { user, loading } = useAuth()
  const [dataLoading, setDataLoading] = useState(true)

  console.log('Home component rendered - user:', !!user, 'loading:', loading, 'dataLoading:', dataLoading)

  // Load customers once when user is available
  useEffect(() => {
    const loadCustomers = async () => {
      if (!user || customers.length > 0) return
      
      try {
        console.log('Loading customers for user:', user.id)
        console.log('User object:', user)
        
        // Test Supabase connection first
        const { data: testData, error: testError } = await supabase
          .from('customers')
          .select('id')
          .limit(1)
        
        console.log('Supabase test query result:', { testData, testError })
        
        const customersData = await customerService.getAll(user.id)
        console.log('Customers loaded:', customersData)
        setCustomers(customersData)
      } catch (error) {
        console.error('Failed to load customers:', error)
      }
    }

    if (!loading && user) {
      console.log('Auth state - loading:', loading, 'user:', !!user)
      loadCustomers()
    }
  }, [user, loading, customers.length, setCustomers])

  // Load time entries when week changes
  useEffect(() => {
    const loadTimeEntries = async () => {
      if (!user) return
      
      try {
        console.log('Loading time entries for user:', user.id)
        setDataLoading(true)
        
        const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })
        
        const timeEntries = await timeEntryService.getAll(
          user.id,
          weekStart.toISOString(),
          weekEnd.toISOString()
        )
        console.log('Time entries loaded:', timeEntries)
        setTimeEntries(timeEntries)
        
      } catch (error) {
        console.error('Failed to load time entries:', error)
      } finally {
        console.log('Setting dataLoading to false')
        setDataLoading(false)
      }
    }

    if (!loading && user) {
      loadTimeEntries()
    }
  }, [user, loading, selectedWeek, setTimeEntries])

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
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Calendar />
      </main>
      
      <TimeEntryForm />
    </div>
  )
}
