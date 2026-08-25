'use client';


import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Plus, Search, Download, Banknote, CreditCard, Calendar, Eye, FileCheck, FileWarning, TrendingUp, ArrowUpRight, DollarSign, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useSettings } from '@/lib/settings-context';

function thisMonthStr() { return new Date().toISOString().slice(0, 7); }

const STATUS_CONFIG: Record<string, { cls: string; icon: any }> = {
    pending: { cls: 'badge-orange', icon: Clock },
    hr_approved: { cls: 'badge-blue', icon: CheckCircle },
    approved: { cls: 'badge-blue', icon: CheckCircle },
    paid: { cls: 'badge-green', icon: CheckCircle },
    rejected: { cls: 'badge-red', icon: AlertCircle },
};

export default function SalaryPage() {
    const [salaries, setSalaries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(thisMonthStr());
    const { user } = useAuth();
    const { company } = useSettings();
    const currencySymbol = company?.currencySymbol || '$';
    const [search, setSearch] = useState('');

    function loadSalaries() {
        setLoading(true);
        api.get('/api/salary', { params: { month } })
            .then(({ data }) => setSalaries(data.salaries.filter((s: any) => ['hr_approved', 'approved', 'paid'].includes(s.status)))) // Only show approved/paid in Ledger
            .catch(() => toast.error('Failed to load salaries'))
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadSalaries(); }, [month]);

    async function handleFinalApprove(id: string) {
        try {
            await api.put(`/api/salary/${id}/approve`);
            toast.success('Salary finalized by Finance!');
            setSalaries(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
        } catch { toast.error('Failed to approve'); }
    }

    async function handleMarkPaid(id: string) {
        try {
            await api.put(`/api/salary/${id}/mark-paid`);
            toast.success('Marked as paid!');
            setSalaries(prev => prev.map(s => s.id === id ? { ...s, status: 'paid' } : s));
        } catch { toast.error('Failed to update'); }
    }

    async function handleInitiatePayout(id: string) {
        const loadingToast = toast.loading('Initiating automated payout...');
        try {
            const { data } = await api.post(`/api/finance/payouts/salary/${id}`);
            toast.dismiss(loadingToast);
            toast.success(data.message || 'Payout initiated successfully!');
            setSalaries(prev => prev.map(s => s.id === id ? { ...s, status: 'paid' } : s));
        } catch (err: any) {
            toast.dismiss(loadingToast);
            toast.error(err?.response?.data?.error || 'Payout failed');
        }
    }

    async function handleVerifyBank(userId: string) {
        const loadingToast = toast.loading('Initiating bank verification...');
        try {
            const { data } = await api.post('/api/finance/verify-bank', { userId });
            toast.dismiss(loadingToast);
            toast.success('Verification initiated.');
            loadSalaries();
        } catch (err: any) {
            toast.dismiss(loadingToast);
            toast.error(err?.response?.data?.error || 'Verification failed');
        }
    }

    const filteredSalaries = salaries.filter(s =>
        s.employee?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.employee?.employeeId?.toLowerCase().includes(search.toLowerCase())
    );

    const totalPayout = salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
    const totalPaid = salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.netSalary || 0), 0);
    const pendingCount = salaries.filter(s => s.status !== 'paid').length;

    return (
        <div className="space-y-6">
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Salary Ledger</h1>
                    <p className="page-subtitle">Track HR-approved payroll, execute payments, and manage disbursements.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Payroll (Selected Month)', value: `${currencySymbol}${totalPayout.toLocaleString()}`, icon: Banknote, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Pending Payouts', value: pendingCount.toString(), icon: FileWarning, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Net Disbursed', value: `${currencySymbol}${totalPaid.toLocaleString()}`, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Total Deductions', value: `${currencySymbol}${salaries.reduce((sum, s) => sum + (s.deductions || 0), 0).toLocaleString()}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3 text-gray-400">
                            <stat.icon className="w-5 h-5" />
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className={clsx("text-2xl font-black", stat.color)}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search employee by name or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 rounded-xl text-sm transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input w-48 py-2 font-medium" />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden text-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee & ID</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base Salary</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bonus</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tax & Ded.</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Net Payable</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 font-medium">
                                {filteredSalaries.map((pay: any) => {
                                    const cfg = STATUS_CONFIG[pay.status] || STATUS_CONFIG.pending;
                                    const Icon = cfg.icon;

                                    return (
                                        <tr key={pay.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                                                        {pay.employee?.name?.[0] || '?'}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-gray-900 font-bold">{pay.employee?.name || 'Unknown'}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] text-gray-400">{pay.employee?.employeeId || 'No ID'}</span>
                                                            {pay.employee?.bankDetails && (
                                                                <span className={clsx(
                                                                    'text-[9px] px-1.5 py-0.5 rounded-full border tracking-wide uppercase font-bold',
                                                                    pay.employee.bankDetails.verificationStatus === 'verified' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                                                        pay.employee.bankDetails.verificationStatus === 'pending' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                                                            'text-gray-400 bg-gray-50 border-gray-100'
                                                                )}>
                                                                    {pay.employee.bankDetails.verificationStatus || 'unverified'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{currencySymbol}{pay.baseSalary?.toLocaleString() || 0}</td>
                                            <td className="px-6 py-4 text-emerald-600">+{currencySymbol}{pay.bonuses?.toLocaleString() || 0}</td>
                                            <td className="px-6 py-4 text-red-500">-{currencySymbol}{pay.deductions?.toLocaleString() || 0}</td>
                                            <td className="px-6 py-4">
                                                <span className="font-black text-gray-900">{currencySymbol}{pay.netSalary?.toLocaleString() || 0}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={clsx("badge gap-1", cfg.cls)}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {pay.status === 'hr_approved' ? 'HR APPR.' : pay.status?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-3 flex-wrap">
                                                    {pay.status === 'hr_approved' && (
                                                        <button onClick={() => handleFinalApprove(pay.id)} className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1">
                                                            <CheckCircle className="w-3.5 h-3.5" /> Final Approve
                                                        </button>
                                                    )}
                                                    {(pay.status === 'approved' || pay.status === 'hr_approved') && (
                                                        <>
                                                            {pay.employee?.bankDetails?.verificationStatus === 'verified' ? (
                                                                <button onClick={() => handleInitiatePayout(pay.id)} className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors">
                                                                    <div className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px]">{currencySymbol}</div> Payout
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    disabled={pay.employee?.bankDetails?.verificationStatus === 'pending'}
                                                                    onClick={() => handleVerifyBank(pay.employee?.id)}
                                                                    className={clsx(
                                                                        "text-xs font-bold flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors border",
                                                                        pay.employee?.bankDetails?.verificationStatus === 'pending' ? "text-amber-500 border-transparent cursor-wait" : "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100"
                                                                    )}>
                                                                    <AlertCircle className="w-3.5 h-3.5" /> {pay.employee?.bankDetails?.verificationStatus === 'pending' ? 'Verifying Bank...' : 'Verify Bank First'}
                                                                </button>
                                                            )}
                                                            <button onClick={() => handleMarkPaid(pay.id)} className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-2 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors">
                                                                <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filteredSalaries.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-gray-400">
                                            No HR-approved salaries found for {month}.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
