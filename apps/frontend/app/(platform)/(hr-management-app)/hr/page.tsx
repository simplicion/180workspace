'use client';


import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import dynamic_import from 'next/dynamic';
import api from '@/lib/api';
import { DollarSign, CheckCircle, Clock, AlertCircle, Plus, FileText } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import CustomSelect from '@/components/ui/CustomSelect';

// Lazy load heavy components
const PayslipDrawer = dynamic_import(() => import('@/app/(platform)/(hr-management-app)/_components/PayslipDrawer'), {
    loading: () => <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm"><LogoLoader className="w-8 h-8 animate-spin text-white" /></div>,
    ssr: false
});

const ReviewSalaryDrawer = dynamic_import(() => import('@/app/(platform)/(hr-management-app)/_components/ReviewSalaryDrawer'), {
    ssr: false
});

const GeneratePayrollDrawer = dynamic_import(() => import('@/app/(platform)/(hr-management-app)/_components/GeneratePayrollDrawer'), {
    ssr: false
});

const STATUS_CONFIG: Record<string, { cls: string; icon: any }> = {
    pending: { cls: 'badge-orange', icon: Clock },
    hr_approved: { cls: 'badge-blue', icon: CheckCircle },
    approved: { cls: 'badge-blue', icon: CheckCircle },
    paid: { cls: 'badge-green', icon: CheckCircle },
    rejected: { cls: 'badge-red', icon: AlertCircle },
};

const LEAVE_TYPE_COLORS: Record<string, string> = {
    sick: 'badge-red', casual: 'badge-blue', annual: 'badge-green',
    maternity: 'badge-purple', paternity: 'badge-purple', unpaid: 'badge-gray', other: 'badge-gray',
};

export default function HRPage() {
    const [salaries, setSalaries] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [leavesLoading, setLeavesLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const month = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
    const [showGenerate, setShowGenerate] = useState(false);
    const [payslipSalary, setPayslipSalary] = useState<any>(null);
    const [reviewSalary, setReviewSalary] = useState<any>(null);
    const [tab, setTab] = useState<'payroll' | 'leaves'>('payroll');
    const { user } = useAuth();
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';

    function loadSalaries() {
        setLoading(true);
        api.get('/api/salary', { params: { month } })
            .then(({ data }) => setSalaries(data.salaries))
            .finally(() => setLoading(false));
    }

    function loadLeaves() {
        setLeavesLoading(true);
        api.get('/api/leaves', { params: { status: 'pending' } })
            .then(({ data }) => setLeaves(data.leaves || []))
            .finally(() => setLeavesLoading(false));
    }

    useEffect(() => { loadSalaries(); }, [month]);
    useEffect(() => { loadLeaves(); }, []);

    async function handleReviewLeave(id: string, status: 'approved' | 'rejected') {
        try {
            await api.put(`/api/leaves/${id}/review`, { status });
            toast.success(`Leave ${status}`);
            setLeaves(prev => prev.filter(l => l.id !== id));
        } catch { toast.error('Failed to update leave'); }
    }

    const totalNet = salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
    const pendingLeaves = leaves.length;

    return (
        <div>
            <GeneratePayrollDrawer
                open={showGenerate}
                onClose={() => setShowGenerate(false)}
                onSuccess={() => { setShowGenerate(false); loadSalaries(); }}
            />
            <PayslipDrawer open={!!payslipSalary} salary={payslipSalary} onClose={() => setPayslipSalary(null)} />
            <ReviewSalaryDrawer open={!!reviewSalary} salary={reviewSalary} onClose={() => setReviewSalary(null)} onSuccess={() => { setReviewSalary(null); loadSalaries(); }} />

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">HR Operations</h1>
                    <p className="page-subtitle">Manage leave approvals and process payroll records</p>
                </div>
                {(['admin', 'ceo'].includes(user?.role || '') || (user?.permissions && user.permissions.includes('can_manage_hr'))) && (
                    <button onClick={() => setShowGenerate(true)} className="btn-primary"><div className="w-4 h-4 flex items-center justify-center font-bold">{currencySymbol}</div>Generate Salary</button>
                )}
            </div>

            <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-max">
                <button onClick={() => setTab('payroll')} className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', tab === 'payroll' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
                    Payroll
                </button>
                <button onClick={() => setTab('leaves')} className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5', tab === 'leaves' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
                    Leave Management
                    {pendingLeaves > 0 && <span className="bg-orange-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{pendingLeaves}</span>}
                </button>
            </div>

            {tab === 'payroll' && (
                <>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="card p-5">
                            <p className="text-sm text-gray-500 mb-1">Total Payroll</p>
                            <p className="text-2xl font-bold text-gray-900">{currencySymbol}{totalNet.toLocaleString()}</p>
                        </div>
                        <div className="card p-5">
                            <p className="text-sm text-gray-500 mb-1">Paid</p>
                            <p className="text-2xl font-bold text-emerald-600">{salaries.filter(s => s.status === 'paid').length}</p>
                        </div>
                        <div className="card p-5">
                            <p className="text-sm text-gray-500 mb-1">Pending</p>
                            <p className="text-2xl font-bold text-amber-500">{salaries.filter(s => s.status === 'pending').length}</p>
                        </div>
                    </div>

                    <div className="flex gap-3 mb-5">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="yearFilter" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Year</label>
                            <CustomSelect id="yearFilter" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="input w-32 h-10">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </CustomSelect>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="monthFilter" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Month</label>
                            <CustomSelect id="monthFilter" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="input w-32 h-10">
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </CustomSelect>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>
                    ) : (
                        <div className="card">
                            <div className="table-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Attendance</th>
                                            <th>Base Salary</th>
                                            <th>Deductions</th>
                                            <th>Bonuses</th>
                                            <th>Net Salary</th>
                                            <th>Status</th>
                                            {(['admin', 'ceo'].includes(user?.role || '') || (user?.permissions && user.permissions.includes('can_manage_hr'))) && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salaries.map((s) => {
                                            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
                                            const Icon = cfg.icon;
                                            return (
                                                <tr key={s.id}>
                                                    <td>
                                                        <p className="font-medium text-gray-900">{(s.employee || s.employeeId)?.name}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <p className="text-xs text-gray-400">{(s.employee || s.employeeId)?.department}</p>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {s.totalDays ? (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                                                                    <span className="text-emerald-600">{s.presentDays}P</span>
                                                                    <span className="text-indigo-600">{s.paidLeaves}L</span>
                                                                    <span className="text-orange-500">{s.holidayCount || 0}H</span>
                                                                    <span className="text-red-500">{s.totalDays - s.presentDays - s.paidLeaves - (s.holidayCount || 0)}A</span>
                                                                </div>
                                                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                                                                    <div title="Present" className="h-full bg-emerald-500" style={{ width: `${(s.presentDays / s.totalDays) * 100}%` }} />
                                                                    <div title="Paid Leave" className="h-full bg-indigo-400" style={{ width: `${(s.paidLeaves / s.totalDays) * 100}%` }} />
                                                                    <div title="Holidays" className="h-full bg-orange-400" style={{ width: `${((s.holidayCount || 0) / s.totalDays) * 100}%` }} />
                                                                </div>
                                                                <span className="text-[9px] text-gray-400 font-medium">{s.totalDays} days</span>
                                                            </div>
                                                        ) : <span className="text-xs text-gray-400">Manual Entry</span>}
                                                    </td>
                                                    <td className="text-gray-700 font-medium">{currencySymbol}{s.baseSalary?.toLocaleString()}</td>
                                                    <td className="text-red-500 font-medium">-{currencySymbol}{s.deductions?.toLocaleString() || 0}</td>
                                                    <td className="text-emerald-600 font-medium">+{currencySymbol}{s.bonuses?.toLocaleString() || 0}</td>
                                                    <td className="font-bold text-gray-900 border-l border-gray-50 pl-4">{currencySymbol}{s.netSalary?.toLocaleString()}</td>
                                                    <td><span className={clsx('badge gap-1', cfg.cls)}><Icon className="w-3 h-3" />{s.status}</span></td>
                                                    {(['admin', 'ceo'].includes(user?.role || '') || (user?.permissions && user.permissions.includes('can_manage_hr'))) && (
                                                        <td>
                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <button title="View Payslip" aria-label={`View Payslip for ${(s.employee || s.employeeId)?.name}`} onClick={() => setPayslipSalary(s)} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors">
                                                                    <FileText className="w-3.5 h-3.5" />Payslip
                                                                </button>
                                                                {s.status === 'pending' && (
                                                                    <button title="Review Detail" aria-label={`Review Salary Detail for ${(s.employee || s.employeeId)?.name}`} onClick={() => setReviewSalary(s)} className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors">Review</button>
                                                                )}
                                                                {s.status === 'paid' && <span className="text-xs text-emerald-500 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" />Paid</span>}
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                        {salaries.length === 0 && (
                                            <tr><td colSpan={8} className="text-center py-10 text-gray-400">No salary records for {month}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {tab === 'leaves' && (
                leavesLoading ? (
                    <div className="flex items-center justify-center py-12"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className="card">
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Type</th>
                                        <th>From</th>
                                        <th>To</th>
                                        <th>Days</th>
                                        <th>Reason</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaves.map((l: any) => (
                                        <tr key={l.id}>
                                            <td>
                                                <p className="font-medium text-gray-900 text-sm">{(l.employee || l.employeeId)?.name}</p>
                                                <p className="text-xs text-gray-400">{(l.employee || l.employeeId)?.department}</p>
                                            </td>
                                            <td><span className={clsx('badge', LEAVE_TYPE_COLORS[l.type] || 'badge-gray')}>{l.type}</span></td>
                                            <td className="text-sm text-gray-600">{l.startDate}</td>
                                            <td className="text-sm text-gray-600">{l.endDate}</td>
                                            <td className="text-sm font-medium">{l.days}d</td>
                                            <td className="text-sm text-gray-500 max-w-[150px] truncate">{l.reason || '—'}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <button title="Approve Leave" onClick={() => handleReviewLeave(l.id, 'approved')} className="btn-secondary text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                                                        <CheckCircle className="w-3.5 h-3.5" />Approve
                                                    </button>
                                                    <button title="Reject Leave" onClick={() => handleReviewLeave(l.id, 'rejected')} className="btn-secondary text-xs text-red-500 border-red-200 hover:bg-red-50">
                                                        <AlertCircle className="w-3.5 h-3.5" />Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {leaves.length === 0 && (
                                        <tr><td colSpan={7} className="text-center py-10 text-gray-400">No pending leave requests 🎉</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
