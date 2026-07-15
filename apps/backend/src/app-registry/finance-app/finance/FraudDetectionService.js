'use strict';
const crypto = require('crypto');

class FraudDetectionService {
    /**
     * Generate a unique fingerprint for a document to detect duplicates.
     * @param {Object} data - Document data (vendorId/clientId, date, amount, referenceNumber)
     */
    static generateFingerprint(data) {
        const { partyId, date, amount, refNumber } = data;
        
        // Safe Date Handling
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
     * @param {Object} doc - The document (Invoice or VendorBill)
     * @param {Object} prisma - Prisma client instance
     * @param {String} type - 'invoice' or 'bill'
     */
    static async calculateRisk(doc, prisma, type) {
        let score = 0;
        const notes = [];

        // Normalize fields for both Invoice and VendorBill
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

        const model = type === 'invoice' ? prisma.invoice : prisma.vendorBill;
        const existing = await model.findFirst({
            where: {
                fingerprint,
                NOT: { id: doc.id }
            }
        });

        if (existing) {
            score += 80;
            notes.push('POTENTIAL DUPLICATE: Identical details found in another document.');
        }

        // 2. High Amount Variance
        const partyField = type === 'invoice' ? 'clientId' : 'vendorId';
        const historyDocs = await model.findMany({
            where: {
                companyId: doc.companyId,
                [partyField]: partyId,
                status: { in: ['paid', 'approved', 'sent'] }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        if (historyDocs.length > 3) {
            const historyAmounts = historyDocs.map(d => d.amount !== undefined ? d.amount : d.totalAmount);
            const avgAmount = historyAmounts.reduce((sum, a) => sum + (a || 0), 0) / historyAmounts.length;
            if (amount > avgAmount * 2.5) {
                score += 30;
                notes.push(`HIGH VARIANCE: Amount is 2.5x higher than the last ${historyDocs.length} transactions.`);
            }
        }

        // 3. New Vendor/Client Risk
        const partyModel = type === 'invoice' ? prisma.client : prisma.vendor;
        if (partyId) {
            const party = await partyModel.findUnique({ where: { id: partyId } });
            if (party && (Date.now() - new Date(party.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000) {
                score += 20;
                notes.push('NEW ENTITY: This vendor/client was created in the last 7 days.');
            }
        }

        // 4. Round Amount Risk (Common in fraudulent expenses)
        if (amount > 1000 && amount % 500 === 0) {
            score += 10;
            notes.push('ROUND AMOUNT: Large round figures are statistically more likely to be estimates or suspicious.');
        }

        return { score: Math.min(score, 100), notes, fingerprint };
    }
}

module.exports = FraudDetectionService;
