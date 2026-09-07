'use client';

import React from 'react';
import { 
    FileEdit, 
    Users, 
    CheckCircle2, 
    CheckCircle, 
    Mail, 
    Share2, 
    ExternalLink, 
    Bot, 
    Trash2, 
    Check, 
    FileText, 
    File, 
    Image, 
    Video,
    Sparkles,
    Database
} from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-200',
    Sent: 'bg-blue-50 text-blue-700 border-blue-200',
    viewed: 'bg-amber-50 text-amber-700 border-amber-200',
    Viewed: 'bg-amber-50 text-amber-700 border-amber-200',
    signed: 'bg-purple-50 text-purple-700 border-purple-200',
    Signed: 'bg-purple-50 text-purple-700 border-purple-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paid: 'bg-green-50 text-green-700 border-green-200',
    Paid: 'bg-green-50 text-green-700 border-green-200',
    declined: 'bg-rose-50 text-rose-700 border-rose-200',
    Declined: 'bg-rose-50 text-rose-700 border-rose-200',
};

function getFileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return Image;
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) return Video;
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return FileText;
    return File;
}

export interface DocumentCardProps {
    doc: any;
    isSelected: boolean;
    isAdminHrFinance?: boolean;
    onToggleSelect: (id: string) => void;
    onClick?: (doc: any) => void;

    onEdit?: (id: string) => void;
    onShare?: (doc: any) => void;
    onDelete?: (doc: any) => void;
    onConvertToInvoice?: (doc: any) => void;
    onAiChat?: (doc: any) => void;
    onPayment?: (doc: any) => void;
    onRemind?: (doc: any) => void;
}

export function DocumentCard({
    doc,
    isSelected,
    isAdminHrFinance = false,
    onToggleSelect,
    onClick,

    onEdit,
    onShare,
    onDelete,
    onConvertToInvoice,
    onAiChat,
    onPayment,
    onRemind,
}: DocumentCardProps) {
    const docId = doc.id || doc._id;
    const statusBadge = STATUS_COLORS[doc.status || 'draft'] || STATUS_COLORS.draft;
    const isReadyForApproval = doc.status === 'signed' || doc.status === 'Signed';
    const FileTypeIcon = getFileIcon(doc.title || doc.name || '');

    return (
        <div 
            className={clsx(
                "card p-0 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group flex flex-col justify-between h-full bg-white border rounded-2xl overflow-hidden text-left relative",
                isSelected ? "border-indigo-400 ring-4 ring-indigo-50" : "border-gray-200/70 hover:border-indigo-200"
            )}
        >
            {/* Document Content & Details */}
            <div className={clsx(
                "flex-1 flex flex-col justify-between p-4 sm:p-5"
            )}>
                <div>
                    {/* Header Row: Checkbox, Icon, Title, Badges */}
                    <div className="flex items-start gap-3.5 relative cursor-pointer" onClick={() => onClick?.(doc)}>
                        {/* Absolute Checkbox Top-Right */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelect(docId);
                            }}
                            className={clsx(
                                "absolute -top-1 -right-1 z-10 p-1.5 transition-opacity duration-200 cursor-pointer",
                                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                            title={isSelected ? "Deselect" : "Select"}
                        >
                            <span className={clsx(
                                "w-5 h-5 rounded-md border shadow-sm flex items-center justify-center transition-all",
                                isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 bg-white hover:border-indigo-400"
                            )}>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </span>
                        </button>

                        {/* Icon */}
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 flex items-center justify-center flex-shrink-0 group-hover:shadow-md group-hover:shadow-indigo-500/20 transition-all duration-300">
                            <FileTypeIcon className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform duration-300" />
                        </div>

                        <div className="flex-1 min-w-0 pr-6">
                            <p 
                                className={clsx(
                                    "font-semibold text-gray-900 truncate leading-tight group-hover:text-indigo-600 transition-colors text-[15px]"
                                )} 
                                title={doc.title || doc.name}
                            >
                                {doc.title || doc.name || 'Untitled Document'}
                            </p>
                            
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                                <span>
                                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                </span>
                                {doc.clientName && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                        <span className="truncate max-w-[100px] flex items-center gap-1">
                                            <Users className="w-3 h-3 text-indigo-400 shrink-0" />
                                            {doc.clientName}
                                        </span>
                                    </>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                {doc.status && (
                                    <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide border', statusBadge)}>
                                        {doc.status}
                                    </span>
                                )}
                                {doc.documentType && (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100/80 text-gray-600 border border-gray-200/50">
                                        {doc.documentType}
                                    </span>
                                )}
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    RAG Indexed
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Financial Grand Total Summary Pill if total exists */}
                    {doc.grandTotal !== undefined && doc.grandTotal > 0 && (
                        <div className="mt-4 py-2 px-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Grand Total</span>
                            <span className="text-sm font-bold text-gray-900">
                                {doc.currency === 'USD' ? '$' : '₹'}{Number(doc.grandTotal).toLocaleString()}
                            </span>
                        </div>
                    )}

                    {/* Two-Step Payment Confirmation Safeguard Banner (Only when Signed) */}
                    {isReadyForApproval && (
                        <div className="mt-2.5 sm:mt-3 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 border border-purple-200/80 flex flex-col gap-2 shadow-2xs">
                            <div>
                                <p className="text-[11px] sm:text-xs font-bold text-purple-900 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                    Client Signed & Accepted
                                </p>
                                <p className="text-[10px] sm:text-[11px] text-purple-700 font-medium truncate">
                                    Did you receive {doc.currency === 'USD' ? '$' : '₹'}{Number(doc.grandTotal || 0).toLocaleString()} payment?
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onPayment?.(doc); }}
                                    className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Yes, Record Payment
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemind?.(doc); }}
                                    className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white border border-purple-200 hover:border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold text-[10px] sm:text-xs transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                                    title="Send friendly payment reminder email to client"
                                >
                                    <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-500" /> Remind
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex items-center gap-0.5 mt-4 pt-3 border-t border-gray-100/80">

                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit?.(docId); }} 
                        className="p-1.5 sm:p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" 
                        title="Edit in Editor"
                    >
                        <FileEdit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>

                    <button 
                        onClick={(e) => { e.stopPropagation(); onShare?.(doc); }} 
                        className="p-1.5 sm:p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" 
                        title="Share & Send with Access Permissions"
                    >
                        <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>

                    {doc.shareToken && (
                        <Link 
                            href={`/f/document/${doc.shareToken}`} 
                            target="_blank" 
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 sm:p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                            title="Public Signing Portal"
                        >
                            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Link>
                    )}

                    {/* Convert to invoice for quotes */}
                    {['QUOTATION', 'SALES_PROPOSAL', 'Quote'].includes(doc.documentType || '') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onConvertToInvoice?.(doc); }}
                            className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                            title="Convert Proposal to Invoice"
                        >
                            → Inv
                        </button>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); onAiChat?.(doc); }}
                        className="p-1.5 sm:p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-auto cursor-pointer"
                        title="Chat with AI"
                    >
                        <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>

                    {isAdminHrFinance && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete?.(doc); }} 
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" 
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
