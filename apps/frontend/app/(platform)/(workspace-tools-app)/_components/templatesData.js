"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENT_TEMPLATES = void 0;
// ─── 20 Production Templates Matrix ───────────────────────────────────────────
exports.DOCUMENT_TEMPLATES = [
    {
        id: 't-blank',
        category: 'other',
        title: 'Blank Document',
        description: 'Start from scratch with a completely blank canvas.',
        blocks: [],
        documentDetails: {
            title: 'Untitled Document',
            documentType: 'general',
            showTotalAmount: false,
        }
    },
    // ── 1. FINANCIAL DOCUMENTS (5 Templates) ──
    {
        id: 't-tax-invoice',
        category: 'financial',
        title: 'Standard Tax Invoice',
        description: 'Professional GST/VAT tax invoice with line item table, auto-calculating totals, and banking instructions.',
        documentDetails: {
            title: 'Tax Invoice',
            documentType: 'invoice',
            showTotalAmount: true,
            totalAmount: '59,000.00',
            subtotal: 50000,
            taxPercent: 18,
            taxAmount: 9000,
            grandTotal: 59000
        },
        blocks: [
            {
                id: 'inv-head',
                type: 'heading',
                content: { text: 'TAX INVOICE' },
                styles: { fontSize: 28, textAlign: 'right', color: '#0f172a', fontWeight: '800' }
            },
            {
                id: 'inv-div-1',
                type: 'divider',
                content: {},
                styles: { borderColor: '#e2e8f0', borderWidth: 2, marginTop: 8, marginBottom: 16 }
            },
            {
                id: 'inv-info',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    hideBorders: true,
                    data: [
                        ['<strong>Billed To:</strong><br>{{clientName}}<br>{{clientEmail}}<br>{{clientAddress}}',
                            '<strong>Invoice #:</strong> {{documentNumber}}<br><strong>Date:</strong> {{issueDate}}<br><strong>Due Date:</strong> {{dueDate}}']
                    ]
                },
                styles: { fontSize: 13, color: '#334155', marginBottom: 20 }
            },
            {
                id: 'inv-table',
                type: 'grid',
                content: {
                    columns: 4,
                    rows: 3,
                    headers: ['Item / Description', 'Qty', 'Unit Rate (₹)', 'Amount (₹)'],
                    data: [
                        ['Full-Stack Web App Development Sprint', '1', '40,000.00', '40,000.00'],
                        ['UI/UX Design Tokens & Mobile Prototype', '1', '10,000.00', '10,000.00'],
                        ['', '', 'Subtotal', '50,000.00']
                    ],
                    showTotals: true,
                    isCurrency: true
                },
                styles: { marginTop: 16, marginBottom: 20 }
            },
            {
                id: 'inv-terms',
                type: 'box',
                content: {
                    text: '<strong>Bank Transfer Details & Payment Terms:</strong><br>Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0000123<br>Payment is due within 15 days of issue. Invoices approved by the client will automatically settle into ledger accounts.'
                },
                styles: { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', fontSize: 12, padding: 16, borderRadius: 8 }
            }
        ]
    },
    {
        id: 't-milestone-invoice',
        category: 'financial',
        title: 'Milestone-Based Project Invoice',
        description: 'Progress billing invoice linked to project phases, completion signoffs, and milestone releases.',
        documentDetails: {
            title: 'Milestone Progress Invoice',
            documentType: 'invoice',
            showTotalAmount: true,
            totalAmount: '45,000.00',
            subtotal: 45000,
            grandTotal: 45000
        },
        blocks: [
            {
                id: 'ms-head',
                type: 'heading',
                content: { text: 'MILESTONE INVOICE - PHASE 2' },
                styles: { fontSize: 26, color: '#1e293b', fontWeight: '800' }
            },
            {
                id: 'ms-summary',
                type: 'box',
                content: {
                    text: '<strong>Milestone Completion Notice:</strong><br>Phase 2 (Database Architecture & Authentication Service) has been successfully verified, tested, and deployed to staging.'
                },
                styles: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', fontSize: 13, padding: 14, borderRadius: 8, marginBottom: 16 }
            },
            {
                id: 'ms-table',
                type: 'grid',
                content: {
                    columns: 4,
                    rows: 3,
                    headers: ['Milestone Name', 'Weight (%)', 'Status', 'Due Amount (₹)'],
                    data: [
                        ['Phase 1: Discovery & Wireframing', '30%', 'Paid', '30,000.00'],
                        ['Phase 2: Core Backend & Auth API', '45%', 'Deliverable Complete', '45,000.00'],
                        ['Phase 3: Final QA & Production Cutover', '25%', 'Upcoming', '25,000.00']
                    ],
                    showTotals: true
                },
                styles: { marginBottom: 24 }
            }
        ]
    },
    {
        id: 't-retainer-invoice',
        category: 'financial',
        title: 'Recurring Retainer Invoice',
        description: 'Monthly agency retainer with allocated service hours, SLA guarantees, and rollover terms.',
        documentDetails: {
            title: 'Monthly Retainer Billing',
            documentType: 'invoice',
            showTotalAmount: true,
            totalAmount: '80,000.00'
        },
        blocks: [
            {
                id: 'ret-head',
                type: 'heading',
                content: { text: 'MONTHLY RETAINER INVOICE' },
                styles: { fontSize: 26, color: '#0f172a', fontWeight: '800' }
            },
            {
                id: 'ret-grid',
                type: 'grid',
                content: {
                    columns: 4,
                    rows: 2,
                    headers: ['Retainer Package', 'Allocated Hours', 'Billing Cycle', 'Fee (₹)'],
                    data: [
                        ['Enterprise Engineering Retainer', '60 Dev Hours / mo', 'March 2026', '80,000.00'],
                        ['', '', 'Total Monthly Fee', '80,000.00']
                    ],
                    showTotals: true
                },
                styles: { marginTop: 16, marginBottom: 20 }
            }
        ]
    },
    {
        id: 't-credit-note',
        category: 'financial',
        title: 'Credit Note / Refund Document',
        description: 'Formal credit adjustment or service refund voucher with reference invoice linkage.',
        documentDetails: {
            title: 'Credit Note',
            documentType: 'credit_note',
            showTotalAmount: true,
            totalAmount: '12,000.00'
        },
        blocks: [
            {
                id: 'cn-head',
                type: 'heading',
                content: { text: 'CREDIT NOTE' },
                styles: { fontSize: 26, color: '#b91c1c', fontWeight: '800' }
            },
            {
                id: 'cn-box',
                type: 'box',
                content: {
                    text: '<strong>Reference Original Invoice:</strong> INV-10029<br><strong>Reason for Credit:</strong> Adjustment for unused server allocation and promotional service credit.'
                },
                styles: { backgroundColor: '#fef2f2', borderColor: '#fecaca', fontSize: 13, padding: 14, borderRadius: 8, marginBottom: 20 }
            },
            {
                id: 'cn-grid',
                type: 'grid',
                content: {
                    columns: 3,
                    rows: 2,
                    headers: ['Adjustment Item', 'Tax Rate', 'Credited Amount (₹)'],
                    data: [
                        ['Cloud Server Resource Credit', '18% GST', '12,000.00'],
                        ['', 'Total Credit', '12,000.00']
                    ],
                    showTotals: true
                },
                styles: { marginBottom: 20 }
            }
        ]
    },
    {
        id: 't-proforma-invoice',
        category: 'financial',
        title: 'Pro-Forma Invoice',
        description: 'Estimated commercial bill for advance payments, customs clearance, or purchase orders.',
        documentDetails: {
            title: 'Pro-Forma Invoice',
            documentType: 'proforma',
            showTotalAmount: true,
            totalAmount: '1,20,000.00'
        },
        blocks: [
            {
                id: 'pf-head',
                type: 'heading',
                content: { text: 'PRO-FORMA INVOICE' },
                styles: { fontSize: 28, color: '#1e293b', fontWeight: '800', textAlign: 'right' }
            },
            {
                id: 'pf-box',
                type: 'box',
                content: {
                    text: '<strong>Note:</strong> This is a Pro-Forma Invoice issued prior to work commencement for purchase order verification and advance deposit processing.'
                },
                styles: { backgroundColor: '#fffbeb', borderColor: '#fde68a', fontSize: 13, padding: 14, borderRadius: 8, marginBottom: 20 }
            }
        ]
    },
    // ── 2. COMMERCIAL & SALES (4 Templates) ──
    {
        id: 't-sales-proposal',
        category: 'commercial',
        title: 'Commercial Sales Proposal',
        description: 'Persuasive client pitch proposal with executive summary, deliverables, timeline, and commercial pricing.',
        documentDetails: {
            title: 'Project Proposal',
            documentType: 'proposal',
            showTotalAmount: true,
            totalAmount: '1,50,000.00'
        },
        blocks: [
            {
                id: 'prop-head',
                type: 'heading',
                content: { text: 'Enterprise Transformation Proposal' },
                styles: { fontSize: 28, color: '#0f172a', fontWeight: '800', textAlign: 'center' }
            },
            {
                id: 'prop-exec',
                type: 'box',
                content: {
                    text: '<strong>Executive Summary:</strong><br>We propose a scalable, multi-tenant digital workspace platform to modernize operations, eliminate friction, and drive 3x employee productivity.'
                },
                styles: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', fontSize: 14, padding: 16, borderRadius: 8, marginBottom: 20 }
            },
            {
                id: 'prop-deliverables',
                type: 'list',
                content: {
                    items: [
                        'Centralized Document & Contract Engine with e-signatures',
                        'Real-time Financial Ledger & Auto-reconciliation',
                        'CRM Deal Tracking & Client Self-Service Portals',
                        'AI-Powered Automated Generation Suite'
                    ]
                },
                styles: { fontSize: 14, marginBottom: 24 }
            },
            {
                id: 'prop-sig',
                type: 'signature',
                content: {
                    signerRole: 'Client Authorization & Acceptance',
                    isRequired: true
                },
                styles: { marginTop: 30 }
            }
        ]
    },
    {
        id: 't-quotation-ratecard',
        category: 'commercial',
        title: 'Detailed Quotation & Rate Card',
        description: 'Itemized quotation breakdown with hourly rates, tier pricing, and validity window.',
        documentDetails: {
            title: 'Commercial Quotation',
            documentType: 'quotation',
            showTotalAmount: true,
            totalAmount: '95,000.00'
        },
        blocks: [
            {
                id: 'quote-head',
                type: 'heading',
                content: { text: 'COMMERCIAL QUOTATION' },
                styles: { fontSize: 26, color: '#0f172a', fontWeight: '800' }
            },
            {
                id: 'quote-grid',
                type: 'grid',
                content: {
                    columns: 4,
                    rows: 3,
                    headers: ['Service Module', 'Estimated Effort', 'Standard Rate', 'Total (₹)'],
                    data: [
                        ['Frontend UI Implementation', '40 Hours', '₹1,200/hr', '48,000.00'],
                        ['Backend Microservices & DB', '35 Hours', '₹1,200/hr', '42,000.00'],
                        ['DevOps & Cloud Setup', '5 Hours', '₹1,000/hr', '5,000.00']
                    ],
                    showTotals: true
                },
                styles: { marginBottom: 20 }
            }
        ]
    },
    {
        id: 't-sow',
        category: 'commercial',
        title: 'Statement of Work (SOW)',
        description: 'Comprehensive technical specification with milestones, acceptance criteria, and out-of-scope boundaries.',
        documentDetails: {
            title: 'Statement of Work',
            documentType: 'sow'
        },
        blocks: [
            {
                id: 'sow-head',
                type: 'heading',
                content: { text: 'STATEMENT OF WORK (SOW)' },
                styles: { fontSize: 26, color: '#1e293b', fontWeight: '800' }
            },
            {
                id: 'sow-scope',
                type: 'box',
                content: {
                    text: '<strong>Scope of Work & Acceptance Criteria:</strong><br>All services defined herein shall strictly adhere to defined technical architectures, automated unit tests, and security guidelines.'
                },
                styles: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', fontSize: 13, padding: 16, borderRadius: 8, marginBottom: 20 }
            }
        ]
    },
    {
        id: 't-rfp-response',
        category: 'commercial',
        title: 'RFP Response Document',
        description: 'Structured response matrix addressing vendor qualification, technical compliance, and case studies.',
        documentDetails: {
            title: 'RFP Tender Submission',
            documentType: 'rfp'
        },
        blocks: [
            {
                id: 'rfp-head',
                type: 'heading',
                content: { text: 'REQUEST FOR PROPOSAL (RFP) SUBMISSION' },
                styles: { fontSize: 24, color: '#0f172a', fontWeight: '800' }
            }
        ]
    },
    // ── 3. LEGAL & COMPLIANCE (4 Templates) ──
    {
        id: 't-nda',
        category: 'legal',
        title: 'Mutual Non-Disclosure Agreement (NDA)',
        description: 'Standard bilateral non-disclosure agreement protecting proprietary trade secrets, codebases, and financial data.',
        documentDetails: {
            title: 'Mutual Non-Disclosure Agreement',
            documentType: 'nda'
        },
        blocks: [
            {
                id: 'nda-head',
                type: 'heading',
                content: { text: 'MUTUAL NON-DISCLOSURE AGREEMENT' },
                styles: { fontSize: 24, color: '#0f172a', fontWeight: '800', textAlign: 'center' }
            },
            {
                id: 'nda-text',
                type: 'text',
                content: {
                    text: 'This Non-Disclosure Agreement ("Agreement") is entered into by and between <strong>{{companyName}}</strong> and <strong>{{clientName}}</strong> to prevent the unauthorized disclosure of Confidential Information.'
                },
                styles: { fontSize: 14, lineHeight: '1.7', marginTop: 16, marginBottom: 20 }
            },
            {
                id: 'nda-sig',
                type: 'signature',
                content: {
                    signerRole: 'Authorized Client Signatory',
                    isRequired: true
                },
                styles: { marginTop: 30 }
            }
        ]
    },
    {
        id: 't-msa',
        category: 'legal',
        title: 'Master Services Agreement (MSA)',
        description: 'Overarching master contract governing liability caps, IP ownership, confidentiality, and dispute resolution.',
        documentDetails: {
            title: 'Master Services Agreement',
            documentType: 'contract'
        },
        blocks: [
            {
                id: 'msa-head',
                type: 'heading',
                content: { text: 'MASTER SERVICES AGREEMENT' },
                styles: { fontSize: 24, color: '#0f172a', fontWeight: '800', textAlign: 'center' }
            }
        ]
    },
    {
        id: 't-contractor-agreement',
        category: 'legal',
        title: 'Independent Contractor Agreement',
        description: 'Freelancer / contractor engagement contract specifying IP assignment, non-solicitation, and compensation.',
        documentDetails: {
            title: 'Independent Contractor Agreement',
            documentType: 'contract'
        },
        blocks: [
            {
                id: 'ica-head',
                type: 'heading',
                content: { text: 'INDEPENDENT CONTRACTOR AGREEMENT' },
                styles: { fontSize: 24, color: '#0f172a', fontWeight: '800', textAlign: 'center' }
            }
        ]
    },
    {
        id: 't-sla',
        category: 'legal',
        title: 'Service Level Agreement (SLA)',
        description: 'Infrastructure uptime commitment (99.9%), incident response severity tiers, and penalty credits.',
        documentDetails: {
            title: 'Service Level Agreement',
            documentType: 'sla'
        },
        blocks: [
            {
                id: 'sla-head',
                type: 'heading',
                content: { text: 'SERVICE LEVEL AGREEMENT (SLA)' },
                styles: { fontSize: 24, color: '#0f172a', fontWeight: '800' }
            }
        ]
    },
    // ── 4. HR & TALENT (4 Templates) ──
    {
        id: 't-offer-letter',
        category: 'hr',
        title: 'Formal Full-Time Offer Letter',
        description: 'Executive job offer package with compensation CTC table, probation terms, benefits, and digital acceptance.',
        documentDetails: {
            title: 'Employment Offer Letter',
            documentType: 'offer_letter'
        },
        blocks: [
            {
                id: 'off-head',
                type: 'heading',
                content: { text: 'OFFER OF EMPLOYMENT' },
                styles: { fontSize: 26, color: '#0f172a', fontWeight: '800', textAlign: 'center' }
            },
            {
                id: 'off-body',
                type: 'text',
                content: {
                    text: 'Dear {{employeeName}},\n\nWe are thrilled to offer you the position of <strong>{{employeeDesignation}}</strong> at <strong>{{companyName}}</strong>. We believe your expertise will make a significant impact on our engineering leadership.'
                },
                styles: { fontSize: 14, lineHeight: '1.7', marginTop: 16, marginBottom: 20 }
            },
            {
                id: 'off-grid',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 4,
                    data: [
                        ['<strong>Designation:</strong>', '{{employeeDesignation}}'],
                        ['<strong>Annual CTC:</strong>', '₹15,00,000 per annum'],
                        ['<strong>Probation Period:</strong>', '3 Months'],
                        ['<strong>Reporting Location:</strong>', 'Bangalore / Hybrid']
                    ]
                },
                styles: { marginBottom: 24 }
            },
            {
                id: 'off-sig',
                type: 'signature',
                content: {
                    signerRole: 'Candidate Acceptance Signature',
                    isRequired: true
                },
                styles: { marginTop: 30 }
            }
        ]
    },
    {
        id: 't-warning-letter',
        category: 'hr',
        title: 'Official Disciplinary & Performance Warning',
        description: 'Formal HR warning notice specifying performance metrics, corrective action milestones, and timeline.',
        documentDetails: {
            title: 'Written Warning Notice',
            documentType: 'warning_letter'
        },
        blocks: [
            {
                id: 'warn-head',
                type: 'heading',
                content: { text: 'OFFICIAL PERFORMANCE & DISCIPLINARY NOTICE' },
                styles: { fontSize: 22, color: '#991b1b', fontWeight: '800', textAlign: 'center' }
            },
            {
                id: 'warn-box',
                type: 'box',
                content: {
                    text: '<strong>Confidential HR Record</strong><br>This notice documents formal concerns regarding performance and attendance standards.'
                },
                styles: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', fontSize: 13, padding: 14, borderRadius: 8, marginBottom: 16 }
            }
        ]
    },
    {
        id: 't-relieving-letter',
        category: 'hr',
        title: 'Relieving & Experience Certificate',
        description: 'Official employment tenure sign-off with last working date, role confirmation, and conduct endorsement.',
        documentDetails: {
            title: 'Relieving & Experience Letter',
            documentType: 'hr_letter'
        },
        blocks: [
            {
                id: 'rel-head',
                type: 'heading',
                content: { text: 'TO WHOMSOEVER IT MAY CONCERN' },
                styles: { fontSize: 22, color: '#0f172a', fontWeight: '800', textAlign: 'center' }
            },
            {
                id: 'rel-body',
                type: 'text',
                content: {
                    text: 'This is to certify that <strong>{{employeeName}}</strong> was employed with <strong>{{companyName}}</strong> from {{startDate}} to {{lastWorkingDate}} as a {{employeeDesignation}}. During their tenure, we found their character and performance to be exemplary.'
                },
                styles: { fontSize: 14, lineHeight: '1.8', marginTop: 20 }
            }
        ]
    },
    {
        id: 't-remote-policy',
        category: 'hr',
        title: 'Company Remote Work & Equipment Policy',
        description: 'Internal policy guideline covering work-from-home etiquette, data protection, and equipment stewardship.',
        documentDetails: {
            title: 'Remote Work & Security Policy',
            documentType: 'policy'
        },
        blocks: [
            {
                id: 'pol-head',
                type: 'heading',
                content: { text: 'GLOBAL REMOTE WORK POLICY' },
                styles: { fontSize: 24, color: '#0f172a', fontWeight: '800' }
            }
        ]
    },
    // ── 5. OPERATIONAL & REPORTS (3 Templates) ──
    {
        id: 't-project-handover',
        category: 'operations',
        title: 'Project Handover & Acceptance Sign-off',
        description: 'Final milestone delivery document confirming credential transfers, repo access, and formal client sign-off.',
        documentDetails: {
            title: 'Project Delivery & Handover Sign-off',
            documentType: 'handover'
        },
        blocks: [
            {
                id: 'hand-head',
                type: 'heading',
                content: { text: 'PROJECT HANDOVER & ACCEPTANCE SIGN-OFF' },
                styles: { fontSize: 24, color: '#0f172a', fontWeight: '800', textAlign: 'center' }
            },
            {
                id: 'hand-sig',
                type: 'signature',
                content: {
                    signerRole: 'Client Sign-off & Acceptance',
                    isRequired: true
                },
                styles: { marginTop: 30 }
            }
        ]
    },
    {
        id: 't-weekly-status',
        category: 'operations',
        title: 'Weekly Sprint & Client Status Report',
        description: 'Structured progress dashboard highlighting completed sprint tasks, blockers, and upcoming milestones.',
        documentDetails: {
            title: 'Weekly Progress Report',
            documentType: 'report'
        },
        blocks: [
            {
                id: 'rep-head',
                type: 'heading',
                content: { text: 'WEEKLY SPRINT STATUS REPORT' },
                styles: { fontSize: 24, color: '#0f172a', fontWeight: '800' }
            }
        ]
    },
    {
        id: 't-post-mortem',
        category: 'operations',
        title: 'Incident Post-Mortem & RCA',
        description: 'Engineering incident report with timeline of outage, root cause analysis, and preventive measures.',
        documentDetails: {
            title: 'Incident Post-Mortem Report',
            documentType: 'report'
        },
        blocks: [
            {
                id: 'rca-head',
                type: 'heading',
                content: { text: 'INCIDENT POST-MORTEM & RCA' },
                styles: { fontSize: 24, color: '#991b1b', fontWeight: '800' }
            }
        ]
    }
];
