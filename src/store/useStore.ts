import { create } from 'zustand'
import { Customer, TimeEntry } from '@/types'

interface AppState {
  customers: Customer[]
  timeEntries: TimeEntry[]
  selectedWeek: Date
  dragStart: { date: string; hour: number } | null
  dragEnd: { date: string; hour: number } | null
  isDragging: boolean
  showEntryForm: boolean
  editingEntry: TimeEntry | null
  
  // Actions
  setCustomers: (customers: Customer[]) => void
  setTimeEntries: (timeEntries: TimeEntry[]) => void
  setSelectedWeek: (date: Date) => void
  setDragStart: (drag: { date: string; hour: number } | null) => void
  setDragEnd: (drag: { date: string; hour: number } | null) => void
  setIsDragging: (isDragging: boolean) => void
  setShowEntryForm: (show: boolean) => void
  setEditingEntry: (entry: TimeEntry | null) => void
  addCustomer: (customer: Customer) => void
  addTimeEntry: (entry: TimeEntry) => void
  updateTimeEntry: (id: string, entry: Partial<TimeEntry>) => void
  deleteTimeEntry: (id: string) => void
}

export const useStore = create<AppState>((set) => ({
  customers: [],
  timeEntries: [],
  selectedWeek: new Date(),
  dragStart: null,
  dragEnd: null,
  isDragging: false,
  showEntryForm: false,
  editingEntry: null,
  
  setCustomers: (customers) => set({ customers }),
  setTimeEntries: (timeEntries) => set({ timeEntries }),
  setSelectedWeek: (selectedWeek) => set({ selectedWeek }),
  setDragStart: (dragStart) => set({ dragStart }),
  setDragEnd: (dragEnd) => set({ dragEnd }),
  setIsDragging: (isDragging) => set({ isDragging }),
  setShowEntryForm: (showEntryForm) => set({ showEntryForm }),
  setEditingEntry: (editingEntry) => set({ editingEntry }),
  
  addCustomer: (customer) =>
    set((state) => ({ customers: [...state.customers, customer] })),
  
  addTimeEntry: (entry) =>
    set((state) => ({ timeEntries: [...state.timeEntries, entry] })),
  
  updateTimeEntry: (id, updatedEntry) =>
    set((state) => ({
      timeEntries: state.timeEntries.map((entry) =>
        entry.id === id ? { ...entry, ...updatedEntry } : entry
      ),
    })),
  
  deleteTimeEntry: (id) =>
    set((state) => ({
      timeEntries: state.timeEntries.filter((entry) => entry.id !== id),
    })),
}))