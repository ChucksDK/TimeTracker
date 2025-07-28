export interface Customer {
  id: string
  user_id: string
  company_name: string
  contact_person?: string
  email?: string
  additional_emails?: string[]
  phone?: string
  billing_address?: string
  vat_number?: string
  default_rate?: number
  rate_type: 'hourly' | 'monthly'
  payment_terms?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Agreement {
  id: string
  customer_id: string
  user_id: string
  name: string
  description?: string
  contract_type: 'hourly' | 'monthly'
  rate: number
  start_date: string
  end_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
  customer?: Customer
}

export interface Task {
  id: string
  customer_id: string
  user_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: string
  user_id: string
  customer_id: string
  agreement_id?: string
  task_id?: string
  subtask?: string
  task_description: string
  start_time: string
  end_time: string
  duration_minutes: number
  is_billable: boolean
  is_invoiced: boolean
  invoice_id?: string
  drive_required: boolean
  kilometers?: number
  created_at: string
  updated_at: string
  customer?: Customer
  agreement?: Agreement
  task?: Task
}

export interface Profile {
  id: string
  email: string
  company_name?: string
  internal_hourly_rate?: number
  currency?: 'USD' | 'EUR' | 'DKK'
  company_details?: any
  business_address?: string
  business_phone?: string
  business_vat_number?: string
  business_email?: string
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  customer: Customer
  is_billable: boolean
  description?: string
}

export interface Invoice {
  id: string
  user_id: string
  customer_id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  subtotal: number
  vat_percentage: number
  vat_amount: number
  total_amount: number
  notes?: string
  created_at: string
  updated_at: string
  customer?: Customer
  invoice_line_items?: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  rate: number
  amount: number
  time_entry_ids?: string[]
  created_at: string
}