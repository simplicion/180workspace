'use client';

import React from 'react';
import { 
    Calculator, 
    Type, 
    Grid, 
    Minus, 
    Image as ImageIcon, 
    FileBadge2, 
    Check, 
    LayoutGrid,
    List,
    CreditCard,
    Scissors,
    FilePlus
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Block } from '../../../../../redux/slices/documentSlice';

export interface ElementBlockDefinition {
    type: string;
    label: string;
    subtitle?: string;
    category: 'base' | 'layout' | 'commercial' | 'legal';
    icon: React.ReactNode;
}

export function createDefaultDocumentBlock(type: string, docDetails?: any): Block {
    const id = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 6);
    switch (type) {
        case 'text':
        case 'heading':
            return {
                id,
                type: 'text',
                content: { text: '<p>Start typing paragraph text, terms, or heading content...</p>', level: 'p' },
                styles: { fontSize: 16, alignment: 'left', color: '#111827' }
            };
        case 'line':
        case 'divider':
            return {
                id,
                type: 'line',
                content: { isPageBreak: false },
                styles: { borderWidth: 2, borderStyle: 'solid', borderColor: '#cbd5e1', width: '100%', orientation: 'horizontal', margin: 16 }
            };
        case 'image':
        case 'media':
            return {
                id,
                type: 'image',
                content: { url: '', caption: '' },
                styles: { alignment: 'center' }
            };
        case 'list':
            return {
                id,
                type: 'list',
                content: { items: ['First list item', 'Second list item', 'Third list item'] }
            };
        case 'pagebreak':
            return {
                id,
                type: 'line',
                content: { isPageBreak: true },
                styles: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#94a3b8', width: '100%', orientation: 'horizontal', margin: 16 }
            };
        case 'box':
            return {
                id,
                type: 'box',
                content: { text: 'Type callout description, notes, or section container content...' },
                styles: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1, borderStyle: 'solid', borderRadius: 12, padding: '16px', color: '#1e293b', fontSize: 14 }
            };
        case 'container':
        case 'row':
        case 'column':
            return {
                id,
                type: 'container',
                content: {
                    direction: 'row',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    gap: 16,
                    wrap: true,
                    children: []
                },
                styles: { backgroundColor: 'transparent', borderColor: '#e2e8f0', borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: '16px', minHeight: '80px' }
            };
        case 'grid':
            return {
                id,
                type: 'grid',
                content: { text: 'Data Grid' }
            };
        case 'pricing_table':
            return {
                id,
                type: 'pricing_table',
                content: {
                    currency: docDetails?.currency || 'INR',
                    items: [
                        { id: 'item-1', description: 'Standard Service Package', quantity: 1, rate: 1000, taxRate: 18, amount: 1000 },
                        { id: 'item-2', description: 'Implementation & Setup', quantity: 1, rate: 500, taxRate: 18, amount: 500 }
                    ],
                    subtotal: 1500,
                    taxAmount: 270,
                    grandTotal: 1770,
                    discount: 0
                }
            };
        case 'payment_checkout':
        case 'payment':
        case 'checkout':
            return {
                id,
                type: 'payment_checkout',
                content: {
                    mode: 'button',
                    buttonText: 'Pay via Secure Gateway',
                    paymentUrl: 'https://razorpay.me/@yourcompany',
                    gateway: 'razorpay',
                    amountText: '₹15,000.00',
                    buttonStyle: 'gradient',
                    buttonColor: '#4f46e5',
                    buttonAlignment: 'center',
                    milestoneTitle: 'Project Payment Milestones',
                    milestoneCurrency: docDetails?.currency || 'INR',
                    milestones: [
                        { id: 'm1', title: 'Phase 1: Project Kickoff & UI Designs', percentage: 40, amount: 6000, dueDate: 'Upon Signing', status: 'pending' },
                        { id: 'm2', title: 'Phase 2: Core Development & MVP Demo', percentage: 40, amount: 6000, dueDate: 'Net 15 Days', status: 'pending' },
                        { id: 'm3', title: 'Phase 3: Final Deployment & Handover', percentage: 20, amount: 3000, dueDate: 'Project Completion', status: 'pending' }
                    ],
                    bankDetailsTitle: 'Direct Bank / Wire Transfer Details',
                    accountHolderName: docDetails?.companyName || 'Acme Technologies Pvt Ltd',
                    bankName: 'HDFC Bank',
                    accountNumber: '50200012345678',
                    ifscOrSwiftCode: 'HDFC0001234',
                    upiId: 'acme@hdfcbank',
                    iban: '',
                    additionalInstructions: 'Please include the document/invoice number in your payment reference note.'
                },
                styles: { padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }
            };
        case 'signature':
            return {
                id,
                type: 'signature',
                content: {
                    label: 'Authorized Signatory',
                    requireName: true,
                    signatoryName: '',
                    signatoryEmail: ''
                },
                styles: { width: '100%' }
            };
        case 'approval_buttons':
        case 'decision':
            return {
                id,
                type: 'approval_buttons',
                content: {
                    title: 'Client Decision & Approval',
                    acceptLabel: 'Approve & Accept',
                    declineLabel: 'Request Revision',
                    requireRevisionNotes: true,
                    status: 'pending'
                }
            };
        default:
            return {
                id,
                type: 'text',
                content: { text: '<p>New block content...</p>', level: 'p' },
                styles: { fontSize: 16, alignment: 'left', color: '#111827' }
            };
    }
}

const BASE_ELEMENTS: ElementBlockDefinition[] = [
    {
        type: 'text',
        label: 'Text',
        subtitle: 'Paragraph & Headings',
        category: 'base',
        icon: <Type className="w-5 h-5 text-gray-500" />
    },
    {
        type: 'image',
        label: 'Image',
        subtitle: 'Photos & Logos',
        category: 'base',
        icon: <ImageIcon className="w-5 h-5 text-gray-500" />
    },
    {
        type: 'list',
        label: 'List',
        subtitle: 'Bullet & Numbered',
        category: 'base',
        icon: <List className="w-5 h-5 text-gray-500" />
    },
    {
        type: 'divider',
        label: 'Divider',
        subtitle: 'Line Separator',
        category: 'base',
        icon: <Minus className="w-5 h-5 text-gray-500" />
    }
];

const LAYOUT_ELEMENTS: ElementBlockDefinition[] = [
    {
        type: 'container',
        label: 'Container',
        subtitle: 'Flexbox Layout',
        category: 'layout',
        icon: <LayoutGrid className="w-5 h-5 text-gray-500" />
    },
    {
        type: 'grid',
        label: 'Data Grid',
        subtitle: 'Multi-column Table',
        category: 'layout',
        icon: <Grid className="w-5 h-5 text-gray-500" />
    },
    {
        type: 'pagebreak',
        label: 'Page Break',
        subtitle: 'Force a new page',
        category: 'layout',
        icon: <Scissors className="w-5 h-5 text-gray-500" />
    }
];

const COMMERCIAL_ELEMENTS: ElementBlockDefinition[] = [
    {
        type: 'pricing_table',
        label: 'Pricing Table',
        subtitle: 'Line Items & Total',
        category: 'commercial',
        icon: <Calculator className="w-5 h-5 text-gray-500" />
    },
    {
        type: 'payment_checkout',
        label: 'Payment & Checkout',
        subtitle: 'Button, Milestones, Bank',
        category: 'commercial',
        icon: <CreditCard className="w-5 h-5 text-gray-500" />
    }
];

const LEGAL_ELEMENTS: ElementBlockDefinition[] = [
    {
        type: 'signature',
        label: 'Signature',
        subtitle: 'E-Signature Slot',
        category: 'legal',
        icon: <FileBadge2 className="w-5 h-5 text-gray-500" />
    },
    {
        type: 'approval_buttons',
        label: 'Approval',
        subtitle: 'Decision Buttons',
        category: 'legal',
        icon: <Check className="w-5 h-5 text-gray-500" />
    }
];

interface ElementsCatalogPanelProps {
    isFullscreen: boolean;
    documentDetails: any;
    onAddBlock: (block: any) => void;
}

export function ElementsCatalogPanel({
    isFullscreen,
    documentDetails,
    onAddBlock
}: ElementsCatalogPanelProps) {
    const handleSelectBlock = (type: string, label: string) => {
        const block = createDefaultDocumentBlock(type, documentDetails);
        onAddBlock(block);
        toast.success(`Added ${label}`, {
            id: 'element-added-toast',
            duration: 1200
        });
    };

    return (
        <aside 
            aria-label="Add Elements Panel"
            className={clsx(
                "w-72 backdrop-blur-md bg-white/80 dark:bg-black/60 border-r border-gray-200 dark:border-white/10 flex flex-col flex-shrink-0 overflow-hidden select-none z-20 transition-all duration-300 shadow-lg shadow-black/5",
                isFullscreen ? "w-0 border-none opacity-0 pointer-events-none" : "opacity-100"
            )}
        >
            {/* Minimal Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between flex-shrink-0 bg-white/40 dark:bg-black/20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                        <LayoutGrid className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-none">
                            Elements
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-tight mt-1">
                            Click or drag to canvas
                        </p>
                    </div>
                </div>
            </div>

            {/* Compact Elements Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* Base Elements */}
                <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-1 mb-3">
                        Base
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        {BASE_ELEMENTS.map((item) => (
                            <ElementTile
                                key={item.type}
                                item={item}
                                onSelect={() => handleSelectBlock(item.type, item.label)}
                            />
                        ))}
                    </div>
                </div>

                {/* Layout Elements */}
                <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-1 mb-3">
                        Layout
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        {LAYOUT_ELEMENTS.map((item) => (
                            <ElementTile
                                key={item.type}
                                item={item}
                                onSelect={() => handleSelectBlock(item.type, item.label)}
                            />
                        ))}
                    </div>
                </div>

                {/* Commercial */}
                <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-1 mb-3">
                        Commercial
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        {COMMERCIAL_ELEMENTS.map((item) => (
                            <ElementTile
                                key={item.type}
                                item={item}
                                onSelect={() => handleSelectBlock(item.type, item.label)}
                            />
                        ))}
                    </div>
                </div>

                {/* Legal */}
                <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-1 mb-3">
                        Signatures & Decisions
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        {LEGAL_ELEMENTS.map((item) => (
                            <ElementTile
                                key={item.type}
                                item={item}
                                onSelect={() => handleSelectBlock(item.type, item.label)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );
}

interface ElementTileProps {
    item: ElementBlockDefinition;
    onSelect: () => void;
}

function ElementTile({ item, onSelect }: ElementTileProps) {
    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('newBlockType', item.type);
                e.dataTransfer.setData('application/vnd.builder.element', item.type);
                e.dataTransfer.setData('text/plain', item.type);
                e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={onSelect}
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-sm text-gray-700 dark:text-gray-300 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/30 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-200 text-center select-none group min-h-[84px]"
            title={`Click or drag to add ${item.label}`}
        >
            <div className="text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:-translate-y-0.5 transition-transform duration-200 mb-1.5">
                {item.icon}
            </div>
            <span className="text-[12px] font-bold tracking-tight text-gray-900 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                {item.label}
            </span>
            {item.subtitle && (
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium mt-0.5 truncate w-full px-1">
                    {item.subtitle}
                </span>
            )}
        </div>
    );
}
