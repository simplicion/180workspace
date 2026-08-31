"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOOTER_TEMPLATES = exports.HEADER_TEMPLATES = void 0;
exports.HEADER_TEMPLATES = [
    {
        id: 'header-corporate',
        name: 'Corporate Executive',
        description: 'Two-column header with company name, address, and GST/Tax ID',
        blocks: [
            {
                id: 'h-corp-1',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    data: [
                        [
                            '<div style="line-height: 1.3;"><div style="font-size: 18px; font-weight: 700; color: #0f172a;">{{companyName}}</div><div style="font-size: 11px; color: #64748b; margin-top: 2px;">Business & Technology Solutions</div></div>',
                            '<div style="text-align: right; font-size: 11px; color: #475569; line-height: 1.4;"><div>{{companyAddress}}</div><div>Tax ID: {{companyGst}} • {{companyEmail}}</div></div>'
                        ]
                    ],
                    headers: [],
                    colWidths: [50, 50],
                    hideBorders: true
                },
                styles: { fontSize: 11, color: '#334155', padding: '0px' }
            },
            {
                id: 'h-corp-2',
                type: 'line',
                content: { isPageBreak: false },
                styles: { borderColor: '#e2e8f0', borderWidth: 1.5, borderStyle: 'solid', margin: 12 }
            }
        ]
    },
    {
        id: 'header-minimal',
        name: 'Minimal Modern',
        description: 'Centered clean title with contact bar and subtle hairline divider',
        blocks: [
            {
                id: 'h-min-1',
                type: 'text',
                content: { text: '<h2 style="font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #0f172a; text-align: center; margin: 0;">{{companyName}}</h2>', level: 'h2' },
                styles: { alignment: 'center', color: '#0f172a' }
            },
            {
                id: 'h-min-2',
                type: 'text',
                content: { text: '<p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 4px;">{{companyAddress}} &nbsp;•&nbsp; {{companyEmail}} &nbsp;•&nbsp; {{companyPhone}}</p>', level: 'p' },
                styles: { alignment: 'center', color: '#64748b' }
            },
            {
                id: 'h-min-3',
                type: 'line',
                content: { isPageBreak: false },
                styles: { borderColor: '#cbd5e1', borderWidth: 1, borderStyle: 'solid', margin: 12 }
            }
        ]
    },
    {
        id: 'header-modern',
        name: 'Modern Split',
        description: 'Left-aligned brand title with right-aligned contact details',
        blocks: [
            {
                id: 'h-mod-1',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    data: [
                        [
                            '<div style="font-size: 20px; font-weight: 800; color: #1e40af; letter-spacing: -0.02em;">{{companyName}}</div>',
                            '<div style="text-align: right; font-size: 11px; color: #475569; line-height: 1.4;"><div>{{companyEmail}}</div><div>{{companyPhone}}</div></div>'
                        ]
                    ],
                    headers: [],
                    colWidths: [60, 40],
                    hideBorders: true
                },
                styles: { fontSize: 11, color: '#1e40af', padding: '0px' }
            },
            {
                id: 'h-mod-2',
                type: 'line',
                content: { isPageBreak: false },
                styles: { borderColor: '#3b82f6', borderWidth: 2, borderStyle: 'solid', margin: 12 }
            }
        ]
    },
    {
        id: 'header-classic',
        name: 'Classic Letterhead',
        description: 'Traditional executive letterhead with corporate accent rules',
        blocks: [
            {
                id: 'h-clas-1',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    data: [
                        [
                            '<div style="font-size: 18px; font-weight: bold; color: #111827; text-transform: uppercase; letter-spacing: 0.05em;">{{companyName}}</div>',
                            '<div style="text-align: right; font-size: 11px; color: #4b5563;"><div>{{companyWebsite}}</div><div>{{companyAddress}}</div></div>'
                        ]
                    ],
                    headers: [],
                    colWidths: [50, 50],
                    hideBorders: true
                },
                styles: { fontSize: 11, color: '#111827', padding: '0px' }
            },
            {
                id: 'h-clas-2',
                type: 'line',
                content: { isPageBreak: false },
                styles: { borderColor: '#94a3b8', borderWidth: 1, borderStyle: 'solid', margin: 10 }
            }
        ]
    }
];
exports.FOOTER_TEMPLATES = [
    {
        id: 'footer-corporate',
        name: 'Corporate Legal',
        description: 'Top border with confidentiality notice and website info',
        blocks: [
            {
                id: 'f-corp-1',
                type: 'line',
                content: { isPageBreak: false },
                styles: { borderColor: '#e2e8f0', borderWidth: 1.5, borderStyle: 'solid', margin: 12 }
            },
            {
                id: 'f-corp-2',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    data: [
                        [
                            '<div style="font-size: 10px; color: #64748b;"><strong>Confidential & Proprietary</strong> — {{companyName}}</div>',
                            '<div style="text-align: right; font-size: 10px; color: #64748b;">{{companyWebsite}} &nbsp;|&nbsp; {{companyEmail}}</div>'
                        ]
                    ],
                    headers: [],
                    colWidths: [55, 45],
                    hideBorders: true
                },
                styles: { fontSize: 10, color: '#64748b', padding: '0px' }
            }
        ]
    },
    {
        id: 'footer-minimal',
        name: 'Minimal Clean',
        description: 'Centered line with company name and web details',
        blocks: [
            {
                id: 'f-min-1',
                type: 'line',
                content: { isPageBreak: false },
                styles: { borderColor: '#e2e8f0', borderWidth: 1, borderStyle: 'solid', margin: 12 }
            },
            {
                id: 'f-min-2',
                type: 'text',
                content: { text: '<p style="font-size: 10px; color: #94a3b8; text-align: center; margin: 0;">{{companyName}} &nbsp;•&nbsp; {{companyWebsite}} &nbsp;•&nbsp; {{companyEmail}}</p>', level: 'p' },
                styles: { alignment: 'center', color: '#94a3b8' }
            }
        ]
    },
    {
        id: 'footer-modern',
        name: 'Modern 3-Column',
        description: 'Three distributed columns with phone, email, and website',
        blocks: [
            {
                id: 'f-mod-1',
                type: 'line',
                content: { isPageBreak: false },
                styles: { borderColor: '#3b82f6', borderWidth: 1.5, borderStyle: 'solid', margin: 12 }
            },
            {
                id: 'f-mod-2',
                type: 'grid',
                content: {
                    columns: 3,
                    rows: 1,
                    data: [
                        [
                            '<div style="font-size: 10px; color: #64748b;">Phone: {{companyPhone}}</div>',
                            '<div style="text-align: center; font-size: 10px; color: #64748b;">Email: {{companyEmail}}</div>',
                            '<div style="text-align: right; font-size: 10px; color: #64748b;">Web: {{companyWebsite}}</div>'
                        ]
                    ],
                    headers: [],
                    hideBorders: true
                },
                styles: { fontSize: 10, color: '#64748b', padding: '0px' }
            }
        ]
    },
    {
        id: 'footer-classic',
        name: 'Formal Sign-off',
        description: 'Terms acknowledgment with company officer signature slot',
        blocks: [
            {
                id: 'f-clas-1',
                type: 'line',
                content: { isPageBreak: false },
                styles: { borderColor: '#cbd5e1', borderWidth: 1, borderStyle: 'solid', margin: 12 }
            },
            {
                id: 'f-clas-2',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    data: [
                        [
                            '<div style="font-size: 10px; color: #64748b;">Official Document Issued by {{companyName}}.<br>Subject to terms & conditions.</div>',
                            '<div style="text-align: right; font-size: 10px; color: #475569;"><strong>Authorized Signatory:</strong><br>{{authorizedSignatory}}</div>'
                        ]
                    ],
                    headers: [],
                    colWidths: [60, 40],
                    hideBorders: true
                },
                styles: { fontSize: 10, color: '#475569', padding: '0px' }
            }
        ]
    }
];
