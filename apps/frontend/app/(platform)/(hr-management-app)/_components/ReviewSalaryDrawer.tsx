'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';
import { useSettings } from '@/lib/settings-context';

export default function ReviewSalaryDrawer({ 
    open, 
    salary, 
    onClose, 
    onSuccess 
}: { 
    open: boolean;
    salary: any; 
    onClose: () => void; 
    onSuccess: () => void; 
}) {
    const [deductions, setDeductions] = useState<number | string>(0);
    const [bonuses, setBonuses] = useState<number | string>(0);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';

    useEffect(() => {
        if (open && salary) {
            setDeductions(salary.deductions || 0);
            setBonuses(salary.bonuses || 0);
            setNotes(salary.notes || '');
        }
    }, [open, salary]);

    const handleApprove = async () => {
        if (!salary) return;
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

    if (!salary) return null;

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={`Review Salary for ${salary.employeeId?.name || 'Employee'}`}
            description="Review details and approve for processing"
            icon={<CheckCircle className="w-5 h-5 text-blue-600" />}
        >
            <div className="flex flex-col h-full">
                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Base Salary</p>
                        <p className="text-xl font-bold text-gray-900">{currencySymbol}{salary.baseSalary?.toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label" htmlFor="review-deds">Deductions ({currencySymbol})</label>
                            <input title="Enter Deductions" id="review-deds" type="number" value={deductions} onChange={e => setDeductions(e.target.value)} className="input" min="0" />
                        </div>
                        <div>
                            <label className="label" htmlFor="review-bonus">Bonuses ({currencySymbol})</label>
                            <input title="Enter Bonuses" id="review-bonus" type="number" value={bonuses} onChange={e => setBonuses(e.target.value)} className="input" min="0" />
                        </div>
                    </div>
                    <div>
                        <label className="label">Notes / Remarks</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input h-20" placeholder="Optional comments about deductions or performance..." />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
                    <button onClick={handleApprove} disabled={saving} className="btn-primary">
                        {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Approve Salary
                    </button>
                </div>
            </div>
        </Drawer>
    );
}
