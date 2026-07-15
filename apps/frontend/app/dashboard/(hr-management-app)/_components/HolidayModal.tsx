'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const HOLIDAY_TYPE_COLORS: Record<string, string> = {
    national: 'badge-blue', optional: 'badge-orange', company: 'badge-green',
};

function todayStr() { return new Date().toISOString().slice(0, 10); }

export function HolidayModal({
    holiday,
    onClose,
    onSuccess,
}: {
    holiday?: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState({
        name: holiday?.name || '',
        date: holiday?.date ? String(holiday.date).slice(0, 10) : todayStr(),
        type: holiday?.type || 'national',
        description: holiday?.description || '',
    });
    const [loading, setLoading] = useState(false);
    const isEdit = !!holiday?.id;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                await api.put(`/api/holidays/${holiday.id}`, form);
                toast.success('Holiday updated');
            } else {
                await api.post('/api/holidays', form);
                toast.success('Holiday added');
            }
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to save holiday');
        } finally { setLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Holiday' : 'Add Holiday'}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center" aria-label="Close modal" title="Close">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div>
                        <label className="label">Holiday Name</label>
                        <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g. Republic Day" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label" htmlFor="holiday-date">Date</label>
                            <input id="holiday-date" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input" required title="Holiday Date" />
                        </div>
                        <div>
                            <label className="label" htmlFor="holiday-type">Type</label>
                            <select id="holiday-type" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="select" title="Holiday Type">
                                <option value="national">National</option>
                                <option value="optional">Optional</option>
                                <option value="company">Company</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="label">Description (optional)</label>
                        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input resize-none" rows={2} placeholder="Brief description..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Add Holiday'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
