import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          company_name: string | null
          internal_hourly_rate: number | null
          company_details: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          company_name?: string | null
          internal_hourly_rate?: number | null
          company_details?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          company_name?: string | null
          internal_hourly_rate?: number | null
          company_details?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          user_id: string
          company_name: string
          contact_person: string | null
          email: string | null
          phone: string | null
          billing_address: string | null
          vat_number: string | null
          default_rate: number | null
          rate_type: 'hourly' | 'monthly'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          billing_address?: string | null
          vat_number?: string | null
          default_rate?: number | null
          rate_type?: 'hourly' | 'monthly'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          billing_address?: string | null
          vat_number?: string | null
          default_rate?: number | null
          rate_type?: 'hourly' | 'monthly'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      agreements: {
        Row: {
          id: string
          customer_id: string
          user_id: string
          name: string
          description: string | null
          contract_type: 'hourly' | 'monthly'
          rate: number
          start_date: string
          end_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          user_id: string
          name: string
          description?: string | null
          contract_type?: 'hourly' | 'monthly'
          rate: number
          start_date: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          user_id?: string
          name?: string
          description?: string | null
          contract_type?: 'hourly' | 'monthly'
          rate?: number
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          user_id: string
          customer_id: string
          agreement_id: string | null
          task_description: string
          start_time: string
          end_time: string
          duration_minutes: number
          is_billable: boolean
          is_invoiced: boolean
          invoice_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id: string
          agreement_id?: string | null
          task_description: string
          start_time: string
          end_time: string
          duration_minutes: number
          is_billable?: boolean
          is_invoiced?: boolean
          invoice_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string
          agreement_id?: string | null
          task_description?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number
          is_billable?: boolean
          is_invoiced?: boolean
          invoice_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          customer_id: string
          invoice_number: string
          invoice_date: string
          due_date: string
          subtotal: number
          vat_percentage: number | null
          vat_amount: number | null
          total_amount: number
          status: 'draft' | 'sent' | 'paid' | 'cancelled'
          sent_at: string | null
          paid_at: string | null
          email_status: string | null
          pdf_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id: string
          invoice_number: string
          invoice_date: string
          due_date: string
          subtotal?: number
          vat_percentage?: number | null
          vat_amount?: number | null
          total_amount?: number
          status?: 'draft' | 'sent' | 'paid' | 'cancelled'
          sent_at?: string | null
          paid_at?: string | null
          email_status?: string | null
          pdf_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string
          invoice_number?: string
          invoice_date?: string
          due_date?: string
          subtotal?: number
          vat_percentage?: number | null
          vat_amount?: number | null
          total_amount?: number
          status?: 'draft' | 'sent' | 'paid' | 'cancelled'
          sent_at?: string | null
          paid_at?: string | null
          email_status?: string | null
          pdf_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          rate: number
          amount: number
          time_entry_ids: string[]
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          rate: number
          amount: number
          time_entry_ids?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          rate?: number
          amount?: number
          time_entry_ids?: string[]
          created_at?: string
        }
      }
    }
  }
}