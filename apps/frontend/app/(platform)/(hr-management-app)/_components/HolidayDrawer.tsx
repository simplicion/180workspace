'use client';

import { LogoLoader } from "@workspace/ui";
import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Drawer } from "@/components/ui/Drawer";
import CustomSelect from '@/components/ui/CustomSelect';

export const HOLIDAY_TYPE_COLORS: Record<string, string> = {
    national: 'badge-blue', optional: 'badge-orange', company: 'badge-green',
};

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function HolidayDrawer({
    holiday,
    open,
    onClose,
    onSuccess,
}: {
    holiday?: any;
    open: boolean;
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
        <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit Holiday' : 'Add Holiday'}>
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
                        <CustomSelect id="holiday-type" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="select" title="Holiday Type">
                            <option value="national">National</option>
                            <option value="optional">Optional</option>
                            <option value="company">Company</option>
                        </CustomSelect>
                    </div>
                </div>
                <div>
                    <label className="label">Description (optional)</label>
                    <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input resize-none" rows={2} placeholder="Brief description..." />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Add Holiday'}
                    </button>
                </div>
            </form>
        </Drawer>
    );
}
