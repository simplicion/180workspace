'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
    Brain, 
    ShieldCheck, 
    CreditCard, 
    RefreshCw, 
    Layers, 
    FileText, 
    Video, 
    Globe, 
    Mail, 
    MessageSquare, 
    CheckCircle2, 
    AlertTriangle,
    Coins
} from 'lucide-react';
import { LogoLoader, AICreditProgressWidget } from '@workspace/ui';

interface AICreditStatus {
    companyId: string;
    monthlyIncludedQuota: number;
    monthlyCreditsUsed: number;
    purchasedCredits: number;
    availableCredits: number;
    percentUsed: number;
    isSoftLocked: boolean;
    recentLedger: Array<{
        id: string;
        timestamp: string;
        appId: string;
        featureKey: string;
        operationType: 'DEBIT' | 'RECHARGE' | 'GRANT' | 'REFUND';
        creditsAmount: number;
        balanceAfter: number;
    }>;
}

const TOPUP_PACKAGES = [
    { id: 'pkg_5', amountUsd: 5, totalCredits: 5000, tag: 'Starter ($5.00)' },
    { id: 'pkg_10', amountUsd: 10, totalCredits: 10000, popular: true, tag: 'Most Popular ($10.00)' },
    { id: 'pkg_25', amountUsd: 25, totalCredits: 27500, tag: 'Growth +10% Bonus ($25.00)' },
    { id: 'pkg_50', amountUsd: 50, totalCredits: 60000, tag: 'Enterprise +20% Bonus ($50.00)' },
];

export default function AiTab() {
    const [loading, setLoading] = useState(true);
    const [rechargingId, setRechargingId] = useState<string | null>(null);
    const [creditStatus, setCreditStatus] = useState<AICreditStatus | null>(null);

    const fetchCreditStatus = async () => {
        try {
            const { data } = await api.get('/api/v1/ai/credits/status');
            if (data && data.success) {
                setCreditStatus(data);
            }
        } catch (err: any) {
            console.warn('[AdminAiTab] Failed to fetch credit status:', err?.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCreditStatus();
    }, []);

    const handleRecharge = async (pkg: typeof TOPUP_PACKAGES[0]) => {
        setRechargingId(pkg.id);
        try {
            const { data } = await api.post('/api/v1/ai/credits/recharge', {
                amountUsd: pkg.amountUsd,
                paymentMethod: 'ADMIN_TOPUP',
            });

            if (data?.success) {
                toast.success(`Recharged $${pkg.amountUsd} (+${pkg.totalCredits.toLocaleString()} Credits)`);
                await fetchCreditStatus();
            } else {
                toast.error(data?.message || 'Recharge failed.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Recharge failed');
        } finally {
            setRechargingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <LogoLoader className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    const monthlyQuota = creditStatus?.monthlyIncludedQuota || 5000;
    const monthlyUsed = creditStatus?.monthlyCreditsUsed || 0;
    const purchased = creditStatus?.purchasedCredits || 0;

    return (
        <div className="max-w-4xl space-y-6">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800 shadow-md flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <ShieldCheck className="w-3.5 h-3.5" /> Platform Managed AI Active
                        </span>
                        <span className="text-[10px] text-slate-400">Zero BYOC Required</span>
                    </div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        AI Platform Credits &amp; Engine Management
                    </h2>
                    <p className="text-xs text-slate-300">
                        Enterprise multi-provider inference (GPT-4o &amp; Claude 3.5 Sonnet) metered automatically by company credit ledger.
                    </p>
                </div>
                <button
                    onClick={fetchCreditStatus}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white transition border border-white/10"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                </button>
            </div>

            {/* Universal Centralized AI Credit Progress Bar & Wallet Widget */}
            <div className="space-y-4">
                <AICreditProgressWidget
                    variant="card"
                    status={creditStatus as any}
                    onRecharged={() => fetchCreditStatus()}
                />

                <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Monthly Quota</span>
                        <span className="text-xs font-bold text-slate-800">{monthlyQuota.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Used This Cycle</span>
                        <span className="text-xs font-bold text-slate-800">{monthlyUsed.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Purchased Top-Ups</span>
                        <span className="text-xs font-bold text-purple-700">{purchased.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Quick Recharges */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-500" />
                    Quick Wallet Recharge
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TOPUP_PACKAGES.map((pkg) => (
                        <div key={pkg.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 flex flex-col justify-between">
                            <div>
                                <div className="text-lg font-black text-slate-900">${pkg.amountUsd}</div>
                                <div className="text-xs font-bold text-purple-700">+{pkg.totalCredits.toLocaleString()} Credits</div>
                                <div className="text-[10px] text-slate-400">{pkg.tag}</div>
                            </div>
                            <button
                                onClick={() => handleRecharge(pkg)}
                                disabled={rechargingId !== null}
                                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                                <CreditCard className="w-3 h-3" />
                                Top-Up
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
