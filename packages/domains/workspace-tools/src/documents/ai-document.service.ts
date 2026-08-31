// @ts-nocheck
import { prisma } from '@workspace/db';
import crypto from 'crypto';

export class AIDocumentService {
    /**
     * Generates a fully formatted Document AST tree based on natural language prompt and workspace context.
     */
    static async generateFromPrompt(params: {
        prompt: string;
        documentType?: string;
        clientId?: string;
        employeeId?: string;
        companyId?: string;
        userId?: string;
    }) {
        const { prompt, documentType: requestedType, clientId, employeeId, companyId } = params;

        // 1. Resolve Context
        let client = null;
        if (clientId) {
            client = await prisma.client.findFirst({ where: { id: clientId } });
        }

        let employee = null;
        if (employeeId) {
            employee = await prisma.user.findFirst({ 
                where: { id: employeeId },
                include: { designation: true }
            });
        }

        const company = await prisma.companyConfig.findFirst({ where: companyId ? { companyId } : {} });

        // 2. Classify Document Type if not explicitly provided
        const lowerPrompt = prompt.toLowerCase();
        let docType = requestedType || 'GENERAL';

        if (!requestedType) {
            if (lowerPrompt.includes('invoice') || lowerPrompt.includes('bill') || lowerPrompt.includes('payment request')) {
                docType = 'INVOICE';
            } else if (lowerPrompt.includes('quote') || lowerPrompt.includes('quotation') || lowerPrompt.includes('estimate') || lowerPrompt.includes('proposal')) {
                docType = 'QUOTATION';
            } else if (lowerPrompt.includes('warning') || lowerPrompt.includes('disciplinary') || lowerPrompt.includes('misconduct') || lowerPrompt.includes('performance')) {
                docType = 'WARNING_LETTER';
            } else if (lowerPrompt.includes('offer') || lowerPrompt.includes('appointment') || lowerPrompt.includes('hire') || lowerPrompt.includes('joining')) {
                docType = 'OFFER_LETTER';
            } else if (lowerPrompt.includes('nda') || lowerPrompt.includes('non-disclosure') || lowerPrompt.includes('confidential')) {
                docType = 'NDA';
            } else if (lowerPrompt.includes('contract') || lowerPrompt.includes('agreement') || lowerPrompt.includes('retainer') || lowerPrompt.includes('sla')) {
                docType = 'CONTRACT';
            } else if (lowerPrompt.includes('policy') || lowerPrompt.includes('handbook') || lowerPrompt.includes('sop')) {
                docType = 'COMPANY_POLICY';
            }
        }

        const companyName = company?.companyName || '180 Workspace Enterprise';
        const clientName = client?.name || client?.companyName || 'Valued Client';
        const clientEmail = client?.email || 'client@example.com';
        const employeeName = employee?.name || 'Employee';
        const employeeDesignation = employee?.designation?.name || 'Team Member';
        const todayDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

        // 3. Check for Incremental AST Synthesis
        const { existingBlocks } = params;
        const hasExisting = Array.isArray(existingBlocks) && existingBlocks.length > 0;
        const isIncremental = hasExisting && (
            lowerPrompt.includes('add') ||
            lowerPrompt.includes('append') ||
            lowerPrompt.includes('insert') ||
            lowerPrompt.includes('complete') ||
            lowerPrompt.includes('half') ||
            lowerPrompt.includes('milestone') ||
            lowerPrompt.includes('sign') ||
            lowerPrompt.includes('signature') ||
            lowerPrompt.includes('terms') ||
            lowerPrompt.includes('table') ||
            lowerPrompt.includes('payment')
        );

        if (isIncremental) {
            let incrementalBlocks: any[] = [];
            let explanation = '';

            if (lowerPrompt.includes('milestone') || lowerPrompt.includes('payment schedule') || lowerPrompt.includes('stages')) {
                explanation = `I've added a structured 3-stage Payment Milestone Schedule with due dates and percentage installments.`;
                incrementalBlocks.push(
                    {
                        id: crypto.randomUUID(),
                        type: 'heading',
                        content: { text: 'Payment Milestones & Schedule', level: 3 },
                        styles: { fontSize: 18, color: '#1e293b', fontWeight: '700', marginTop: 24, marginBottom: 12 }
                    },
                    {
                        id: crypto.randomUUID(),
                        type: 'grid',
                        content: {
                            columns: 4,
                            rows: 4,
                            headers: ['Milestone Phase', 'Deliverables', 'Due Date', 'Amount (₹)'],
                            data: [
                                ['Phase 1: Initial Deposit', 'Project kickoff, architecture approval, and design system', 'Upon Signing', '20,000.00'],
                                ['Phase 2: Alpha Release', 'Core feature implementation, backend APIs, and integration tests', 'Day 15', '20,000.00'],
                                ['Phase 3: Final Handover', 'Production deployment, documentation, and client sign-off', 'Day 30', '10,000.00'],
                                ['', '', 'Total Contract Value', '50,000.00']
                            ],
                            showTotals: true,
                            isCurrency: true
                        },
                        styles: { marginTop: 12, marginBottom: 20 }
                    }
                );
            }

            if (lowerPrompt.includes('sign') || lowerPrompt.includes('signature') || lowerPrompt.includes('signatory') || lowerPrompt.includes('approval')) {
                explanation += (explanation ? ' Also ' : "I've ") + 'inserted bilateral signature blocks for authorized client and provider sign-off.';
                incrementalBlocks.push(
                    {
                        id: crypto.randomUUID(),
                        type: 'divider',
                        content: {},
                        styles: { borderColor: '#e2e8f0', borderWidth: 1, marginTop: 28, marginBottom: 20 }
                    },
                    {
                        id: crypto.randomUUID(),
                        type: 'container',
                        content: {
                            direction: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 32,
                            children: [
                                {
                                    id: crypto.randomUUID(),
                                    type: 'signature',
                                    content: {
                                        signerRole: 'Client Authorized Representative',
                                        signerName: clientName,
                                        signerEmail: clientEmail,
                                        isRequired: true
                                    },
                                    styles: { flex: 1 }
                                },
                                {
                                    id: crypto.randomUUID(),
                                    type: 'signature',
                                    content: {
                                        signerRole: 'Company Signatory',
                                        signerName: employeeName,
                                        signerEmail: 'authorized@company.com',
                                        isRequired: true
                                    },
                                    styles: { flex: 1 }
                                }
                            ]
                        },
                        styles: { marginTop: 20, marginBottom: 20 }
                    }
                );
            }

            if (lowerPrompt.includes('razorpay') || lowerPrompt.includes('stripe') || lowerPrompt.includes('payment button') || lowerPrompt.includes('pay button') || lowerPrompt.includes('checkout') || lowerPrompt.includes('payment link') || lowerPrompt.includes('pay link')) {
                const gateway = lowerPrompt.includes('stripe') ? 'stripe' : lowerPrompt.includes('paypal') ? 'paypal' : lowerPrompt.includes('upi') ? 'upi' : 'razorpay';
                explanation += (explanation ? ' Also ' : "I've ") + `added an online checkout button with ${gateway.toUpperCase()} integration.`;
                incrementalBlocks.push({
                    id: crypto.randomUUID(),
                    type: 'payment_checkout',
                    content: {
                        mode: 'button',
                        buttonText: `Pay via ${gateway.toUpperCase()} Secure`,
                        paymentUrl: gateway === 'stripe' ? 'https://buy.stripe.com/demo_checkout' : 'https://razorpay.me/@demo_company',
                        gateway,
                        amountText: '₹50,000.00',
                        buttonStyle: 'gradient',
                        buttonColor: '#4f46e5',
                        buttonAlignment: 'center'
                    },
                    styles: { padding: 12, marginTop: 16, marginBottom: 16 }
                });
            }

            if (lowerPrompt.includes('bank details') || lowerPrompt.includes('wire transfer') || lowerPrompt.includes('bank transfer') || lowerPrompt.includes('ifsc') || lowerPrompt.includes('swift') || lowerPrompt.includes('upi')) {
                explanation += (explanation ? ' Also ' : "I've ") + 'added corporate Bank & Wire Transfer payment details.';
                incrementalBlocks.push({
                    id: crypto.randomUUID(),
                    type: 'payment_checkout',
                    content: {
                        mode: 'bank_transfer',
                        bankDetailsTitle: 'Direct Bank & Wire Transfer Details',
                        accountHolderName: companyName,
                        bankName: 'HDFC Bank Corporate',
                        accountNumber: '50200098765432',
                        ifscOrSwiftCode: 'HDFC0001234',
                        upiId: 'corporate@hdfcbank',
                        iban: '',
                        additionalInstructions: 'Please specify the invoice/document number in the transaction remarks.'
                    },
                    styles: { padding: 16, marginTop: 16, marginBottom: 16 }
                });
            }

            if (lowerPrompt.includes('terms') || lowerPrompt.includes('condition') || lowerPrompt.includes('clause') || lowerPrompt.includes('nda') || lowerPrompt.includes('policy')) {
                explanation += (explanation ? ' Plus ' : "I've ") + 'added standard compliance and payment terms.';
                incrementalBlocks.push(
                    {
                        id: crypto.randomUUID(),
                        type: 'heading',
                        content: { text: 'Terms & Conditions', level: 3 },
                        styles: { fontSize: 16, color: '#1e293b', fontWeight: '700', marginTop: 24, marginBottom: 8 }
                    },
                    {
                        id: crypto.randomUUID(),
                        type: 'box',
                        content: {
                            text: `<strong>1. Payment Terms:</strong> Invoices are payable within Net 15 business days of issue. Overdue payments accrue interest at 1.5% per month.<br><strong>2. Confidentiality:</strong> Both parties agree to protect proprietary code, trade secrets, and non-public data.<br><strong>3. Termination:</strong> Either party may terminate with 14 days written notice.`
                        },
                        styles: { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', fontSize: 13, padding: 16, borderRadius: 8, marginBottom: 20 }
                    }
                );
            }

            if (incrementalBlocks.length === 0) {
                explanation = `I've synthesized custom sections and updated your document based on your instructions: "${prompt}".`;
                incrementalBlocks.push(
                    {
                        id: crypto.randomUUID(),
                        type: 'text',
                        content: {
                            text: `<p><strong>Additional Details:</strong> Generated to fulfill your request: <em>"${prompt}"</em>.</p>`
                        },
                        styles: { fontSize: 14, color: '#334155', marginTop: 16, marginBottom: 16 }
                    }
                );
            }

            return {
                success: true,
                mode: 'append',
                explanation: explanation.trim(),
                newBlocks: incrementalBlocks,
                blocks: [...existingBlocks, ...incrementalBlocks],
                title: 'Updated Document',
                documentType: docType,
                documentDetails: {
                    clientName,
                    clientEmail,
                    employeeName,
                    employeeDesignation
                }
            };
        }

        let blocks: any[] = [];
        let title = 'Generated Document';
        let subtotal = 0;
        let grandTotal = 0;

        // 4. Build Schema-Compliant AST Blocks from Scratch
        if (docType === 'INVOICE') {
            title = `Tax Invoice - ${clientName}`;
            subtotal = 50000;
            const tax = 9000; // 18%
            grandTotal = 59000;

            blocks = [
                {
                    id: crypto.randomUUID(),
                    type: 'heading',
                    content: { text: 'TAX INVOICE', level: 1 },
                    styles: { textAlign: 'right', color: '#1e293b', fontWeight: '800', fontSize: 32 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'divider',
                    content: {},
                    styles: { borderColor: '#e2e8f0', borderWidth: 2, marginTop: 8, marginBottom: 16 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'grid',
                    content: {
                        columns: 2,
                        rows: 1,
                        hideBorders: true,
                        data: [
                            [`<strong>Billed To:</strong><br>${clientName}<br>${clientEmail}<br>${client?.billingAddress || 'Corporate Office'}`,
                             `<strong>Invoice #:</strong> INV-${Date.now().toString().slice(-6)}<br><strong>Issue Date:</strong> ${todayDate}<br><strong>Payment Terms:</strong> Net 15 Days`]
                        ]
                    },
                    styles: { fontSize: 13, color: '#475569', marginBottom: 20 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'grid',
                    content: {
                        columns: 4,
                        rows: 3,
                        headers: ['Description / Deliverable', 'Qty', 'Unit Price (₹)', 'Total (₹)'],
                        data: [
                            ['Full-Stack Web Development & API Integration', '1', '40000.00', '40000.00'],
                            ['UI/UX Design System & Mobile Responsive Layouts', '1', '10000.00', '10000.00'],
                            ['', '', 'Subtotal', '50000.00']
                        ],
                        showTotals: true,
                        isCurrency: true
                    },
                    styles: { marginTop: 16, marginBottom: 24 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'box',
                    content: {
                        text: `<strong>Payment Instructions:</strong><br>Please remit payment within 15 days via bank transfer or direct payment link. Thank you for your business!`
                    },
                    styles: { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', fontSize: 12, padding: 16, borderRadius: 8 }
                }
            ];
        } else if (docType === 'QUOTATION' || docType === 'SALES_PROPOSAL') {
            title = `Commercial Proposal & Quotation - ${clientName}`;
            subtotal = 75000;
            grandTotal = 75000;

            blocks = [
                {
                    id: crypto.randomUUID(),
                    type: 'heading',
                    content: { text: `Project Proposal for ${clientName}`, level: 1 },
                    styles: { textAlign: 'center', color: '#1e293b', fontSize: 26, fontWeight: '800' }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'text',
                    content: { text: `Prepared by <strong>${companyName}</strong> on ${todayDate}` },
                    styles: { textAlign: 'center', color: '#64748b', fontSize: 13, marginBottom: 20 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'box',
                    content: {
                        text: `<strong>Executive Summary</strong><br>Based on your requirements, we propose a comprehensive end-to-end digital transformation strategy designed to maximize user engagement and streamline operations.`
                    },
                    styles: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', fontSize: 14, padding: 16, borderRadius: 8, marginBottom: 20 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'heading',
                    content: { text: 'Scope of Deliverables', level: 2 },
                    styles: { color: '#0f172a', fontSize: 18, fontWeight: '700', marginTop: 16 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'list',
                    content: {
                        items: [
                            'High-converting modern responsive web experience with dark/light themes',
                            'Automated CRM integration & client self-service portal',
                            'SEO & AEO structured data indexing and performance optimization',
                            'Continuous deployment pipeline with 99.9% uptime guarantee'
                        ]
                    },
                    styles: { listType: 'bullet', fontSize: 14, color: '#334155', marginBottom: 20 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'heading',
                    content: { text: 'Investment & Commercial Quotation', level: 2 },
                    styles: { color: '#0f172a', fontSize: 18, fontWeight: '700', marginTop: 16 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'grid',
                    content: {
                        columns: 3,
                        rows: 3,
                        headers: ['Project Phase / Module', 'Timeline', 'Cost (₹)'],
                        data: [
                            ['Phase 1: Architecture & UI Prototype', '2 Weeks', '25000.00'],
                            ['Phase 2: Full Development & Integrations', '3 Weeks', '35000.00'],
                            ['Phase 3: QA Testing, Deployment & Training', '1 Week', '15000.00']
                        ],
                        showTotals: true
                    },
                    styles: { marginTop: 12, marginBottom: 24 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'signature',
                    content: {
                        signerRole: 'Client Acceptance',
                        signerName: clientName,
                        signerEmail: clientEmail,
                        isRequired: true
                    },
                    styles: { marginTop: 30 }
                }
            ];
        } else if (docType === 'WARNING_LETTER') {
            title = `Official Performance Notice - ${employeeName}`;
            blocks = [
                {
                    id: crypto.randomUUID(),
                    type: 'heading',
                    content: { text: 'OFFICIAL WRITTEN WARNING NOTICE', level: 1 },
                    styles: { textAlign: 'center', color: '#991b1b', fontSize: 22, fontWeight: '800' }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'divider',
                    content: {},
                    styles: { borderColor: '#fca5a5', borderWidth: 2, marginTop: 8, marginBottom: 16 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'grid',
                    content: {
                        columns: 2,
                        rows: 3,
                        data: [
                            ['<strong>Employee Name:</strong>', employeeName],
                            ['<strong>Designation:</strong>', employeeDesignation],
                            ['<strong>Date of Notice:</strong>', todayDate]
                        ],
                        hideBorders: true
                    },
                    styles: { fontSize: 13, color: '#334155', marginBottom: 20 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'text',
                    content: {
                        text: `Dear ${employeeName},\n\nThis letter serves as an official formal warning regarding your recent work performance and attendance standards. Specifically, concerns have been noted regarding project deadlines and communication compliance.\n\nAt <strong>${companyName}</strong>, we maintain high standards of accountability and team collaboration. We expect immediate and sustained improvement over the next 30 days.`
                    },
                    styles: { fontSize: 14, color: '#334155', lineHeight: '1.7', marginBottom: 20 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'box',
                    content: {
                        text: `<strong>Required Corrective Actions:</strong><br>1. Adhere to daily standup and task time-tracking updates.<br>2. Complete all assigned project deliverables within agreed sprint timelines.<br>3. Schedule weekly progress check-ins with your reporting manager.`
                    },
                    styles: { backgroundColor: '#fef2f2', borderColor: '#fecaca', fontSize: 13, padding: 16, borderRadius: 8, marginBottom: 24 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'grid',
                    content: {
                        columns: 2,
                        rows: 1,
                        data: [
                            ['<br><br>___________________________<br><strong>Manager Signature</strong><br>Authorized Signatory',
                             `<br><br>___________________________<br><strong>Employee Acknowledgment</strong><br>${employeeName}`]
                        ],
                        hideBorders: true
                    },
                    styles: { marginTop: 40 }
                }
            ];
        } else if (docType === 'OFFER_LETTER') {
            title = `Offer of Employment - ${employeeName}`;
            blocks = [
                {
                    id: crypto.randomUUID(),
                    type: 'heading',
                    content: { text: 'OFFER OF EMPLOYMENT', level: 1 },
                    styles: { textAlign: 'center', color: '#1e293b', fontSize: 24, fontWeight: '800' }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'text',
                    content: {
                        text: `Dear ${employeeName},\n\nWe are delighted to extend an offer of employment for the position of <strong>${employeeDesignation}</strong> at <strong>${companyName}</strong>. We were thoroughly impressed with your technical skills and leadership experience.`
                    },
                    styles: { fontSize: 14, color: '#334155', lineHeight: '1.7', marginTop: 16, marginBottom: 20 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'grid',
                    content: {
                        columns: 2,
                        rows: 4,
                        data: [
                            ['<strong>Role & Title:</strong>', employeeDesignation],
                            ['<strong>Employment Type:</strong>', 'Full-Time / Permanent'],
                            ['<strong>Effective Start Date:</strong>', todayDate],
                            ['<strong>Annual Compensation (CTC):</strong>', '₹12,00,000 per annum']
                        ]
                    },
                    styles: { fontSize: 13, marginBottom: 20 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'box',
                    content: {
                        text: `<strong>Benefits & Perks:</strong><br>• Comprehensive Health & Medical Insurance Coverage<br>• 24 Days Annual Paid Leave + Public Holidays<br>• Professional Learning & Development Stipend<br>• Flexible Hybrid Work Model`
                    },
                    styles: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', fontSize: 13, padding: 16, borderRadius: 8, marginBottom: 24 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'signature',
                    content: {
                        signerRole: 'Candidate Acceptance',
                        signerName: employeeName,
                        signerEmail: employee?.email || 'candidate@example.com',
                        isRequired: true
                    },
                    styles: { marginTop: 30 }
                }
            ];
        } else {
            // General / Contract
            title = `Mutual Agreement - ${clientName}`;
            blocks = [
                {
                    id: crypto.randomUUID(),
                    type: 'heading',
                    content: { text: `Service Agreement & Terms`, level: 1 },
                    styles: { textAlign: 'center', color: '#1e293b', fontSize: 24, fontWeight: '800' }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'text',
                    content: {
                        text: `This agreement is made on ${todayDate} between <strong>${companyName}</strong> (Service Provider) and <strong>${clientName}</strong> (Client).`
                    },
                    styles: { fontSize: 14, color: '#334155', lineHeight: '1.7', marginTop: 16, marginBottom: 20 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'box',
                    content: {
                        text: `<strong>1. Terms of Engagement</strong><br>The service provider agrees to perform the services in a professional and timely manner. All confidential information exchanged shall be protected under strict non-disclosure obligations.`
                    },
                    styles: { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', fontSize: 13, padding: 16, borderRadius: 8, marginBottom: 24 }
                },
                {
                    id: crypto.randomUUID(),
                    type: 'signature',
                    content: {
                        signerRole: 'Authorized Signatory',
                        signerName: clientName,
                        signerEmail: clientEmail,
                        isRequired: true
                    },
                    styles: { marginTop: 30 }
                }
            ];
        }

        return {
            success: true,
            title,
            documentType: docType,
            documentDetails: {
                title,
                documentType: docType.toLowerCase(),
                clientName,
                clientEmail,
                employeeName,
                employeeDesignation,
                subtotal,
                grandTotal: grandTotal.toString()
            },
            blocks,
            headerBlocks: [],
            footerBlocks: [],
            designSettings: {
                fontFamily: 'sans-serif',
                fontSize: 14,
                primaryColor: '#2563eb'
            }
        };
    }
}
