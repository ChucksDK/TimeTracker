'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import type { Invoice, Profile, Customer } from '@/types'

interface InvoiceEmailModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: Invoice
  profile: Profile
  customer: Customer
  onSend: (emailContent: { subject: string; body: string }) => Promise<void>
}

export function InvoiceEmailModal({ isOpen, onClose, invoice, profile, customer, onSend }: InvoiceEmailModalProps) {
  const defaultSubject = `Invoice ${invoice.invoice_number} from ${profile.company_name || 'Your Company'}`
  
  const defaultBody = `Dear ${customer.contact_person || customer.company_name},

Please find attached your invoice for services rendered.

Invoice Details:
- Invoice Number: ${invoice.invoice_number}
- Invoice Date: ${format(new Date(invoice.invoice_date), 'MMMM d, yyyy')}
- Due Date: ${format(new Date(invoice.due_date), 'MMMM d, yyyy')}
- Amount Due: ${invoice.total_amount.toLocaleString('en-US', { style: 'currency', currency: profile.currency || 'USD' })}

${invoice.notes ? `Notes: ${invoice.notes}\n\n` : ''}If you have any questions about this invoice, please don't hesitate to contact me.

Thank you for your business!

Best regards,
${profile.company_name || 'Your Company'}
${profile.business_email || profile.email}`

  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [isSending, setIsSending] = useState(false)

  if (!isOpen) return null

  const handleSend = async () => {
    setIsSending(true)
    try {
      await onSend({ subject, body })
      onClose()
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Send Invoice Email</h3>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">To:</label>
            <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-900">
              <div className="font-medium">{customer.company_name}</div>
              <div className="text-sm text-gray-600 mt-1">
                {customer.email && <div>• {customer.email}</div>}
                {customer.additional_emails?.map((email, index) => (
                  <div key={index}>• {email}</div>
                ))}
                {!customer.email && (!customer.additional_emails || customer.additional_emails.length === 0) && (
                  <div className="text-red-600">No email addresses configured</div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject:
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
              Message:
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium">Attachment:</p>
                <p>invoice-{invoice.invoice_number}.pdf</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !subject || !body}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  )
}