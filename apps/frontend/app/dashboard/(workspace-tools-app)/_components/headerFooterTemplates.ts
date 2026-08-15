import { Block } from '../../../../redux/slices/documentSlice';

export interface HeaderFooterTemplate {
    id: string;
    name: string;
    blocks: Block[];
}

export const HEADER_TEMPLATES: HeaderFooterTemplate[] = [
    {
        id: 'header-corporate',
        name: 'Corporate Style',
        blocks: [
            {
                id: 'h-corp-1',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    data: [['<img src="{{companyLogo}}" style="max-height: 60px; object-fit: contain;" alt="" onerror="this.style.display=\'none\'" />', '<div style="text-align: right; line-height: 1.5;"><strong>{{companyName}}</strong>\n{{companyAddress}}\nGST: {{companyGst}}</div>']],
                    headers: [],
                    colWidths: [30, 70],
                    hideBorders: true
                },
                styles: { fontSize: 12, color: '#4B5563' }
            },
            {
                id: 'h-corp-2',
                type: 'divider',
                content: {},
                styles: { borderColor: '{{primaryColor}}', borderWidth: 2 }
            }
        ]
    },
    {
        id: 'header-minimal',
        name: 'Minimal Style',
        blocks: [
            {
                id: 'h-min-1',
                type: 'text',
                content: { text: '{{companyName}}' },
                styles: { fontSize: 24, fontWeight: 'bold', color: '{{primaryColor}}', alignment: 'center' }
            },
            {
                id: 'h-min-2',
                type: 'text',
                content: { text: '{{companyAddress}} | {{companyEmail}} | {{companyPhone}}' },
                styles: { fontSize: 10, color: '#6B7280', alignment: 'center' }
            }
        ]
    },
    {
        id: 'header-modern',
        name: 'Modern Split',
        blocks: [
            {
                id: 'h-mod-1',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    data: [['<div style="font-size: 20px;"><strong>{{companyName}}</strong></div>', '<div style="text-align: right;">{{companyEmail}}\n{{companyPhone}}</div>']],
                    headers: [],
                    hideBorders: true
                },
                styles: { fontSize: 12, color: '{{primaryColor}}' }
            },
            {
                id: 'h-mod-2',
                type: 'divider',
                content: {},
                styles: { borderColor: '#E5E7EB', borderWidth: 1 }
            }
        ]
    },
    {
        id: 'header-classic',
        name: 'Classic Logo',
        blocks: [
            {
                id: 'h-clas-1',
                type: 'image',
                content: { url: '{{companyLogo}}' },
                styles: { width: '120px', alignment: 'center' }
            },
            {
                id: 'h-clas-2',
                type: 'divider',
                content: {},
                styles: { borderColor: '#E5E7EB', borderWidth: 1 }
            }
        ]
    }
];

export const FOOTER_TEMPLATES: HeaderFooterTemplate[] = [
    {
        id: 'footer-corporate',
        name: 'Corporate Footer',
        blocks: [
            {
                id: 'f-corp-1',
                type: 'divider',
                content: {},
                styles: { borderColor: '{{primaryColor}}', borderWidth: 2 }
            },
            {
                id: 'f-corp-2',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    data: [['<strong>Confidential & Proprietary</strong>', '<div style="text-align: right;">{{companyWebsite}} | {{companyEmail}}</div>']],
                    headers: [],
                    colWidths: [50, 50],
                    hideBorders: true
                },
                styles: { fontSize: 10, color: '#4B5563' }
            }
        ]
    },
    {
        id: 'footer-minimal',
        name: 'Minimal Footer',
        blocks: [
            {
                id: 'f-min-1',
                type: 'divider',
                content: {},
                styles: { borderColor: '#E5E7EB', borderWidth: 1 }
            },
            {
                id: 'f-min-2',
                type: 'text',
                content: { text: '{{companyName}} • {{companyWebsite}}' },
                styles: { fontSize: 10, color: '#9CA3AF', alignment: 'center' }
            }
        ]
    },
    {
        id: 'footer-modern',
        name: 'Modern Footer',
        blocks: [
            {
                id: 'f-mod-1',
                type: 'grid',
                content: {
                    columns: 3,
                    rows: 1,
                    data: [['{{companyPhone}}', '<div style="text-align: center;">{{companyEmail}}</div>', '<div style="text-align: right;">{{companyWebsite}}</div>']],
                    headers: [],
                    hideBorders: true
                },
                styles: { fontSize: 10, color: '#6B7280' }
            },
            {
                id: 'f-mod-2',
                type: 'divider',
                content: {},
                styles: { borderColor: '{{primaryColor}}', borderWidth: 4 }
            }
        ]
    },
    {
        id: 'footer-classic',
        name: 'Classic Signature',
        blocks: [
            {
                id: 'f-clas-1',
                type: 'grid',
                content: {
                    columns: 2,
                    rows: 1,
                    data: [['<br><br><br>___________________________<br><strong>{{authorizedSignatory}}</strong><br>{{companyName}}', '']],
                    headers: [],
                    hideBorders: true
                },
                styles: { fontSize: 12, color: '#111827' }
            }
        ]
    }
];
