'use client';

import { LogoLoader } from "@workspace/ui";
import { useEffect, useState, use } from 'react';
import { Building2, Mail, ArrowLeft, CheckCircle2, XCircle, AlertCircle, RefreshCw, ShieldCheck, Database as DbIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../../lib/superadmin-api';

const STATUS_COLORS: Record<string, string> = {
    active: 'text-emerald-600 bg-emerald-50 border border-emerald-100',
    trial: 'text-amber-600 bg-amber-50 border border-amber-100',
    suspended: 'text-rose-600 bg-rose-50 border border-rose-100',
    cancelled: 'text-slate-500 bg-slate-50 border border-slate-200',
    expired: 'text-orange-600 bg-orange-50 border border-orange-100',
};

export default function CompanyDetailsPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = use(paramsPromise);
    const router = useRouter();
    const [company, setCompany] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [params.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [compRes, HistRes] = await Promise.all([
                saApi.get(`/companies/${params.id}`),
                saApi.get(`/subscriptions/company/${params.id}`)
            ]);
            setCompany(compRes.data.company);
            setHistory(HistRes.data.subscriptions || []);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to load company details');
            router.push('/superadmin/companies');
        }
        setLoading(false);
        setHistoryLoading(false);
    };

    if (loading) return (
        <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
            <LogoLoader className="w-10 h-10 text-sky-500 animate-spin" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Retrieving Organization Intel...</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <Toaster position="top-center" />

            <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold text-xs uppercase tracking-widest">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Col: Company Info */}
                <div className="flex-1 space-y-6">
                    <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-sky-500" />
                        <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-sky-50 flex items-center justify-center border-2 border-sky-100">
                                    <Building2 className="w-8 h-8 text-sky-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{company.companyName}</h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-sm font-bold text-slate-500">{company.adminEmail}</span>
                                    </div>
                                </div>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[company.subscriptionStatus] || 'bg-slate-100 text-slate-500'}`}>
                                {company.subscriptionStatus}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Users</p>
                                <p className="text-xl font-black text-slate-900">3 / 10</p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Storage Used</p>
                                <p className="text-xl font-black text-slate-900">0.5 GB</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-indigo-500" /> Subscription Attributes
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                <span className="text-xs font-bold text-slate-500 uppercase">Current Plan</span>
                                <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">{company.subscriptionPlan?.planName || 'Free Trial'}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                <span className="text-xs font-bold text-slate-500 uppercase">Expiration Date</span>
                                <span className="text-xs font-black text-slate-900 tracking-tight">
                                    {company.subscriptionEndDate ? new Date(company.subscriptionEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                <span className="text-xs font-bold text-slate-500 uppercase">Billing Cycle</span>
                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Monthly</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                <span className="text-xs font-bold text-slate-500 uppercase">Autopay Status</span>
                                <span className={`text-xs font-black uppercase tracking-widest ${company.autopayEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {company.autopayEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <span className="text-xs font-bold text-slate-500 uppercase">Next Charge</span>
                                <span className="text-xs font-black text-slate-900 tracking-tight">
                                    {company.nextChargeDate ? new Date(company.nextChargeDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Database Infrastructure Section */}
                    <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                                <DbIcon className="w-5 h-5 text-sky-500" /> Database Infrastructure
                            </h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="relative group">
                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-[11px] break-all text-slate-500 leading-relaxed min-h-[60px] flex items-center">
                                    Unified High-Performance PostgreSQL Node (Company ID: {company.id})
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                        Active & Synchronized
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Engine: PostgreSQL</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: History */}
                <div className="w-full md:w-[400px] lg:w-[450px]">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-200/50 text-white min-h-[400px]">
                        <h2 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                            <RefreshCw className="w-5 h-5" /> Transaction Ledger
                        </h2>

                        {historyLoading ? (
                            <div className="flex justify-center py-12"><LogoLoader className="w-6 h-6 animate-spin text-indigo-400" /></div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-12 px-6">
                                <AlertCircle className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No historical data found for this organization.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {history.map((h: any) => (
                                    <div key={h.id} className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{h.planId?.planName || 'Custom Upgrade'}</p>
                                                <p className="text-sm font-bold text-white mt-0.5">{new Date(h.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-white tracking-tighter">₹{(h.amount || 0).toLocaleString('en-IN')}</p>
                                                <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${h.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {h.paymentStatus}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">TXID: {h.paymentId || 'MANUAL'}</span>
                                            {h.paymentStatus === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
