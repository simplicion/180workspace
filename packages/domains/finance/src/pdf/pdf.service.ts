import { prisma } from '@workspace/db';
// @ts-ignore
const PDFDocument = require('pdfkit');

export class PDFService {
    /**
     * Generates a premium branded invoice PDF.
     */
    static async generateInvoicePDF(invoice: any, company: any): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ 
                margin: 50,
                size: 'A4',
                bufferPages: true 
            });
            let buffers: any[] = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                let pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            doc.on('error', reject);

            const indigo = '#4f46e5';
            const darkText = '#1f2937';
            const lightText = '#6b7280';
            const borderColor = '#e5e7eb';
            const lightBg = '#f9fafb';

            // --- Header: Branded Identity ---
            doc.fillColor(indigo)
                .font('Helvetica-Bold')
                .fontSize(28)
                .text(company.companyName, 50, 45);

            doc.fillColor(lightText)
                .font('Helvetica')
                .fontSize(10)
                .text(company.address || '', 50, 80)
                .text(`Email: ${company.companyEmail}`, 50, 95)
                .text(`Phone: ${company.phoneNumber || ''}`, 50, 110);

            // --- Top Right: Invoice Metadata ---
            doc.fillColor('#e5e7eb')
                .font('Helvetica-Bold')
                .fontSize(40)
                .text('INVOICE', 350, 45, { align: 'right', width: 200 });

            doc.fillColor(darkText)
                .font('Helvetica-Bold')
                .fontSize(14)
                .text(`#${invoice.invoiceNumber}`, 350, 95, { align: 'right', width: 200 });

            doc.fillColor(lightText)
                .font('Helvetica')
                .fontSize(10)
                .text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 350, 115, { align: 'right', width: 200 })
                .text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon Receipt'}`, 350, 130, { align: 'right', width: 200 });

            // Paid Badge
            if (invoice.status === 'paid') {
                doc.rect(500, 150, 50, 18).fill('#ecfdf5');
                doc.fillColor('#059669').font('Helvetica-Bold').fontSize(8).text('PAID', 500, 155, { align: 'center', width: 50 });
            }

            // --- Bill To Section in a Box ---
            doc.roundedRect(50, 180, 250, 100, 8).fill(lightBg);
            doc.fillColor(lightText).font('Helvetica-Bold').fontSize(8).text('BILL TO', 65, 195);
            doc.fillColor(darkText).font('Helvetica-Bold').fontSize(16).text(invoice.clientName || 'N/A', 65, 210);
            doc.fillColor(lightText).font('Helvetica').fontSize(10).text(invoice.clientEmail || '', 65, 235);

            // --- Items Table ---
            const tableTop = 320;
            
            // Table Header Background
            doc.rect(50, tableTop, 500, 25).fill(lightBg);
            
            doc.fillColor(lightText).font('Helvetica-Bold').fontSize(9);
            doc.text('DESCRIPTION', 65, tableTop + 8);
            doc.text('QUANTITY', 300, tableTop + 8, { width: 60, align: 'center' });
            doc.text('UNIT PRICE', 380, tableTop + 8, { width: 80, align: 'right' });
            doc.text('TOTAL', 480, tableTop + 8, { width: 60, align: 'right' });

            // Line Items
            let currentY = tableTop + 35;
            doc.font('Helvetica').fontSize(10).fillColor(darkText);

            invoice.lineItems.forEach((item: any) => {
                // Background for alternating rows? (Optional)
                
                doc.text(item.description, 65, currentY, { width: 230 });
                doc.text(item.quantity.toString(), 300, currentY, { width: 60, align: 'center' });
                doc.text(`â‚¹${item.unitPrice.toLocaleString()}`, 380, currentY, { width: 80, align: 'right' });
                doc.text(`â‚¹${item.amount.toLocaleString()}`, 480, currentY, { width: 60, align: 'right' });

                currentY += 25;
                // Border line
                doc.strokeColor(borderColor).lineWidth(1).moveTo(50, currentY - 5).lineTo(550, currentY - 5).stroke();
                currentY += 10;
            });

            // --- Totals Area ---
            const totalsLeft = 350;
            const subtotalY = currentY > 600 ? 50 : currentY;
            if (currentY > 600) doc.addPage();
            
            doc.fontSize(10).fillColor(lightText).font('Helvetica');
            doc.text('Subtotal', totalsLeft, subtotalY);
            doc.fillColor(darkText).font('Helvetica-Bold').text(`â‚¹${invoice.subtotal.toLocaleString()}`, 480, subtotalY, { width: 60, align: 'right' });

            currentY = subtotalY + 25;
            doc.rect(totalsLeft - 10, currentY - 10, 210, 40).fill(lightBg);
            doc.fillColor(darkText).font('Helvetica-Bold').fontSize(14).text('TOTAL AMOUNT', totalsLeft, currentY);
            doc.fillColor(indigo).fontSize(18).text(`â‚¹${invoice.totalAmount.toLocaleString()}`, 480, currentY - 2, { width: 60, align: 'right' });

            // --- Bottom Footer Section ---
            const bottomY = currentY + 80;
            
            // Thank You on the Left
            doc.fillColor('#e5e7eb').font('Helvetica-Bold').fontSize(10)
                .text('THANK YOU FOR YOUR BUSINESS!', 50, bottomY);

            // Signature on the Right
            const sigX = 350;
            const sigWidth = 200;
            
            doc.strokeColor(borderColor).dash(2, { space: 2 }).lineWidth(0.5)
                .moveTo(sigX, bottomY + 30)
                .lineTo(sigX + sigWidth, bottomY + 30)
                .stroke()
                .undash();

            doc.fillColor(darkText).font('Helvetica-Bold').fontSize(10)
                .text(company.authorizedSignatory || 'Authorized Signatory', sigX, bottomY + 35, { align: 'center', width: sigWidth });
            doc.fillColor(lightText).font('Helvetica-Bold').fontSize(8)
                .text(company.designation || 'OWNER / PARTNER', sigX, bottomY + 48, { align: 'center', width: sigWidth });

            if (company.gstNumber) {
                doc.fillColor(lightText).fontSize(7).text(`GSTIN: ${company.gstNumber}`, 50, 780, { align: 'center', width: 500 });
            }

            doc.end();
        });
    }
}
