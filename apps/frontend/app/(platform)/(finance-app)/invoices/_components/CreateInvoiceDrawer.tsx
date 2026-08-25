import React, { useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';
import { LogoLoader } from '@workspace/ui';
import { FileText, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import CustomSelect from '@/components/ui/CustomSelect';

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

export function CreateInvoiceDrawer({ isOpen, onClose, onSuccess, clients }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; clients: any[] }) {
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
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';

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
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title="Create Invoice"
            maxWidth="max-w-2xl"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Create Invoice'}
                    </button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Client & Dates */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="clientId" className="label">Client *</label>
                        <CustomSelect id="clientId" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} className="select">
                            <option value="">Select client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.company}</option>)}
                        </CustomSelect>
                        {!form.clientId && (
                            <input id="manualClientName" aria-label="Manual client name" value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} className="input mt-2" placeholder="Or enter client name manually" />
                        )}
                    </div>
                    <div>
                        <label htmlFor="invoiceStatus" className="label">Status</label>
                        <CustomSelect id="invoiceStatus" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="select">
                            {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
                        </CustomSelect>
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
                                            {currencySymbol}{(line.quantity * line.unitPrice).toLocaleString('en-IN')}
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
                            <span>Subtotal</span><span className="font-medium text-gray-800">{currencySymbol}{subtotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-500">
                            <span className="flex items-center gap-2">Tax
                                <input aria-label="Tax percentage" type="number" value={form.taxPercent} onChange={e => setForm(p => ({ ...p, taxPercent: Number(e.target.value) }))} className="w-16 input py-0.5 text-xs text-center" min="0" max="100" />%
                            </span>
                            <span className="font-medium text-gray-800">{currencySymbol}{tax.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-500">
                            <span className="flex items-center gap-2">Discount
                                <input aria-label="Discount amount" type="number" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: Number(e.target.value) }))} className="w-20 input py-0.5 text-xs text-center" min="0" />
                            </span>
                            <span className="font-medium text-red-500">-{currencySymbol}{form.discount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
                            <span>Total</span><span>{currencySymbol}{total.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="invoiceNotes" className="label">Notes</label>
                    <textarea id="invoiceNotes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input resize-none" rows={2} placeholder="Payment terms, bank details, etc." />
                </div>
            </form>
        </Drawer>
    );
}
