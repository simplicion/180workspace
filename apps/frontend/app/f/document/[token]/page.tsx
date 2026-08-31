'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  PenTool, 
  CheckCircle, 
  Download, 
  FileText, 
  Printer, 
  Building2, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  XCircle, 
  AlertCircle, 
  MessageSquare,
  Calculator,
  UserCheck
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PaymentCheckoutBlock } from '@/app/(platform)/(workspace-tools-app)/document-editor/_components/blocks/PaymentCheckoutBlock';
import { SignatureBlock } from '@/app/(platform)/(workspace-tools-app)/document-editor/_components/blocks/SignatureBlock';
import { UniversalSignatureModal } from '@/app/(platform)/(workspace-tools-app)/document-editor/_components/UniversalSignatureModal';

export default function PublicDocumentPortalView() {
    const params = useParams();
    const token = params?.token as string;
    
    const [doc, setDoc] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [clientName, setClientName] = useState('');
    const [agreed, setAgreed] = useState(false);
    const sigCanvas = useRef<any>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Decision state
    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [reviewerName, setReviewerName] = useState('');
    const [declineReason, setDeclineReason] = useState('');
    const [approvalNote, setApprovalNote] = useState('');
    const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

    const loadDoc = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const res = await api.get(`/api/v1/workspace-tools/documents/token/${token}`);
            if (res.data?.document) {
                const docData = res.data.document;
                setDoc(docData);
                if (docData.clientName) {
                    setClientName(docData.clientName);
                    setReviewerName(docData.clientName);
                }
            } else {
                toast.error('Document not found');
            }
        } catch (err) {
            console.error('Failed to load document by token:', err);
            toast.error('Document link is invalid or has expired');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDoc();
    }, [token]);

    const handleSign = async () => {
        if (!clientName.trim()) return toast.error('Please enter your full name');
        if (!agreed) return toast.error('Please check the acknowledgment box');
        if (sigCanvas.current?.isEmpty()) return toast.error('Please draw your signature');

        const signatureData = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');

        try {
            setIsSigning(true);
            await api.post(`/api/v1/workspace-tools/documents/token/${token}/sign`, { clientName, signatureData });
            toast.success('Document signed & verified successfully!');
            setIsSignModalOpen(false);
            loadDoc();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to sign document');
        } finally {
            setIsSigning(false);
        }
    };

    const handleDecision = async (action: 'approve' | 'decline') => {
        if (!reviewerName.trim()) {
            return toast.error('Please enter your name');
        }
        if (action === 'decline' && !declineReason.trim()) {
            return toast.error('Please enter the mandatory reason for declining / changes required');
        }

        try {
            setIsSubmittingDecision(true);
            const res = await api.post(`/api/v1/workspace-tools/documents/token/${token}/decision`, {
                action,
                reviewerName,
                reason: action === 'decline' ? declineReason : undefined,
                note: action === 'approve' ? approvalNote : undefined
            });
            toast.success(res.data?.message || (action === 'decline' ? 'Feedback recorded.' : 'Document approved!'));
            setIsDeclineModalOpen(false);
            setIsApproveModalOpen(false);
            loadDoc();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to submit decision');
        } finally {
            setIsSubmittingDecision(false);
        }
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = document.getElementById('public-document-pdf-element');
            if (!element) {
                window.print();
                return;
            }
            const opt = {
                margin: 0.2,
                filename: `${(doc?.title || 'Document').replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
            };
            await html2pdf().set(opt).from(element).save();
            toast.success('PDF downloaded successfully!');
        } catch (err) {
            console.error('Error generating PDF:', err);
            window.print();
        } finally {
            setIsDownloading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Loading secure document...</p>
                </div>
            </div>
        );
    }

    if (doc?.accessGranted === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center animate-in zoom-in-95 duration-200">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-xs">
                        <Lock className="w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1.5">Access Restricted</h2>
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                        This document has been set to <strong>Restricted Access</strong>. Only authorized 180 Workspace team members, assigned clients, and allowed email recipients can view and interact with it.
                    </p>
                    <div className="space-y-2.5">
                        <a
                            href="/login"
                            className="block w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                            Sign In with Workspace Account
                        </a>
                        <p className="text-[11px] text-slate-400">
                            If you believe you should have access, please ask the document owner to share access with your email address.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!doc) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1">Document Unavailable</h2>
                    <p className="text-xs text-slate-500">This document link may have expired or is no longer accessible.</p>
                </div>
            </div>
        );
    }

    const isSigned = doc.status === 'signed' || doc.status === 'Signed' || doc.status === 'approved' || doc.status === 'paid';
    const isDeclined = doc.status === 'declined';
    const decision = doc.decisionData;
    const currencySymbol = doc.currency === 'USD' ? '$' : '₹';

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 print:bg-white flex flex-col">
            {/* Top Security Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 print:hidden sticky top-0 z-20 shadow-xs gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 shrink-0">
                        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">Secure E-Sign & Review Portal</span>
                            {doc.accessType === 'client_only' ? (
                                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" /> Client Only
                                </span>
                            ) : (
                                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                    <ShieldCheck className="w-2.5 h-2.5" /> Public View
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-400">256-bit Encrypted Document</p>
                    </div>
                </div>
                
                <div className="flex items-center flex-wrap gap-1.5 sm:gap-2.5 justify-end sm:justify-start">
                    <button 
                        onClick={handleDownloadPDF} 
                        disabled={isDownloading} 
                        className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                    >
                        <Download className="w-3.5 h-3.5" /> {isDownloading ? 'Downloading...' : 'PDF'}
                    </button>
                    
                    <button 
                        onClick={() => window.print()} 
                        className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                        <Printer className="w-3.5 h-3.5" /> Print
                    </button>

                    {isDeclined ? (
                        <div className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-rose-700 bg-rose-100 border border-rose-200 rounded-xl">
                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Changes Requested
                        </div>
                    ) : !isSigned ? (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <button 
                                onClick={() => setIsDeclineModalOpen(true)}
                                className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
                            >
                                <XCircle className="w-3.5 h-3.5" /> Decline / Feedback
                            </button>
                            <button 
                                onClick={() => setIsSignModalOpen(true)} 
                                className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
                            >
                                <PenTool className="w-3.5 h-3.5" /> Sign & Accept
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-xl">
                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Signed & Approved
                        </div>
                    )}
                </div>
            </div>

            {/* Document Canvas Container */}
            <div className="flex-1 p-2.5 sm:p-6 md:p-12 print:p-0 overflow-y-auto flex justify-center items-start">
                <div 
                    id="public-document-pdf-element" 
                    className="bg-white mx-auto shadow-xl print:shadow-none rounded-2xl min-h-[900px] sm:min-h-[1056px] max-w-[816px] w-full p-4 sm:p-8 md:p-14 text-slate-900 border border-slate-200/80 min-w-0"
                    style={{
                        fontFamily: doc.designSettings?.fontFamily || 'Inter, sans-serif'
                    }}
                >
                    {/* Status Alert Banner */}
                    {isDeclined && (
                        <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 animate-in fade-in">
                            <div className="flex items-start gap-2.5 sm:gap-3">
                                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs sm:text-sm font-bold">Revisions Requested / Declined</h4>
                                    <p className="text-[11px] sm:text-xs text-rose-700 mt-0.5">
                                        Reviewed by <b>{decision?.reviewerName || 'Reviewer'}</b> on {new Date(decision?.timestamp || Date.now()).toLocaleDateString()}
                                    </p>
                                    {decision?.reason && (
                                        <div className="mt-2 p-2 sm:p-2.5 rounded-lg bg-white/80 border border-rose-200 text-[11px] sm:text-xs font-medium text-rose-800">
                                            <b>Reason / Feedback:</b> "{decision.reason}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {doc.status === 'approved' && !doc.signature && (
                        <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 animate-in fade-in">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                <div>
                                    <h4 className="text-xs sm:text-sm font-bold">Document Approved & Accepted</h4>
                                    <p className="text-[11px] sm:text-xs text-emerald-700 mt-0.5">
                                        Approved by <b>{decision?.reviewerName || 'Authorized Signatory'}</b> on {new Date(decision?.timestamp || Date.now()).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Header Details */}
                    <div className="mb-6 sm:mb-8 border-b border-slate-200 pb-4 sm:pb-6 flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-1.5 break-words">{doc.title}</h1>
                            {doc.documentNumber && (
                                <p className="text-[11px] sm:text-xs font-semibold text-indigo-600 uppercase tracking-wider">Doc #: {doc.documentNumber}</p>
                            )}
                        </div>
                        <div className="text-left sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                            <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                {doc.documentType || 'DOCUMENT'}
                            </span>
                            <p className="text-[10px] sm:text-xs text-slate-400 sm:mt-2">
                                {new Date(doc.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* Render Content Blocks */}
                    <div className="space-y-6">
                        {Array.isArray(doc.blocks) && doc.blocks.map((b: any, index: number) => {
                            if (b.type === 'pricing_table') {
                                const c = b.content || {};
                                const items = c.items || [];
                                return (
                                    <div key={b.id || index} className="my-6 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                        <table className="w-full border-collapse text-left text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                                    <th className="p-3">Item / Milestone</th>
                                                    <th className="p-3 text-center w-16">Qty</th>
                                                    <th className="p-3 text-right w-24">Rate</th>
                                                    <th className="p-3 text-center w-16">Tax</th>
                                                    <th className="p-3 text-right w-28">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {items.map((it: any, iIdx: number) => (
                                                    <tr key={it.id || iIdx} className="hover:bg-slate-50/50">
                                                        <td className="p-3 font-medium text-slate-800">{it.description}</td>
                                                        <td className="p-3 text-center text-slate-600">{it.quantity}</td>
                                                        <td className="p-3 text-right font-mono text-slate-600">{currencySymbol}{Number(it.rate || 0).toLocaleString()}</td>
                                                        <td className="p-3 text-center text-slate-500">{it.taxRate || 0}%</td>
                                                        <td className="p-3 text-right font-bold text-slate-900 font-mono">{currencySymbol}{Number(it.amount || 0).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="bg-slate-50/80 p-4 border-t border-slate-200 flex justify-end">
                                            <div className="w-64 text-xs space-y-1.5">
                                                <div className="flex justify-between text-slate-600">
                                                    <span>Subtotal:</span>
                                                    <span className="font-semibold">{currencySymbol}{Number(c.subtotal || 0).toLocaleString()}</span>
                                                </div>
                                                {c.discountAmount > 0 && (
                                                    <div className="flex justify-between text-emerald-600 font-medium">
                                                        <span>Discount:</span>
                                                        <span>-{currencySymbol}{Number(c.discountAmount).toLocaleString()}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-slate-600">
                                                    <span>Tax Amount:</span>
                                                    <span className="font-semibold">+{currencySymbol}{Number(c.taxAmount || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                                                    <span>Grand Total:</span>
                                                    <span className="text-indigo-600">{currencySymbol}{Number(c.grandTotal || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (b.type === 'line' || b.type === 'divider') {
                                const s = b.styles || {};
                                const isVertical = s.orientation === 'vertical';
                                if (isVertical) {
                                    return <div key={b.id || index} className="my-3 mx-auto h-16 border-l" style={{ borderColor: s.borderColor || '#cbd5e1', borderLeftWidth: s.borderWidth || 2, borderLeftStyle: s.borderStyle || 'solid' }} />;
                                }
                                return <hr key={b.id || index} className="my-5" style={{ borderColor: s.borderColor || '#cbd5e1', borderWidth: s.borderWidth || 1, borderStyle: s.borderStyle || 'solid' }} />;
                            }

                            if (b.type === 'box') {
                                const s = b.styles || {};
                                return (
                                    <div 
                                        key={b.id || index} 
                                        className="text-sm leading-relaxed"
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
                                                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50"
                                                    >
                                                        <div className="h-16 border-b border-dashed border-slate-400 flex items-end justify-center pb-2 mb-2 bg-white rounded-t-lg">
                                                            {child.content?.signatureImage ? (
                                                                <img src={child.content.signatureImage} alt="Signature" className="max-h-12 object-contain" />
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400 italic">e-Signature Slot</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-800 text-center">{child.content?.label || 'Authorized Signatory'}</p>
                                                        {child.content?.requireName !== false && (
                                                            <div className="border-b border-slate-300 h-6 flex items-end pb-0.5 mt-2">
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
                                                    {isApp ? '✅ Approved & Accepted' : '❌ Changes Requested'} ({d.reviewerRole || 'Reviewer'})
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
                                        <h4 className="text-sm font-bold text-slate-800">{c.title || 'Document Approval & Authorization'}</h4>
                                        <p className="text-xs text-slate-500 max-w-md mx-auto">{c.description || 'Please review this document and indicate your authorization or submit revisions.'}</p>
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

                            if (b.type === 'payment_checkout' || b.type === 'payment' || b.type === 'checkout') {
                                return (
                                    <div key={b.id || index} className="my-6">
                                        <PaymentCheckoutBlock block={b} isPublicViewer={true} />
                                    </div>
                                );
                            }

                            if (b.type === 'signature') {
                                const mergedBlock = {
                                    ...b,
                                    content: {
                                        ...b.content,
                                        signatureImage: doc.signature?.signatureImage || b.content?.signatureImage,
                                        signatoryName: doc.signature?.signedBy || doc.clientName || b.content?.signatoryName,
                                        signedAt: doc.signature?.signedAt || doc.signedAt || b.content?.signedAt
                                    }
                                };
                                return (
                                    <div key={b.id || index} className="my-6">
                                        <SignatureBlock block={mergedBlock} isPublicViewer={true} />
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            </div>

            {/* Decline / Feedback Reason Modal */}
            {isDeclineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50">
                            <div>
                                <h3 className="font-bold text-rose-900 flex items-center gap-2">
                                    <XCircle className="w-4 h-4 text-rose-600" /> Decline / Request Revisions
                                </h3>
                                <p className="text-xs text-rose-700">Please provide clear feedback for the author</p>
                            </div>
                            <button onClick={() => setIsDeclineModalOpen(false)} className="text-rose-400 hover:text-rose-600 p-1 rounded-lg">
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 mb-1 block">Your Name / Title</label>
                                <input
                                    type="text"
                                    value={reviewerName}
                                    onChange={e => setReviewerName(e.target.value)}
                                    placeholder="e.g. Alex Johnson (Senior Architect)"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                                    Mandatory Reason / Required Changes <span className="text-rose-600">*</span>
                                </label>
                                <textarea
                                    value={declineReason}
                                    onChange={e => setDeclineReason(e.target.value)}
                                    rows={4}
                                    placeholder="Explain specifically what needs to be changed before this document can be approved..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsDeclineModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/50 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDecision('decline')}
                                disabled={isSubmittingDecision || !reviewerName.trim() || !declineReason.trim()}
                                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all"
                            >
                                {isSubmittingDecision ? 'Submitting...' : 'Submit Decline & Feedback'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Accept & Approve Modal */}
            {isApproveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-emerald-100 flex items-center justify-between bg-emerald-50">
                            <div>
                                <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Accept & Approve Document
                                </h3>
                                <p className="text-xs text-emerald-700">Official sign-off confirmation</p>
                            </div>
                            <button onClick={() => setIsApproveModalOpen(false)} className="text-emerald-400 hover:text-emerald-600 p-1 rounded-lg">
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 mb-1 block">Your Name / Title</label>
                                <input
                                    type="text"
                                    value={reviewerName}
                                    onChange={e => setReviewerName(e.target.value)}
                                    placeholder="e.g. Senior Reviewer"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700 mb-1 block">Approval Note (Optional)</label>
                                <input
                                    type="text"
                                    value={approvalNote}
                                    onChange={e => setApprovalNote(e.target.value)}
                                    placeholder="e.g. Looks good to proceed with Phase 1."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsApproveModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/50 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDecision('approve')}
                                disabled={isSubmittingDecision || !reviewerName.trim()}
                                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
                            >
                                {isSubmittingDecision ? 'Approving...' : 'Confirm Approval'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Universal Signature Capture Modal */}
            <UniversalSignatureModal
                isOpen={isSignModalOpen}
                onClose={() => setIsSignModalOpen(false)}
                onSaveSignature={async (sig) => {
                    try {
                        setIsSigning(true);
                        await api.post(`/api/v1/workspace-tools/documents/token/${token}/sign`, {
                            clientName: sig.signerName || clientName || 'Authorized Signatory',
                            signatureData: sig.signatureImage
                        });
                        toast.success('Document signed & verified successfully!');
                        setIsSignModalOpen(false);
                        loadDoc();
                    } catch (error: any) {
                        toast.error(error?.response?.data?.message || 'Failed to sign document');
                    } finally {
                        setIsSigning(false);
                    }
                }}
                initialSignerName={clientName}
                signatoryRole={doc?.client?.name || doc?.variables?.clientName || 'Client Signatory'}
                title="Sign & Accept Document"
            />
        </div>
    );
}
