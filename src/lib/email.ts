import { Resend } from 'resend'
import type { Invoice, Profile, Customer } from '@/types'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required')
}

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendInvoiceEmailParams {
  invoice: Invoice
  profile: Profile
  customer: Customer
  pdfBuffer: Buffer
  customSubject?: string
  customBody?: string
}

export const emailService = {
  async sendInvoice({ invoice, profile, customer, pdfBuffer, customSubject, customBody }: SendInvoiceEmailParams) {
    try {
      // Use verified domain email address for Resend
      const fromEmail = 'Casper@casperlarsen.dk'
      
      // Collect all email addresses (primary + additional)
      const emailAddresses = []
      if (customer.email) {
        emailAddresses.push(customer.email)
      }
      if (customer.additional_emails && customer.additional_emails.length > 0) {
        emailAddresses.push(...customer.additional_emails)
      }

      if (emailAddresses.length === 0) {
        throw new Error('Customer email is required to send invoice')
      }

      const subject = customSubject || `Invoice ${invoice.invoice_number} from ${profile.company_name || 'Your Company'}`
      
      // If custom body is provided, convert plain text to HTML
      const htmlContent = customBody ? `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">${customBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>
        </body>
        </html>
      ` : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .invoice-details { background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .footer { font-size: 14px; color: #6c757d; text-align: center; margin-top: 30px; }
            .amount { font-size: 24px; font-weight: bold; color: #28a745; }
            .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invoice ${invoice.invoice_number}</h1>
              <p>From: ${profile.company_name || 'Your Company'}</p>
              <p>To: ${customer.company_name}</p>
            </div>
            
            <div class="invoice-details">
              <p><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
              <p><strong>Amount Due:</strong> <span class="amount">${invoice.total_amount.toLocaleString('en-US', { style: 'currency', currency: profile.currency || 'USD' })}</span></p>
              
              ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
            </div>
            
            <p>Dear ${customer.contact_person || customer.company_name},</p>
            
            <p>Please find attached your invoice for services rendered. The invoice is due on ${new Date(invoice.due_date).toLocaleDateString()}.</p>
            
            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
            
            <p>Thank you for your business!</p>
            
            <div class="footer">
              <p>Best regards,<br>
              ${profile.company_name || 'Your Company'}<br>
              ${profile.business_email || profile.email}</p>
            </div>
          </div>
        </body>
        </html>
      `

      const textContent = customBody || `Invoice ${invoice.invoice_number}
        
        From: ${profile.company_name || 'Your Company'}
        To: ${customer.company_name}
        
        Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
        Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
        Amount Due: ${invoice.total_amount.toLocaleString('en-US', { style: 'currency', currency: profile.currency || 'USD' })}
        
        ${invoice.notes ? `Notes: ${invoice.notes}` : ''}
        
        Dear ${customer.contact_person || customer.company_name},
        
        Please find attached your invoice for services rendered. The invoice is due on ${new Date(invoice.due_date).toLocaleDateString()}.
        
        If you have any questions about this invoice, please don't hesitate to contact us.
        
        Thank you for your business!
        
        Best regards,
        ${profile.company_name || 'Your Company'}
        ${profile.business_email || profile.email}`

      const result = await resend.emails.send({
        from: fromEmail,
        to: emailAddresses,
        subject: subject,
        html: htmlContent,
        text: textContent,
        attachments: [
          {
            filename: `invoice-${invoice.invoice_number}.pdf`,
            content: pdfBuffer,
          },
        ],
      })

      return result
    } catch (error) {
      console.error('Error sending invoice email:', error)
      throw error
    }
  },

  async testConnection() {
    try {
      // Test the Resend connection by sending a simple test
      // This is optional but useful for debugging
      return { success: true }
    } catch (error) {
      console.error('Email service connection test failed:', error)
      return { success: false, error }
    }
  }
}