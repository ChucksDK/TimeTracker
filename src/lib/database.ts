import { supabase } from './supabase'
import type { Database } from './supabase'

type Customer = Database['public']['Tables']['customers']['Row']
type TimeEntry = Database['public']['Tables']['time_entries']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

// Customer operations
export const customerService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('company_name')
    
    if (error) throw error
    return data
  },

  async create(customer: Database['public']['Tables']['customers']['Insert']) {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, customer: Database['public']['Tables']['customers']['Update']) {
    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('customers')
      .update({ is_active: false })
      .eq('id', id)
    
    if (error) throw error
  }
}

// Time entry operations
export const timeEntryService = {
  async getAll(userId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: false })

    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    const { data, error } = await query
    
    if (error) throw error
    return data
  },

  async create(timeEntry: Database['public']['Tables']['time_entries']['Insert']) {
    const { data, error } = await supabase
      .from('time_entries')
      .insert(timeEntry)
      .select(`
        *,
        customer:customers(*)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, timeEntry: Database['public']['Tables']['time_entries']['Update']) {
    const { data, error } = await supabase
      .from('time_entries')
      .update(timeEntry)
      .eq('id', id)
      .select(`
        *,
        customer:customers(*)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Profile operations
export const profileService = {
  async get(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  async create(profile: Database['public']['Tables']['profiles']['Insert']) {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(userId: string, profile: Database['public']['Tables']['profiles']['Update']) {
    const { data, error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// Error handling helper
export function handleDatabaseError(error: any) {
  console.error('Database error:', error)
  
  if (error.code === 'PGRST116') {
    throw new Error('Record not found')
  }
  
  if (error.code === '23505') {
    throw new Error('This record already exists')
  }
  
  if (error.code === '42P01') {
    throw new Error('Database error. Please contact support.')
  }
  
  throw new Error(error.message || 'An unexpected error occurred')
}