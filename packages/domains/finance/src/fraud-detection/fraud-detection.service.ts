import * as crypto from 'crypto';
import { prisma } from '@workspace/db';

export class FraudDetectionService {
  /**
   * Generate a unique fingerprint for a document to detect duplicates.
   */
  static generateFingerprint(data: any): string {
    const { partyId, date, amount, refNumber } = data;
    
    let dateStr = 'no-date';
    try {
      const d = date ? new Date(date) : new Date();
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('[FraudDetection] Invalid date during fingerprinting:', date);
    }

    const amt = typeof amount === 'number' ? amount : 0;
    const raw = `${partyId || 'no-party'}|${dateStr}|${amt.toFixed(2)}|${refNumber ? refNumber.trim().toLowerCase() : ''}`;
    return crypto.createHash('md5').update(raw).digest('hex');
  }

  /**
   * Calculate risk score and generate notes for a financial document.
   */
  static async calculateRisk(doc: any, type: 'invoice' | 'bill'): Promise<{ score: number, notes: string[], fingerprint: string }> {
    let score = 0;
    const notes: string[] = [];

    const amount = doc.amount !== undefined ? doc.amount : doc.totalAmount;
    const date = doc.date || doc.issueDate || doc.createdAt;
    const refNumber = type === 'invoice' ? doc.invoiceNumber : doc.billNumber;
    const partyId = type === 'invoice' ? doc.clientId : doc.vendorId;

    if (amount === undefined) {
      console.error('FraudDetection: Amount is undefined for doc', doc.id);
    }

    // 1. Check for Duplicate Fingerprint
    const fingerprint = this.generateFingerprint({
      partyId,
      date,
      amount: amount || 0,
      refNumber
    });

    const existing = type === 'invoice' 
      ? await prisma.invoice.findFirst({ where: { companyId: doc.companyId, fingerprint, NOT: { id: doc.id } } })
      : null; // VendorBill isn't in the schema dump, skipping for 'bill' unless added later

    if (existing) {
      score += 80;
      notes.push('POTENTIAL DUPLICATE: Identical details found in another document.');
    }

    // 2. High Amount Variance
    if (type === 'invoice' && partyId) {
      const historyDocs = await prisma.invoice.findMany({
        where: {
          companyId: doc.companyId,
          clientId: partyId,
          status: { in: ['paid', 'sent'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (historyDocs.length > 3) {
        const historyAmounts = historyDocs.map((d: any) => d.totalAmount || 0);
        const avgAmount = historyAmounts.reduce((sum: number, a: number) => sum + a, 0) / historyAmounts.length;
        if (amount > avgAmount * 2.5) {
          score += 30;
          notes.push(`HIGH VARIANCE: Amount is 2.5x higher than the last ${historyDocs.length} transactions.`);
        }
      }
    }

    // 3. New Vendor/Client Risk
    if (type === 'invoice' && partyId) {
      const party = await prisma.client.findFirst({ where: { id: partyId, companyId: doc.companyId } });
      if (party && !(party as any).createdAt) {
         // Field missing in schema, skipped check for now.
      }
    }

    // 4. Round Amount Risk
    if (amount > 1000 && amount % 500 === 0) {
      score += 10;
      notes.push('ROUND AMOUNT: Large round figures are statistically more likely to be estimates or suspicious.');
    }

    return { score: Math.min(score, 100), notes, fingerprint };
  }
}
