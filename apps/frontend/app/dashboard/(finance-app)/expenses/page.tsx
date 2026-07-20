'use client';


import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Receipt, Plus, X, CheckCircle, XCircle, Clock, Filter, TrendingUp, Trash2, Link, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';
import { ConfirmModal , LogoLoader } from "@workspace/ui";
import { useModal } from '@/lib/modal-context';

const CATEGORIES = ['Software/SaaS', 'Office Supplies', 'Travel & Meals', 'Marketing', 'Utilities', 'Professional Services', 'other'];
const STATUS_STYLES: Record<string, string> = {
    pending: 'badge-orange',
    approved: 'badge-green',
    rejected: 'badge-red',
};
const CAT_COLORS: Record<string, string> = {
    'Software/SaaS': 'bg-indigo-50 text-indigo-700',
    'Office Supplies': 'bg-blue-50 text-blue-700',
    'Travel & Meals': 'bg-sky-50 text-sky-700',
    'Marketing': 'bg-pink-50 text-pink-700',
    'Utilities': 'bg-orange-50 text-orange-700',
    'Professional Services': 'bg-purple-50 text-purple-700',
    'other': 'bg-gray-50 text-gray-600',
};

function AddExpenseModal({ onClose, onSuccess, projects, clients }: { onClose: () => void; onSuccess: () => void; projects: any[]; clients: any[] }) {
    const [form, setForm] = useState({
        title: '', amount: '', category: 'Travel & Meals',
        date: format(new Date(), 'yyyy-MM-dd'),
        receiptLinks: [''] as string[], notes: '',
        projectId: '', clientId: '', isBillable: false
    });
    const [loading, setLoading] = useState(false);

    function addReceiptLink() {
        setForm(p => ({ ...p, receiptLinks: [...p.receiptLinks, ''] }));
    }

    function updateReceiptLink(index: number, value: string) {
        setForm(p => {
            const links = [...p.receiptLinks];
            links[index] = value;
            return { ...p, receiptLinks: links };
        });
    }

    function removeReceiptLink(index: number) {
        setForm(p => ({ ...p, receiptLinks: p.receiptLinks.filter((_, i) => i !== index) }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.title || !form.amount || !form.date) return toast.error('Fill required fields');
        setLoading(true);
        try {
            await api.post('/api/expenses', {
                ...form,
                amount: parseFloat(form.amount),
                projectId: form.projectId || undefined,
                clientId: form.clientId || undefined,
                receiptLinks: form.receiptLinks.filter(l => l.trim() !== '')
            });
            toast.success('Expense submitted!');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to submit');
        } finally { setLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Submit Expense</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center" title="Close Modal">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div>
                        <label className="label">Expense Title *</label>
                        <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input" placeholder="e.g. Flight to Mumbai" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label" htmlFor="amount">Amount (₹) *</label>
                            <input type="number" id="amount" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="input" placeholder="0.00" min="0" step="0.01" required />
                        </div>
                        <div>
                            <label className="label" htmlFor="date">Date *</label>
                            <input type="date" id="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label" htmlFor="projectId">Project (Optional)</label>
                            <select id="projectId" title="Select Project" value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))} className="select">
                                <option value="">None</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label" htmlFor="clientId">Client (Optional)</label>
                            <select id="clientId" title="Select Client" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} className="select text-sm">
                                <option value="">None</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="isBillable" checked={form.isBillable} onChange={e => setForm(p => ({ ...p, isBillable: e.target.checked }))} className="w-4 h-4 text-indigo-600 rounded" />
                        <label htmlFor="isBillable" className="text-sm font-medium text-gray-700">Billable to Client</label>
                    </div>
                    <div>
                        <label className="label" htmlFor="category">Category</label>
                        <select id="category" title="Select Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="select text-sm">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="label mb-0">Receipt / Proof Links</label>
                            <button
                                type="button"
                                onClick={addReceiptLink}
                                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Link
                            </button>
                        </div>
                        <div className="space-y-2">
                            {form.receiptLinks.map((link, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400" />
                                        <input
                                            type="url"
                                            value={link}
                                            onChange={e => updateReceiptLink(idx, e.target.value)}
                                            placeholder="https://drive.google.com/... or any proof link"
                                            className="input pl-9 text-sm"
                                        />
                                    </div>
                                    {form.receiptLinks.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeReceiptLink(idx)}
                                            className="text-red-400 hover:text-red-600 flex-shrink-0"
                                            title="Remove link"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5">Paste links to Google Drive, Dropbox, S3, or any publicly accessible proof document.</p>
                    </div>
                    <div>
                        <label className="label text-sm" htmlFor="notes">Notes</label>
                        <textarea id="notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input text-sm resize-none" rows={2} placeholder="Optional notes..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Submit Claim'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ExpensesPage() {
    const { user } = useAuth();
    const modal = useModal();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [projects, setProjects] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const isHR = user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_hr'));

    function loadExpenses() {
        setLoading(true);
        api.get('/api/expenses', {
            params: {
                status: filterStatus || undefined,
                projectId: filterProject || undefined
            }
        })
            .then(({ data }) => setExpenses(data.expenses || []))
            .catch(() => setExpenses([]))
            .finally(() => setLoading(false));
    }

    function loadMetadata() {
        api.get('/api/projects').then(({ data }) => setProjects(data.projects || []));
        api.get('/api/clients').then(({ data }) => setClients(data.clients || []));
    }

    useEffect(() => {
        loadExpenses();
        loadMetadata();
    }, [filterStatus, filterProject]);

    async function review(id: string, status: 'approved' | 'rejected') {
        let reviewNote = '';
        if (status === 'rejected') {
            const reason = await modal.prompt({
                title: 'Rejection Reason',
                message: 'Please provide a reason for rejecting this expense claim.',
                placeholder: 'e.g. Invalid receipt, Out of policy...',
                confirmText: 'Reject'
            });
            if (reason === null) return; // Cancelled
            reviewNote = reason;
        }
        try {
            await api.put(`/api/expenses/${id}/review`, { status, reviewNote });
            toast.success(`Expense ${status}`);
            loadExpenses();
        } catch { toast.error('Failed to update'); }
    }

    async function handleDeleteExpense() {
        if (!showDeleteConfirm) return;
        setDeleting(true);
        try {
            await api.delete(`/api/expenses/${showDeleteConfirm}`);
            toast.success('Deleted');
            setExpenses(prev => prev.filter(e => e.id !== showDeleteConfirm));
        } catch {
            toast.error('Failed to delete');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(null);
        }
    }

    const totalPending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0);
    const totalApproved = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);

    return (
        <div>
            {showAdd && <AddExpenseModal projects={projects} clients={clients} onClose={() => setShowAdd(false)} onSuccess={loadExpenses} />}

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Expense Claims</h1>
                    <p className="page-subtitle">{isHR ? 'Review and manage all expense claims' : 'Submit and track your expense claims'}</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn-primary">
                    <Plus className="w-4 h-4" /> Submit Expense
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Pending', value: `₹${totalPending.toLocaleString('en-IN')}`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Approved', value: `₹${totalApproved.toLocaleString('en-IN')}`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Total Claims', value: expenses.length, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
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
            <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    {['', 'pending', 'approved', 'rejected'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                                filterStatus === s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50')}>
                            {s === '' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 border-l border-gray-100 pl-4">
                    <select id="filterProject" title="Filter by Project" value={filterProject} onChange={e => setFilterProject(e.target.value)}
                        className="text-xs font-semibold bg-white border border-gray-100 rounded-full py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                        <option value="">All Projects</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : expenses.length === 0 ? (
                <div className="text-center py-16">
                    <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No expense claims found</p>
                </div>
            ) : (
                <div className="card">
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Expense</th>
                                    <th>Linkage</th>
                                    {isHR && <th>Employee</th>}
                                    <th>Category</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    {isHR && <th>Actions</th>}
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map(exp => (
                                    <tr key={exp.id} className="group">
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-800">{exp.title}</p>
                                                {exp.receiptLinks?.length > 0 && exp.receiptLinks.filter(Boolean).map((link: string, i: number) => (
                                                    <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                                                        className="p-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                                        title={`View Proof Link ${i + 1}`}
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ))}
                                {/* Legacy single receiptUrl support */}
                                {!exp.receiptLinks?.length && exp.receiptUrl && (
                                                    <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer"
                                                        className="p-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                                        title="View Receipt"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {exp.notes && <p className="text-xs text-gray-400">{exp.notes}</p>}
                                                {exp.isBillable && <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1 rounded uppercase tracking-wider">Billable</span>}
                                            </div>
                                        </td>
                                        <td>
                                            {exp.projectId ? (
                                                <div className="text-sm">
                                                    <p className="text-gray-800 font-medium">{exp.projectId.name}</p>
                                                    {exp.clientId && <p className="text-[10px] text-gray-400">{exp.clientId.company}</p>}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-300">—</span>
                                            )}
                                        </td>
                                        {isHR && (
                                            <td className="text-sm text-gray-600">
                                                {exp.employeeId?.name || '—'}
                                                <p className="text-xs text-gray-400">{exp.employeeId?.department || ''}</p>
                                            </td>
                                        )}
                                        <td>
                                            <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', CAT_COLORS[exp.category] || CAT_COLORS.other)}>
                                                {exp.category}
                                            </span>
                                        </td>
                                        <td className="font-bold text-gray-900">₹{exp.amount?.toLocaleString('en-IN')}</td>
                                        <td className="text-sm text-gray-500">{exp.date ? format(new Date(exp.date), 'MMM d, yyyy') : '—'}</td>
                                        <td>
                                            <span className={clsx('badge text-xs capitalize', STATUS_STYLES[exp.status] || 'badge-gray')}>
                                                {exp.status}
                                            </span>
                                        </td>
                                        {isHR && (
                                            <td>
                                                {exp.status === 'pending' && (
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => review(exp.id, 'approved')} className="p-1 rounded hover:bg-green-50 text-green-600" title="Approve Expense">
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => review(exp.id, 'rejected')} className="p-1 rounded hover:bg-red-50 text-red-400" title="Reject Expense">
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        <td>
                                            <button onClick={() => setShowDeleteConfirm(exp.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600" title="Delete Expense">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!showDeleteConfirm}
                title="Delete Expense"
                message="Are you sure you want to delete this expense claim?"
                confirmText="Delete"
                onConfirm={handleDeleteExpense}
                onCancel={() => setShowDeleteConfirm(null)}
                loading={deleting}
                variant="danger"
            />
        </div>
    );
}
