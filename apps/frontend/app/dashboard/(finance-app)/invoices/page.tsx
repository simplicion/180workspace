'use client';


import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useSettings } from '@/lib/settings-context';
import { FileText, Plus, X, Trash2, Eye, Filter, CheckCircle2, Send, Banknote, AlertCircle, Printer, CreditCard, ExternalLink, Download, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';
import { ConfirmModal , LogoLoader } from "@workspace/ui";
import ContextActions from '@/app/dashboard/(dashboard)/_components/ContextActions';
import { pdf } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/InvoicePDF';

const STATUS_STYLES: Record<string, { badge: string; label: string; icon: any }> = {
    draft: { badge: 'badge-gray', label: 'Draft', icon: FileText },
    sent: { badge: 'badge-blue', label: 'Sent', icon: Send },
    paid: { badge: 'badge-green', label: 'Paid', icon: CheckCircle2 },
    overdue: { badge: 'badge-red', label: 'Overdue', icon: AlertCircle },
    cancelled: { badge: 'badge-orange', label: 'Cancelled', icon: X },
};

interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
}

function CreateInvoiceModal({ onClose, onSuccess, clients }: { onClose: () => void; onSuccess: () => void; clients: any[] }) {
    const [form, setForm] = useState({
        clientId: '',
        clientName: '',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        dueDate: '',
        notes: '',
        taxPercent: 0,
        discount: 0,
        status: 'draft',
    });
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { description: '', quantity: 1, unitPrice: 0 },
    ]);
    const [loading, setLoading] = useState(false);

    function addLine() { setLineItems(p => [...p, { description: '', quantity: 1, unitPrice: 0 }]); }
    function removeLine(i: number) { setLineItems(p => p.filter((_, idx) => idx !== i)); }
    function updateLine(i: number, field: keyof LineItem, val: string | number) {
        setLineItems(p => p.map((l, idx) => idx === i ? { ...l, [field]: field === 'description' ? val : Number(val) } : l));
    }

    const subtotal = lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const tax = subtotal * (form.taxPercent / 100);
    const total = subtotal + tax - form.discount;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.clientId && !form.clientName) return toast.error('Client is required');
        setLoading(true);
        try {
            const clientName = clients.find(c => c.id === form.clientId)?.name || form.clientName;
            await api.post('/api/invoices', {
                ...form,
                clientName,
                lineItems,
                taxPercent: Number(form.taxPercent),
                discount: Number(form.discount),
            });
            toast.success('Invoice created!');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to create invoice');
        } finally { setLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center" aria-label="Close modal">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                    {/* Client & Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="clientId" className="label">Client *</label>
                            <select id="clientId" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} className="select">
                                <option value="">Select client</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.company}</option>)}
                            </select>
                            {!form.clientId && (
                                <input id="manualClientName" aria-label="Manual client name" value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} className="input mt-2" placeholder="Or enter client name manually" />
                            )}
                        </div>
                        <div>
                            <label htmlFor="invoiceStatus" className="label">Status</label>
                            <select id="invoiceStatus" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="select">
                                {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="issueDate" className="label">Issue Date</label>
                            <input id="issueDate" type="date" value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} className="input" />
                        </div>
                        <div>
                            <label htmlFor="dueDate" className="label">Due Date</label>
                            <input id="dueDate" type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="input" />
                        </div>
                    </div>

                    {/* Line Items */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="label">Line Items</label>
                            <button type="button" onClick={addLine} className="text-xs text-indigo-600 font-semibold hover:text-indigo-800">+ Add Line</button>
                        </div>
                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Description</th>
                                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-20">Qty</th>
                                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-28">Unit Price</th>
                                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-24">Amount</th>
                                        <th className="w-8" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {lineItems.map((line, i) => (
                                        <tr key={i} className="border-t border-gray-50">
                                            <td className="px-3 py-2">
                                                <input aria-label="Line item description" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} className="w-full input py-1 text-sm" placeholder="Description" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input aria-label="Line item quantity" type="number" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} className="w-full input py-1 text-sm text-right" min="1" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input aria-label="Line item unit price" type="number" value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} className="w-full input py-1 text-sm text-right" min="0" step="0.01" />
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-gray-800">
                                                ₹{(line.quantity * line.unitPrice).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-2">
                                                {lineItems.length > 1 && (
                                                    <button type="button" onClick={() => removeLine(i)} className="text-gray-300 hover:text-red-400" aria-label="Remove line">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="mt-3 space-y-1.5 text-sm">
                            <div className="flex justify-between text-gray-500">
                                <span>Subtotal</span><span className="font-medium text-gray-800">₹{subtotal.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex items-center justify-between text-gray-500">
                                <span className="flex items-center gap-2">Tax
                                    <input aria-label="Tax percentage" type="number" value={form.taxPercent} onChange={e => setForm(p => ({ ...p, taxPercent: Number(e.target.value) }))} className="w-16 input py-0.5 text-xs text-center" min="0" max="100" />%
                                </span>
                                <span className="font-medium text-gray-800">₹{tax.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex items-center justify-between text-gray-500">
                                <span className="flex items-center gap-2">Discount
                        <input aria-label="Discount amount" type="number" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: Number(e.target.value) }))} className="w-20 input py-0.5 text-xs text-center" min="0" />
                                </span>
                                <span className="font-medium text-red-500">-₹{form.discount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
                                <span>Total</span><span>₹{total.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="invoiceNotes" className="label">Notes</label>
                        <textarea id="invoiceNotes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input resize-none" rows={2} placeholder="Payment terms, bank details, etc." />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Create Invoice'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function InvoiceViewModal({ invoice, onClose }: { invoice: any; onClose: () => void }) {
    const { company, platform } = useSettings();
    const brandColor = company?.brandColor || '#4f46e5';

    const [paying, setPaying] = useState(false);

    const handlePayInvoice = async () => {
        setPaying(true);
        try {
            const { data } = await api.post(`/api/finance/invoices/${invoice.id}/payment-link`);
            if (data.linkData?.paymentLinkUrl) {
                window.open(data.linkData.paymentLinkUrl, '_blank');
                toast.success('Opening payment gateway...');
            } else {
                toast.error('Payment gateway not configured');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to initiate payment');
        } finally {
            setPaying(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        try {
            const blob = await pdf(<InvoicePDF invoice={invoice} company={company} platform={platform} />).toBlob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice-${invoice.invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error(err);
            toast.error('Failed to download PDF');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 print:p-0">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden print:shadow-none h-[90vh] flex flex-col" id="invoice-print-content">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 no-print flex-shrink-0">
                    <h2 className="text-lg font-semibold text-gray-900">Invoice â€” {invoice.invoiceNumber}</h2>
                    <div className="flex gap-2 items-center">
                        {invoice.status === 'sent' && (
                            <button
                                onClick={handlePayInvoice}
                                disabled={paying}
                                className="btn-primary text-xs py-1.5 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                            >
                                {paying ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                                {paying ? 'Processing...' : 'Pay Online'}
                            </button>
                        )}
                        <button onClick={handlePrint} className="btn-secondary text-xs py-1.5 hover:bg-gray-100"><Printer className="w-3.5 h-3.5" />Print</button>
                        <button onClick={handleDownloadPDF} className="btn-secondary text-xs py-1.5 bg-gray-50 hover:bg-gray-100 border-gray-200"><Download className="w-3.5 h-3.5" />PDF</button>
                        <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center" aria-label="Close view"><X className="w-4 h-4 text-gray-500" /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-12 space-y-12">
                    {/* Header: Company and Invoice Info */}
                    <div className="flex justify-between items-start">
                        <div className="space-y-4">
                            {company?.companyLogo ? (
                                <img src={company.companyLogo} alt={company.companyName} className="h-16 w-auto" />
                            ) : (
                                <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: brandColor }}>{company?.companyName || platform?.name || platform?.platformName || 'Pitchin180'}</h1>
                            )}
                            <div className="text-sm text-gray-500 max-w-xs leading-relaxed">
                                <p className="font-bold text-gray-800 text-base mb-1">{company?.companyName || platform?.name || 'Enterprise'}</p>
                                <p>{company?.address || ','}</p>
                                <p>Email: {company?.companyEmail || platform?.email || ''}</p>
                                {company?.phoneNumber && <p>Phone: {company.phoneNumber}</p>}
                            </div>
                        </div>
                        <div className="text-right space-y-1">
                            <h2 className="text-6xl font-black text-gray-100 uppercase tracking-tighter mb-4 select-none">Invoice</h2>
                            <p className="text-lg font-bold text-gray-900">#{invoice.invoiceNumber}</p>
                            <div className="text-sm space-y-1 mt-4">
                                <p className="text-gray-400">Issue Date: <span className="text-gray-900 font-semibold">{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</span></p>
                                <p className="text-gray-400">Due Date: <span className="text-gray-900 font-semibold">{format(new Date(invoice.dueDate || invoice.issueDate), 'MMM d, yyyy')}</span></p>
                            </div>
                            <div className={clsx('inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase mt-4 tracking-widest',
                                invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600')}>
                                <div className={clsx('w-1.5 h-1.5 rounded-full', invoice.status === 'paid' ? 'bg-emerald-500' : 'bg-orange-500')} />
                                {invoice.status}
                            </div>
                        </div>
                    </div>

                    {/* Bill To Info */}
                    <div className="grid grid-cols-2 gap-12">
                        <div className="p-8 rounded-3xl bg-gray-50/80 space-y-3">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Bill To</h3>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">{invoice.clientName || invoice.clientId?.name}</p>
                            <p className="text-sm text-gray-500 font-medium">{invoice.clientId?.email || ''}</p>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="space-y-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Quantity</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Unit Price</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100/50">
                                {invoice.lineItems?.map((item: any, i: number) => (
                                    <tr key={i} className="group transition-colors hover:bg-gray-50/30">
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-gray-900 border-l-4 border-transparent group-hover:border-indigo-500 pl-2 transition-all">{item.description}</p>
                                        </td>
                                        <td className="px-6 py-5 text-center text-gray-600 font-medium">{item.quantity}</td>
                                        <td className="px-6 py-5 text-right text-gray-600 font-medium">₹{item.unitPrice?.toLocaleString('en-IN')}</td>
                                        <td className="px-6 py-5 text-right font-black text-gray-900">₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Area */}
                    <div className="flex justify-between items-start pt-8 pb-12">
                        <div className="flex-1 space-y-6">
                            <div className="text-[10px] font-black text-gray-200 tracking-[0.3em] uppercase mt-20">
                                Thank you for your business!
                            </div>
                        </div>
                        
                        <div className="w-80 space-y-8">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-gray-400">Subtotal</span>
                                    <span className="text-gray-900 font-bold">₹{invoice.subtotal?.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Total Amount</span>
                                    <span className="text-4xl font-black tracking-tighter" style={{ color: brandColor }}>₹{invoice.totalAmount?.toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            {/* Digital Signature with Dashed Line */}
                            <div className="pt-12 text-center space-y-2">
                                <div className="w-full border-b border-dashed border-gray-200 mb-2" />
                                <p className="text-xs font-bold text-gray-900 tracking-tight">{company?.authorizedSignatory || 'Authorized Signatory'}</p>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{company?.designation || 'OWNER / PARTNER'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function InvoicesPage() {
    const { user } = useAuth();
    const { company } = useSettings();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [viewInvoice, setViewInvoice] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);


    function loadInvoices() {
        setLoading(true);
        api.get('/api/invoices', { params: { status: filterStatus || undefined } })
            .then(({ data }) => setInvoices(data.invoices || []))
            .catch(() => setInvoices([]))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadInvoices();
        api.get('/api/clients', { params: { limit: 200 } }).then(({ data }) => setClients(data.clients || []));

        // Track Visit (Phase 6)
        api.post('/api/user-preferences/recent', {
            recordId: 'invoices-management',
            type: 'Financial',
            label: 'Invoices',
            href: '/dashboard/invoices'
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
        <div>
            {showCreate && (
                <CreateInvoiceModal onClose={() => setShowCreate(false)} onSuccess={loadInvoices} clients={clients} />
            )}
            {viewInvoice && (
                <InvoiceViewModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
            )}

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Invoice Management</h1>
                    <p className="page-subtitle">{user?.role === 'client' ? 'View and pay your invoices' : 'Create and track client invoices'}</p>
                </div>
                {user?.role !== 'client' && (
                    <button onClick={() => setShowCreate(true)} className="btn-primary">
                        <Plus className="w-4 h-4" /> Create Invoice
                    </button>
                )}
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: user?.role === 'client' ? 'Total Paid' : 'Paid Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: 'text-green-600', icon: Banknote, bg: 'bg-green-50' },
                    { label: user?.role === 'client' ? 'To Be Paid' : 'Outstanding', value: `₹${totalPending.toLocaleString('en-IN')}`, color: 'text-blue-600', icon: Send, bg: 'bg-blue-50' },
                    { label: 'Total Invoices', value: invoices.length, color: 'text-indigo-600', icon: FileText, bg: 'bg-indigo-50' },
                    { label: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length, color: 'text-red-600', icon: AlertCircle, bg: 'bg-red-50' },
                ].map(k => (
                    <div key={k.label} className="card p-4 flex items-center gap-3">
                        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', k.bg)}>
                            <k.icon className={clsx('w-5 h-5', k.color)} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase">{k.label}</p>
                            <p className={clsx('text-xl font-black', k.color)}>{k.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Filter className="w-4 h-4 text-gray-400" />
                {['', ...Object.keys(STATUS_STYLES)].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                        className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                            filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                        {s === '' ? 'All' : STATUS_STYLES[s].label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : invoices.length === 0 ? (
                <div className="text-center py-16">
                    <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No invoices yet</p>
                    <p className="text-gray-300 text-sm mt-1">Create your first invoice</p>
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
                                                        <span>₹{inv.totalAmount?.toLocaleString('en-IN')}</span>
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
                                                <td className="text-sm text-gray-500">{inv.issueDate ? format(new Date(inv.issueDate), 'MMM d, yyyy') : 'â€”'}</td>
                                                <td className="text-sm text-gray-500">{inv.dueDate ? format(new Date(inv.dueDate), 'MMM d, yyyy') : 'â€”'}</td>
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

