// @ts-nocheck
import { prisma, requestContext } from '@workspace/db';
import { PrismaClient } from '@workspace/db';
import { EmailService } from '@workspace/backend-infra';

export class ReminderService {
    /**
     * Process reminders for a specific company using Prisma
     */
    async processReminders() {
        const companyId = requestContext.getStore()?.companyId as string;
        try {
            const config = await prisma.companyConfig.findFirst({
                where: { companyId }
            });
            
            const paymentConfig = config?.companyPaymentConfig as any || {};
            if (!config || !paymentConfig?.reminderSettings?.enabled) {
                return { success: true, message: 'Reminders disabled or not configured' };
            }

            const schedule = paymentConfig.reminderSettings.schedule || [3, 1, -7];
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            // Find unpaid invoices (sent or overdue)
            const invoices = await prisma.invoice.findMany({
                where: {
                    companyId,
                    status: { in: ['sent', 'overdue'] }
                },
                include: {
                    client: true,
                    reminders: true
                }
            });

            let sentCount = 0;

            for (const invoice of invoices) {
                if (!invoice.dueDate || !invoice.client?.email) continue;

                const dueDate = new Date(invoice.dueDate);
                dueDate.setHours(0, 0, 0, 0);

                // Calculate the difference in days (positive = before due date, negative = after due date)
                const diffTime = dueDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Check if today matches any scheduled reminder offset
                if (schedule.includes(diffDays)) {
                    // Check if a reminder for this specific offset has already been sent
                    const alreadySent = (invoice.reminders || []).some(r => r.daysFromDue === diffDays);

                    if (!alreadySent) {
                        // Update status to 'overdue' if necessary
                        if (diffDays < 0 && invoice.status !== 'overdue') {
                            await prisma.invoice.update({
                                where: { id: invoice.id },
                                data: { status: 'overdue' }
                            });
                        }

                        // Send reminder email
                        const emailResult = await this.sendReminderEmail(invoice, diffDays, config, prisma);

                        if (emailResult.success) {
                            await prisma.invoiceReminder.create({
                                data: {
                                    invoiceId: invoice.id,
                                    sentAt: new Date(),
                                    daysFromDue: diffDays
                                }
                            });
                            sentCount++;
                        }
                    }
                }
            }

            return { success: true, processed: invoices.length, sent: sentCount };
        } catch (error: any) {
            console.error('[ReminderService] Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Internal helper to send reminder email
     */
    async sendReminderEmail(invoice: any, daysFromDue: number, company: any) {
        const isOverdue = daysFromDue < 0;
        const absDays = Math.abs(daysFromDue);

        let subjectOffset = '';
        if (daysFromDue === 0) subjectOffset = 'is due today';
        else if (isOverdue) subjectOffset = `is ${absDays} day${absDays > 1 ? 's' : ''} overdue`;
        else subjectOffset = `is due in ${absDays} day${absDays > 1 ? 's' : ''}`;

        const subject = `Payment Reminder: Invoice #${invoice.invoiceNumber} ${subjectOffset}`;
        const amount = Number(invoice.totalAmount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

        // Reuse transitional template if specific reminder template doesn't exist
        return EmailService.notify(invoice.client?.email, 'invoice_reminder', {
            subject,
            message: `This is a friendly reminder that payment for Invoice <strong>#${invoice.invoiceNumber}</strong> is ${isOverdue ? 'overdue' : 'upcoming'}.`,
            invoiceNumber: invoice.invoiceNumber,
            amount,
            dueDate: new Date(invoice.dueDate).toLocaleDateString(),
            ctaLink: `${process.env.CLIENT_URL}/pay/${invoice.id}`,
            ctaText: 'View & Pay Invoice'
        }, prisma);
    }
}

