'use client'

import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { prevWeek, nextWeek } from '@/lib/dateUtils'
import { format } from 'date-fns'
import { useAuth } from '@/components/AuthProvider'
import { CustomerModal } from '@/components/CustomerModal'

export const Header = () => {
  const { selectedWeek, setSelectedWeek } = useStore()
  const { user, signOut } = useAuth()
  const [showCustomerModal, setShowCustomerModal] = useState(false)

  const goToPrevWeek = () => {
    setSelectedWeek(prevWeek(selectedWeek))
  }

  const goToNextWeek = () => {
    setSelectedWeek(nextWeek(selectedWeek))
  }

  const goToToday = () => {
    setSelectedWeek(new Date())
  }

  const weekLabel = format(selectedWeek, 'MMMM yyyy')

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">Time Tracker</h1>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Today
            </button>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={goToPrevWeek}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <h2 className="text-xl font-semibold text-gray-900 min-w-[140px] text-center">
                {weekLabel}
              </h2>
              
              <button
                onClick={goToNextWeek}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowCustomerModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            New Customer
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {user?.email}
            </span>
            <button
              onClick={signOut}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
      
      <CustomerModal 
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
      />
    </header>
  )
}