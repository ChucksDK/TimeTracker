import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf } from '@react-pdf/renderer'
import { format } from 'date-fns'
import type { Invoice, Profile } from '@/types'

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  // Header with blue background
  headerSection: {
    backgroundColor: '#1e40af',
    padding: 20,
    marginBottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  companyDetails: {
    fontSize: 11,
    color: '#dbeafe',
    lineHeight: 1.4,
  },
  invoiceTitle: {
    textAlign: 'right',
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#dbeafe',
    fontWeight: 'bold',
  },
  // Invoice details section
  detailsSection: {
    backgroundColor: '#f8fafc',
    padding: 30,
    marginBottom: 0,
  },
  detailsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billToSection: {
    flex: 1,
    marginRight: 30,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billToContent: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 1.5,
  },
  billToName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  invoiceDetailsSection: {
    flex: 1,
  },
  invoiceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 11,
    color: '#111827',
    fontWeight: 'bold',
  },
  // Main content
  mainContent: {
    padding: 30,
    paddingTop: 20,
    paddingBottom: 20,
  },
  // Table styles
  table: {
    marginBottom: 25,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    padding: 12,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottom: '1 solid #e5e7eb',
  },
  tableRowAlternate: {
    flexDirection: 'row',
    padding: 12,
    borderBottom: '1 solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.4,
  },
  descriptionColumn: {
    flex: 3,
  },
  qtyColumn: {
    flex: 1,
    textAlign: 'right',
  },
  rateColumn: {
    flex: 1.2,
    textAlign: 'right',
  },
  amountColumn: {
    flex: 1.2,
    textAlign: 'right',
  },
  // Totals section
  totalsSectionWrapper: {
    backgroundColor: '#f8fafc',
    padding: 30,
    marginTop: 0,
  },
  totalsSection: {
    alignItems: 'flex-end',
  },
  totalsContainer: {
    width: 250,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
    border: '1 solid #e5e7eb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTop: '2 solid #1e40af',
    marginTop: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    marginHorizontal: -10,
  },
  totalLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 11,
    color: '#374151',
    fontWeight: 'bold',
  },
  totalLabelFinal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  totalValueFinal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    backgroundColor: '#1e40af',
    padding: 15,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#dbeafe',
  },
})

interface InvoicePDFProps {
  invoice: Invoice
  profile: Profile
  currency: string
}

const formatCurrencyForPDF = (amount: number, currency: string = 'USD') => {
  const currencySymbols = {
    USD: '$',
    EUR: '€',
    DKK: 'kr',
  }
  
  const symbol = currencySymbols[currency as keyof typeof currencySymbols] || '$'
  
  if (currency === 'DKK') {
    return `${amount.toFixed(2)} ${symbol}`
  }
  
  return `${symbol}${amount.toFixed(2)}`
}

const InvoicePDF = ({ invoice, profile, currency }: InvoicePDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header Section - Blue background */}
      <View style={styles.headerSection}>
        <View style={styles.headerContent}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>
              {profile.company_name || 'Your Company'}
            </Text>
            <View style={styles.companyDetails}>
              {profile.business_address && (
                <Text>{profile.business_address}</Text>
              )}
              {profile.business_phone && (
                <Text>{profile.business_phone}</Text>
              )}
              {profile.business_email && (
                <Text>{profile.business_email}</Text>
              )}
              {profile.business_vat_number && (
                <Text>VAT: {profile.business_vat_number}</Text>
              )}
              {!profile.business_email && (
                <Text>{profile.email}</Text>
              )}
            </View>
          </View>
          <View style={styles.invoiceTitle}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          </View>
        </View>
      </View>

      {/* Details Section - Light grey background */}
      <View style={styles.detailsSection}>
        <View style={styles.detailsContent}>
          <View style={styles.billToSection}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <View style={styles.billToContent}>
              <Text style={styles.billToName}>{invoice.customer?.company_name}</Text>
              {invoice.customer?.contact_person && (
                <Text>{invoice.customer.contact_person}</Text>
              )}
              {invoice.customer?.email && (
                <Text>{invoice.customer.email}</Text>
              )}
              {invoice.customer?.billing_address && (
                <Text>{invoice.customer.billing_address}</Text>
              )}
            </View>
          </View>
          <View style={styles.invoiceDetailsSection}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.invoiceDetailRow}>
              <Text style={styles.detailLabel}>Issue Date:</Text>
              <Text style={styles.detailValue}>{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</Text>
            </View>
            <View style={styles.invoiceDetailRow}>
              <Text style={styles.detailLabel}>Due Date:</Text>
              <Text style={styles.detailValue}>{format(new Date(invoice.due_date), 'MMM d, yyyy')}</Text>
            </View>
            <View style={styles.invoiceDetailRow}>
              <Text style={styles.detailLabel}>Payment Terms:</Text>
              <Text style={styles.detailValue}>{invoice.customer?.payment_terms || 14} days</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content - Line Items */}
      <View style={styles.mainContent}>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.descriptionColumn]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.qtyColumn]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.rateColumn]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, styles.amountColumn]}>Amount</Text>
          </View>
          {invoice.invoice_line_items?.map((item, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
              <Text style={[styles.tableCell, styles.descriptionColumn]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.qtyColumn]}>{item.quantity.toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.rateColumn]}>
                {formatCurrencyForPDF(item.rate, currency)}
              </Text>
              <Text style={[styles.tableCell, styles.amountColumn]}>
                {formatCurrencyForPDF(item.amount, currency)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Totals Section - Light grey background */}
      <View style={styles.totalsSectionWrapper}>
        <View style={styles.totalsSection}>
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>
                {formatCurrencyForPDF(invoice.subtotal, currency)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT ({invoice.vat_percentage}%):</Text>
              <Text style={styles.totalValue}>
                {formatCurrencyForPDF(invoice.vat_amount, currency)}
              </Text>
            </View>
            <View style={styles.totalRowFinal}>
              <Text style={styles.totalLabelFinal}>Total Amount Due:</Text>
              <Text style={styles.totalValueFinal}>
                {formatCurrencyForPDF(invoice.total_amount, currency)}
              </Text>
            </View>
          </View>
        </View>
      </View>


      {/* Footer - Blue background */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Generated on {format(new Date(), 'MMMM d, yyyy')} • Thank you for your business!
        </Text>
      </View>
    </Page>
  </Document>
)

export default InvoicePDF

export const InvoicePDFDownloadButton = ({ invoice, profile, currency, children }: InvoicePDFProps & { children: React.ReactNode }) => (
  <PDFDownloadLink
    document={<InvoicePDF invoice={invoice} profile={profile} currency={currency} />}
    fileName={`invoice-${invoice.invoice_number}.pdf`}
  >
    {children}
  </PDFDownloadLink>
)

// Function to generate PDF as Buffer for email attachments
export const generateInvoicePDF = async (invoice: Invoice, profile: Profile, currency: string): Promise<Buffer> => {
  const doc = <InvoicePDF invoice={invoice} profile={profile} currency={currency} />
  const asPdf = pdf(doc)
  const blob = await asPdf.toBlob()
  
  // Convert blob to buffer
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}