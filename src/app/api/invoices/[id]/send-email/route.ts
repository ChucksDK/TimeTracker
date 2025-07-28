import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { invoiceService } from '@/lib/database'
import { emailService } from '@/lib/email'
import { generateInvoicePDF } from '@/lib/invoicePDF'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // Get request body with custom email content
    const body = await request.json()
    const { subject: customSubject, body: customBody } = body || {}
    
    // Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('User authenticated:', user.email, 'Invoice ID:', id)

    // First, let's check if the invoice exists at all
    const { data: invoiceCheck, error: checkError } = await supabaseClient
      .from('invoices')
      .select('id, user_id')
      .eq('id', id)
      .single()
    
    console.log('Invoice check result:', { invoiceCheck, checkError })

    // Get invoice with customer data using the authenticated client
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        invoice_line_items(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    console.log('Full invoice query result:', { invoice: !!invoice, invoiceError })

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceError)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get user profile using the authenticated client
    console.log('Querying profile for user ID:', user.id)
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('Profile query result:', { profile: !!profile, profileError })

    if (profileError || !profile) {
      console.error('Profile not found:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if customer has email
    console.log('Checking customer email:', invoice.customer?.email)
    if (!invoice.customer?.email) {
      return NextResponse.json({ 
        error: 'Customer email is required to send invoice' 
      }, { status: 400 })
    }

    console.log('Generating PDF...')
    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice, profile, profile.currency || 'USD')
    console.log('PDF generated successfully, size:', pdfBuffer.length)

    console.log('Sending email...')
    // Send email
    const emailResult = await emailService.sendInvoice({
      invoice,
      profile,
      customer: invoice.customer,
      pdfBuffer,
      customSubject,
      customBody
    })
    console.log('Email sent successfully:', emailResult.data?.id)

    console.log('Updating invoice status...')
    // Update invoice status to 'sent' if it was 'draft'
    if (invoice.status === 'draft') {
      const { error: updateError } = await supabaseClient
        .from('invoices')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id)
        .eq('user_id', user.id)
      
      if (updateError) {
        console.error('Failed to update invoice status:', updateError)
        // Don't fail the entire request since email was sent successfully
      }
    }
    console.log('Invoice status updated')

    // TODO: Track email in database (future enhancement)
    // This would require creating an invoice_emails table

    return NextResponse.json({ 
      success: true, 
      emailId: emailResult.data?.id,
      message: 'Invoice sent successfully'
    })
  } catch (error) {
    console.error('Error sending invoice email:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to send invoice'
    }, { status: 500 })
  }
}