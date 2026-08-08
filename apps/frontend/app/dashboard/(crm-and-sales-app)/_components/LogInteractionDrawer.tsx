import React, { useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { X, CheckCircle, Mail, PhoneCall, CalendarIcon, FileText } from 'lucide-react';
import { LogoLoader } from "@workspace/ui";
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '@/lib/api';

const COMM_TYPES = [
    { value: 'email',   label: 'Email',   icon: Mail,        color: 'bg-blue-50 text-blue-600',   bar: 'bg-blue-500' },
    { value: 'call',    label: 'Call',    icon: PhoneCall,   color: 'bg-green-50 text-green-600', bar: 'bg-green-500' },
    { value: 'meeting', label: 'Meeting', icon: CalendarIcon,color: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' },
    { value: 'note',    label: 'Note',    icon: FileText,    color: 'bg-gray-50 text-gray-600',   bar: 'bg-gray-400' },
];

export function LogInteractionDrawer({ clientId, isOpen, onClose, onSuccess }: any) {
    const [form, setForm] = useState({ type: 'call', subject: '', summary: '', date: format(new Date(), 'yyyy-MM-dd') });
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.subject.trim()) { toast.error('Subject is required'); return; }
        setSaving(true);
        try {
            const { data } = await api.post(`/api/clients/${clientId}/communications`, form);
            toast.success('Interaction logged!');
            onSuccess(data.communication);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to log interaction');
        } finally {
            setSaving(false);
        }
    }

    if (!isOpen) return null;

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Log Interaction" maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
                <div>
                    <label className="label">Interaction Type</label>
                    <div className="grid grid-cols-4 gap-2">
                        {COMM_TYPES.map(t => {
                            const TIcon = t.icon;
                            return (
                                <button
                                    key={t.value} type="button"
                                    onClick={() => setForm(p => ({ ...p, type: t.value }))}
                                    className={clsx(
                                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-bold',
                                        form.type === t.value
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-100 hover:border-gray-200 text-gray-500'
                                    )}
                                >
                                    <TIcon className="w-4 h-4" />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className="label">Subject *</label>
                    <input
                        type="text"
                        required
                        value={form.subject}
                        onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                        placeholder="e.g. Project Kickoff Meeting"
                        className="input"
                    />
                </div>

                <div>
                    <label className="label">Summary / Notes</label>
                    <textarea
                        rows={3}
                        value={form.summary}
                        onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
                        placeholder="Brief notes about this interaction..."
                        className="input resize-none"
                    />
                </div>

                <div>
                    <label className="label">Date</label>
                    <input
                        type="date"
                        value={form.date}
                        onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                        className="input"
                    />
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                    <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3">Cancel</button>
                    <button type="submit" disabled={saving} className="flex-1 btn-primary py-3">
                        {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Log Interaction'}
                    </button>
                </div>
            </form>
        </Drawer>
    );
}
