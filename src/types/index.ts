export interface Customer {
  id: string
  user_id: string
  company_name: string
  contact_person?: string
  email?: string
  phone?: string
  billing_address?: string
  vat_number?: string
  default_rate?: number
  rate_type: 'hourly' | 'monthly'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: string
  user_id: string
  customer_id: string
  agreement_id?: string
  task_description: string
  start_time: string
  end_time: string
  duration_minutes: number
  is_billable: boolean
  is_invoiced: boolean
  invoice_id?: string
  created_at: string
  updated_at: string
  customer?: Customer
}

export interface Profile {
  id: string
  email: string
  company_name?: string
  internal_hourly_rate?: number
  company_details?: any
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