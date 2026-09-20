'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
    Brain, 
    Zap, 
    ShieldCheck, 
    CreditCard, 
    RefreshCw, 
    Sparkles, 
    Layers, 
    FileText, 
    Video, 
    Globe, 
    Mail, 
    MessageSquare, 
    CheckCircle2, 
    AlertTriangle,
    ArrowUpRight,
    Coins
} from 'lucide-react';
import clsx from 'clsx';
import { LogoLoader, AICreditProgressWidget } from '@workspace/ui';

interface AICreditStatus {
    companyId: string;
    monthlyIncludedQuota: number;
    monthlyCreditsUsed: number;
    purchasedCredits: number;
    reservedCredits: number;
    availableCredits: number;
    percentUsed: number;
    isSoftLocked: boolean;
    currency: string;
    usdEquivalentRate: number;
    recentLedger: Array<{
        id: string;
        timestamp: string;
        appId: string;
        featureKey: string;
        operationType: 'DEBIT' | 'RECHARGE' | 'GRANT' | 'REFUND';
        creditsAmount: number;
        balanceAfter: number;
        metadata?: any;
    }>;
}

const TOPUP_PACKAGES = [
    {
        id: 'pkg_5',
        amountUsd: 5,
        baseCredits: 5000,
        bonusCredits: 0,
        totalCredits: 5000,
        popular: false,
        tag: 'Starter Top-Up',
        description: 'Ideal for ~500 document generations or 5,000 iterative revisions',
    },
    {
        id: 'pkg_10',
        amountUsd: 10,
        baseCredits: 10000,
        bonusCredits: 0,
        totalCredits: 10000,
        popular: true,
        tag: 'Most Popular',
        description: 'Best for growing business teams and active daily editing',
    },
    {
        id: 'pkg_25',
        amountUsd: 25,
        baseCredits: 25000,
        bonusCredits: 2500,
        totalCredits: 27500,
        popular: false,
        tag: '+10% Bonus Credits',
        description: 'High-frequency teams with video director and heavy document workloads',
    },
    {
        id: 'pkg_50',
        amountUsd: 50,
        baseCredits: 50000,
        bonusCredits: 10000,
        totalCredits: 60000,
        popular: false,
        tag: '+20% Bonus Credits',
        description: 'Agency volume with full autonomous video & website generation',
    },
];

const COST_BREAKDOWN = [
    { feature: 'Document Full Architecture', cost: '10 Credits', icon: FileText, note: 'Initial 8-12 AST block draft' },
    { feature: 'Document Revision / Patch', cost: '1 Credit', icon: FileText, note: '10 revisions = 10 credits total' },
    { feature: 'Autonomous Video Director', cost: '25 Credits', icon: Video, note: 'Complete zero-footage edit with B-roll & voice' },
    { feature: 'Website Synthesis', cost: '20 Credits', icon: Globe, note: 'Multi-section responsive site with tailwind styling' },
    { feature: 'AI Copilot Chat & Memory', cost: '1 Credit', icon: MessageSquare, note: 'Real-time assistant inquiry' },
    { feature: 'Smart CRM Email Draft', cost: '2 Credits', icon: Mail, note: 'Contextual lead follow-up generation' },
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
            console.warn('[AiTab] Failed to fetch credit status:', err?.message);
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
                paymentMethod: 'PLATFORM_WALLET',
            });

            if (data?.success) {
                toast.success(`Successfully recharged $${pkg.amountUsd}! +${pkg.totalCredits.toLocaleString()} AI Credits added.`);
                await fetchCreditStatus();
            } else {
                toast.error(data?.message || 'Recharge failed. Please try again.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Recharge transaction failed');
        } finally {
            setRechargingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <LogoLoader className="w-8 h-8 animate-spin text-purple-600" />
                <p className="text-xs text-slate-500 font-medium">Loading AI Credit Ledger & Engine Status...</p>
            </div>
        );
    }

    const monthlyQuota = creditStatus?.monthlyIncludedQuota || 5000;
    const monthlyUsed = creditStatus?.monthlyCreditsUsed || 0;
    const purchased = creditStatus?.purchasedCredits || 0;

    return (
        <div className="max-w-4xl space-y-8">
            {/* Header: Platform Managed AI Engine */}
            <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 text-white rounded-2xl p-6 border border-purple-800/40 shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <ShieldCheck className="w-3.5 h-3.5" /> Platform Managed AI Active
                            </span>
                            <span className="text-[11px] text-purple-300/80">Enterprise Zero-BYOC</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-400" />
                            AI Platform Credits & Usage Hub
                        </h2>
                        <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                            Your workspace is powered out-of-the-box by high-performance models (GPT-4o &amp; Claude 3.5 Sonnet) with no external API keys or configurations needed. All platform AI tools share your tenant credit wallet.
                        </p>
                    </div>

                    <button
                        onClick={fetchCreditStatus}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white transition border border-white/10 w-fit shrink-0 cursor-pointer"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh Ledger
                    </button>
                </div>
            </div>

            {/* Universal Centralized AI Credit Progress Bar & Wallet Widget */}
            <div className="space-y-4">
                <AICreditProgressWidget
                    variant="card"
                    status={creditStatus as any}
                    onRecharged={() => fetchCreditStatus()}
                />

                {/* 4 Multi-Pool Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 font-medium block">Monthly Base Quota</span>
                        <span className="text-sm font-bold text-slate-800">{monthlyQuota.toLocaleString()} Credits</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Resets every billing cycle</span>
                    </div>
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 font-medium block">Credits Consumed</span>
                        <span className="text-sm font-bold text-slate-800">{monthlyUsed.toLocaleString()} Credits</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">This cycle</span>
                    </div>
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 font-medium block">Purchased Top-Ups</span>
                        <span className="text-sm font-bold text-purple-700">{purchased.toLocaleString()} Credits</span>
                        <span className="text-[10px] text-purple-600/80 block mt-0.5">Never expire • Rollover</span>
                    </div>
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 font-medium block">Total Effective Limit</span>
                        <span className="text-sm font-bold text-slate-800">{(monthlyQuota + purchased).toLocaleString()} Credits</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Base + Top-Up Pool</span>
                    </div>
                </div>
            </div>

            {/* Instant Wallet Top-Up Packages */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Coins className="w-5 h-5 text-amber-500" />
                            Instant Wallet Top-Up Packages
                        </h3>
                        <p className="text-xs text-slate-500">
                            Recharge credits on-demand. Top-up credits never expire and roll over month-to-month.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {TOPUP_PACKAGES.map((pkg) => {
                        const isRecharging = rechargingId === pkg.id;
                        return (
                            <div
                                key={pkg.id}
                                className={clsx(
                                    "rounded-2xl p-5 border flex flex-col justify-between transition-all relative overflow-hidden bg-white shadow-sm hover:shadow-md",
                                    pkg.popular
                                        ? "border-purple-500 ring-2 ring-purple-100"
                                        : "border-slate-200"
                                )}
                            >
                                {pkg.popular && (
                                    <div className="absolute top-0 right-0 bg-purple-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                                        Popular
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-2xl font-black text-slate-900">${pkg.amountUsd}</span>
                                        <span className="text-xs text-slate-400 font-medium">USD</span>
                                    </div>

                                    <div className="space-y-0.5">
                                        <div className="text-sm font-bold text-purple-700">
                                            +{pkg.totalCredits.toLocaleString()} Credits
                                        </div>
                                        {pkg.bonusCredits > 0 && (
                                            <span className="inline-block text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                +{pkg.bonusCredits.toLocaleString()} Bonus Included!
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-[11px] text-slate-500 leading-normal pt-1">
                                        {pkg.description}
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleRecharge(pkg)}
                                    disabled={rechargingId !== null}
                                    className={clsx(
                                        "w-full mt-5 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm",
                                        pkg.popular
                                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                                            : "bg-slate-900 hover:bg-slate-800 text-white",
                                        rechargingId !== null && "opacity-60 cursor-not-allowed"
                                    )}
                                >
                                    {isRecharging ? (
                                        <>
                                            <LogoLoader className="w-3.5 h-3.5 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-3.5 h-3.5" />
                                            <span>Recharge ${pkg.amountUsd}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Credit Cost Reference Guide */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-purple-600" />
                            Platform AI Consumption Rates
                        </h3>
                        <p className="text-xs text-slate-500">
                            Predictable, transparent credit pricing across all 180 Workspace applications
                        </p>
                    </div>
                    <span className="text-[11px] font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
                        1 Credit = $0.001 USD (0.1¢)
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {COST_BREAKDOWN.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-purple-600 shrink-0 shadow-2xs">
                                <item.icon className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                                <div className="text-xs font-semibold text-slate-800 truncate">{item.feature}</div>
                                <div className="text-xs font-extrabold text-purple-700">{item.cost}</div>
                                <div className="text-[10px] text-slate-400 leading-tight">{item.note}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Real-time Ledger & Transaction History */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Recent AI Operations Ledger</h3>
                        <p className="text-xs text-slate-500">Real-time audit log of debits, revisions, and wallet recharges</p>
                    </div>
                </div>

                {creditStatus?.recentLedger && creditStatus.recentLedger.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                                    <th className="py-2.5 px-3">Date &amp; Time</th>
                                    <th className="py-2.5 px-3">Feature</th>
                                    <th className="py-2.5 px-3">App</th>
                                    <th className="py-2.5 px-3 text-right">Credits</th>
                                    <th className="py-2.5 px-3 text-right">Balance After</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {creditStatus.recentLedger.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                                            {new Date(item.timestamp).toLocaleString(undefined, { 
                                                month: 'short', 
                                                day: 'numeric', 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </td>
                                        <td className="py-2 px-3 font-medium text-slate-800">
                                            {item.featureKey?.replace(/_/g, ' ') || 'AI Action'}
                                        </td>
                                        <td className="py-2 px-3 text-slate-500">
                                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600">
                                                {item.appId}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold">
                                            {item.operationType === 'RECHARGE' ? (
                                                <span className="text-emerald-600">+{item.creditsAmount.toLocaleString()}</span>
                                            ) : (
                                                <span className="text-red-500">{item.creditsAmount}</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3 text-right font-semibold text-slate-700">
                                            {item.balanceAfter?.toLocaleString() ?? '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                        No AI operations logged yet this cycle. Once you generate documents, media, or chat with AI, debits will appear here in real time.
                    </div>
                )}
            </div>
        </div>
    );
}
