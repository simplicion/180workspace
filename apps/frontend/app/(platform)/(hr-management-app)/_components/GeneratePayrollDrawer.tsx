'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
    DollarSign, Calendar, User, AlertCircle, Plus, XCircle, 
    Info, Mail, CheckCircle2, ShieldCheck, Send, Sparkles, 
    Link2, ExternalLink, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';
import { useSettings } from '@/lib/settings-context';
import CustomSelect from '@/components/ui/CustomSelect';

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
    const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; success: number } | null>(null);

    const [form, setForm] = useState({
        employeeId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        baseSalary: '',
        deductions: '0',
        bonuses: '0',
        notes: '',
        sendEmail: true,
        isPaid: false
    });

    const monthStr = `${form.year}-${form.month.toString().padStart(2, '0')}`;
    const selectedEmployee = employees.find(e => e.id === form.employeeId);
    const hasConfiguredEmail = Boolean(selectedEmployee?.email);

    useEffect(() => {
        if (open) {
            api.get('/api/users', { params: { limit: 150 } })
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
                baseSalary: data.preview.baseSalary?.toString() || '0',
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

    const net = Math.max(0, Number(form.baseSalary || 0) - Number(form.deductions || 0) + Number(form.bonuses || 0));

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
                notes: form.notes,
                sendEmail: form.sendEmail && hasConfiguredEmail,
                isPaid: form.isPaid,
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
            
            if (form.sendEmail && hasConfiguredEmail) {
                toast.success(`Salary generated & payslip emailed to ${selectedEmployee.email}!`, { duration: 4000 });
            } else if (form.isPaid) {
                toast.success('Salary generated, marked as paid & synced to Financial Expenses!', { duration: 4000 });
            } else {
                toast.success('Enterprise salary record generated successfully!');
            }

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
        const total = employees.length;
        setBulkProgress({ current: 0, total, success: 0 });

        try {
            for (let i = 0; i < employees.length; i++) {
                const emp = employees[i];
                setBulkProgress({ current: i + 1, total, success });
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
                        notes: p.notes,
                        sendEmail: form.sendEmail && Boolean(emp.email),
                        isPaid: form.isPaid
                    });
                    success++;
                } catch (empErr: any) {
                    console.error(`Failed for ${emp.name}:`, empErr?.response?.data?.error || empErr.message);
                }
            }
            toast.success(`Automated enterprise payroll generated for ${success} employees!`);
            onSuccess({});
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Partial failure generating bulk payroll');
        } finally {
            setGenerating(false);
            setBulkProgress(null);
        }
    }

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="Generate Enterprise Payroll"
            description="Automated Attendance Sync & Multi-Channel Payslip Distribution"
            icon={<div className="w-5 h-5 text-indigo-600 flex items-center justify-center font-bold text-lg">{currencySymbol}</div>}
        >
            <div className="flex flex-col h-full bg-white">
                <form onSubmit={handleGenerate} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {/* Period & Employee Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-wider mb-1.5 block">Fiscal Year</label>
                            <CustomSelect 
                                title="Select year" 
                                value={form.year} 
                                onChange={(e) => setForm(f => ({ ...f, year: Number(e.target.value) }))} 
                                className="w-full bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm py-2.5 px-3 font-semibold"
                            >
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </CustomSelect>
                        </div>
                        <div className="col-span-1">
                            <label className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-wider mb-1.5 block">Pay Month</label>
                            <CustomSelect 
                                title="Select month" 
                                value={form.month} 
                                onChange={(e) => setForm(f => ({ ...f, month: Number(e.target.value) }))} 
                                className="w-full bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm py-2.5 px-3 font-semibold"
                            >
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </CustomSelect>
                        </div>

                        <div className="col-span-2">
                            <label className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-wider mb-1.5 block">Staff Member</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                                <CustomSelect 
                                    title="Select employee" 
                                    value={form.employeeId} 
                                    onChange={set('employeeId')} 
                                    className="w-full bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm py-2.5 pl-10 font-semibold appearance-none"
                                >
                                    <option value="">Choose Employee...</option>
                                    {employees.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} {u.salary ? `(${currencySymbol}${Number(u.salary).toLocaleString()})` : ''} — {u.email || 'No email configured'}
                                        </option>
                                    ))}
                                </CustomSelect>
                            </div>

                            {/* Configured Email Status Box */}
                            {selectedEmployee && (
                                <div className="mt-2 text-xs">
                                    {hasConfiguredEmail ? (
                                        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/80 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium">
                                            <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <span>Email configured: <strong className="font-bold">{selectedEmployee.email}</strong> (will receive payslip statement)</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl font-medium leading-relaxed">
                                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <span>
                                                No email on profile. A <strong>secure sharable link</strong> and <strong>downloadable PDF</strong> will be instantly available once generated.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bulk Generation Option Card */}
                    <div className="bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-blue-50/40 border border-indigo-100 rounded-2xl p-4 flex gap-4 transition-all hover:shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-black text-indigo-950 mb-0.5">Bulk Enterprise Generation</h3>
                            <p className="text-xs text-indigo-700/80 leading-relaxed">
                                Instantly calculate and generate pro-rata verified payroll for all {employees.length} active employees for {monthStr}.
                            </p>
                            {bulkProgress && (
                                <div className="mt-2.5 space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold text-indigo-900">
                                        <span>Processing employee {bulkProgress.current} of {bulkProgress.total}...</span>
                                        <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-indigo-200 h-1.5 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-indigo-600 h-full transition-all duration-300"
                                            style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            <button
                                title="Run bulk generation"
                                type="button"
                                onClick={handleGenerateAll}
                                disabled={generating}
                                className="mt-3 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {generating ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <div className="w-3.5 h-3.5 flex items-center justify-center font-bold">{currencySymbol}</div>}
                                <span>{generating ? 'Processing Bulk Payroll...' : 'Generate for Entire Organization'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Attendance Scanning State */}
                    {fetchingPreview ? (
                        <div className="py-12 flex flex-col items-center justify-center text-zinc-400 space-y-3">
                            <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Scanning Attendance & Leave Registers...</p>
                        </div>
                    ) : (preview && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                            {/* Attendance Summary */}
                            <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                                <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Attendance & Leave Breakdown</span>
                                    <div className="flex gap-2">
                                        {preview.holidayCount > 0 && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">{preview.holidayCount} Holidays</span>}
                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Pro-Rata Sync</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-5 divide-x divide-zinc-100 text-center text-xs">
                                    <div className="py-3">
                                        <p className="text-base font-black text-zinc-900">{preview.totalDays}</p>
                                        <p className="text-[8px] font-bold text-zinc-400 uppercase">Working Days</p>
                                    </div>
                                    <div className="py-3">
                                        <p className="text-base font-black text-emerald-600">{preview.presentDays}</p>
                                        <p className="text-[8px] font-bold text-zinc-400 uppercase">Present</p>
                                    </div>
                                    <div className="py-3">
                                        <p className="text-base font-black text-indigo-600">{preview.paidLeaves}</p>
                                        <p className="text-[8px] font-bold text-zinc-400 uppercase">Paid L</p>
                                    </div>
                                    <div className="py-3">
                                        <p className="text-base font-black text-amber-600">{preview.holidayCount}</p>
                                        <p className="text-[8px] font-bold text-zinc-400 uppercase">Holidays</p>
                                    </div>
                                    <div className="py-3">
                                        <p className="text-base font-black text-rose-600">{preview.unpaidLeaves + Math.max(0, (preview.totalDays - preview.presentDays - preview.paidLeaves - preview.holidayCount - (preview.halfDays * 0.5)))}</p>
                                        <p className="text-[8px] font-bold text-zinc-400 uppercase">Loss Pay</p>
                                    </div>
                                </div>
                                {preview.notes && (
                                    <div className="bg-indigo-50/40 p-3 border-t border-zinc-100 flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                        <p className="text-[11px] font-medium text-indigo-900 leading-tight">
                                            {preview.notes}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Base, Bonuses, Deductions Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-wider mb-1.5 block">Base Compensation ({currencySymbol})</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">{currencySymbol}</div>
                                        <input 
                                            title="Base Salary" 
                                            value={form.baseSalary} 
                                            onChange={set('baseSalary')} 
                                            type="number" 
                                            className="w-full bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm py-2.5 pl-8 font-bold" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-wider mb-1.5 block">Total Additions / Bonuses</label>
                                    <div className="relative">
                                        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                        <input 
                                            title="Bonuses" 
                                            value={form.bonuses} 
                                            onChange={set('bonuses')} 
                                            type="number" 
                                            className="w-full bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-emerald-100 rounded-xl text-sm py-2.5 pl-10 font-bold" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-wider mb-1.5 block">Total Deductions / PT</label>
                                    <div className="relative">
                                        <XCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                                        <input 
                                            title="Deductions" 
                                            value={form.deductions} 
                                            onChange={set('deductions')} 
                                            type="number" 
                                            className="w-full bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-rose-100 rounded-xl text-sm py-2.5 pl-10 font-bold" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Net Payable Highlight Card */}
                            <div className="bg-zinc-900 rounded-2xl p-5 text-white flex items-center justify-between shadow-xl shadow-zinc-900/10">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Net Disbursable Salary</p>
                                    <p className="text-3xl font-black text-emerald-400 tracking-tight">{currencySymbol}{net.toLocaleString()}</p>
                                </div>
                                <div className="text-right text-[11px] font-semibold space-y-0.5">
                                    <p className="text-zinc-400">Gross: {currencySymbol}{(Number(form.baseSalary || 0) + Number(form.bonuses || 0)).toLocaleString()}</p>
                                    <p className="text-rose-400">Deductions: -{currencySymbol}{Number(form.deductions || 0).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Distribution & Financial Options */}
                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-wider block">Enterprise Delivery & Accounting Settings</label>
                                
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200 rounded-xl cursor-pointer transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={form.sendEmail} 
                                            onChange={(e) => setForm(f => ({ ...f, sendEmail: e.target.checked }))}
                                            className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                                        />
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                                                <span>Direct Payslip Email Dispatch</span>
                                            </p>
                                            <p className="text-[11px] text-zinc-500">
                                                Automatically email the official digital payslip & summary to the employee.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200 rounded-xl cursor-pointer transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={form.isPaid} 
                                            onChange={(e) => setForm(f => ({ ...f, isPaid: e.target.checked }))}
                                            className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
                                        />
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                                                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>Disburse Immediately (Record in Financial Expenses)</span>
                                            </p>
                                            <p className="text-[11px] text-zinc-500">
                                                Marks as Paid and registers in corporate Expense ledger under Payroll.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-wider mb-1.5 block">Payroll Remarks / Statement Note</label>
                                <textarea 
                                    title="Notes" 
                                    value={form.notes} 
                                    onChange={set('notes')} 
                                    placeholder="Add any specific performance notes or statement remarks..." 
                                    rows={2} 
                                    className="w-full bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-indigo-100 rounded-xl text-xs py-2.5 px-3 font-medium resize-none shadow-xs" 
                                />
                            </div>
                        </div>
                    ))}
                </form>

                {/* Footer Controls */}
                <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end gap-3 shrink-0">
                    <button 
                        title="Cancel" 
                        onClick={onClose} 
                        type="button" 
                        className="px-5 py-2.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        title="Generate salary" 
                        onClick={handleGenerate} 
                        disabled={loading || !preview} 
                        className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4 flex items-center justify-center font-bold">{currencySymbol}</div>}
                        <span>{form.sendEmail && hasConfiguredEmail ? 'Generate & Email Payslip' : 'Generate Enterprise Payroll'}</span>
                    </button>
                </div>
            </div>
        </Drawer>
    );
}

