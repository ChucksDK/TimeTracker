import { supabase } from './supabase'
import type { Database } from './supabase'

type Customer = Database['public']['Tables']['customers']['Row']
type TimeEntry = Database['public']['Tables']['time_entries']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type Agreement = Database['public']['Tables']['agreements']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

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
        customer:customers(*),
        task:tasks(*)
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
        customer:customers(*),
        task:tasks(*)
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
        customer:customers(*),
        task:tasks(*)
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

// Invoice operations
export const invoiceService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        invoice_line_items(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        invoice_line_items(*)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async create(invoice: Database['public']['Tables']['invoices']['Insert']) {
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoice)
      .select(`
        *,
        customer:customers(*)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Database['public']['Tables']['invoices']['Update']) {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
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
      .from('invoices')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async addLineItem(lineItem: Database['public']['Tables']['invoice_line_items']['Insert']) {
    const { data, error } = await supabase
      .from('invoice_line_items')
      .insert(lineItem)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async generateInvoiceNumber(userId: string): Promise<string> {
    // Get the latest invoice for this user
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    
    // Generate new invoice number
    const currentYear = new Date().getFullYear()
    let nextNumber = 1
    
    if (data?.invoice_number) {
      const match = data.invoice_number.match(/INV-(\d{4})-(\d+)/)
      if (match && parseInt(match[1]) === currentYear) {
        nextNumber = parseInt(match[2]) + 1
      }
    }
    
    return `INV-${currentYear}-${nextNumber.toString().padStart(3, '0')}`
  }
}

// Agreement operations
export const agreementService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('agreements')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getByCustomer(userId: string, customerId: string) {
    const { data, error } = await supabase
      .from('agreements')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('user_id', userId)
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('agreements')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async create(agreement: Database['public']['Tables']['agreements']['Insert']) {
    const { data, error } = await supabase
      .from('agreements')
      .insert(agreement)
      .select(`
        *,
        customer:customers(*)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, agreement: Database['public']['Tables']['agreements']['Update']) {
    const { data, error } = await supabase
      .from('agreements')
      .update(agreement)
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
      .from('agreements')
      .update({ is_active: false })
      .eq('id', id)
    
    if (error) throw error
  }
}

// Task operations
export const taskService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    return data
  },

  async getByCustomer(userId: string, customerId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    return data
  },

  async create(task: Database['public']['Tables']['tasks']['Insert']) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, task: Database['public']['Tables']['tasks']['Update']) {
    const { data, error } = await supabase
      .from('tasks')
      .update(task)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('tasks')
      .update({ is_active: false })
      .eq('id', id)
    
    if (error) throw error
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