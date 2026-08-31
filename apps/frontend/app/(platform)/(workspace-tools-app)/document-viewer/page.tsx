'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { 
    ArrowLeft, 
    Edit3, 
    Share2, 
    Download, 
    Printer, 
    Maximize, 
    Minimize, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    Globe, 
    Lock, 
    ExternalLink, 
    CheckCircle, 
    XCircle,
    Calendar,
    Building2,
    DollarSign,
    Clock,
    FileBadge2,
    Calculator
} from 'lucide-react';
import { LogoLoader } from '@workspace/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { generatePDF } from '@/lib/pdf-utils';
import { generateDOCX } from '@/lib/docx-utils';
import { generateHtmlFromBlocks } from '../document-editor/_components/utils/generateHtml';
import { PaymentCheckoutBlock } from '../document-editor/_components/blocks/PaymentCheckoutBlock';
import { SignatureBlock } from '../document-editor/_components/blocks/SignatureBlock';
import ShareDocumentModal from '../_components/ShareDocumentModal';
import Link from 'next/link';

function DocumentViewerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const token = searchParams.get('token');
    const isEmbed = searchParams.get('embed') === 'true';

    const [doc, setDoc] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    // Decision Modal state for AST documents
    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [reviewerName, setReviewerName] = useState('');
    const [reviewerRole, setReviewerRole] = useState('');
    const [declineReason, setDeclineReason] = useState('');
    const [submittingDecision, setSubmittingDecision] = useState(false);

    const viewerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadDocument();
    }, [id, token]);

    async function loadDocument() {
        setLoading(true);
        setError(null);
        try {
            if (id) {
                const res = await api.get(`/api/v1/workspace-tools/documents/${id}`);
                const documentData = res.data?.document || res.data?.article || res.data?.data || res.data;
                setDoc(documentData);
            } else if (token) {
                const res = await api.get(`/api/v1/workspace-tools/documents/token/${token}`);
                const documentData = res.data?.document || res.data?.article || res.data?.data || res.data;
                setDoc(documentData);
            } else {
                setError('No document ID or Share Token provided in URL.');
            }
        } catch (err: any) {
            console.error('Failed to load document:', err);
            setError(err?.response?.data?.message || 'Document not found or inaccessible.');
        } finally {
            setLoading(false);
        }
    }

    // Toggle Fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            viewerRef.current?.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    // Print Document
    const handlePrint = () => {
        window.print();
    };

    // Download handlers
    const handleDownload = async (format: 'pdf' | 'docx') => {
        if (!doc) return;
        const toastId = toast.loading(`Generating ${format.toUpperCase()}...`);
        try {
            const htmlContent = generateHtmlFromBlocks(
                doc.blocks || [],
                doc.documentDetails || {},
                doc.designSettings || {}
            );

            let blob: Blob;
            if (format === 'pdf') {
                blob = await generatePDF(htmlContent);
            } else {
                blob = await generateDOCX(doc.title || 'document', htmlContent);
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(doc.title || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Downloaded ${format.toUpperCase()}`, { id: toastId });
        } catch (err) {
            toast.error(`Failed to export ${format.toUpperCase()}`, { id: toastId });
        }
    };

    // Decision Submissions
    const handleDeclineDecision = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!declineReason.trim()) {
            return toast.error('A mandatory reason is required when declining or requesting changes.');
        }

        setSubmittingDecision(true);
        try {
            const payload = {
                action: 'decline',
                reviewerName: reviewerName.trim() || 'Authorized Reviewer',
                reviewerRole: reviewerRole.trim() || 'Reviewer',
                reason: declineReason.trim()
            };

            if (token) {
                await api.post(`/api/p/document/${token}/decision`, payload);
            } else if (doc?.id) {
                await api.post(`/api/v1/workspace-tools/documents/${doc.id}/decision`, payload);
            }

            toast.success('Feedback recorded & status updated to Changes Requested');
            setIsDeclineModalOpen(false);
            loadDocument();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to submit decision');
        } finally {
            setSubmittingDecision(false);
        }
    };

    const handleApproveDecision = async () => {
        setSubmittingDecision(true);
        try {
            const payload = {
                action: 'approve',
                reviewerName: reviewerName.trim() || 'Authorized Reviewer',
                reviewerRole: reviewerRole.trim() || 'Signatory',
                note: 'Document authorized and approved via Document Viewer.'
            };

            if (token) {
                await api.post(`/api/p/document/${token}/decision`, payload);
            } else if (doc?.id) {
                await api.post(`/api/v1/workspace-tools/documents/${doc.id}/decision`, payload);
            }

            toast.success('Document authorized and approved!');
            setIsApproveModalOpen(false);
            loadDocument();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to approve document');
        } finally {
            setSubmittingDecision(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <LogoLoader className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
                <p className="text-sm font-semibold text-gray-600">Loading Universal Document Viewer...</p>
            </div>
        );
    }

    if (doc?.accessGranted === false) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md text-center animate-in zoom-in-95 duration-200">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-xs">
                        <Lock className="w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1.5">Access Restricted</h2>
                    <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                        This document has been set to <strong>Restricted Access</strong>. Only authorized 180 Workspace team members, assigned clients, and allowed email recipients can view and interact with it.
                    </p>
                    <div className="space-y-2.5">
                        <button
                            onClick={() => router.push('/documents')}
                            className="block w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                            Return to Documents Hub
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                <h2 className="text-lg font-bold text-gray-900 mb-1">Document Unavailable</h2>
                <p className="text-sm text-gray-500 max-w-md mb-6">{error || 'Could not load document details.'}</p>
                <button
                    onClick={() => router.push('/documents')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                    Back to Documents Hub
                </button>
            </div>
        );
    }

    // Determine document type and file properties
    const isASTDocument = Array.isArray(doc.blocks) && doc.blocks.length > 0;
    const fileUrl = doc.url || doc.fileUrl;
    const ext = fileUrl?.split('.').pop()?.split('?')[0]?.toLowerCase();
    const isPDF = ext === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');

    const isDeclined = doc.status === 'declined';
    const isApproved = doc.status === 'approved';
    const isPaid = doc.status === 'paid';
    const isSigned = doc.status === 'signed';
    const decision = doc.decision || doc.reviewDecision;

    return (
        <div ref={viewerRef} className="min-h-screen bg-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
            {/* Header Navigation Toolbar — Hidden in embed/preview mode */}
            {!isEmbed && (
            <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3.5 sticky top-0 z-40 flex flex-col sm:flex-row sm:items-center sm:justify-between shadow-xs print:hidden gap-2 sm:gap-0">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <button
                        onClick={() => router.push('/documents')}
                        className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors p-1.5 rounded-lg hover:bg-slate-100 shrink-0"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Documents</span>
                    </button>

                    <div className="hidden sm:block h-5 w-px bg-slate-200" />

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[150px] sm:max-w-md">
                                {doc.title || doc.name || 'Untitled Document'}
                            </h1>
                            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                {doc.documentType || doc.category || 'DOCUMENT'}
                            </span>
                            {doc.accessType === 'client_only' ? (
                                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shrink-0">
                                    <Lock className="w-2.5 h-2.5" /> Client Only
                                </span>
                            ) : (
                                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                                    <Globe className="w-2.5 h-2.5" /> Public View
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Toolbar Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
                    {/* Status Badge */}
                    <div className="mr-1 sm:mr-2">
                        {isPaid && <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-emerald-100 text-emerald-800">✅ Paid</span>}
                        {isApproved && !isPaid && <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">Approved</span>}
                        {isSigned && !isApproved && !isPaid && <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">Signed</span>}
                        {isDeclined && <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">❌ Changes Requested</span>}
                        {doc.status === 'draft' && <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-slate-100 text-slate-600">Draft</span>}
                    </div>

                    {/* Edit in Editor (if user has access) */}
                    {doc.id && (
                        <button
                            onClick={() => router.push(`/document-editor?id=${doc.id}`)}
                            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1 sm:gap-1.5 shadow-xs"
                        >
                            <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600" />
                            <span className="hidden sm:inline">Edit Document</span>
                            <span className="sm:hidden">Edit</span>
                        </button>
                    )}

                    {/* Share / Send */}
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-1 sm:gap-1.5 shadow-sm shadow-indigo-600/20"
                    >
                        <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline">Share & Send</span>
                        <span className="sm:hidden">Share</span>
                    </button>

                    {/* Downloads & Print */}
                    {isASTDocument && (
                        <>
                            <button
                                onClick={() => handleDownload('pdf')}
                                className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
                                title="Download PDF"
                            >
                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                                onClick={handlePrint}
                                className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
                                title="Print Document"
                            >
                                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                        </>
                    )}

                    <button
                        onClick={toggleFullscreen}
                        className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
                    >
                        {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </button>
                </div>
            </header>
            )}

            {/* Main Document Viewer Canvas */}
            <main className={clsx("flex-1 overflow-hidden flex justify-center items-start", isEmbed ? "p-4" : "p-2.5 sm:p-6 md:p-12 overflow-y-auto")}>
                {/* 1. 180 Workspace Native Document Rendering */}
                {isASTDocument ? (
                    <div 
                        className="w-full max-w-[850px] bg-white rounded-2xl shadow-xl p-4 sm:p-8 md:p-14 border border-slate-200 text-slate-800 min-w-0"
                        style={{
                            fontFamily: doc.designSettings?.fontFamily || 'Inter, sans-serif'
                        }}
                    >
                        {/* Status Banners */}
                        {isDeclined && (
                            <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 animate-in fade-in">
                                <div className="flex items-start gap-2.5 sm:gap-3">
                                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-bold">Revisions Requested / Declined</h4>
                                        <p className="text-[11px] sm:text-xs text-rose-700 mt-0.5">
                                            Reviewed by <b>{decision?.reviewerName || 'Reviewer'}</b> on {new Date(decision?.timestamp || Date.now()).toLocaleDateString()}
                                        </p>
                                        {decision?.reason && (
                                            <div className="mt-2 p-2 sm:p-2.5 rounded-lg bg-white/90 border border-rose-200 text-[11px] sm:text-xs font-medium text-rose-800">
                                                <b>Feedback / Reason:</b> "{decision.reason}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {isApproved && (
                            <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 animate-in fade-in">
                                <div className="flex items-center gap-2.5 sm:gap-3">
                                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-bold">Document Approved & Accepted</h4>
                                        <p className="text-[11px] sm:text-xs text-emerald-700 mt-0.5">
                                            Authorized by <b>{decision?.reviewerName || 'Signatory'}</b> on {new Date(decision?.timestamp || Date.now()).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Document Header Info */}
                        <div className="mb-6 sm:mb-8 border-b border-slate-200 pb-4 sm:pb-6 flex flex-col sm:flex-row items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-1 break-words">{doc.title}</h2>
                                {doc.documentNumber && (
                                    <p className="text-[11px] sm:text-xs font-semibold text-indigo-600 uppercase tracking-wider">Doc #: {doc.documentNumber}</p>
                                )}
                            </div>
                            <div className="text-left sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                                <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                    {doc.documentType || 'DOCUMENT'}
                                </span>
                                <p className="text-[10px] sm:text-xs text-slate-400 sm:mt-2">
                                    {new Date(doc.createdAt || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {/* Render All AST Blocks */}
                        <div className="space-y-6">
                            {doc.blocks.map((b: any, index: number) => {
                                // 1. Pricing Table Block
                                if (b.type === 'pricing_table') {
                                    const c = b.content || {};
                                    const items = c.items || [];
                                    const currency = c.currency || doc.documentDetails?.currency || 'INR';
                                    const currSymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹';

                                    return (
                                        <div key={b.id || index} className="my-6 rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Calculator className="w-4 h-4 text-indigo-600" />
                                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Pricing & Deliverables Table</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-500">Currency: {currSymbol} ({currency})</span>
                                            </div>
                                            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                                            <th className="py-2.5 px-4 w-[50%]">Item & Description</th>
                                                            <th className="py-2.5 px-3 w-[12%] text-center">Qty</th>
                                                            <th className="py-2.5 px-3 w-[18%] text-right">Rate</th>
                                                            <th className="py-2.5 px-3 w-[12%] text-center">Tax</th>
                                                            <th className="py-2.5 px-4 w-[18%] text-right">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 text-xs">
                                                        {items.map((item: any) => (
                                                            <tr key={item.id}>
                                                                <td className="py-3 px-4 font-semibold text-slate-800">{item.description}</td>
                                                                <td className="py-3 px-3 text-center text-slate-600">{item.quantity}</td>
                                                                <td className="py-3 px-3 text-right text-slate-600">{currSymbol}{Number(item.rate || 0).toLocaleString()}</td>
                                                                <td className="py-3 px-3 text-center text-slate-600">{item.taxRate}%</td>
                                                                <td className="py-3 px-4 text-right font-bold text-slate-900">{currSymbol}{Number(item.amount || 0).toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="bg-slate-50/70 p-4 border-t border-slate-200 flex justify-end">
                                                <div className="w-64 space-y-1.5 text-xs">
                                                    <div className="flex justify-between text-slate-500">
                                                        <span>Subtotal:</span>
                                                        <span className="font-semibold text-slate-800">{currSymbol}{Number(c.subtotal || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-slate-500">
                                                        <span>Estimated Tax:</span>
                                                        <span className="font-semibold text-slate-800">{currSymbol}{Number(c.taxAmount || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
                                                        <span>Grand Total:</span>
                                                        <span className="text-indigo-600">{currSymbol}{Number(c.grandTotal || 0).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                // 2. Container Block (Flex Row & Column Layout with Multi-Slot Positioning)
                                if (b.type === 'container') {
                                    const c = b.content || {};
                                    const direction = c.direction || 'row';
                                    const justify = c.justifyContent || 'space-between';
                                    const align = c.alignItems || 'center';
                                    const gap = c.gap !== undefined ? Number(c.gap) : 24;
                                    const wrap = c.wrap !== false;
                                    const s = b.styles || {};
                                    const children = c.children || [];

                                    return (
                                        <div
                                            key={b.id || index}
                                            style={{
                                                display: 'flex',
                                                flexDirection: direction,
                                                justifyContent: justify,
                                                alignItems: align,
                                                gap: `${gap}px`,
                                                flexWrap: wrap ? 'wrap' : 'nowrap',
                                                backgroundColor: s.backgroundColor || 'transparent',
                                                borderColor: s.borderColor || 'transparent',
                                                borderStyle: s.borderStyle || 'none',
                                                borderWidth: `${s.borderWidth || 0}px`,
                                                borderRadius: `${s.borderRadius || 0}px`,
                                                padding: s.padding || '0px'
                                            }}
                                            className="w-full my-6"
                                        >
                                            {children.map((child: any, cIdx: number) => {
                                                if (child.type === 'signature') {
                                                    return (
                                                        <div 
                                                            key={child.id || cIdx} 
                                                            style={{ flex: child.flex || (direction === 'row' ? '1 1 0px' : 'none'), minWidth: '220px', width: child.width }}
                                                            className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-center"
                                                        >
                                                            <div className="h-16 border-b border-dashed border-slate-400 flex items-end justify-center pb-2 mb-2 bg-white rounded-t-lg">
                                                                {child.content?.signatureImage ? (
                                                                    <img src={child.content.signatureImage} alt="Signature" className="max-h-12 object-contain" />
                                                                ) : (
                                                                    <span className="text-[11px] text-slate-400 italic">Signature Slot</span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-800">{child.content?.label || 'Authorized Signatory'}</p>
                                                            {child.content?.requireName !== false && (
                                                                <div className="border-b border-slate-300 h-6 flex items-end pb-0.5 mt-2 justify-center">
                                                                    <span className="text-[10px] text-slate-400 font-medium">Name: ________________</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                if (child.type === 'text') {
                                                    return (
                                                        <div 
                                                            key={child.id || cIdx}
                                                            style={{ flex: child.flex || (direction === 'row' ? '1 1 0px' : 'none'), minWidth: '200px', width: child.width }}
                                                            className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap"
                                                        >
                                                            {child.content?.text || ''}
                                                        </div>
                                                    );
                                                }

                                                if (child.type === 'box') {
                                                    return (
                                                        <div 
                                                            key={child.id || cIdx}
                                                            style={{
                                                                flex: child.flex || (direction === 'row' ? '1 1 0px' : 'none'),
                                                                minWidth: '200px',
                                                                width: child.width,
                                                                backgroundColor: child.styles?.backgroundColor || '#f8fafc',
                                                                borderColor: child.styles?.borderColor || '#e2e8f0',
                                                                borderRadius: `${child.styles?.borderRadius || 8}px`,
                                                                padding: child.styles?.padding || '12px'
                                                            }}
                                                            className="border text-xs text-slate-700 whitespace-pre-wrap"
                                                        >
                                                            {child.content?.text || ''}
                                                        </div>
                                                    );
                                                }

                                                return null;
                                            })}
                                        </div>
                                    );
                                }

                                // 3. Approval Buttons / Decision Engine
                                if (b.type === 'approval_buttons' || b.type === 'decision') {
                                    const c = b.content || {};
                                    const d = c.decision || decision;
                                    const isApp = d?.status === 'approved';
                                    const isDec = d?.status === 'declined';

                                    if (d && (isApp || isDec)) {
                                        return (
                                            <div key={b.id || index} className={`my-6 p-4 rounded-xl border ${isApp ? 'bg-emerald-50/90 border-emerald-200' : 'bg-rose-50/90 border-rose-200'}`}>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs font-bold uppercase tracking-wider ${isApp ? 'text-emerald-800' : 'text-rose-800'}`}>
                                                        {isApp ? '✅ Authorized & Approved' : '❌ Changes Requested'} ({d.reviewerRole || 'Reviewer'})
                                                    </span>
                                                    <span className="text-[11px] text-slate-500">{new Date(d.timestamp || Date.now()).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-xs text-slate-700 mt-1">Reviewed by <b>{d.reviewerName || 'Reviewer'}</b></p>
                                                {d.reason && (
                                                    <div className="mt-2 p-2.5 bg-white rounded-lg border border-rose-200 text-xs text-rose-900">
                                                        <b>Feedback / Reason:</b> "{d.reason}"
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={b.id || index} className="my-6 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                                            <h4 className="text-sm font-bold text-slate-800">{c.title || 'Reviewer Sign-Off & Authorization'}</h4>
                                            <p className="text-xs text-slate-500 max-w-md mx-auto">{c.description || 'Review this document and submit your authorization or request changes.'}</p>
                                            <div className="flex items-center justify-center gap-3 pt-2">
                                                <button
                                                    onClick={() => setIsDeclineModalOpen(true)}
                                                    className="px-4 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" /> {c.declineLabel || 'Decline / Changes'}
                                                </button>
                                                <button
                                                    onClick={() => setIsApproveModalOpen(true)}
                                                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" /> {c.acceptLabel || 'Accept & Approve'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                // 4. Rich Text & Headings
                                if (b.type === 'text' || b.type === 'heading') {
                                    const s = b.styles || {};
                                    return (
                                        <div 
                                            key={b.id || index}
                                            className="leading-relaxed"
                                            style={{
                                                fontSize: s.fontSize ? `${s.fontSize}px` : undefined,
                                                fontWeight: s.fontWeight || undefined,
                                                fontFamily: s.fontFamily || undefined,
                                                lineHeight: s.lineHeight || undefined,
                                                letterSpacing: s.letterSpacing || undefined,
                                                textAlign: s.textAlign || s.alignment || 'left',
                                                color: s.color || '#1e293b',
                                                backgroundColor: s.highlightColor || s.backgroundColor || 'transparent'
                                            }}
                                            dangerouslySetInnerHTML={{ __html: b.content?.text || '' }}
                                        />
                                    );
                                }

                                // 5. Box Block
                                if (b.type === 'box') {
                                    const s = b.styles || {};
                                    return (
                                        <div
                                            key={b.id || index}
                                            style={{
                                                backgroundColor: s.backgroundColor || '#f8fafc',
                                                borderColor: s.borderColor || '#e2e8f0',
                                                borderStyle: s.borderStyle || 'solid',
                                                borderWidth: s.borderWidth !== undefined ? `${s.borderWidth}px` : '1px',
                                                borderRadius: s.borderRadius !== undefined ? `${s.borderRadius}px` : '12px',
                                                boxShadow: s.boxShadow || '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                                                padding: s.padding ? `${s.padding}` : '20px',
                                                color: s.color || '#1e293b'
                                            }}
                                            dangerouslySetInnerHTML={{ __html: b.content?.text || '' }}
                                        />
                                    );
                                }

                                // 6. Line Divider Block
                                if (b.type === 'line' || b.type === 'divider') {
                                    const s = b.styles || {};
                                    return (
                                        <div key={b.id || index} className="my-4 flex justify-center">
                                            <hr 
                                                style={{
                                                    border: 'none',
                                                    borderTop: `${s.borderWidth || 1}px ${s.borderStyle || 'solid'} ${s.borderColor || '#cbd5e1'}`,
                                                    width: s.width || '100%'
                                                }}
                                            />
                                        </div>
                                    );
                                }

                                // 7. Standalone Signature Block
                                if (b.type === 'signature') {
                                    return (
                                        <div key={b.id || index} className="my-6">
                                            <SignatureBlock block={b} isPublicViewer={true} />
                                        </div>
                                    );
                                }

                                // 8. Payment & Checkout Block
                                if (b.type === 'payment_checkout' || b.type === 'payment' || b.type === 'checkout') {
                                    return (
                                        <div key={b.id || index} className="my-6">
                                            <PaymentCheckoutBlock block={b} isPublicViewer={true} />
                                        </div>
                                    );
                                }

                                return null;
                            })}
                        </div>
                    </div>
                ) : isPDF ? (
                    // 2. External PDF Document Viewer
                    <div className="w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                        <iframe src={fileUrl} className="w-full h-full border-0" title={doc.title || 'PDF Viewer'} />
                    </div>
                ) : isImage ? (
                    // 3. Image Document Viewer
                    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-4 border border-slate-200 flex justify-center">
                        <img src={fileUrl} alt={doc.title || 'Document Image'} className="max-h-[80vh] object-contain rounded-xl" />
                    </div>
                ) : (
                    // 4. Fallback File Viewer
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center space-y-4">
                        <FileText className="w-16 h-16 text-indigo-500 mx-auto" />
                        <div>
                            <h3 className="text-base font-bold text-slate-800">{doc.title || doc.name || 'Document File'}</h3>
                            <p className="text-xs text-slate-500 mt-1">This document format is available for direct download and viewing.</p>
                        </div>
                        {fileUrl && (
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                            >
                                <Download className="w-4 h-4" /> Download Document
                            </a>
                        )}
                    </div>
                )}
            </main>

            {/* Decision Decline Modal */}
            {isDeclineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                                <XCircle className="w-5 h-5" /> Request Document Changes
                            </div>
                            <button onClick={() => setIsDeclineModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleDeclineDecision} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Your Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={reviewerName}
                                    onChange={(e) => setReviewerName(e.target.value)}
                                    placeholder="e.g. Eleanor Vance"
                                    className="w-full text-xs p-2.5 border rounded-xl focus:ring-2 focus:ring-rose-500/20 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Required Changes / Reason (Mandatory)</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={declineReason}
                                    onChange={(e) => setDeclineReason(e.target.value)}
                                    placeholder="Specify exactly what amendments or changes are requested..."
                                    className="w-full text-xs p-2.5 border rounded-xl focus:ring-2 focus:ring-rose-500/20 outline-none resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsDeclineModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingDecision}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20"
                                >
                                    {submittingDecision ? 'Submitting...' : 'Submit Revisions'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Decision Approve Modal */}
            {isApproveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                                <CheckCircle className="w-5 h-5" /> Authorize & Approve Document
                            </div>
                            <button onClick={() => setIsApproveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Your Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={reviewerName}
                                    onChange={(e) => setReviewerName(e.target.value)}
                                    placeholder="e.g. Eleanor Vance"
                                    className="w-full text-xs p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                />
                            </div>

                            <p className="text-xs text-slate-500">
                                By approving, you authorize the contents of this document. An audit record of this approval will be logged.
                            </p>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsApproveModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApproveDecision}
                                    disabled={submittingDecision || !reviewerName.trim()}
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                                >
                                    {submittingDecision ? 'Authorizing...' : 'Authorize & Sign Off'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Universal Share & Send Modal */}
            <ShareDocumentModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                documentId={doc.id || doc._id}
                documentTitle={doc.title || doc.name || 'Document'}
                initialShareToken={doc.shareToken}
                initialAccessType={doc.accessType || 'public'}
                clientName={doc.clientName || doc.documentDetails?.clientName}
                clientEmail={doc.clientEmail || doc.documentDetails?.clientEmail}
                onAccessTypeUpdated={(newType) => setDoc({ ...doc, accessType: newType })}
            />
        </div>
    );
}

export default function DocumentViewerPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LogoLoader className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        }>
            <DocumentViewerContent />
        </Suspense>
    );
}
