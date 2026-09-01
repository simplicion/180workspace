7'use client';

import React, { useMemo } from 'react';
import { Check, FileText, Receipt, FileCheck, Award, ShieldCheck, Briefcase } from 'lucide-react';
import clsx from 'clsx';

interface DocumentCardPreviewProps {
    doc: any;
    isSelected: boolean;
    onToggleSelect: (e: React.MouseEvent) => void;
}

const TYPE_CONFIGS: Record<string, { label: string; bg: string; text: string; border: string; accentColor: string; icon: any }> = {
    contract: { label: 'CONTRACT', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', accentColor: '#7c3aed', icon: FileCheck },
    CONTRACT: { label: 'CONTRACT', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', accentColor: '#7c3aed', icon: FileCheck },
    invoice: { label: 'INVOICE', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accentColor: '#059669', icon: Receipt },
    INVOICE: { label: 'INVOICE', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accentColor: '#059669', icon: Receipt },
    quotation: { label: 'QUOTATION', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accentColor: '#4f46e5', icon: Receipt },
    QUOTATION: { label: 'QUOTATION', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accentColor: '#4f46e5', icon: Receipt },
    proposal: { label: 'PROPOSAL', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accentColor: '#2563eb', icon: Briefcase },
    PROPOSAL: { label: 'PROPOSAL', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accentColor: '#2563eb', icon: Briefcase },
    offer_letter: { label: 'OFFER LETTER', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', accentColor: '#d97706', icon: Award },
    OFFER_LETTER: { label: 'OFFER LETTER', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', accentColor: '#d97706', icon: Award },
    warning_letter: { label: 'WARNING LETTER', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', accentColor: '#e11d48', icon: FileText },
    WARNING_LETTER: { label: 'WARNING LETTER', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', accentColor: '#e11d48', icon: FileText },
    nda: { label: 'NDA', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', accentColor: '#0d9488', icon: ShieldCheck },
    NDA: { label: 'NDA', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', accentColor: '#0d9488', icon: ShieldCheck },
    general: { label: 'DOCUMENT', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', accentColor: '#64748b', icon: FileText },
    GENERAL: { label: 'DOCUMENT', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', accentColor: '#64748b', icon: FileText },
};

const STATUS_CONFIGS: Record<string, { label: string; text: string; bg: string }> = {
    draft: { label: 'Draft', text: 'text-slate-600', bg: 'bg-slate-100/90' },
    Draft: { label: 'Draft', text: 'text-slate-600', bg: 'bg-slate-100/90' },
    sent: { label: 'Sent', text: 'text-blue-600 font-semibold', bg: 'bg-blue-50/90' },
    Sent: { label: 'Sent', text: 'text-blue-600 font-semibold', bg: 'bg-blue-50/90' },
    viewed: { label: 'Viewed', text: 'text-amber-600 font-semibold', bg: 'bg-amber-50/90' },
    Viewed: { label: 'Viewed', text: 'text-amber-600 font-semibold', bg: 'bg-amber-50/90' },
    signed: { label: 'Signed', text: 'text-purple-600 font-bold', bg: 'bg-purple-50/90' },
    Signed: { label: 'Signed', text: 'text-purple-600 font-bold', bg: 'bg-purple-50/90' },
    approved: { label: 'Approved', text: 'text-emerald-600 font-bold', bg: 'bg-emerald-50/90' },
    Approved: { label: 'Approved', text: 'text-emerald-600 font-bold', bg: 'bg-emerald-50/90' },
    paid: { label: 'Paid', text: 'text-green-600 font-bold', bg: 'bg-green-50/90' },
    Paid: { label: 'Paid', text: 'text-green-600 font-bold', bg: 'bg-green-50/90' },
    declined: { label: 'Declined', text: 'text-rose-600 font-bold', bg: 'bg-rose-50/90' },
    Declined: { label: 'Declined', text: 'text-rose-600 font-bold', bg: 'bg-rose-50/90' }
};

export function DocumentCardPreview({ doc, isSelected, onToggleSelect }: DocumentCardPreviewProps) {
    const rawType = doc.documentType || doc.category || doc.folder || 'general';
    const typeConfig = TYPE_CONFIGS[rawType] || TYPE_CONFIGS.general;
    const statusConfig = STATUS_CONFIGS[doc.status || 'draft'] || STATUS_CONFIGS.draft;

    const fileUrl = doc.thumbnailUrl || doc.previewUrl || doc.fileUrl || doc.url || '';
    const ext = fileUrl.split('.').pop()?.split('?')[0]?.toLowerCase();
    const isRealImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);

    // Parse blocks from doc
    const blocks = useMemo(() => {
        if (Array.isArray(doc.blocks) && doc.blocks.length > 0) return doc.blocks;
        if (typeof doc.content === 'string') {
            try {
                const parsed = JSON.parse(doc.content);
                if (Array.isArray(parsed.blocks)) return parsed.blocks;
            } catch {
                return null;
            }
        } else if (doc.content && typeof doc.content === 'object' && Array.isArray(doc.content.blocks)) {
            return doc.content.blocks;
        }
        return null;
    }, [doc]);

    const title = doc.title || doc.name || 'Untitled Document';
    const clientName = doc.clientName || doc.documentDetails?.clientName || '';
    const formattedDate = doc.createdAt
        ? new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : '31 Aug 2026';

    const grandTotalFormatted = doc.grandTotal
        ? `${doc.currency === 'USD' ? '$' : '₹'}${Number(doc.grandTotal).toLocaleString()}`
        : null;

    const isInvoiceOrQuote = rawType.toLowerCase().includes('invoice') || rawType.toLowerCase().includes('quotation');
    const isContractOrNDA = rawType.toLowerCase().includes('contract') || rawType.toLowerCase().includes('proposal') || rawType.toLowerCase().includes('nda');
    const isHR = rawType.toLowerCase().includes('offer') || rawType.toLowerCase().includes('warning') || rawType.toLowerCase().includes('letter') || rawType.toLowerCase().includes('hr');

    return (
        <div className="relative w-full aspect-[16/11] bg-slate-100 dark:bg-slate-800/60 rounded-t-2xl border-b border-gray-200/70 flex items-center justify-center p-2.5 overflow-hidden select-none group/preview">

            {/* Top Left: Category Badge */}
            <div className="absolute top-2.5 left-2.5 z-20">
                <span className={clsx(
                    "px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase border shadow-2xs transition-all flex items-center gap-1",
                    typeConfig.bg,
                    typeConfig.text,
                    typeConfig.border
                )}>
                    {typeConfig.label}
                </span>
            </div>

            {/* Top Right: Status Badge */}
            <div className="absolute top-2.5 right-2.5 z-20">
                <span className={clsx(
                    "text-[9px] font-semibold px-2 py-0.5 rounded-md shadow-2xs border border-gray-200/80 backdrop-blur-xs",
                    statusConfig.bg,
                    statusConfig.text
                )}>
                    {statusConfig.label}
                </span>
            </div>

            {/* Real Image or High-Fidelity A4 Document Canvas */}
            {isRealImage ? (
                <div className="w-[82%] h-[92%] bg-white rounded-md shadow-md border border-gray-200 overflow-hidden relative group-hover:scale-[1.02] transition-transform duration-200">
                    <img
                        src={fileUrl}
                        alt={title}
                        className="w-full h-full object-cover object-top"
                        loading="lazy"
                    />
                </div>
            ) : (
                /* High-Fidelity Miniature A4 Document Page */
                <div
                    className={clsx(
                        "w-[80%] h-[94%] bg-white rounded-md shadow-[0_3px_12px_rgba(0,0,0,0.08)] border border-slate-200/90 flex flex-col p-2.5 overflow-hidden relative transition-all duration-200 group-hover:scale-[1.02]",
                        isSelected && "ring-2 ring-indigo-500 shadow-indigo-500/20"
                    )}
                >
                    {/* Top Branded Corporate Banner Strip */}
                    <div
                        className="h-1.5 w-full rounded-full mb-1.5 flex-shrink-0"
                        style={{ backgroundColor: typeConfig.accentColor }}
                    />

                    {/* Document Header with Real Title & Date */}
                    <div className="flex items-start justify-between gap-1 mb-1.5 pb-1 border-b border-gray-100 flex-shrink-0">
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-bold text-gray-900 truncate leading-tight">
                                {title}
                            </p>
                            {clientName ? (
                                <p className="text-[7.5px] text-indigo-600 font-medium truncate">
                                    To: {clientName}
                                </p>
                            ) : (
                                <p className="text-[7.5px] text-gray-400 font-medium">
                                    {formattedDate}
                                </p>
                            )}
                        </div>
                        <div className="text-[7.5px] font-semibold text-gray-400 shrink-0">
                            {doc.documentNumber || 'DOC-2026'}
                        </div>
                    </div>

                    {/* Document Body Simulation based on Type */}
                    <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        {isInvoiceOrQuote ? (
                            /* Real Invoice / Quotation Miniature Table */
                            <div className="space-y-1">
                                <div className="border border-gray-200 rounded-[3px] overflow-hidden text-[7px]">
                                    <div className="bg-slate-100 px-1 py-0.5 flex justify-between font-bold text-gray-700">
                                        <span>Description</span>
                                        <span>Total</span>
                                    </div>
                                    <div className="px-1 py-0.5 border-t border-gray-100 flex justify-between text-gray-600">
                                        <span className="truncate max-w-[90px]">Consulting & Services</span>
                                        <span className="font-semibold">{grandTotalFormatted || '₹45,000'}</span>
                                    </div>
                                    <div className="px-1 py-0.5 border-t border-gray-100 flex justify-between text-gray-600 bg-gray-50/50">
                                        <span className="truncate max-w-[90px]">Platform Setup & Tax</span>
                                        <span className="font-semibold">Included</span>
                                    </div>
                                </div>

                                {grandTotalFormatted && (
                                    <div className="flex items-center justify-between px-1.5 py-0.5 rounded-[3px] bg-emerald-50 border border-emerald-100 text-[7.5px]">
                                        <span className="font-bold text-emerald-800">Grand Total:</span>
                                        <span className="font-black text-emerald-700">{grandTotalFormatted}</span>
                                    </div>
                                )}
                            </div>
                        ) : isContractOrNDA ? (
                            /* Real Contract / Agreement Miniature Clauses & Signature */
                            <div className="space-y-1">
                                <div className="space-y-0.5 text-[7px] text-gray-600">
                                    <p className="font-bold text-gray-800">1. Scope of Engagement</p>
                                    <p className="line-clamp-2 text-[6.5px] text-gray-500 leading-tight">
                                        This Agreement governs the mutual commercial obligations and terms between both parties.
                                    </p>
                                </div>
                                <div className="pt-1 flex items-end justify-between text-[6.5px]">
                                    <div className="border-t border-gray-400 w-12 pt-0.5">
                                        <span className="text-gray-600 font-bold block">Authorized</span>
                                        <span className="text-[5.5px] text-gray-400">Signatory</span>
                                    </div>
                                    <div className="px-1 py-0.5 rounded-[2px] bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[6.5px]">
                                        E-Signed
                                    </div>
                                </div>
                            </div>
                        ) : isHR ? (
                            /* Real HR / Offer Letter Structure */
                            <div className="space-y-1 text-[7px]">
                                <p className="font-bold text-gray-800">Dear Candidate,</p>
                                <p className="text-[6.5px] text-gray-500 leading-tight line-clamp-2">
                                    We are delighted to extend this formal offer of employment to join our growing enterprise team.
                                </p>
                                <div className="p-1 rounded-[3px] bg-amber-50 border border-amber-200 flex justify-between items-center text-[7px]">
                                    <span className="font-bold text-amber-800">Annual CTC</span>
                                    <span className="font-black text-amber-700">{grandTotalFormatted || 'Confidential'}</span>
                                </div>
                            </div>
                        ) : (
                            /* General Document Structure */
                            <div className="space-y-1 text-[7px]">
                                <div className="h-1.5 w-3/4 bg-gray-300 rounded-[2px]" />
                                <div className="space-y-0.5">
                                    <div className="h-1 w-full bg-gray-200 rounded-[2px]" />
                                    <div className="h-1 w-5/6 bg-gray-200 rounded-[2px]" />
                                    <div className="h-1 w-4/6 bg-gray-200 rounded-[2px]" />
                                </div>
                                <div className="pt-1 flex justify-between items-center text-[6.5px] text-gray-400 border-t border-gray-100">
                                    <span>Verified Document</span>
                                    <span className="text-indigo-600 font-semibold">180 Universal</span>
                                </div>
                            </div>
                        )}

                        {/* Miniature Watermark Stamp */}
                        <div className="flex items-center justify-between text-[6px] text-gray-400 pt-0.5 border-t border-dashed border-gray-100">
                            <span>180Workspace</span>
                            <span className="font-mono">{formattedDate}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Left: Multi-select Checkbox */}
            <div
                className="absolute bottom-2.5 left-2.5 z-20"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(e);
                }}
            >
                <button
                    type="button"
                    className={clsx(
                        "w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer shadow-sm",
                        isSelected
                            ? "bg-indigo-600 border-2 border-indigo-600 text-white"
                            : "bg-white/95 hover:bg-white border-2 border-gray-300 hover:border-indigo-400"
                    )}
                    title={isSelected ? "Deselect document" : "Select document"}
                >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
            </div>
        </div>
    );
}
