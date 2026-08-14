import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Optional: Register fonts if needed
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  companyInfo: {
    flex: 1,
  },
  logo: {
    width: 100,
    height: 40,
    objectFit: 'contain',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4f46e5', // Brand color fallback
    marginBottom: 5,
  },
  companyDetails: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  invoiceTitleArea: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 32,
    fontWeight: 'heavy',
    color: '#f3f4f6',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  dateInfo: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  dateLabel: {
    color: '#9ca3af',
    marginRight: 5,
  },
  dateValue: {
    color: '#111827',
    fontWeight: 'bold',
  },
  billToSection: {
    backgroundColor: '#f9fafb',
    padding: 20,
    borderRadius: 8,
    marginBottom: 30,
    width: '50%',
  },
  billToLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 10,
    color: '#6b7280',
  },
  table: {
    width: '100%',
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 2, textAlign: 'right' },
  colTotal: { flex: 2, textAlign: 'right' },
  itemDesc: {
    fontWeight: 'bold',
    color: '#111827',
  },
  itemValue: {
    color: '#4b5563',
  },
  itemTotal: {
    fontWeight: 'bold',
    color: '#111827',
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  thankYou: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#e5e7eb',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 40,
  },
  totalsArea: {
    width: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subtotalLabel: {
    color: '#9ca3af',
  },
  subtotalValue: {
    fontWeight: 'bold',
    color: '#111827',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
    marginTop: 5,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  signatureArea: {
    marginTop: 40,
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'dashed',
    marginBottom: 8,
  },
  signatoryName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  signatoryRole: {
    fontSize: 8,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
});

interface InvoicePDFProps {
  invoice: any;
  company: any;
  platform: any;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, company, platform }) => {
  const brandColor = company?.brandColor || '#4f46e5';
  const currencySymbol = company?.currencySymbol || '$';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {company?.companyLogo ? (
              <Image src={company.companyLogo} style={styles.logo} />
            ) : (
              <Text style={{ ...styles.companyName, color: brandColor }}>
                {company?.companyName || platform?.name || platform?.platformName || 'Pitchin180'}
              </Text>
            )}
            <View style={styles.companyDetails}>
              <Text style={{ fontWeight: 'bold', color: '#111827', marginBottom: 2 }}>
                {company?.companyName || platform?.name || 'Enterprise'}
              </Text>
              <Text>{company?.address || ''}</Text>
              <Text>Email: {company?.companyEmail || platform?.email || ''}</Text>
              {company?.phoneNumber && <Text>Phone: {company.phoneNumber}</Text>}
            </View>
          </View>

          <View style={styles.invoiceTitleArea}>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
            <View style={styles.dateInfo}>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Issue Date:</Text>
                <Text style={styles.dateValue}>
                  {invoice.issueDate ? format(new Date(invoice.issueDate), 'MMM d, yyyy') : ''}
                </Text>
              </View>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Due Date:</Text>
                <Text style={styles.dateValue}>
                  {invoice.dueDate || invoice.issueDate
                    ? format(new Date(invoice.dueDate || invoice.issueDate), 'MMM d, yyyy')
                    : ''}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.billToSection}>
          <Text style={styles.billToLabel}>Bill To</Text>
          <Text style={styles.clientName}>{invoice.clientName || invoice.clientId?.name}</Text>
          <Text style={styles.clientEmail}>{invoice.clientId?.email || ''}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Quantity</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>
          {invoice.lineItems?.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.itemDesc, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.itemValue, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.itemValue, styles.colPrice]}>
                {currencySymbol}{item.unitPrice?.toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.itemTotal, styles.colTotal]}>
                {currencySymbol}{(item.quantity * item.unitPrice).toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summarySection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.thankYou}>Thank you for your business!</Text>
          </View>
          
          <View style={styles.totalsArea}>
            <View style={styles.totalRow}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalValue}>
                {currencySymbol}{invoice.subtotal?.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total Amount</Text>
              <Text style={{ ...styles.grandTotalValue, color: brandColor }}>
                {currencySymbol}{invoice.totalAmount?.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.signatureArea}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatoryName}>
                {company?.authorizedSignatory || 'Authorized Signatory'}
              </Text>
              <Text style={styles.signatoryRole}>
                {company?.designation || 'OWNER / PARTNER'}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
