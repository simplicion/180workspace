'use client';

import { LogoLoader } from "@workspace/ui";
import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ReviewSalaryModal({ salary, onClose, onSuccess }: { salary: any; onClose: () => void, onSuccess: () => void }) {
    const [deductions, setDeductions] = useState<number | string>(salary.deductions || 0);
    const [bonuses, setBonuses] = useState<number | string>(salary.bonuses || 0);
    const [notes, setNotes] = useState(salary.notes || '');
    const [saving, setSaving] = useState(false);

    const handleApprove = async () => {
        setSaving(true);
        try {
            await api.put(`/api/salary/${salary.id}/hr-approve`, {
                deductions: Number(deductions),
                bonuses: Number(bonuses),
                notes
            });
            toast.success('Salary reviewed and HR Approved');
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to approve salary');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Review Salary for {salary.employeeId?.name}</h3>
                    <button title="Close Modal" onClick={onClose}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Base Salary</p>
                        <p className="text-xl font-bold text-gray-900">₹{salary.baseSalary?.toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label" htmlFor="review-deds">Deductions (₹)</label>
                            <input title="Enter Deductions" id="review-deds" type="number" value={deductions} onChange={e => setDeductions(e.target.value)} className="input" min="0" />
                        </div>
                        <div>
                            <label className="label" htmlFor="review-bonus">Bonuses (₹)</label>
                            <input title="Enter Bonuses" id="review-bonus" type="number" value={bonuses} onChange={e => setBonuses(e.target.value)} className="input" min="0" />
                        </div>
                    </div>
                    <div>
                        <label className="label">Notes / Remarks</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input h-20" placeholder="Optional comments about deductions or performance..." />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
                    <button onClick={handleApprove} disabled={saving} className="btn-primary">
                        {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Approve Salary
                    </button>
                </div>
            </div>
        </div>
    );
}
