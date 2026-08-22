'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { CreditCard, Shield, Zap, Check, Tag, AlertCircle, Calendar, Users, ChevronRight, RefreshCw, XCircle, FileWarning, BarChart3 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '@/lib/api';
import { useSubscription } from '@/lib/useSubscription';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

declare global { interface Window { Razorpay: any; } }

import { PlanDetailsDrawer } from './_components/PlanDetailsDrawer';



function PlanCard({ plan, current, status, onUpgrade, onViewDetails, disabled }: any) {
    const isCurrentPlan = current?.planId?.id === plan.id || current?.planId === plan.id;
    // An active plan could be paused or trial or active
    // If we are expired or mandate_pending, we might show "Get Started"
    const isActiveStatus = isCurrentPlan && (status === 'active' || status === 'trial' || status === 'paused');

    return (
        <div className={`relative bg-white border-2 rounded-3xl p-6 transition-all group ${isActiveStatus ? 'border-indigo-500 shadow-xl shadow-indigo-50/50' : 'border-slate-100 hover:border-indigo-200 hover:shadow-lg'}`}>
            {plan.isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full tracking-tighter uppercase">Recommended</div>}
            {isActiveStatus && <div className="absolute -top-3 right-4 px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full tracking-tighter uppercase">Current</div>}

            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{plan.planName}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black text-slate-900">₹{plan.price?.toLocaleString('en-IN')}</span>
                    <span className="text-slate-400 text-xs font-semibold uppercase">/{plan.billingCycle || 'mo'}</span>
                </div>
            </div>

            <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium">Up to {plan.maxUsers} users</span>
                </div>
                {plan.features?.slice(0, 3).map((f: string) => (
                    <div key={f} className="flex items-start gap-3 text-sm text-slate-500 pl-1">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{f}</span>
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                <button onClick={() => onUpgrade(plan)} disabled={disabled || isActiveStatus}
                    className={`w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all
                        ${isActiveStatus ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100'}`}>
                    {isActiveStatus ? 'Active' : (plan.trialDays > 0 ? 'Activate Trial' : 'Get Started')}
                </button>
                {!isActiveStatus && (
                    <button onClick={() => onViewDetails(plan)} className="w-full py-2 text-indigo-600 text-xs font-bold hover:underline opacity-60 hover:opacity-100 transition-all flex items-center justify-center gap-1">
                        View Full Details <ChevronRight className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default function BillingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedDetailPlan, setSelectedDetailPlan] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const {
        subscription,
        plan,
        daysLeft,
        isExpired,
        isTrialing,
        status,
        paymentsEnabled,
        mandateStatus,
        autopayEnabled,
        autopayFailCount,
        nextChargeDate,
        usage,
        refresh
    } = useSubscription();

    const isAdmin = ['admin', 'ceo'].includes(user?.role || '') || user?.roles?.includes('admin') || user?.roles?.includes('ceo') || (user?.permissions && user.permissions.includes('can_manage_team'));
    const contactMsg = isAdmin ? 'Contact support.' : 'Contact your administrator.';

    useEffect(() => {
        api.get('/api/billing/plans').then(r => setPlans(r.data.plans));
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const { data } = await api.get('/api/billing/history');
            setHistory(data.subscriptions || []);
        } catch { /* ignore */ }
        setHistoryLoading(false);
    };

    const handleUpgrade = async (chosenPlan: any) => {
        if (!paymentsEnabled) { toast.error(`Payments not enabled. ${contactMsg}`); return; }
        router.push(`/dashboard/billing/checkout?planId=${chosenPlan.id}`);
    };

    const handleCancelAutopay = async () => {
        if (!confirm('Are you sure you want to cancel Autopay? Your subscription features will be suspended at the end of the billing cycle unless you manually pay.')) return;
        setActionLoading(true);
        try {
            await api.post('/api/billing/autopay/cancel');
            toast.success('Autopay canceled successfully');
            await refresh();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to cancel Autopay');
        }
        setActionLoading(false);
    };

    const handleResumeAutopay = async () => {
        if (!plan?.id) {
            toast.error('No active plan found to resume Autopay.');
            return;
        }
        // Redirect to checkout with the same plan to re-authorize mandate
        router.push(`/dashboard/billing/checkout?planId=${plan.id}`);
    };

    const statusBadge = {
        trial: 'bg-amber-100 text-amber-700 border border-amber-200',
        active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
        expired: 'bg-red-100 text-red-700 border border-red-200',
        paused: 'bg-transparent text-indigo-600 border border-indigo-600',
        mandate_pending: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
    }[status] || 'bg-gray-100 text-gray-600';

    const expiryDate = isTrialing ? subscription?.trialEndDate : subscription?.subscriptionEndDate;

    return (
        <div className="max-w-4xl space-y-6">
            <Toaster position="top-center" />

            <PlanDetailsDrawer
                plan={selectedDetailPlan}
                isOpen={!!selectedDetailPlan}
                onClose={() => setSelectedDetailPlan(null)}
                onSelect={(p: any) => handleUpgrade(p)}
            />

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
                <p className="text-gray-500 mt-1">Manage your plan, upgrade, and billing information</p>
            </div>

            {/* Pending Mandate Banner */}
            {status === 'mandate_pending' && isAdmin && (
                <div className="bg-indigo-50 border-2 border-indigo-500 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-indigo-100">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-lg font-bold text-indigo-900">Complete Payment Setup</h3>
                            <p className="text-indigo-700 text-sm mt-1">
                                Your account requires a payment method on file to continue. Please set up your subscription to access all features.
                                A nominal ₹1 fee is charged to authorize your card.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Current Status */}
            <div className={`rounded-2xl p-6 text-white ${status === 'expired' ? 'bg-gradient-to-br from-red-600 to-rose-700' : 'bg-gradient-to-br from-indigo-600 to-purple-700'}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-indigo-200 text-sm font-medium mb-1">Current Plan</p>
                        <h2 className="text-2xl font-bold">{plan?.planName || 'None'}</h2>
                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold capitalize ${statusBadge}`}>
                            {status === 'mandate_pending' ? 'Pending Setup' : status}
                        </span>
                    </div>
                    <div className="text-right">
                        <p className="text-indigo-200 text-sm">{isTrialing ? 'Trial ends' : 'Next Cycle'}</p>
                        <p className="text-xl font-bold">{expiryDate ? new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
                        {!isExpired && status !== 'mandate_pending' && (
                            <p className={`text-sm mt-1 font-semibold ${daysLeft <= 3 ? 'text-red-300' : daysLeft <= 7 ? 'text-amber-300' : 'text-indigo-200'}`}>
                                {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Usage Metrics */}
            {usage && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        Current Usage & Overage
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-sm text-gray-500 mb-1">Team Members</p>
                            <p className="text-xl font-bold text-gray-900">{usage.currentMembers} <span className="text-sm font-normal text-gray-400">/ {usage.maxMembers === Infinity ? 'Unlimited' : usage.maxMembers}</span></p>
                            {usage.extraMembers > 0 && (
                                <p className="text-xs text-red-500 mt-2 font-medium">+{usage.extraMembers} extra (${usage.extraMembers * 2}/mo)</p>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative">
                            <p className="text-sm text-gray-500 mb-1">Storage</p>
                            <p className="text-xl font-bold text-gray-900">{usage.storageUsedGB}GB <span className="text-sm font-normal text-gray-400">/ {usage.storageLimitGB}GB</span></p>
                            {usage.extraStorageBlocks > 0 && (
                                <p className="text-xs text-indigo-600 mt-2 font-medium">+{usage.extraStorageBlocks}GB extra purchased (₹{usage.extraStorageBlocks * 50}/mo)</p>
                            )}
                            <button 
                                onClick={() => router.push('/dashboard/billing/add-storage')}
                                className="mt-3 w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                            >
                                Add Storage (₹50/GB)
                            </button>
                        </div>
                    </div>
                    {usage.overageCharges > 0 && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-red-900">Estimated Overage Charges: ${usage.overageCharges}</p>
                                <p className="text-xs text-red-700 mt-0.5">These charges will be added to your next billing cycle.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Autopay Management */}
            {status !== 'mandate_pending' && status !== 'expired' && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <RefreshCw className={`w-5 h-5 ${autopayEnabled ? 'text-emerald-500' : 'text-gray-400'}`} />
                            <h3 className="font-bold text-gray-900 text-lg">Autopay Settings</h3>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${autopayEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {autopayEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>

                    <div className="text-sm text-gray-600 mb-6 space-y-2">
                        <p>
                            {autopayEnabled
                                ? `Your subscription will automatically renew on ${nextChargeDate ? new Date(nextChargeDate).toLocaleDateString() : 'the next billing cycle'}.`
                                : 'Autopay is currently disabled. Your subscription will not renew automatically and may be suspended.'}
                        </p>
                        {autopayFailCount > 0 && autopayEnabled && (
                            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-2 rounded-lg mt-2 font-medium">
                                <FileWarning className="w-4 h-4" />
                                Heads up: The last autopay attempt failed. We will retry soon.
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 border-t border-gray-100 pt-5">
                        {autopayEnabled ? (
                            <button onClick={handleCancelAutopay} disabled={actionLoading}
                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
                                {actionLoading ? <LogoLoader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Cancel Autopay
                            </button>
                        ) : (
                            <button onClick={handleResumeAutopay} disabled={actionLoading}
                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
                                {actionLoading ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                Enable Autopay
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Available Plans */}
            {(isExpired || status === 'mandate_pending') && (
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Available Plans</h2>
                    {plans.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl">No plans configured yet. Contact your Super Admin.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {plans.map(p => (
                                <PlanCard
                                    key={p.id}
                                    plan={p}
                                    current={subscription}
                                    status={status}
                                    onUpgrade={handleUpgrade}
                                    onViewDetails={(p: any) => setSelectedDetailPlan(p)}
                                    disabled={!paymentsEnabled}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Non-refundable notice */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                <div>
                    <strong>Refund Policy:</strong> All subscription payments are <strong>non-refundable</strong>. By completing a purchase you agree to our Terms of Service.
                </div>
            </div>

            {/* Transaction History */}
            <div className="pt-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" /> Transaction History
                </h2>
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    {historyLoading ? (
                        <div className="p-10 text-center"><LogoLoader className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>
                    ) : history.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 text-sm italic">No transaction history found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Plan</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Transaction ID</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {history.map((h: any) => (
                                        <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                                                {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs font-semibold text-gray-700 uppercase">{h.transactionType || 'Subscription'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-bold text-gray-900">{h.planId?.planName || 'Custom Plan'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-black text-slate-900">₹{(h.amount || 0).toLocaleString('en-IN')}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter
                                                    ${h.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                        h.paymentStatus === 'failed' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                            'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                    {h.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-[10px] text-gray-400">
                                                {h.paymentId || h.razorpayOrderId || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
