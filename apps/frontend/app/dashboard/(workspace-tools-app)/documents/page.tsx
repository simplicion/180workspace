'use client';



import { LogoLoader } from "@workspace/ui";
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useGet180DocumentsQuery, useDeleteArticleMutation } from '@/redux/api/knowledgeApi';
import { useGetContractsQuery } from '@/redux/api/contractApi';
import { useRouter } from 'next/navigation';
import { FileText, Upload, Search, Plus, Download, Trash2, File, FolderOpen, Image, Video, X, ExternalLink, Eye, Tags, Mail, LayoutTemplate, Link2, Users, CheckCircle, AlertCircle, FileIcon, ImageIcon, ChevronDown, Bot, ShieldAlert, FileEdit, Receipt } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import TemplatesListDrawer from '@/app/dashboard/(workspace-tools-app)/_components/TemplatesListDrawer';
import DocumentAIChatDrawer from '@/app/dashboard/(workspace-tools-app)/_components/DocumentAIChatDrawer';
import FileUploadModal from '@/components/shared/FileUploadModal';
import QuoteModal from '@/app/dashboard/(workspace-tools-app)/_components/QuoteModal';
import EmailQuoteModal from '@/app/dashboard/(workspace-tools-app)/_components/EmailQuoteModal';

interface Document { id?: string;
    _id?: string;
    title?: string;
    name?: string;
    url?: string;
    type?: string;
    folder?: string;
    category?: string;
    createdAt: string;
    taggedUsers?: { _id: string; name: string; email: string }[];
    notes?: string;
    isArticle?: boolean;
    isContract?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
    { key: 'all', label: 'All Files' },
    { key: 'HR', label: 'HR & Employee' },
    { key: 'Finance', label: 'Finance' },
    { key: 'Contract', label: 'Contracts' },
    { key: 'Legal', label: 'Legal' },
    { key: 'Project', label: 'Projects' },
    { key: 'Marketing', label: 'Marketing' },
    { key: 'General', label: 'General' },
];

const TYPE_COLORS: Record<string, string> = {
    Contract: 'bg-blue-50 text-blue-700 border-blue-100',
    'Joining Letter': 'bg-purple-50 text-purple-700 border-purple-100',
    'Experience Letter': 'bg-purple-50 text-purple-700 border-purple-100',
    'Appraisal Letter': 'bg-purple-50 text-purple-700 border-purple-100',
    'ID Proof': 'bg-purple-50 text-purple-700 border-purple-100',
    HR: 'bg-purple-50 text-purple-700 border-purple-100',
    Payslip: 'bg-green-50 text-green-700 border-green-100',
    Finance: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    Legal: 'bg-amber-50 text-amber-700 border-amber-100',
    Project: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    Marketing: 'bg-pink-50 text-pink-700 border-pink-100',
    General: 'bg-gray-50 text-gray-600 border-gray-100',
    Other: 'bg-gray-50 text-gray-600 border-gray-100',
};

const MAX_SIZE_MB = 20;
const ACCEPTED = ['image/*', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.html'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 truncate max-w-[60vw]">{docTitle}</h2>
                            <p className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {docUrl && (
                            <a href={docUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors">
                                <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                            </a>
                        )}
                        <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-gray-50">
                    {isImage ? (
                        <img src={docUrl} alt={docTitle} className="max-w-full mx-auto rounded-xl shadow-lg" />
                    ) : isPDF ? (
                        <iframe src={docUrl} className="w-full h-[72vh] rounded-xl border border-gray-200" title={docTitle} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-5">
                                <FileText className="w-9 h-9 text-indigo-300" />
                            </div>
                            <p className="text-gray-600 font-semibold text-lg mb-1">Preview unavailable</p>
                            <p className="text-gray-400 text-sm mb-5">This file type cannot be previewed in-browser.</p>
                            {docUrl && (
                                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                                    <Download className="w-4 h-4" /> Download File
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}



// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ doc, onCancel, onConfirm }: { doc: any; onCancel: () => void; onConfirm: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-gray-900 text-center mb-1">Delete Document?</h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                    &quot;<span className="font-semibold">{doc.title}</span>&quot; will be permanently deleted. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
    const [docs, setDocs] = useState<Document[]>([]);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [showUpload, setShowUpload] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
    const [showAiChat, setShowAiChat] = useState(false);
    const [selectedAiDoc, setSelectedAiDoc] = useState<Document | null>(null);
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [editingQuote, setEditingQuote] = useState<any | null>(null);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [selectedEmailQuote, setSelectedEmailQuote] = useState<any | null>(null);
    const [storageStats, setStorageStats] = useState<{ used: number, total: number, usagePercent: number } | null>(null);
    const { user } = useAuth();
    const router = useRouter();
    const [deleteArticle] = useDeleteArticleMutation();
    const { data: unifiedData, isLoading: articlesLoading, refetch: refetchArticles } = useGet180DocumentsQuery({ search: search || undefined });
    const { data: contractsData, isLoading: contractsLoading, refetch: refetchContracts } = useGetContractsQuery({});

    function loadDocs() {
        setLoading(true);
        Promise.all([
            api.get('/api/files', { params: { search } }),
            api.get('/api/sales/quotes', { params: { search } }).catch(() => ({ data: { quotes: [] } })),
            api.get('/api/invoices', { params: { search } }).catch(() => ({ data: { invoices: [] } }))
        ]).then(([filesRes, quotesRes, invoicesRes]) => {
            setDocs(filesRes.data.documents || filesRes.data.files || filesRes.data || []);
            setQuotes(quotesRes.data.quotes || []);
            setInvoices(invoicesRes.data.invoices || []);
        }).catch(() => {
            setDocs([]);
            setQuotes([]);
            setInvoices([]);
        }).finally(() => setLoading(false));
        
        // Fetch storage stats from platform-billing
        api.get('/api/v1/platform-billing').then(res => {
            if (res.data) {
                const config = res.data.companyConfig;
                const plan = res.data.plan;
                if (config && plan) {
                    const maxStorage = plan.maxStorageBytes || 0;
                    const totalStorage = maxStorage;
                    const storageUsed = config.storageUsedBytes || 0;
                    
                    setStorageStats({
                        used: storageUsed,
                        total: totalStorage,
                        usagePercent: totalStorage > 0 ? Math.min((storageUsed / totalStorage) * 100, 100) : 0
                    });
                }
            }
        }).catch(() => {});
        
        refetchArticles();
        refetchContracts();
    }

    useEffect(() => { loadDocs(); }, [search]);

    async function handleDelete(doc: any) {
        try {
            if (doc.isArticle) {
                await deleteArticle(doc.id || doc._id).unwrap();
                toast.success('Article deleted');
            } else if (doc.isQuote) {
                await api.delete(`/api/sales/quotes/${doc.id || doc._id}`);
                toast.success('Quote deleted');
            } else if (doc.isInvoice) {
                await api.delete(`/api/invoices/${doc.id || doc._id}`);
                toast.success('Invoice deleted');
            } else {
                await api.delete(`/api/files/${doc.id}`);
                toast.success('Document deleted');
            }
            setDocs(prev => prev.filter(d => (d.id || d._id) !== (doc.id || doc._id)));
            setDeleteDoc(null);
            refetchArticles();
            if (doc.isQuote || doc.isInvoice) loadDocs();
        } catch { toast.error('Failed to delete'); }
    }

    const handleDocumentClick = (doc: Document & { isQuote?: boolean; isInvoice?: boolean }) => {
        if (doc.isArticle) {
            router.push(`/dashboard/documents/${doc.id || doc._id}`);
            return;
        }
        if (doc.isContract) {
            router.push(`/dashboard/documents/contract/${doc.id || doc._id}/edit`);
            return;
        }
        if (doc.isQuote) {
            router.push(`/dashboard/documents/quote/${doc.id || doc._id}`);
            return;
        }
        if (doc.isInvoice) {
            router.push(`/dashboard/documents/invoice/${doc.id || doc._id}`);
            return;
        }
        const isLink = (doc as any).isLinkOnly || (doc as any).fileType === 'link' || doc.type === 'link';
        const url = doc.url || (doc as any).fileUrl;
        
        const ext = url?.split('.').pop()?.split('?')[0]?.toLowerCase();
        const isPreviewable = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext || '');

        if (url && (isLink || !isPreviewable)) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            setSelectedDoc(doc);
        }
    };

    const HR_CATEGORIES = ['HR', 'ID Proof', 'Joining Letter', 'Experience Letter', 'Appraisal Letter'];
    const FINANCE_CATEGORIES = ['Finance', 'Payslip'];

    const allDocs = [
        ...docs.map(d => ({ ...d, isArticle: false, isQuote: false, isInvoice: false, isContract: false })),
        ...(unifiedData?.documents?.filter((a: any) => a.isArticle) || []).map((a: any) => ({ ...a, isArticle: true, isQuote: false, isInvoice: false, isContract: false, folder: a.category || 'General', id: a._id, name: a.title })),
        ...(unifiedData?.documents?.filter((c: any) => c.isContract) || []).map((c: any) => ({ ...c, isArticle: false, isQuote: false, isInvoice: false, isContract: true, folder: 'Contract', id: c._id, name: c.title || 'Untitled Contract' })),
        ...quotes.map(q => ({ ...q, isArticle: false, isQuote: true, isInvoice: false, isContract: false, folder: 'Finance', id: q.id || q._id, name: q.quoteNumber ? `Quote ${q.quoteNumber}` : 'Quote' })),
        ...invoices.map(i => ({ ...i, isArticle: false, isQuote: false, isInvoice: true, isContract: false, folder: 'Finance', id: i.id || i._id, name: i.invoiceNumber ? `Invoice ${i.invoiceNumber}` : 'Invoice' }))
    ];

    const filtered = allDocs.filter(d => {
        const isVoiceNote = (d.title || d.name || '').toLowerCase().includes('voice-note') || (d.url || '').toLowerCase().endsWith('.webm');
        if (isVoiceNote) return false;

        if (activeCategory === 'all') return true;
        const folder = (d as any).folder || (d as any).category;
        if (activeCategory === 'HR') return HR_CATEGORIES.includes(folder);
        if (activeCategory === 'Finance') return FINANCE_CATEGORIES.includes(folder);
        return folder === activeCategory;
    });

    const isAdminHrFinance = user?.roles?.some((r: string) => ['admin', 'ceo'].includes(r)) || ['admin', 'ceo'].includes(user?.role || '') || (user?.permissions && (user.permissions.includes('can_manage_team') || user.permissions.includes('can_manage_hr')));

    return (
        <div className="min-h-full">
            {/* Modals */}
            {showUpload && <FileUploadModal relatedModel="Vault" onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); loadDocs(); }} />}
            {showTemplates && <TemplatesListDrawer onClose={() => setShowTemplates(false)} onSuccess={() => { setShowTemplates(false); loadDocs(); }} />}
            {selectedDoc && <PreviewModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}
            {deleteDoc && <ConfirmDeleteModal doc={deleteDoc} onCancel={() => setDeleteDoc(null)} onConfirm={() => handleDelete(deleteDoc)} />}
            {showAiChat && selectedAiDoc && (
                <DocumentAIChatDrawer
                    document={selectedAiDoc}
                    onClose={() => { setShowAiChat(false); setSelectedAiDoc(null); }}
                />
            )}
            <QuoteModal 
                isOpen={showQuoteModal} 
                onClose={() => { setShowQuoteModal(false); setEditingQuote(null); }} 
                onSuccess={() => { setShowQuoteModal(false); setEditingQuote(null); loadDocs(); }}
                editingQuote={editingQuote}
            />
            {selectedEmailQuote && (
                <EmailQuoteModal
                    isOpen={showEmailModal}
                    onClose={() => { setShowEmailModal(false); setSelectedEmailQuote(null); }}
                    quote={selectedEmailQuote}
                />
            )}

            {/* Page Header */}
            <div className="page-header">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="page-title">180 Documents</h1>
                        <p className="page-subtitle">Manage contracts, policies, payslips, and rich-text documents</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setShowTemplates(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors">
                            <LayoutTemplate className="w-4 h-4" /> Templates
                        </button>
                        <button onClick={() => setShowUpload(true)} className="btn-secondary">
                            <Upload className="w-4 h-4" /> Upload Document
                        </button>
                        <button onClick={() => { setEditingQuote(null); setShowQuoteModal(true); }} className="btn-secondary">
                            <Plus className="w-4 h-4" /> New Quote
                        </button>
                        <button onClick={() => setShowTemplates(true)} className="btn-primary shadow-md shadow-indigo-600/20">
                            <Plus className="w-4 h-4" /> New Document
                        </button>
                    </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    {[
                        { label: 'Total Documents', value: docs.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'HR / Employee', value: docs.filter(d => ['HR', 'ID Proof', 'Joining Letter', 'Experience Letter', 'Appraisal Letter'].includes((d as any).folder)).length, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: 'Financial', value: docs.filter(d => ['Finance', 'Payslip'].includes((d as any).folder)).length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Contracts & Legal', value: docs.filter(d => ['Contract', 'Legal'].includes((d as any).folder)).length, color: 'text-rose-600', bg: 'bg-rose-50' },
                    ].map(s => (
                        <div key={s.label} className={clsx('rounded-xl p-4 flex items-center gap-3', s.bg)}>
                            <div>
                                <p className={clsx('text-2xl font-bold', s.color)}>{s.value}</p>
                                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Storage Progress Bar */}
                {storageStats && storageStats.total > 0 && (
                    <div className="mt-5 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                                    <FileIcon className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">Storage Usage</h3>
                                    <p className="text-xs text-gray-500">
                                        {formatBytes(storageStats.used)} used of {formatBytes(storageStats.total)}
                                    </p>
                                </div>
                            </div>
                            <Link href="/dashboard/settings/platform-billing" className="btn-secondary text-xs px-3 py-1.5 shadow-sm">
                                Add Storage
                            </Link>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className={`h-2.5 rounded-full ${storageStats.usagePercent >= 90 ? 'bg-red-500' : 'bg-indigo-600'}`} 
                                style={{ width: `${storageStats.usagePercent}%` }}
                            ></div>
                        </div>
                        {storageStats.usagePercent >= 90 && (
                            <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Storage is almost full. Upgrade to avoid interruptions.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5 mt-2">
                <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search documents..." className="input pl-9 w-full"
                    />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {CATEGORIES.map(cat => (
                        <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                            className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                                activeCategory === cat.key
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600')}>
                            {cat.label}
                            {cat.key !== 'all' && (
                                <span className="ml-1.5 opacity-60 text-[10px]">
                                    ({docs.filter(d => {
                                        const folder = (d as any).folder;
                                        if (cat.key === 'HR') return HR_CATEGORIES.includes(folder);
                                        if (cat.key === 'Finance') return FINANCE_CATEGORIES.includes(folder);
                                        return folder === cat.key;
                                    }).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {(loading || articlesLoading) ? (
                <div className="flex items-center justify-center py-28">
                    <div className="flex flex-col items-center gap-3">
                        <LogoLoader className="w-9 h-9 animate-spin text-indigo-400" />
                        <p className="text-sm text-gray-400">Loading documents...</p>
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-28 text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                        <FolderOpen className="w-9 h-9 text-gray-200" />
                    </div>
                    <p className="text-gray-500 font-semibold text-lg mb-1">No documents found</p>
                    <p className="text-gray-400 text-sm mb-6">
                        {activeCategory !== 'all'
                            ? `No documents in "${activeCategory.replace('_', ' ')}" category`
                            : 'Upload your first document or use a template to get started'}
                    </p>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowTemplates(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors">
                            <LayoutTemplate className="w-4 h-4" /> Browse Templates
                        </button>
                        <button onClick={() => setShowUpload(true)} className="btn-primary">
                            <Upload className="w-4 h-4" /> Upload Document
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((doc: any) => {
                        const Icon = getFileIcon(doc.title || doc.url || '');
                        const typeBadge = TYPE_COLORS[(doc as any).folder] || TYPE_COLORS.Other;
                        return (
                            <div key={doc.id} className="card p-5 hover:shadow-lg hover:shadow-gray-100 transition-all duration-200 group flex flex-col">
                                <div className="flex items-start gap-3 cursor-pointer" onClick={() => handleDocumentClick(doc)}>
                                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 transition-colors duration-300">
                                        {doc.isArticle ? (
                                            <FileEdit className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                                        ) : doc.isQuote || doc.isInvoice ? (
                                            <Receipt className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                                        ) : (
                                            <Icon className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate leading-snug group-hover:text-indigo-600 transition-colors">{doc.title || doc.name}</p>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border', typeBadge)}>
                                                {((doc as any).folder || 'other').replace('_', ' ')}
                                            </span>
                                            {(doc as any).isConfidential && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border bg-red-50 text-red-600 border-red-100 flex items-center gap-1">
                                                    <ShieldAlert className="w-2.5 h-2.5" /> Confidential
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400">
                                                {new Date(doc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tags */}
                                {((doc as any).tags && (doc as any).tags.length > 0) && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {(doc as any).tags.map((tag: string, i: number) => (
                                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-md font-medium">#{tag}</span>
                                        ))}
                                    </div>
                                )}

                                {/* Tagged users */}
                                {doc.taggedUsers && doc.taggedUsers.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-indigo-50/50 rounded-lg">
                                        <Users className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                                        <p className="text-[10px] text-indigo-600 font-medium truncate">
                                            {doc.taggedUsers.map((u: any) => u.name || u).join(', ')}
                                        </p>
                                    </div>
                                )}

                                {doc.notes && (
                                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{doc.notes}</p>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-50">
                                    <button onClick={() => handleDocumentClick(doc)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="Preview / Open">
                                        {doc.isArticle ? <FileEdit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    {doc.url && (
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="Open in New Tab">
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => { setSelectedAiDoc(doc); setShowAiChat(true); }}
                                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100/50 hover:border-indigo-200"
                                        title="Chat with AI"
                                    >
                                        <Bot className="w-4 h-4" />
                                    </button>
                                    {doc.isQuote && (
                                        <>
                                            <button
                                                onClick={() => { setEditingQuote(doc); setShowQuoteModal(true); }}
                                                className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                                title="Edit Quote"
                                            >
                                                <FileEdit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedEmailQuote(doc); setShowEmailModal(true); }}
                                                className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                                title="Send Email"
                                            >
                                                <Mail className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {isAdminHrFinance && (
                                        <button onClick={() => setDeleteDoc(doc)} className="ml-auto p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

