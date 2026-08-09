// ─── Company Branding Interface ────────────────────────────────────────────────
export interface BrandConfig {
    companyName: string;
    logoUrl?: string;
    brandColor?: string; // hex e.g. '#4f46e5'
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
}

// ─── Template Definition ───────────────────────────────────────────────────────
export interface DocumentTemplate {
    id: string;
    category: 'contract' | 'offer_letter' | 'policy' | 'report' | 'other' | 'my_templates';
    title: string;
    description: string;
    isCustom?: boolean;
    blocks?: any[];
    documentDetails?: any;
}

// ─── Hardcoded Initial Templates ──────────────────────────────────────────────
// These templates are converted into the JSON-based block format.
export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
    {
        id: 't-blank',
        category: 'other',
        title: 'Blank Document',
        description: 'Start from scratch with a completely blank canvas.',
        blocks: [],
        documentDetails: {
            title: 'Untitled Document',
            showTotalAmount: false,
        }
    },
    {
        id: 't-invoice-01',
        category: 'other',
        title: 'Standard Invoice',
        description: 'A clean, professional invoice with auto-calculating totals and items grid.',
        documentDetails: {
            title: 'Invoice',
            showTotalAmount: true,
            totalAmount: '0.00',
        },
        blocks: [
            {
                id: 'inv-1',
                type: 'heading',
                content: { text: 'INVOICE' },
                styles: { fontSize: 32, alignment: 'right', color: '#111827', fontWeight: 'bold' }
            },
            {
                id: 'inv-2',
                type: 'divider',
                content: {},
                styles: { borderColor: '#E5E7EB', borderWidth: 2 }
            },
            {
                id: 'inv-3',
                type: 'grid',
                content: { 
                    columns: 2, 
                    rows: 1,
                    hideBorders: true,
                    data: [['<strong>Billed To:</strong>\n{{clientName}}\n{{clientAddress}}\n{{clientEmail}}', '<strong>Invoice Number:</strong> INV-1001\n<strong>Date:</strong> {{validUntil}}']]
                },
                styles: { fontSize: 14, color: '#374151' }
            },
            {
                id: 'inv-4',
                type: 'grid',
                content: { 
                    columns: 4, 
                    rows: 3, 
                    headers: ['Description', 'Qty', 'Unit Price', 'Total'],
                    data: [
                        ['Web Development Services', '1', '1500.00', '1500.00'],
                        ['UI/UX Design', '1', '800.00', '800.00'],
                        ['', '', 'Subtotal', '2300.00']
                    ],
                    showTotals: true,
                    isCurrency: true
                },
                styles: { textAlign: 'left', marginTop: 24 }
            },
            {
                id: 'inv-5',
                type: 'box',
                content: { text: '<strong>Payment Terms:</strong>\nPayment is due within 15 days of the invoice date. Please make checks payable to {{companyName}} or use the bank details provided below.' },
                styles: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', marginTop: 40, fontSize: 12 }
            }
        ]
    },
    {
        id: 't-offer-01',
        category: 'offer_letter',
        title: 'Employment Offer Letter',
        description: 'Standard employment offer with signature block and compensation grid.',
        documentDetails: {
            title: 'Offer Letter',
            showTotalAmount: false,
        },
        blocks: [
            {
                id: 'off-1',
                type: 'heading',
                content: { text: 'Offer of Employment' },
                styles: { fontSize: 24, alignment: 'center', color: '#111827', fontWeight: 'bold' }
            },
            {
                id: 'off-2',
                type: 'text',
                content: { text: 'Dear {{employeeName}},\n\nWe are thrilled to offer you the position of <strong>{{employeeDesignation}}</strong> at {{companyName}}. We believe your skills and experience are an excellent match for our company.' },
                styles: { alignment: 'left', fontSize: 14, color: '#374151', marginTop: 20 }
            },
            {
                id: 'off-3',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 3,
                    data: [
                        ['<strong>Start Date</strong>', '{{joiningDate}}'],
                        ['<strong>Reporting To</strong>', 'Manager / Director'],
                        ['<strong>Base Salary</strong>', '{{employeeSalary}} per annum']
                    ]
                },
                styles: { fontSize: 14, marginTop: 24, marginBottom: 24 }
            },
            {
                id: 'off-4',
                type: 'box',
                content: { text: '<strong>Standard Benefits Package:</strong>\n• Comprehensive Health Insurance\n• 21 Days Paid Time Off (PTO)\n• Remote Work Flexibility\n• Annual Performance Bonus' },
                styles: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', fontSize: 13 }
            },
            {
                id: 'off-5',
                type: 'text',
                content: { text: 'Please sign below to indicate your acceptance of this offer.' },
                styles: { alignment: 'left', fontSize: 14, color: '#374151', marginTop: 30 }
            },
            {
                id: 'off-6',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    data: [['<br><br><br>___________________________<br><strong>Employer Signature</strong><br>{{authorizedSignatory}}', '<br><br><br>___________________________<br><strong>Candidate Signature</strong><br>{{employeeName}}']],
                    hideBorders: true
                }
            }
        ]
    },
    {
        id: 't-contract-01',
        category: 'contract',
        title: 'NDA Agreement',
        description: 'Non-disclosure agreement for sharing confidential information.',
        documentDetails: {
            title: 'Non-Disclosure Agreement',
            showTotalAmount: false,
        },
        blocks: [
            {
                id: 'nda-1',
                type: 'heading',
                content: { text: 'Mutual Non-Disclosure Agreement' },
                styles: { fontSize: 24, alignment: 'center', color: '#111827', fontWeight: 'bold' }
            },
            {
                id: 'nda-2',
                type: 'text',
                content: { text: 'This Non-Disclosure Agreement ("Agreement") is entered into by and between <strong>{{companyName}}</strong> and <strong>{{clientName}}</strong>.' },
                styles: { alignment: 'justify', fontSize: 13, color: '#374151', marginTop: 20 }
            },
            {
                id: 'nda-3',
                type: 'box',
                content: { text: '<strong>1. Definition of Confidential Information</strong>\n"Confidential Information" means any proprietary information, technical data, trade secrets, business plans, or know-how disclosed by either party.' },
                styles: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', fontSize: 13, marginTop: 20 }
            },
            {
                id: 'nda-4',
                type: 'list',
                content: {
                    items: [
                        'The Receiving Party shall hold and maintain the Confidential Information in strictest confidence.',
                        'The Receiving Party shall not use any Confidential Information for its own benefit.',
                        'The Receiving Party shall limit access to the Confidential Information to its employees who strictly need access.'
                    ]
                },
                styles: { listType: 'number', fontSize: 13, color: '#374151', marginTop: 16 }
            },
            {
                id: 'nda-5',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    data: [['<br><br><br>___________________________<br><strong>{{companyName}}</strong><br>{{authorizedSignatory}}', '<br><br><br>___________________________<br><strong>{{clientName}}</strong><br>Authorized Representative']],
                    hideBorders: true
                }
            }
        ]
    },
    {
        id: 't-warning-01',
        category: 'policy',
        title: 'Written Warning Letter',
        description: 'Official written warning letter for an employee.',
        documentDetails: {
            title: 'Written Warning Letter',
            showTotalAmount: false,
        },
        blocks: [
            {
                id: 'ww-1',
                type: 'heading',
                content: { text: 'Written Warning Notice' },
                styles: { fontSize: 24, alignment: 'center', color: '#111827', fontWeight: 'bold' }
            },
            {
                id: 'ww-2',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 3,
                    data: [
                        ['<strong>Employee Name:</strong>', '{{employeeName}}'],
                        ['<strong>Designation:</strong>', '{{employeeDesignation}}'],
                        ['<strong>Date:</strong>', '{{validUntil}}']
                    ],
                    hideBorders: true
                },
                styles: { fontSize: 14, marginTop: 20 }
            },
            {
                id: 'ww-3',
                type: 'divider',
                content: {},
                styles: { borderColor: '#E5E7EB', borderWidth: 2 }
            },
            {
                id: 'ww-4',
                type: 'text',
                content: { text: 'Dear {{employeeName}},\n\nThis letter serves as an official written warning regarding your recent conduct/performance. Specifically, [Detailed description of the issue, incident, or pattern of behaviour].\n\nWe expect immediate and sustained improvement. Further incidents may result in additional disciplinary action.' },
                styles: { fontSize: 14, color: '#374151', marginTop: 20 }
            },
            {
                id: 'ww-5',
                type: 'box',
                content: { text: '<strong>Employee Acknowledgment:</strong>\nI acknowledge receipt of this warning letter. My signature does not necessarily indicate agreement with its contents.' },
                styles: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', fontSize: 13, marginTop: 40 }
            },
            {
                id: 'ww-6',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    data: [['<br><br><br>___________________________<br><strong>Manager Signature</strong>', '<br><br><br>___________________________<br><strong>Employee Signature</strong>']],
                    hideBorders: true
                }
            }
        ]
    }
];
