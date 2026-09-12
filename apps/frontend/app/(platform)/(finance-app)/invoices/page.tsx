'use client';


import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useSettings } from '@/lib/settings-context';
import { FileText, Plus, X, Trash2, Eye, Filter, CheckCircle2, Send, Banknote, AlertCircle, Printer, CreditCard, ExternalLink, Download, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';
import { ConfirmModal , LogoLoader } from "@workspace/ui";
import ContextActions from '@/app/(platform)/(dashboard)/_components/ContextActions';

import { InvoiceViewDrawer } from './_components/InvoiceViewDrawer';
import { Sparkles, ArrowRight } from 'lucide-react';

const STATUS_STYLES: Record<string, { badge: string; label: string; icon: any }> = {
    draft: { badge: 'badge-gray', label: 'Draft', icon: FileText },
    sent: { badge: 'badge-blue', label: 'Sent', icon: Send },
    paid: { badge: 'badge-green', label: 'Paid', icon: CheckCircle2 },
    overdue: { badge: 'badge-red', label: 'Overdue', icon: AlertCircle },
    cancelled: { badge: 'badge-orange', label: 'Cancelled', icon: X },
};

export default function InvoicesPage() {
    const { user } = useAuth();
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';
    const [invoices, setInvoices] = useState<any[]>([]);
    const [viewInvoice, setViewInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Fast In-Memory SWR Cache for 0ms Instant Navigation (Slack/Notion Gold Standard)
    const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

    function loadInvoices() {
        const cacheKey = `invoices:${filterStatus || 'all'}`;
        const cached = swrCacheRef.current.get(cacheKey);

        if (cached) {
            setInvoices(cached.data || []);
            setLoading(false);
        } else {
            setLoading(true);
        }

        api.get('/api/invoices', { params: { status: filterStatus || undefined } })
            .then(({ data }) => {
                const fetched = data.invoices || [];
                setInvoices(fetched);
                swrCacheRef.current.set(cacheKey, {
                    data: fetched,
                    timestamp: Date.now()
                });
            })
            .catch(() => {
                if (!cached) setInvoices([]);
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadInvoices();

        // Track Visit (Phase 6)
        api.post('/api/user-preferences/recent', {
            recordId: 'invoices-management',
            type: 'Financial',
            label: 'Invoices',
            href: '/invoices'
        }).then(() => {
            window.dispatchEvent(new CustomEvent('recentItemsUpdated'));
        }).catch(err => console.error('Recent tracking error:', err));
    }, [filterStatus]);

    async function updateStatus(id: string, status: string) {
        try {
            await api.put(`/api/invoices/${id}`, { status });
            toast.success(`Marked as ${status}`);
            loadInvoices();
        } catch { toast.error('Failed to update'); }
    }

    async function handleDeleteInvoice() {
        if (!showDeleteConfirm) return;
        setDeleting(true);
        try {
            await api.delete(`/api/invoices/${showDeleteConfirm}`);
            toast.success('Invoice deleted');
            setInvoices(prev => prev.filter(i => i.id !== showDeleteConfirm));
        } catch {
            toast.error('Failed to delete');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(null);
        }
    }

    async function handleDownloadPDF(inv: any) {
        try {
            const [{ pdf }, { InvoicePDF }] = await Promise.all([
                import('@react-pdf/renderer'),
                import('@/components/pdf/InvoicePDF')
            ]);
            const blob = await pdf(<InvoicePDF invoice={inv} company={company} platform={{}} />).toBlob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice-${inv.invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate PDF');
        }
    }

    const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0);
    const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.totalAmount, 0);

    return (
        <div className="space-y-6">
            {viewInvoice && (
                <InvoiceViewDrawer invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
            )}

            {/* Header */}
            <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Invoice & Receivables Ledger</h1>
                    <p className="page-subtitle">{user?.role === 'client' ? 'View and pay your client invoices' : 'Master invoice records synced from 180 Documents'}</p>
                </div>
                {user?.role !== 'client' && (
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/document-editor?templateId=t-tax-invoice" 
                            className="btn-primary flex items-center gap-2 text-xs py-2.5 px-4 shadow-sm"
                        >
                            <Sparkles className="w-4 h-4" />
                            Create Invoice in 180 Documents
                        </Link>
                    </div>
                )}
            </div>

            {/* 180 Documents System Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-white dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-gray-900 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                            Generated & Authored in 180 Documents
                        </p>
                        <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                            All company invoices are designed in 180 Documents and automatically recorded as Inflows (Money In) in the Master Ledger.
                        </p>
                    </div>
                </div>
                <Link
                    href="/documents"
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1 flex-shrink-0"
                >
                    Browse Document Templates <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: user?.role === 'client' ? 'Total Paid' : 'Paid Revenue', value: `${currencySymbol}${totalRevenue.toLocaleString('en-IN')}`, color: 'text-green-600', icon: Banknote, bg: 'bg-green-50' },
                    { label: user?.role === 'client' ? 'To Be Paid' : 'Outstanding', value: `${currencySymbol}${totalPending.toLocaleString('en-IN')}`, color: 'text-blue-600', icon: Send, bg: 'bg-blue-50' },
                    { label: 'Total Invoices', value: invoices.length, color: 'text-indigo-600', icon: FileText, bg: 'bg-indigo-50' },
                    { label: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length, color: 'text-red-600', icon: AlertCircle, bg: 'bg-red-50' },
                ].map(k => (
                    <div key={k.label} className="bg-white dark:bg-gray-800/80 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center gap-3">
                        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', k.bg)}>
                            <k.icon className={clsx('w-5 h-5', k.color)} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{k.label}</p>
                            <p className={clsx('text-xl font-black', k.color)}>{k.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3 flex-wrap">
                <Filter className="w-4 h-4 text-gray-400" />
                {['', ...Object.keys(STATUS_STYLES)].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                            filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200')}>
                        {s === '' ? 'All' : STATUS_STYLES[s].label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : invoices.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60">
                    <FileText className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No invoices recorded yet</p>
                    <p className="text-gray-400 text-xs mt-1">Generate your first tax invoice using 180 Documents.</p>
                    <Link 
                        href="/document-editor?templateId=t-tax-invoice"
                        className="btn-primary mt-4 inline-flex items-center gap-2 text-xs py-2 px-4"
                    >
                        <Sparkles className="w-3.5 h-3.5" /> Launch 180 Documents Invoice Creator
                    </Link>
                </div>
            ) : (
                <div className="card">
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Client</th>
                                    <th>Amount</th>
                                    <th>Issue Date</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(inv => {
                                    const statusInfo = STATUS_STYLES[inv.status] || STATUS_STYLES.draft;
                                    const StatusIcon = statusInfo.icon;
                                    return (
                                        <React.Fragment key={inv.id}>
                                            <tr className="group">
                                                <td className="font-mono font-bold text-indigo-600">{inv.invoiceNumber}</td>
                                                <td>
                                                    <p className="font-medium text-gray-800">{inv.clientName || inv.clientId?.name}</p>
                                                    {inv.clientId?.email && <p className="text-xs text-gray-400">{inv.clientId.email}</p>}
                                                </td>
                                                <td className="font-bold text-gray-900">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{currencySymbol}{inv.totalAmount?.toLocaleString('en-IN')}</span>
                                                        {inv.riskScore !== undefined && inv.riskScore > 20 && (
                                                            <span className={clsx(
                                                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border w-fit",
                                                                inv.riskScore > 50 ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                            )}>
                                                                <ShieldAlert className="w-2.5 h-2.5" />
                                                                Risk: {inv.riskScore}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="text-sm text-gray-500">{inv.issueDate ? format(new Date(inv.issueDate), 'MMM d, yyyy') : '-'}</td>
                                                <td className="text-sm text-gray-500">{inv.dueDate ? format(new Date(inv.dueDate), 'MMM d, yyyy') : '-'}</td>
                                                <td>
                                                    <span className={clsx('badge text-xs flex items-center gap-1 w-fit', statusInfo.badge)}>
                                                        <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex justify-end">
                                                        <ContextActions
                                                            actions={[
                                                                {
                                                                    label: 'View',
                                                                    icon: Eye,
                                                                    onClick: () => setViewInvoice(inv),
                                                                    variant: 'primary'
                                                                },
                                                                ...(user?.role !== 'client' && inv.status === 'draft' ? [{
                                                                    label: 'Send',
                                                                    icon: Send,
                                                                    onClick: () => updateStatus(inv.id, 'sent')
                                                                }] : []),
                                                                ...(user?.role !== 'client' && inv.status === 'sent' ? [{
                                                                    label: 'Mark Paid',
                                                                    icon: CheckCircle2,
                                                                    onClick: () => updateStatus(inv.id, 'paid')
                                                                }] : []),
                                                                {
                                                                    label: 'Download',
                                                                    icon: Download,
                                                                    onClick: () => handleDownloadPDF(inv)
                                                                },
                                                                ...(user?.role !== 'client' ? [{
                                                                    label: 'Delete',
                                                                    icon: Trash2,
                                                                    onClick: () => setShowDeleteConfirm(inv.id),
                                                                    variant: 'danger' as const
                                                                }] : [])
                                                            ]}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Risk Notes Row */}
                                            {inv.riskScore !== undefined && inv.riskScore > 20 && inv.riskNotes && inv.riskNotes.length > 0 && (
                                                <tr className="border-none">
                                                    <td colSpan={7} className="px-6 py-0 pb-3">
                                                        <div className={clsx(
                                                            "p-3 rounded-xl border flex flex-col gap-1.5 ml-8",
                                                            inv.riskScore > 50 ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
                                                        )}>
                                                            <div className="flex items-center gap-2">
                                                                <ShieldAlert className={clsx("w-3.5 h-3.5", inv.riskScore > 50 ? "text-red-600" : "text-amber-600")} />
                                                                <p className={clsx("text-[10px] font-bold uppercase tracking-wider", inv.riskScore > 50 ? "text-red-700" : "text-amber-700")}>
                                                                    Fraud Risk Analysis ({inv.riskScore}%)
                                                                </p>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                                                {inv.riskNotes.map((note, idx) => (
                                                                    <p key={idx} className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                                                        <span className={clsx("w-1 h-1 rounded-full", inv.riskScore > 50 ? "bg-red-400" : "bg-amber-400")} />
                                                                        {note}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!showDeleteConfirm}
                title="Delete Invoice"
                message="Are you sure you want to delete this invoice? This action cannot be undone."
                confirmText="Delete Invoice"
                onConfirm={handleDeleteInvoice}
                onCancel={() => setShowDeleteConfirm(null)}
                loading={deleting}
                variant="danger"
            />
        </div>
    );
}

