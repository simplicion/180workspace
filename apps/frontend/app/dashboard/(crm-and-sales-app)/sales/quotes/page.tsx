'use client';


import { useState, useEffect } from 'react';
import {
    FileText, Plus, Search, Filter, ArrowRight, DollarSign,
    Calendar, Download, CheckCircle, Clock, X, Trash2,
    MoreVertical, Mail, Edit2, Eye
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow, parseISO, addDays } from 'date-fns';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth-context';
import { PlatformModal } from '@/components/shared/PlatformModal';

export default function QuotesPage() {
    const { user } = useAuth();
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [activeQuote, setActiveQuote] = useState<any>(null);
    const [emailRecipient, setEmailRecipient] = useState('');
    
    const [clients, setClients] = useState<any[]>([]);
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        validUntil: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        notes: '',
        clientId: '',
        opportunityId: '',
        items: [{ description: '', quantity: 1, unitPrice: 0, tax: 0, total: 0 }],
        discount: 0
    });
    const [saving, setSaving] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        fetchQuotes();
        fetchClients();
        fetchOpportunities();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await api.get('/api/clients');
            setClients(res.data.clients || []);
        } catch (error) { console.error('Failed to load clients'); }
    };

    const fetchOpportunities = async () => {
        try {
            const res = await api.get('/api/sales/leads-pipeline');
            setOpportunities(res.data.opportunities || []);
        } catch (error) { console.error('Failed to load opportunities'); }
    };

    const fetchQuotes = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/sales/quotes');
            setQuotes(res.data.quotes || []);
        } catch (error) {
            toast.error('Failed to load quotes');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitQuote = async () => {
        if (formData.items.length === 0 || !formData.items[0].description) {
            return toast.error('Add at least one item');
        }

        try {
            setSaving(true);
            let subtotal = 0;
            let taxTotal = 0;
            const processedItems = formData.items.map(item => {
                const total = item.quantity * item.unitPrice;
                const taxAmount = total * (item.tax / 100);
                subtotal += total;
                taxTotal += taxAmount;
                return { ...item, total: total + taxAmount };
            });

            const grandTotal = subtotal + taxTotal - Number(formData.discount);
            const payload = {
                clientId: formData.clientId || null,
                opportunityId: formData.opportunityId || null,
                validUntil: formData.validUntil,
                notes: formData.notes,
                items: processedItems,
                subtotal,
                taxTotal,
                discount: Number(formData.discount),
                grandTotal
            };

            if (editingId) {
                await api.put(`/api/sales/quotes/${editingId}`, payload);
                toast.success('Quote updated successfully');
            } else {
                await api.post('/api/sales/quotes', payload);
                toast.success('Quote created successfully');
            }

            setIsModalOpen(false);
            setEditingId(null);
            fetchQuotes();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to save quote');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (quote: any) => {
        setEditingId(quote.id);
        setFormData({
            clientId: quote.clientId?.id || '',
            opportunityId: quote.opportunityId?.id || '',
            validUntil: format(parseISO(quote.validUntil), 'yyyy-MM-dd'),
            notes: quote.notes || '',
            items: quote.items.map((i: any) => ({ ...i })),
            discount: quote.discount || 0
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this quotation?')) return;
        try {
            await api.delete(`/api/sales/quotes/${id}`);
            toast.success('Quote deleted');
            fetchQuotes();
        } catch (error) {
            toast.error('Failed to delete quote');
        }
    };

    const openEmailModal = (quote: any) => {
        setActiveQuote(quote);
        setEmailRecipient(quote.clientId?.email || '');
        setIsEmailModalOpen(true);
    };

    const handleSendEmail = async () => {
        if (!emailRecipient) return toast.error('Recipient email is required');
        try {
            setSendingEmail(true);
            await api.post(`/api/sales/quotes/${activeQuote.id}/send-email`, { email: emailRecipient });
            toast.success('Email sent successfully');
            setIsEmailModalOpen(false);
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Failed to send email';
            toast.error(msg, { duration: 5000 });
        } finally {
            setSendingEmail(false);
        }
    };

    const handleDownload = (id: string, number: string) => {
        const token = localStorage.getItem('platform_auth_token');
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/sales/quotes/${id}/pdf${token ? `?token=${token}` : ''}`;
        window.open(url, '_blank');
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        // auto-calc line total for visual feedback
        const total = Number(newItems[index].quantity) * Number(newItems[index].unitPrice);
        const withTax = total + (total * (Number(newItems[index].tax) / 100));
        newItems[index].total = withTax;

        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: '', quantity: 1, unitPrice: 0, tax: 0, total: 0 }]
        });
    };

    const removeItem = (index: number) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const filteredQuotes = quotes.filter(q =>
        q.quoteNumber?.toLowerCase().includes(search.toLowerCase()) ||
        q.createdBy?.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="page-header flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="page-title">Quotations</h1>
                        <p className="page-subtitle">Manage and generate sales quotes</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({
                            validUntil: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                            notes: '',
                            clientId: '',
                            opportunityId: '',
                            items: [{ description: '', quantity: 1, unitPrice: 0, tax: 0, total: 0 }],
                            discount: 0
                        });
                        setIsModalOpen(true);
                    }}
                    className="btn btn-primary flex items-center gap-2 px-4 py-2"
                >
                    <Plus className="w-4 h-4" /> New Quote
                </button>
            </div>

            <div className="card flex flex-wrap gap-4 items-center justify-between">
                <div className="relative flex-1 min-w-[250px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search quote number, creator..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input pl-10 w-full"
                    />
                </div>
                <button className="btn btn-secondary flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Filter
                </button>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quote Number</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date / Valid Until</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Creator</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Value</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
                                    </td>
                                </tr>
                            ) : filteredQuotes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No quotes found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredQuotes.map((quote) => (
                                    <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-semibold text-gray-900">{quote.quoteNumber}</div>
                                            {quote.clientId && <div className="text-xs text-gray-500">{quote.clientId?.company || quote.clientId?.name}</div>}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-900">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {format(parseISO(quote.createdAt), 'MMM d, yyyy')}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Valid until: {format(parseISO(quote.validUntil), 'MMM d, yyyy')}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-700">
                                            {quote.createdBy?.name || 'Unknown'}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900">${quote.grandTotal?.toLocaleString()}</div>
                                            <div className="text-xs text-gray-500">{quote.items?.length || 0} items</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={clsx(
                                                "px-2.5 py-1 text-xs font-semibold rounded-full border",
                                                quote.status === 'Draft' ? "bg-gray-100 text-gray-700 border-gray-200" :
                                                    quote.status === 'Sent' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                                        quote.status === 'Accepted' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                                            "bg-red-100 text-red-700 border-red-200"
                                            )}>
                                                {quote.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button 
                                                    onClick={() => handleDownload(quote.id, quote.quoteNumber)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                                                    title="Preview & Download PDF"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => openEmailModal(quote)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                                    title="Send via Email"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleEdit(quote)}
                                                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                                                    title="Edit Quote"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(quote.id)}
                                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                                                    title="Delete Quote"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Quote Modal */}
            <PlatformModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Edit Quotation' : 'Create New Quote'}
                maxWidthClass="max-w-4xl"
                footer={
                    <>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                        <button type="button" onClick={handleSubmitQuote} disabled={saving} className="btn-primary px-6">
                            {saving ? 'Saving...' : editingId ? 'Update & Save' : 'Generate Quote'}
                        </button>
                    </>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Client Information</h3>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Select Client *</label>
                                <select
                                    value={formData.clientId}
                                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                    className="input w-full"
                                    required
                                    aria-label="Select Client"
                                    title="Select Client"
                                >
                                    <option value="">-- Choose Client --</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.company || c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Link to Deal (Optional)</label>
                                <select
                                    value={formData.opportunityId}
                                    onChange={(e) => setFormData({ ...formData, opportunityId: e.target.value })}
                                    className="input w-full"
                                    aria-label="Link to Deal"
                                    title="Link to Deal"
                                >
                                    <option value="">-- No Deal Linked --</option>
                                    {opportunities.map(o => (
                                        <option key={o.id} value={o.id}>{o.title} (${o.value?.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Quote Meta</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Valid Until *</label>
                                    <input
                                        type="date"
                                        value={formData.validUntil}
                                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                        className="input w-full"
                                        title="Valid Until Date"
                                        aria-label="Valid Until"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reference</label>
                                    <div className="input w-full bg-gray-50 text-gray-400 italic">
                                        Auto-generated
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Discount ($)</label>
                                <div className="relative">
                                    <DollarSign className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="number" min="0"
                                        value={formData.discount}
                                        onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                                        className="input w-full pl-7"
                                        aria-label="Total Discount Amount"
                                        title="Total Discount Amount"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden mt-6 shadow-sm">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-700">Line Items</h3>
                            <button type="button" onClick={addItem} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Add Item
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {formData.items.map((item, index) => (
                                <div key={index} className="flex gap-4 items-start relative group">
                                    <div className="flex-1">
                                        <input
                                            type="text" placeholder="Item description"
                                            value={item.description}
                                            onChange={e => updateItem(index, 'description', e.target.value)}
                                            className="input w-full"
                                            title="Item Description"
                                            aria-label="Description"
                                        />
                                    </div>
                                    <div className="w-24">
                                        <input
                                            type="number" placeholder="Qty" min="1"
                                            title="Quantity"
                                            value={item.quantity}
                                            onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                                            className="input w-full"
                                        />
                                    </div>
                                    <div className="w-32">
                                        <div className="relative">
                                            <DollarSign className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number" placeholder="Price" min="0" step="0.01"
                                                value={item.unitPrice} title="Unit Price"
                                                onChange={e => updateItem(index, 'unitPrice', Number(e.target.value))}
                                                className="input w-full pl-7"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-24">
                                        <div className="relative">
                                            <input
                                                type="number" placeholder="Tax" min="0" max="100"
                                                value={item.tax} title="Tax %"
                                                onChange={e => updateItem(index, 'tax', Number(e.target.value))}
                                                className="input w-full pr-7"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                                        </div>
                                    </div>
                                    <div className="w-24 flex items-center h-10 text-gray-900 font-semibold justify-end">
                                        ${item.total.toFixed(2)}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="mt-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50"
                                        title="Remove Item"
                                        aria-label="Remove Item"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                        <textarea
                            rows={3}
                            value={formData.notes}
                            placeholder="Terms, conditions, or extra information..."
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="input w-full py-3 resize-none"
                        />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-end justify-between mt-6">
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-500 gap-8">
                                <span>Subtotal:</span>
                                <span>${formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 gap-8">
                                <span>Tax:</span>
                                <span>+ ${formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.tax / 100)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-xs text-rose-500 gap-8">
                                <span>Discount:</span>
                                <span>- ${Number(formData.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-xl pt-1 flex gap-4 items-baseline">
                                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total:</span>
                                <span className="font-black text-indigo-600">${(formData.items.reduce((sum, item) => sum + item.total, 0) - formData.discount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </PlatformModal>

            {/* Email Confirmation Modal */}
            <PlatformModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                title="Send Quotation"
                icon={Mail}
                iconColorClass="text-blue-600"
                iconBgClass="bg-blue-50"
                maxWidthClass="max-w-md"
                footer={
                    <>
                        <button type="button" onClick={() => setIsEmailModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                        <button 
                            type="button"
                            onClick={handleSendEmail} 
                            disabled={sendingEmail}
                            className="btn-primary flex-1"
                        >
                            {sendingEmail ? 'Sending...' : 'Send Now'}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        This will send <strong>{activeQuote?.quoteNumber}</strong> as a PDF attachment to the following address:
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Recipient Email</label>
                        <input 
                            type="email"
                            value={emailRecipient}
                            onChange={(e) => setEmailRecipient(e.target.value)}
                            placeholder="client@example.com"
                            className="input w-full"
                        />
                    </div>
                </div>
            </PlatformModal>
        </div>
    );
}
