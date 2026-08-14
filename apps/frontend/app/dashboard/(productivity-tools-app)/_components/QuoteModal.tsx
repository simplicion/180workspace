import { useState, useEffect } from 'react';
import { PlatformModal } from '@/components/shared/PlatformModal';
import { Plus, DollarSign, Trash2 } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { useSettings } from '@/lib/settings-context';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface QuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingQuote: any | null;
}

export default function QuoteModal({ isOpen, onClose, onSuccess, editingQuote }: QuoteModalProps) {
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';
    const [clients, setClients] = useState<any[]>([]);
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        validUntil: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        notes: '',
        clientId: '',
        opportunityId: '',
        items: [{ description: '', quantity: 1, unitPrice: 0, tax: 0, total: 0 }],
        discount: 0
    });

    useEffect(() => {
        if (isOpen) {
            fetchClients();
            fetchOpportunities();
            
            if (editingQuote) {
                setFormData({
                    clientId: editingQuote.clientId?.id || editingQuote.clientId || '',
                    opportunityId: editingQuote.opportunityId?.id || editingQuote.opportunityId || '',
                    validUntil: editingQuote.validUntil ? format(parseISO(editingQuote.validUntil), 'yyyy-MM-dd') : format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                    notes: editingQuote.notes || '',
                    items: editingQuote.items ? editingQuote.items.map((i: any) => ({ ...i })) : [{ description: '', quantity: 1, unitPrice: 0, tax: 0, total: 0 }],
                    discount: editingQuote.discount || 0
                });
            } else {
                setFormData({
                    validUntil: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                    notes: '',
                    clientId: '',
                    opportunityId: '',
                    items: [{ description: '', quantity: 1, unitPrice: 0, tax: 0, total: 0 }],
                    discount: 0
                });
            }
        }
    }, [isOpen, editingQuote]);

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

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
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

    const handleSubmit = async () => {
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

            if (editingQuote) {
                await api.put(`/api/sales/quotes/${editingQuote.id || editingQuote._id}`, payload);
                toast.success('Quote updated successfully');
            } else {
                await api.post('/api/sales/quotes', payload);
                toast.success('Quote created successfully');
            }

            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to save quote');
        } finally {
            setSaving(false);
        }
    };

    return (
        <PlatformModal
            isOpen={isOpen}
            onClose={onClose}
            title={editingQuote ? 'Edit Quotation' : 'Create New Quote'}
            maxWidthClass="max-w-4xl"
            footer={
                <>
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={saving} className="btn-primary px-6">
                        {saving ? 'Saving...' : editingQuote ? 'Update & Save' : 'Generate Quote'}
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
                                    />
                                </div>
                                <div className="w-24">
                                    <input
                                        type="number" placeholder="Qty" min="1"
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
                                            value={item.unitPrice}
                                            onChange={e => updateItem(index, 'unitPrice', Number(e.target.value))}
                                            className="input w-full pl-7"
                                        />
                                    </div>
                                </div>
                                <div className="w-24">
                                    <div className="relative">
                                        <input
                                            type="number" placeholder="Tax" min="0" max="100"
                                            value={item.tax}
                                            onChange={e => updateItem(index, 'tax', Number(e.target.value))}
                                            className="input w-full pr-7"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                                    </div>
                                </div>
                                <div className="w-24 flex items-center h-10 text-gray-900 font-semibold justify-end">
                                    {currencySymbol}{item.total.toFixed(2)}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="mt-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50"
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
                        <div className="flex justify-between items-center text-gray-600 mb-2">
                            <span>Subtotal</span>
                            <span>{currencySymbol}{formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-600 mb-2">
                            <span>Total Tax</span>
                            <span>{currencySymbol}{formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.tax / 100)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-xs text-rose-500 gap-8">
                            <span>Discount:</span>
                            <span>- {currencySymbol}{Number(formData.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg mt-4 pt-4 border-t border-gray-100">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="font-black text-indigo-600">{currencySymbol}{(formData.items.reduce((sum, item) => sum + item.total, 0) - formData.discount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </PlatformModal>
    );
}
