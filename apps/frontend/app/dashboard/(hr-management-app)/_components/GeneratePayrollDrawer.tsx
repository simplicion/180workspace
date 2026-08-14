'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { DollarSign, Calendar, User, AlertCircle, Plus, XCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';
import { useSettings } from '@/lib/settings-context';

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: (salary: any) => void;
}

export default function GeneratePayrollDrawer({ open, onClose, onSuccess }: Props) {
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';
    
    const [preview, setPreview] = useState<any>(null);
    const [fetchingPreview, setFetchingPreview] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [form, setForm] = useState({
        employeeId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        baseSalary: '',
        deductions: '0',
        bonuses: '0',
        notes: '',
    });

    const monthStr = `${form.year}-${form.month.toString().padStart(2, '0')}`;

    useEffect(() => {
        if (open) {
            api.get('/api/users', { params: { limit: 100 } })
                .then(({ data }) => setEmployees(data.users || []));
        }
    }, [open]);

    // Auto-fetch preview when employee/month selected
    useEffect(() => {
        if (form.employeeId && monthStr && open) {
            fetchPreview();
        }
    }, [form.employeeId, monthStr, open]);

    async function fetchPreview() {
        setFetchingPreview(true);
        try {
            const { data } = await api.get('/api/salary/preview', {
                params: { employeeId: form.employeeId, month: monthStr }
            });
            setPreview(data.preview);
            setForm(prev => ({
                ...prev,
                baseSalary: data.preview.baseSalary.toString(),
                bonuses: data.preview.bonuses?.toString() || '0',
                deductions: data.preview.deductions?.toString() || '0',
                notes: data.preview.notes || ''
            }));
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to fetch attendance preview');
        } finally {
            setFetchingPreview(false);
        }
    }

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    const net = Number(form.baseSalary || 0) - Number(form.deductions || 0) + Number(form.bonuses || 0);

    async function handleGenerate(e: React.FormEvent) {
        e.preventDefault();
        if (!form.employeeId) return toast.error('Please select an employee');
        if (form.baseSalary === '') return toast.error('Base salary is required');
        setLoading(true);
        try {
            const payload = {
                employeeId: form.employeeId,
                month: monthStr,
                baseSalary: Number(form.baseSalary),
                deductions: Number(form.deductions),
                bonuses: Number(form.bonuses),
                totalDays: preview?.totalDays,
                presentDays: preview?.presentDays,
                halfDays: preview?.halfDays,
                holidayCount: preview?.holidayCount,
                paidLeaves: preview?.paidLeaves,
                unpaidLeaves: preview?.unpaidLeaves,
                lateDays: preview?.lateDays,
                perDaySalary: preview?.perDaySalary
            };
            const { data } = await api.post('/api/salary/generate', payload);
            toast.success('Salary record generated!');
            onSuccess(data.salary);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to generate payroll');
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerateAll() {
        if (!form.month) return toast.error('Select a month first');
        setGenerating(true);
        let success = 0;
        try {
            for (const emp of employees) {
                try {
                    const { data } = await api.get('/api/salary/preview', {
                        params: { employeeId: emp.id, month: monthStr }
                    });
                    const p = data.preview;
                    
                    await api.post('/api/salary/generate', {
                        employeeId: emp.id,
                        month: monthStr,
                        baseSalary: p.baseSalary,
                        deductions: p.deductions || 0,
                        bonuses: p.bonuses || 0,
                        totalDays: p.totalDays,
                        presentDays: p.presentDays,
                        halfDays: p.halfDays,
                        holidayCount: p.holidayCount,
                        paidLeaves: p.paidLeaves,
                        unpaidLeaves: p.unpaidLeaves,
                        lateDays: p.lateDays,
                        perDaySalary: p.perDaySalary,
                        notes: p.notes
                    });
                    success++;
                } catch (empErr: any) {
                    console.error(`Failed for ${emp.name}:`, empErr?.response?.data?.error || empErr.message);
                }
            }
            toast.success(`Generated automated payroll for ${success} employees`);
            onSuccess({});
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Partial failure generating payroll');
        } finally {
            setGenerating(false);
        }
    }

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="Generate Professional Payroll"
            description="Automated Attendance Sync"
            icon={<div className="w-5 h-5 text-indigo-600 flex items-center justify-center font-bold text-lg">{currencySymbol}</div>}
        >
            <div className="flex flex-col h-full">
                <form onSubmit={handleGenerate} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 block">Year</label>
                            <select title="Select year" value={form.year} onChange={(e) => setForm(f => ({ ...f, year: Number(e.target.value) }))} className="w-full bg-gray-50 border-0 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm py-2.5 px-3 font-medium">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 block">Month</label>
                            <select title="Select month" value={form.month} onChange={(e) => setForm(f => ({ ...f, month: Number(e.target.value) }))} className="w-full bg-gray-50 border-0 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm py-2.5 px-3 font-medium">
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 block">Select Staff Member</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                                <select title="Select employee" value={form.employeeId} onChange={set('employeeId')} className="w-full bg-gray-50 border-0 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm py-2.5 pl-10 font-medium appearance-none">
                                    <option value="">Choose Employee</option>
                                    {employees.map(u => <option key={u.id} value={u.id}>{u.name} {u.salary ? `(${currencySymbol}${u.salary.toLocaleString()})` : ''}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex gap-4 transition-all hover:shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-indigo-900 mb-1">Bulk Enterprise Generation</h3>
                            <p className="text-xs text-indigo-600/80 leading-relaxed">Instantly calculate and generate salary records for all employees based on verified attendance logs and approved leaves.</p>
                            <button
                                title="Run bulk generation"
                                type="button"
                                onClick={handleGenerateAll}
                                disabled={generating}
                                className="mt-3 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center gap-2 group"
                            >
                                {generating ? <LogoLoader className="w-3 h-3 animate-spin" /> : <div className="w-3.5 h-3.5 flex items-center justify-center font-bold">{currencySymbol}</div>}
                                Generate for Everyone
                            </button>
                        </div>
                    </div>

                    {fetchingPreview ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-3">
                            <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
                            <p className="text-xs font-bold uppercase tracking-widest">Scanning Attendance Logs...</p>
                        </div>
                    ) : (preview && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                             <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                                <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance & Leave Breakdown</span>
                                    <div className="flex gap-2">
                                        {preview.holidayCount > 0 && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">{preview.holidayCount} Holidays Credited</span>}
                                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Pro-rata calc</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-5 divide-x divide-gray-50 text-center">
                                    <div className="py-3">
                                        <p className="text-base font-black text-gray-900">{preview.totalDays}</p>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase">Cycle</p>
                                    </div>
                                    <div className="py-3">
                                        <p className="text-base font-black text-emerald-600">{preview.presentDays}</p>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase">Present</p>
                                    </div>
                                    <div className="py-3">
                                        <p className="text-base font-black text-indigo-600">{preview.paidLeaves}</p>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase">Paid L</p>
                                    </div>
                                    <div className="py-3">
                                        <p className="text-base font-black text-orange-600">{preview.holidayCount}</p>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase">Holidays</p>
                                    </div>
                                    <div className="py-3">
                                        <p className="text-base font-black text-red-600">{preview.unpaidLeaves + (preview.totalDays - preview.presentDays - preview.paidLeaves - preview.holidayCount - (preview.halfDays * 0.5))}</p>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase">Loss Pay</p>
                                    </div>
                                </div>
                                <div className="bg-indigo-50/30 p-3 border-t border-gray-100 flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                    <p className="text-[10px] font-medium text-indigo-600 italic leading-tight">
                                        {preview.notes}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 block">Total Bonuses (incl. base Bonuses)</label>
                                    <div className="relative">
                                        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                        <input title="Bonuses" value={form.bonuses} onChange={set('bonuses')} type="number" className="w-full bg-gray-50 border-0 focus:ring-2 focus:ring-emerald-100 rounded-xl text-sm py-2.5 pl-10 font-bold" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 block">Total Deductions (incl. PT/Penalty)</label>
                                    <div className="relative">
                                        <XCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                                        <input title="Deductions" value={form.deductions} onChange={set('deductions')} type="number" className="w-full bg-gray-50 border-0 focus:ring-2 focus:ring-red-100 rounded-xl text-sm py-2.5 pl-10 font-bold" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-900 rounded-2xl p-5 text-white flex items-center justify-between shadow-xl shadow-gray-200">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Net Payable Salary</p>
                                    <p className="text-3xl font-black tracking-tighter">{currencySymbol}{net.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Gross: {currencySymbol}{preview.meta?.gross?.toLocaleString() || preview.baseSalary.toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-emerald-500">Additions: +{currencySymbol}{Number(form.bonuses).toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-red-400">Total Deds: -{currencySymbol}{Number(form.deductions).toLocaleString()}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 block">Payroll Remarks / Notes</label>
                                <textarea title="Notes" value={form.notes} onChange={set('notes')} placeholder="Add notes for the employee's payslip..." rows={2} className="w-full bg-gray-50 border-0 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm py-3 px-4 font-medium resize-none shadow-inner" />
                            </div>
                        </div>
                    ))}
                </form>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button title="Cancel" onClick={onClose} type="button" className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                    <button title="Generate salary" onClick={handleGenerate} disabled={loading || !preview} className="px-8 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4 flex items-center justify-center font-bold">{currencySymbol}</div>}
                        Generate & Notify Staff
                    </button>
                </div>
            </div>
        </Drawer>
    );
}
