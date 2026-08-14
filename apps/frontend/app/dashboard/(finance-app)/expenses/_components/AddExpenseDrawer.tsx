import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { X, Plus, Link } from 'lucide-react';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';
import { LogoLoader } from '@workspace/ui';
import { useSettings } from '@/lib/settings-context';

const CATEGORIES = ['Software/SaaS', 'Office Supplies', 'Travel & Meals', 'Marketing', 'Utilities', 'Professional Services', 'other'];

export function AddExpenseDrawer({ isOpen, onClose, onSuccess, projects, clients, expenseToEdit }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; projects: any[]; clients: any[]; expenseToEdit?: any }) {
    const [form, setForm] = useState({
        title: '', amount: '', category: 'Travel & Meals',
        date: format(new Date(), 'yyyy-MM-dd'),
        receiptLinks: [''] as string[], notes: '',
        projectId: '', clientId: '', isBillable: false
    });
    const [loading, setLoading] = useState(false);
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';

    useEffect(() => {
        if (isOpen && expenseToEdit) {
            setForm({
                title: expenseToEdit.title || '',
                amount: expenseToEdit.amount?.toString() || '',
                category: expenseToEdit.category || 'Travel & Meals',
                date: expenseToEdit.date ? format(new Date(expenseToEdit.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                receiptLinks: expenseToEdit.receiptLinks?.length ? [...expenseToEdit.receiptLinks] : (expenseToEdit.receiptUrl ? [expenseToEdit.receiptUrl] : ['']),
                notes: expenseToEdit.notes || '',
                projectId: expenseToEdit.projectId?.id || expenseToEdit.projectId || '',
                clientId: expenseToEdit.clientId?.id || expenseToEdit.clientId || '',
                isBillable: !!expenseToEdit.isBillable
            });
        } else if (isOpen && !expenseToEdit) {
            setForm({
                title: '', amount: '', category: 'Travel & Meals',
                date: format(new Date(), 'yyyy-MM-dd'),
                receiptLinks: [''], notes: '',
                projectId: '', clientId: '', isBillable: false
            });
        }
    }, [isOpen, expenseToEdit]);

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
            const payload = {
                ...form,
                amount: parseFloat(form.amount),
                projectId: form.projectId || undefined,
                clientId: form.clientId || undefined,
                receiptLinks: form.receiptLinks.filter(l => l.trim() !== '')
            };

            if (expenseToEdit) {
                await api.put(`/api/expenses/${expenseToEdit.id}`, payload);
                toast.success('Expense updated!');
            } else {
                await api.post('/api/expenses', payload);
                toast.success('Expense submitted!');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to save');
        } finally { setLoading(false); }
    }

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={expenseToEdit ? "Edit Expense" : "Submit Expense"}
            maxWidth="max-w-md"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" form="expense-form" disabled={loading} className="btn-primary">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : expenseToEdit ? 'Save Changes' : 'Submit Claim'}
                    </button>
                </div>
            }
        >
            <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="label">Expense Title *</label>
                    <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input" placeholder="e.g. Flight to Mumbai" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="label" htmlFor="amount">Amount ({currencySymbol}) *</label>
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
            </form>
        </Drawer>
    );
}
