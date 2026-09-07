'use client';

import { LogoLoader, ConfirmModal } from "@workspace/ui";
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useGet180DocumentsQuery, useDeleteArticleMutation, useApproveDocumentMutation, useConvertToInvoiceMutation, useSendPaymentReminderMutation } from '@/redux/api/knowledgeApi';
import { useGetContractsQuery } from '@/redux/api/contractApi';
import { useRouter } from 'next/navigation';
import { FileText, Upload, Search, Plus, Download, Trash2, File, FolderOpen, Image, Video, X, ExternalLink, Tags, Mail, LayoutTemplate, Link2, Users, CheckCircle, AlertCircle, FileIcon, ImageIcon, ChevronDown, Bot, ShieldAlert, FileEdit, Receipt, Sparkles, CheckCircle2, ArrowRightCircle, Share2, CheckSquare, Square, MinusSquare, Layers, LayoutGrid, Check, HardDrive, Cloud, Database } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/lib/useSubscription';
import TemplatesListDrawer from '@/app/(platform)/(workspace-tools-app)/_components/TemplatesListDrawer';
import DocumentAIChatDrawer from '@/app/(platform)/(workspace-tools-app)/_components/DocumentAIChatDrawer';
import CreateWithAIModal from '@/app/(platform)/(workspace-tools-app)/_components/CreateWithAIModal';
import FileUploadModal from '@/components/shared/FileUploadModal';
import QuoteModal from '@/app/(platform)/(workspace-tools-app)/_components/QuoteModal';
import EmailQuoteModal from '@/app/(platform)/(workspace-tools-app)/_components/EmailQuoteModal';
import DigitalSignatureModal from '@/app/(platform)/(workspace-tools-app)/_components/DigitalSignatureModal';
import RecordPaymentModal from '@/app/(platform)/(workspace-tools-app)/_components/RecordPaymentModal';
import ShareDocumentModal from '@/app/(platform)/(workspace-tools-app)/_components/ShareDocumentModal';
import { CreateRagVaultModal } from './_components/CreateRagVaultModal';
import { RagVaultsDrawer } from './_components/RagVaultsDrawer';
import { DocumentCard } from './_components/DocumentCard';

interface Document { 
    id?: string;
    _id?: string;
    title?: string;
    name?: string;
    documentNumber?: string;
    documentType?: string;
    status?: string;
    url?: string;
    fileUrl?: string;
    type?: string;
    folder?: string;
    category?: string;
    createdAt: string;
    taggedUsers?: { _id: string; name: string; email: string }[];
    notes?: string;
    isArticle?: boolean;
    isContract?: boolean;
    isInvoice?: boolean;
    isQuote?: boolean;
    clientName?: string;
    clientEmail?: string;
    grandTotal?: number;
    currency?: string;
    shareToken?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
    { key: 'all', label: 'All Documents' },
    { key: 'Finance', label: 'Finance & Invoices' },
    { key: 'Contract', label: 'Contracts & Proposals' },
    { key: 'HR', label: 'HR & Letters' },
    { key: 'Legal', label: 'Legal & NDAs' },
    { key: 'Project', label: 'Project SOWs' },
    { key: 'General', label: 'General' },
];

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-200',
    Sent: 'bg-blue-50 text-blue-700 border-blue-200',
    viewed: 'bg-amber-50 text-amber-700 border-amber-200',
    signed: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold animate-pulse',
    Signed: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold animate-pulse',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    paid: 'bg-green-50 text-green-700 border-green-200 font-semibold',
    Paid: 'bg-green-50 text-green-700 border-green-200 font-semibold',
};

const TYPE_COLORS: Record<string, string> = {
    Contract: 'bg-blue-50 text-blue-700 border-blue-100',
    INVOICE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    QUOTATION: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    OFFER_LETTER: 'bg-purple-50 text-purple-700 border-purple-100',
    WARNING_LETTER: 'bg-rose-50 text-rose-700 border-rose-100',
    NDA: 'bg-amber-50 text-amber-700 border-amber-100',
    COMPANY_POLICY: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    Finance: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    Legal: 'bg-amber-50 text-amber-700 border-amber-100',
    Project: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    General: 'bg-gray-50 text-gray-600 border-gray-100',
};

function getFileIcon(name: string) {
    const ext = name?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return Image;
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) return Video;
    if (['pdf', 'doc', 'docx', 'txt', 'html'].includes(ext || '')) return FileText;
    return File;
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({ doc, onClose }: { doc: any; onClose: () => void }) {
    const docUrl = doc.url || doc.fileUrl;
    const docTitle = doc.title || doc.name;
    const ext = docUrl?.split('.').pop()?.split('?')[0]?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
    const isPDF = ext === 'pdf';
    const isDeclined = doc.status === 'declined';
    const isApproved = doc.status === 'approved';
    const decision = doc.decisionData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 truncate max-w-md">{docTitle}</h3>
                            <p className="text-xs text-gray-400">{doc.category || doc.documentType || 'General'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {doc.shareToken && (
                            <Link href={`/f/document/${doc.shareToken}`} target="_blank" className="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold flex items-center gap-1">
                                <ExternalLink className="w-3.5 h-3.5" /> Client Portal
                            </Link>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-auto flex flex-col items-center bg-gray-50/50">
                    {/* Status Banners */}
                    {isDeclined && (
                        <div className="w-full max-w-3xl mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold">Reviewer Declined / Requested Changes</h4>
                                    <p className="text-xs text-rose-700 mt-0.5">
                                        Reviewed by <b>{decision?.reviewerName || 'Reviewer'}</b> on {new Date(decision?.timestamp || Date.now()).toLocaleDateString()}
                                    </p>
                                    {decision?.reason && (
                                        <div className="mt-2 p-2.5 rounded-lg bg-white/90 border border-rose-200 text-xs font-medium text-rose-900">
                                            <b>Reason:</b> "{decision.reason}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {isApproved && (
                        <div className="w-full max-w-3xl mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold">Document Approved & Accepted</h4>
                                    <p className="text-xs text-emerald-700 mt-0.5">
                                        Approved by <b>{decision?.reviewerName || 'Authorized Signatory'}</b> on {new Date(decision?.timestamp || Date.now()).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {isImage ? (
                        <img src={docUrl} alt={docTitle} className="max-w-full max-h-[70vh] rounded-lg object-contain" />
                    ) : isPDF ? (
                        <iframe src={docUrl} className="w-full h-[70vh] rounded-lg border-0" title={docTitle} />
                    ) : (
                        <div className="text-center py-12">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-600 font-medium mb-4">Preview not available directly in modal</p>
                            {docUrl && (
                                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2">
                                    <Download className="w-4 h-4" /> Open / Download File
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
    const [docs, setDocs] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [showUpload, setShowUpload] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showCreateAI, setShowCreateAI] = useState(false);
    const [showCreateVaultModal, setShowCreateVaultModal] = useState(false);
    const [showVaultsDrawer, setShowVaultsDrawer] = useState(false);
    const [customCategories, setCustomCategories] = useState<{ id: string; name: string }[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
    const [showAiChat, setShowAiChat] = useState(false);
    const [selectedAiDoc, setSelectedAiDoc] = useState<Document | null>(null);
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [editingQuote, setEditingQuote] = useState<any | null>(null);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [selectedEmailQuote, setSelectedEmailQuote] = useState<any | null>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [storageStats, setStorageStats] = useState<{ used: number, total: number, usagePercent: number } | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [selectedPaymentDoc, setSelectedPaymentDoc] = useState<any | null>(null);
    const [shareModalDoc, setShareModalDoc] = useState<any | null>(null);
    
    // Multi-select & Batch Operations State
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);
    const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);

    const { user } = useAuth();
    const subscription = useSubscription();
    const router = useRouter();
    const [deleteArticle] = useDeleteArticleMutation();
    const [approveDocMutation] = useApproveDocumentMutation();
    const [sendReminderMutation] = useSendPaymentReminderMutation();
    const [convertInvoiceMutation] = useConvertToInvoiceMutation();
    const { data: unifiedData, isLoading: articlesLoading, refetch: refetchArticles } = useGet180DocumentsQuery({ search: search || undefined });

    // Fast In-Memory SWR Cache for 0ms Instant Navigation (Slack/Notion Gold Standard)
    const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

    function loadDocs() {
        const cacheKey = `documents:${search || 'all'}`;
        const cached = swrCacheRef.current.get(cacheKey);

        if (cached) {
            // Instant 0ms Paint
            setDocs(cached.data.docs || []);
            if (cached.data.storageStats) setStorageStats(cached.data.storageStats);
            setLoading(false);
        } else {
            setLoading(true);
        }

        api.get('/api/files', { params: { search } })
            .then(filesRes => {
                const fetchedDocs = filesRes.data.documents || filesRes.data.files || filesRes.data || [];
                setDocs(fetchedDocs);
                swrCacheRef.current.set(cacheKey, {
                    data: { docs: fetchedDocs, storageStats },
                    timestamp: Date.now()
                });
            })
            .catch(() => {
                if (!cached) setDocs([]);
            })
            .finally(() => setLoading(false));

        api.get('/v1/workspace-tools/storage/stats')
            .then(res => {
                if (res.data) setStorageStats(res.data);
            })
            .catch(() => {});

        refetchArticles();
    }

    useEffect(() => { 
        loadDocs(); 
        api.get('/api/v1/workspace-tools/vaults/categories')
            .then(res => {
                if (res.data?.categories) {
                    setCustomCategories(res.data.categories);
                }
            })
            .catch(() => {});
    }, [search]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('drawer') === 'vaults') {
                setShowVaultsDrawer(true);
            }
        }
    }, []);

    async function handleApprove(doc: any) {
        try {
            setApprovingId(doc.id || doc._id);
            const res = await approveDocMutation(doc.id || doc._id).unwrap();
            toast.success(res.message || 'Document approved & posted to financial records!');
            loadDocs();
        } catch (err: any) {
            toast.error(err.data?.message || 'Failed to approve document');
        } finally {
            setApprovingId(null);
        }
    }

    async function handleSendReminder(doc: any) {
        try {
            const res = await sendReminderMutation(doc.id || doc._id).unwrap();
            toast.success(res.message || 'Payment reminder sent to client!');
            loadDocs();
        } catch (err: any) {
            toast.error(err.data?.message || 'Failed to send reminder');
        }
    }

    async function handleConvertToInvoice(doc: any) {
        try {
            const res = await convertInvoiceMutation(doc.id || doc._id).unwrap();
            toast.success('Converted to Invoice successfully!');
            loadDocs();
            if (res.invoice?.id) {
                router.push(`/document-editor?id=${res.invoice.id}`);
            }
        } catch (err: any) {
            toast.error(err.data?.message || 'Failed to convert to invoice');
        }
    }

    async function handleDelete(doc: any) {
        try {
            if (doc.isArticle || doc.blocks) {
                await deleteArticle(doc.id || doc._id).unwrap();
                toast.success('Document deleted');
            } else {
                await api.delete(`/api/files/${doc.id || doc._id}`);
                toast.success('Document deleted');
            }
            setDocs(prev => prev.filter(d => (d.id || d._id) !== (doc.id || doc._id)));
            setDeleteDoc(null);
            refetchArticles();
        } catch { toast.error('Failed to delete'); }
    }

    const handleDocumentClick = (doc: any) => {
        // Direct to Universal Document Viewer for all documents
        const docId = doc.id || doc._id;
        if (docId) {
            router.push(`/document-viewer?id=${docId}`);
            return;
        }

        const url = doc.url || doc.fileUrl;
        const ext = url?.split('.').pop()?.split('?')[0]?.toLowerCase();
        const isPreviewable = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext || '');

        if (url && !isPreviewable) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            setSelectedDoc(doc);
        }
    };

    const HR_CATEGORIES = ['HR', 'ID Proof', 'Joining Letter', 'Experience Letter', 'Appraisal Letter', 'OFFER_LETTER', 'WARNING_LETTER'];
    const FINANCE_CATEGORIES = ['Finance', 'Payslip', 'INVOICE', 'QUOTATION'];

    // Combine newly unified documents and file vault with ID deduplication
    const rawDocs = [
        ...(unifiedData?.documents || []).map((d: any) => ({
            ...d,
            id: d.id || d._id,
            name: d.title || d.name,
            folder: d.category || d.documentType || 'General'
        })),
        ...docs.map(d => ({ ...d, id: d.id || (d as any)._id, isArticle: false, isVault: true }))
    ];

    const seenDocIds = new Set<string>();
    const allDocs: any[] = [];
    for (const d of rawDocs) {
        const id = d.id || (d as any)._id;
        if (id) {
            const idStr = String(id);
            if (seenDocIds.has(idStr)) continue;
            seenDocIds.add(idStr);
        }
        allDocs.push(d);
    }

    const totalStorageBytes = (storageStats as any)?.usedBytes ?? (
        docs.reduce((acc, d) => acc + ((d as any).fileSize || 0), 0) + ((unifiedData?.documents?.length || 0) * 24 * 1024)
    );
    // Use plan maxStorageBytes if available, else fallback to storageStats or 10GB
    const storageQuotaBytes = ((subscription as any)?.plan?.maxStorageBytes) || (storageStats as any)?.totalQuotaBytes || 10 * 1024 * 1024 * 1024;
    const storagePercentage = storageQuotaBytes > 0 ? Math.min(100, Math.round((totalStorageBytes / storageQuotaBytes) * 100)) : 0;
    const displayCategories = [
        ...CATEGORIES,
        ...customCategories
            .filter(cat => !CATEGORIES.some(c => c.key.toLowerCase() === cat.name.toLowerCase()))
            .map(cat => ({ key: cat.name, label: cat.name }))
    ];

    const filtered = allDocs.filter(d => {
        const isVoiceNote = (d.title || d.name || '').toLowerCase().includes('voice-note') || (d.url || '').toLowerCase().endsWith('.webm');
        if (isVoiceNote) return false;

        if (activeCategory === 'all') return true;
        const folder = (d as any).folder || (d as any).category || (d as any).documentType;
        if (activeCategory === 'HR') return HR_CATEGORIES.includes(folder);
        if (activeCategory === 'Finance') return FINANCE_CATEGORIES.includes(folder);
        if (activeCategory === 'Contract') return ['Contract', 'CONTRACT', 'Proposal'].includes(folder);
        return folder === activeCategory;
    });

    const isAdminHrFinance = user?.roles?.some((r: string) => r === 'admin') || user?.role === 'admin' || (user?.permissions && (user.permissions.includes('can_manage_team') || user.permissions.includes('can_manage_hr')));

    // Multi-select actions & batch deletion
    const toggleSelectDoc = (id: string) => {
        setSelectedDocIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const isAllSelected = filtered.length > 0 && filtered.every(d => selectedDocIds.includes(d.id || d._id));
    const isPartiallySelected = selectedDocIds.length > 0 && !isAllSelected;

    const handleSelectAllToggle = () => {
        if (isAllSelected) {
            setSelectedDocIds([]);
        } else {
            setSelectedDocIds(filtered.map(d => d.id || d._id).filter(Boolean));
        }
    };

    const handleClearSelection = () => {
        setSelectedDocIds([]);
    };

    const handleBatchDeleteSelected = async () => {
        if (selectedDocIds.length === 0) return;
        setIsBatchDeleting(true);
        const count = selectedDocIds.length;
        try {
            const deletePromises = selectedDocIds.map(async (id) => {
                const docObj = allDocs.find(d => (d.id || d._id) === id);
                if (docObj?.isArticle || docObj?.blocks) {
                    return deleteArticle(id).unwrap();
                } else {
                    return api.delete(`/api/files/${id}`);
                }
            });

            await Promise.allSettled(deletePromises);
            toast.success(`Successfully deleted ${count} document${count > 1 ? 's' : ''}`);
            setSelectedDocIds([]);
            setBatchDeleteModalOpen(false);
            loadDocs();
        } catch (err) {
            console.error('Error during batch delete:', err);
            toast.error('Some documents could not be deleted');
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const handleDeleteAllFiltered = async () => {
        if (filtered.length === 0) return;
        setIsBatchDeleting(true);
        const count = filtered.length;
        try {
            const deletePromises = filtered.map(async (doc) => {
                const id = doc.id || doc._id;
                if (!id) return;
                if (doc.isArticle || doc.blocks) {
                    return deleteArticle(id).unwrap();
                } else {
                    return api.delete(`/api/files/${id}`);
                }
            });

            await Promise.allSettled(deletePromises);
            toast.success(`Successfully deleted all ${count} document${count > 1 ? 's' : ''}`);
            setSelectedDocIds([]);
            setDeleteAllModalOpen(false);
            loadDocs();
        } catch (err) {
            console.error('Error deleting all documents:', err);
            toast.error('Failed to delete all documents');
        } finally {
            setIsBatchDeleting(false);
        }
    };

    return (
        <div className="min-h-full pb-16 relative">
            {/* Modals & Drawers */}
            <CreateRagVaultModal 
                isOpen={showCreateVaultModal} 
                onClose={() => setShowCreateVaultModal(false)} 
                onVaultCreated={() => loadDocs()} 
            />
            <RagVaultsDrawer 
                isOpen={showVaultsDrawer} 
                onClose={() => setShowVaultsDrawer(false)} 
                onOpenCreate={() => { setShowVaultsDrawer(false); setShowCreateVaultModal(true); }} 
                onVaultCreated={() => loadDocs()}
            />
            {showCreateAI && <CreateWithAIModal isOpen={showCreateAI} onClose={() => setShowCreateAI(false)} />}
            {showUpload && <FileUploadModal relatedModel="Vault" onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); loadDocs(); }} />}
            {showTemplates && <TemplatesListDrawer onClose={() => setShowTemplates(false)} onSuccess={() => { setShowTemplates(false); loadDocs(); }} />}
            {selectedDoc && <PreviewModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}
            <ConfirmModal
                isOpen={!!deleteDoc}
                title="Delete Document?"
                message={`Are you sure you want to delete "${deleteDoc?.title || deleteDoc?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                onConfirm={() => {
                    if (deleteDoc) {
                        handleDelete(deleteDoc);
                        setDeleteDoc(null);
                    }
                }}
                onCancel={() => setDeleteDoc(null)}
            />
            {/* Batch Delete Selected Confirmation */}
            <ConfirmModal
                isOpen={batchDeleteModalOpen}
                title={`Delete ${selectedDocIds.length} Selected Document${selectedDocIds.length > 1 ? 's' : ''}?`}
                message={`Are you sure you want to delete ${selectedDocIds.length} selected document${selectedDocIds.length > 1 ? 's' : ''}? This action cannot be undone.`}
                confirmText={isBatchDeleting ? "Deleting..." : `Delete (${selectedDocIds.length})`}
                variant="danger"
                onConfirm={handleBatchDeleteSelected}
                onCancel={() => setBatchDeleteModalOpen(false)}
            />
            {/* Delete All in View Confirmation */}
            <ConfirmModal
                isOpen={deleteAllModalOpen}
                title={`Delete All ${filtered.length} Documents in View?`}
                message={`Are you sure you want to delete ALL ${filtered.length} documents currently displayed in the "${displayCategories.find(c => c.key === activeCategory)?.label || 'All Documents'}" view? This action is permanent.`}
                confirmText={isBatchDeleting ? "Deleting All..." : `Delete All (${filtered.length})`}
                variant="danger"
                onConfirm={handleDeleteAllFiltered}
                onCancel={() => setDeleteAllModalOpen(false)}
            />
            {showAiChat && selectedAiDoc && (
                <DocumentAIChatDrawer
                    document={selectedAiDoc}
                    onClose={() => { setShowAiChat(false); setSelectedAiDoc(null); }}
                />
            )}
            <DigitalSignatureModal 
                isOpen={showSignatureModal}
                onClose={() => setShowSignatureModal(false)}
            />
            {selectedPaymentDoc && (
                <RecordPaymentModal
                    isOpen={!!selectedPaymentDoc}
                    document={selectedPaymentDoc}
                    onClose={() => setSelectedPaymentDoc(null)}
                    onSuccess={() => loadDocs()}
                />
            )}
            {shareModalDoc && (
                <ShareDocumentModal
                    isOpen={!!shareModalDoc}
                    onClose={() => setShareModalDoc(null)}
                    documentId={shareModalDoc.id || shareModalDoc._id}
                    documentTitle={shareModalDoc.title || shareModalDoc.name || 'Document'}
                    initialShareToken={shareModalDoc.shareToken}
                    initialAccessType={shareModalDoc.accessType || 'public'}
                    clientName={shareModalDoc.clientName || shareModalDoc.documentDetails?.clientName}
                    clientEmail={shareModalDoc.clientEmail || shareModalDoc.documentDetails?.clientEmail}
                    onAccessTypeUpdated={() => loadDocs()}
                />
            )}

            {/* Page Header */}
            <div className="page-header">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="page-title">180 Documents & Commercial Hub</h1>
                        <p className="page-subtitle">Centralized document engine, 50MB RAG memory vaults, e-signatures & commercial workflows</p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* RAG Memory Vaults Action */}
                        <button
                            onClick={() => setShowVaultsDrawer(true)}
                            className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                            title="Open RAG Vaults Management"
                        >
                            <Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>RAG Vaults</span>
                        </button>

                        {/* Prominent Create with AI button */}
                        <button 
                            onClick={() => router.push('/document-editor?ai=open')}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl shadow-md shadow-purple-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                        >
                            <Sparkles className="w-4 h-4" />
                            Create with AI
                        </button>

                        <button onClick={() => setShowUpload(true)} className="btn-secondary cursor-pointer">
                            <Upload className="w-4 h-4" /> Upload
                        </button>

                        {/* New Document Button: Directly opens Template & Blank Canvas Drawer */}
                        <button 
                            onClick={() => setShowTemplates(true)} 
                            className="btn-primary shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> New Document
                        </button>
                    </div>
                </div>

                {/* KPI Header Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5">
                    {[
                        { label: 'Total Documents', value: allDocs.length, color: 'text-indigo-600', bg: 'bg-indigo-50/70', sub: 'Unified Documents' },
                        { label: 'Invoices & Finance', value: allDocs.filter(d => FINANCE_CATEGORIES.includes((d as any).folder || (d as any).category)).length, color: 'text-emerald-600', bg: 'bg-emerald-50/70', sub: 'Ledgers & Totals' },
                        { label: 'Contracts & Proposals', value: allDocs.filter(d => ['Contract', 'CONTRACT', 'Proposal'].includes((d as any).folder || (d as any).category)).length, color: 'text-blue-600', bg: 'bg-blue-50/70', sub: 'E-Signatures & NDAs' },
                        { label: 'Pending Sign / Approval', value: allDocs.filter(d => ['signed', 'Signed', 'sent', 'Sent'].includes(d.status || '')).length, color: 'text-purple-600', bg: 'bg-purple-50/70', sub: 'Action Required' },
                        { label: 'R2 Cloud Storage', value: formatBytes(totalStorageBytes), color: 'text-amber-600', bg: 'bg-amber-50/70', sub: `${storagePercentage}% of ${storageQuotaBytes < 0 ? 'Unlimited' : formatBytes(storageQuotaBytes)} quota` },
                    ].map(s => (
                        <div key={s.label} className={clsx('rounded-xl p-3.5 sm:p-4 flex flex-col justify-between border border-black/5 shadow-2xs transition-all hover:shadow-xs', s.bg)}>
                            <div>
                                <p className={clsx('text-xl sm:text-2xl font-black', s.color)}>{s.value}</p>
                                <p className="text-xs text-gray-700 font-bold mt-0.5">{s.label}</p>
                            </div>
                            {s.sub && (
                                <p className="text-[10px] text-gray-500 font-medium mt-1 truncate">
                                    {s.sub}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Search + Categories + View Mode Switcher */}
            <div className="flex flex-col gap-3 mb-5 mt-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by title, invoice #, client, or tags..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {displayCategories.map(cat => (
                                <button
                                    key={cat.key}
                                    onClick={() => { setActiveCategory(cat.key); setSelectedDocIds([]); }}
                                    className={clsx(
                                        'px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                                        activeCategory === cat.key
                                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                    )}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sub-Header Selection Controls Bar */}
                {filtered.length > 0 && (
                    <div className="flex items-center justify-between px-2 py-1 bg-white/70 backdrop-blur-xs rounded-xl border border-gray-200/70 text-xs">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSelectAllToggle}
                                className="flex items-center gap-2 font-semibold text-gray-700 hover:text-indigo-600 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-gray-100"
                            >
                                <span className={clsx(
                                    "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                                    isAllSelected ? "bg-indigo-600 border-indigo-600 text-white" : isPartiallySelected ? "bg-indigo-100 border-indigo-500 text-indigo-700" : "border-gray-300 bg-white"
                                )}>
                                    {isAllSelected ? <Check className="w-3 h-3 stroke-[3]" /> : isPartiallySelected ? <span className="w-2 h-0.5 bg-indigo-600 rounded-full" /> : null}
                                </span>
                                <span>{isAllSelected ? 'Deselect All' : `Select All (${filtered.length})`}</span>
                            </button>

                            {selectedDocIds.length > 0 && (
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold px-2 py-0.5 rounded-full text-[11px]">
                                    {selectedDocIds.length} selected
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedDocIds.length > 0 && isAdminHrFinance && (
                                <button
                                    onClick={() => setBatchDeleteModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Selected ({selectedDocIds.length})
                                </button>
                            )}

                            {isAdminHrFinance && (
                                <button
                                    onClick={() => setDeleteAllModalOpen(true)}
                                    className="text-gray-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors text-xs font-medium cursor-pointer"
                                    title="Delete all documents matching current filter"
                                >
                                    Delete All ({filtered.length})
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Document Cards Grid */}
            {(loading || articlesLoading) ? (
                <div className="flex items-center justify-center py-28">
                    <div className="flex flex-col items-center gap-3">
                        <LogoLoader className="w-9 h-9 animate-spin text-indigo-500" />
                        <p className="text-sm text-gray-400">Loading documents & ledgers...</p>
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-28 text-center bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <p className="text-gray-800 font-bold text-lg mb-1">No documents in this view</p>
                    <p className="text-gray-400 text-xs max-w-sm mb-6">
                        Create invoices, proposals, contracts, or offer letters with auto-calculating totals and digital signatures.
                    </p>
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                        <button onClick={() => router.push('/document-editor?ai=open')} className="btn-primary flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Create with AI
                        </button>
                        <button onClick={() => setShowTemplates(true)} className="btn-secondary flex items-center gap-2">
                            <LayoutTemplate className="w-4 h-4" /> Browse 20 Templates
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                    {filtered.map((doc: any, index: number) => {
                        const docId = doc.id || doc._id || `doc-${index}`;
                        const isSelected = selectedDocIds.includes(docId);

                        return (
                            <DocumentCard
                                key={`${docId}-${index}`}
                                doc={doc}
                                isSelected={isSelected}
                                isAdminHrFinance={isAdminHrFinance}
                                onToggleSelect={toggleSelectDoc}
                                onClick={handleDocumentClick}
                                onEdit={(id) => router.push(`/document-editor?id=${id}`)}
                                onShare={(d) => setShareModalDoc(d)}
                                onDelete={(d) => setDeleteDoc(d)}
                                onConvertToInvoice={handleConvertToInvoice}
                                onAiChat={(d) => { setSelectedAiDoc(d); setShowAiChat(true); }}
                                onPayment={(d) => setSelectedPaymentDoc(d)}
                                onRemind={handleSendReminder}
                            />
                        );
                    })}
                </div>
            )}


        </div>
    );
}
