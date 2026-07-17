'use client';

import { LogoLoader } from "@workspace/ui";
import { useState } from 'react';
import api from '@/lib/api';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export const LEAVE_TYPE_COLORS: Record<string, string> = {
    sick: 'badge-red', casual: 'badge-blue', annual: 'badge-green',
    maternity: 'badge-purple', paternity: 'badge-purple', unpaid: 'badge-gray', other: 'badge-gray',
};

function todayStr() { return new Date().toISOString().slice(0, 10); }

export function LeaveRequestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState({ type: 'casual', startDate: todayStr(), endDate: todayStr(), reason: '' });
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/leaves', form);
            toast.success('Leave request submitted!');
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to submit');
        } finally { setLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Request Leave</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center" aria-label="Close modal" title="Close">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div>
                        <label className="label" htmlFor="leave-type">Leave Type</label>
                        <select id="leave-type" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="select" title="Select leave type">
                            {['sick', 'casual', 'annual', 'maternity', 'paternity', 'unpaid', 'other'].map(t => (
                                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label" htmlFor="start-date">Start Date</label>
                            <input id="start-date" type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="input" required title="Start Date" />
                        </div>
                        <div>
                            <label className="label" htmlFor="end-date">End Date</label>
                            <input id="end-date" type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="input" required title="End Date" />
                        </div>
                    </div>
                    <div>
                        <label className="label">Reason</label>
                        <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} className="input resize-none" rows={3} placeholder="Briefly describe the reason..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

import clsx from 'clsx';

export function ViewLeaveModal({ leave, onClose }: { leave: any; onClose: () => void }) {
    if (!leave) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Leave Details</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center" aria-label="Close modal" title="Close">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                            {leave.employeeId?.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{leave.employeeId?.name}</p>
                            <p className="text-xs text-gray-500">{leave.employeeId?.department} • {leave.employeeId?.employeeId}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Type</p>
                            <span className={clsx('badge capitalize', LEAVE_TYPE_COLORS[leave.type] || 'badge-gray')}>{leave.type}</span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                            <span className={clsx('badge capitalize', leave.status === 'approved' ? 'badge-green' : leave.status === 'rejected' ? 'badge-red' : 'badge-orange')}>
                                {leave.status}
                            </span>
                        </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Duration</p>
                        <p className="text-sm text-gray-700 font-medium">{leave.startDate} to {leave.endDate} ({leave.days} days)</p>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reason</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{leave.reason || "No reason provided."}</p>
                    </div>

                    {leave.reviewedBy && (
                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Reviewed By</p>
                            <p className="text-sm text-indigo-700 font-medium">{leave.reviewedBy.name}</p>
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button onClick={onClose} className="btn-primary w-full shadow-lg shadow-indigo-200">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
