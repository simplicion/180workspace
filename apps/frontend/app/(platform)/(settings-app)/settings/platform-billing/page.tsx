"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Zap, Shield, ArrowRight, Package, Clock, History, AlertCircle, Database, Users, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LogoLoader, ConfirmModal } from "@workspace/ui";
import { OneEightyPricingTable, PricingPlan } from '@workspace/identity-sdk';
import { UsageProgressBar } from '@/components/ui/UsageProgressBar';
import toast from 'react-hot-toast';
import { APPS_CONFIG } from '@/lib/module-map';

export default function PlatformBillingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [billingInfo, setBillingInfo] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [currencyInfo, setCurrencyInfo] = useState({ symbol: '$', rate: 1, code: 'USD' });
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [infoRes, plansRes] = await Promise.all([
                    api.get('/api/v1/platform-billing'),
                    api.get('/api/v1/platform-billing/plans')
                ]);
                setBillingInfo(infoRes.data);
                setPlans(plansRes.data.plans || []);
                
                const backendCurrency = plansRes.data.currency || 'USD';
                let currencySymbol = '$';
                try {
                    currencySymbol = (0).toLocaleString('en-US', {
                        style: 'currency',
                        currency: backendCurrency,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }).replace(/\d/g, '').trim();
                } catch (e) {
                    currencySymbol = backendCurrency;
                }
                
                setCurrencyInfo({ symbol: currencySymbol, rate: 1, code: backendCurrency });
            } catch (err) {
                console.error('Failed to fetch billing info', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCancelSubscription = async () => {
        try {
            setCancelling(true);
            await api.post('/api/v1/platform-billing/plan/cancel');
            toast.success('Subscription cancelled successfully');
            setIsCancelModalOpen(false);
            window.location.reload();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to cancel subscription');
        } finally {
            setCancelling(false);
        }
    };

    const { currentSubscription, status } = billingInfo || {};

    // Baseline or effective plan resolution
    const effectivePlan = currentSubscription?.plan || 
        billingInfo?.plan || 
        plans.find((p: any) => p.price === 0 || p.planName?.toLowerCase().includes('kickstart')) || 
        plans[0] || 
        null;

    const isTrial = currentSubscription?.plan?.planName === 'Free Trial' || billingInfo?.isTrialing;
    const trialDaysLeft = billingInfo?.daysLeft || 0;

    const formatBytes = (bytes: number) => {
        if (!bytes || bytes <= 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Limits & quotas calculations with robust defaults
    const maxStorage = currentSubscription?.plan?.maxStorageBytes ?? effectivePlan?.maxStorageBytes ?? (1 * 1024 * 1024 * 1024);
    const totalStorage = maxStorage;
    const storageUsed = billingInfo?.companyConfig?.storageUsedBytes || 0;

    const maxUsers = currentSubscription?.plan?.maxUsers ?? effectivePlan?.maxUsers ?? 2;
    const totalMaxUsers = maxUsers;
    const teamMembersCount = billingInfo?.teamMembersCount || 1;

    const maxApps = currentSubscription?.plan?.maxApps ?? effectivePlan?.maxApps ?? 5;
    const appsCount = billingInfo?.activeAppsCount || 3;

    const maxWebsites = currentSubscription?.plan?.maxWebsites ?? effectivePlan?.maxWebsites ?? 1;
    const websitesCount = billingInfo?.activeWebsitesCount || 0;

    const formatLimit = (limit?: number) => {
        if (limit === undefined || limit === null) return undefined;
        return limit < 0 || limit >= 999 ? 'Unlimited' : limit.toString();
    };

    const planPrice = currentSubscription?.plan?.price ?? effectivePlan?.price ?? 0;
    const planCurrency = currencyInfo.code || currentSubscription?.plan?.currency || effectivePlan?.currency || 'USD';
    const formattedPrice = planPrice > 0 
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: planCurrency, maximumFractionDigits: 2 }).format(planPrice) 
        : 'Free Tier';

    const displayPlanName = currentSubscription?.plan?.planName || effectivePlan?.planName || '180 Kickstart';

    // Map plans to PricingPlan interface to provide OneEightyPricingTable direct data
    const pricingTablePlans: PricingPlan[] = useMemo(() => {
        const rawList = plans && plans.length > 0 ? plans : [
            {
                id: 'kickstart',
                planCode: '180-kickstart',
                planName: '180 Kickstart',
                price: 10,
                currency: currencyInfo.code || 'USD',
                features: [
                    'Access to 5 Apps',
                    'Up to 2 Team Members',
                    '1 Custom Domain Website',
                    '1GB High-Speed Cloud Storage',
                    'Standard Platform Support'
                ],
                trialDays: 0
            },
            {
                id: 'momentum',
                planCode: '180-momentum',
                planName: '180 Momentum',
                price: 17,
                currency: currencyInfo.code || 'USD',
                features: [
                    'Access to 7 Apps',
                    'Up to 5 Team Members',
                    'Up to 5 Websites',
                    '10GB High-Speed Cloud Storage',
                    'Priority 24/7 Support',
                    'AI Assistant Copilot',
                    'Custom Email SMTP'
                ],
                trialDays: 14
            },
            {
                id: 'limitless',
                planCode: '180-limitless',
                planName: '180 Limitless',
                price: 20,
                currency: currencyInfo.code || 'USD',
                features: [
                    'Unlimited Access to All Apps',
                    'Up to 20 Team Members',
                    'Unlimited Websites',
                    '20GB High-Speed Cloud Storage',
                    'Dedicated Team Support',
                    'Full AI Assistant & Agent Access',
                    'Custom White-labeling'
                ],
                trialDays: 14
            }
        ];

        return rawList.map((p: any) => {
            const isMomentum = p.planName?.toLowerCase().includes('momentum') || p.price === 17;
            const isKickstart = p.planName?.toLowerCase().includes('kickstart') || p.price === 10;
            const isLimitless = p.planName?.toLowerCase().includes('limitless') || p.price === 20;

            let description = p.description;
            if (!description) {
                if (isKickstart) description = 'Essential platform toolkit for lean founders & small teams.';
                else if (isMomentum) description = 'High-growth platform suite with AI and multi-app orchestration.';
                else if (isLimitless) description = 'Full unmetered enterprise sovereignty across the entire 180 ecosystem.';
                else description = 'Tailored workspace tier for high-velocity teams.';
            }

            const isCurrent = (currentSubscription?.planId && currentSubscription.planId === p.id) ||
                (currentSubscription?.plan?.planName && currentSubscription.plan.planName.toLowerCase() === p.planName?.toLowerCase());

            return {
                id: p.id,
                planCode: p.planCode || p.planName?.toLowerCase().replace(/\s+/g, '-'),
                name: p.planName,
                description,
                monthlyAmount: Number(p.price || 0),
                yearlyAmount: p.yearlyPrice ? Number(p.yearlyPrice) : Math.round(Number(p.price || 0) * 12 * 0.8),
                currency: p.currency || currencyInfo.code || 'USD',
                isPopular: isMomentum,
                badgeText: isMomentum ? 'Most Popular' : (isLimitless ? 'Enterprise Choice' : undefined),
                features: Array.isArray(p.features) && p.features.length > 0 ? p.features : [
                    `Up to ${p.maxUsers || 2} Team Members`,
                    `${p.maxApps ? (p.maxApps >= 999 ? 'Unlimited' : p.maxApps) : 'Core'} Apps Included`,
                    `${p.maxWebsites ? (p.maxWebsites < 0 ? 'Unlimited' : p.maxWebsites) : 1} Website(s)`,
                    'High-Speed Cloud Storage',
                    'Full Platform Sovereignty'
                ],
                trialDays: p.trialDays ?? (isMomentum ? 14 : 0),
                buttonText: isCurrent ? 'Current Active Plan' : (p.trialDays && p.trialDays > 0 ? `Start ${p.trialDays}-Day Free Trial` : 'Get Started')
            };
        });
    }, [plans, currencyInfo.code, currentSubscription]);

    if (loading) {
        return (
            <div className="flex h-72 items-center justify-center">
                <LogoLoader className="h-10 w-10 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-16">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                        Platform Billing & Quotas
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                        Manage your workspace subscription tiers, resource limits, and sovereign payments.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 shadow-sm">
                        <Shield className="w-3.5 h-3.5" />
                        180 Sovereign Billing
                    </span>
                </div>
            </div>

            {/* Current Plan & Quotas Overview Cards */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Plan & Resource Quotas Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl border border-gray-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between h-full"
                >
                    <div>
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                                    <Zap className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Workspace Plan</h3>
                                    <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">{displayPlanName}</p>
                                </div>
                            </div>
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                                {planPrice > 0 ? `${formattedPrice}/mo` : 'Free Tier'}
                            </span>
                        </div>

                        {isTrial && (
                            <div className="mb-6 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-amber-900 dark:text-amber-300 text-sm">Trial Ends in {Math.max(0, trialDaysLeft)} Days</h4>
                                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400/90">
                                            Upgrade now to ensure uninterrupted access to your team workspace tools and apps.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-5 mt-2">
                            <div>
                                <UsageProgressBar 
                                    label="Storage Usage"
                                    current={storageUsed}
                                    max={totalStorage}
                                    formattedCurrent={formatBytes(storageUsed)}
                                    formattedMax={totalStorage < 0 ? 'Unlimited' : formatBytes(totalStorage)}
                                />
                            </div>
                            <div>
                                <UsageProgressBar 
                                    label="Team Members"
                                    current={teamMembersCount}
                                    max={totalMaxUsers}
                                    formattedMax={formatLimit(totalMaxUsers)}
                                />
                            </div>
                            <div>
                                <UsageProgressBar 
                                    label="Apps Count"
                                    current={appsCount}
                                    max={maxApps}
                                    formattedMax={formatLimit(maxApps) === 'Unlimited' ? APPS_CONFIG.length.toString() : formatLimit(maxApps)}
                                />
                            </div>
                            <div>
                                <UsageProgressBar 
                                    label="Websites Count"
                                    current={websitesCount}
                                    max={maxWebsites}
                                    formattedMax={formatLimit(maxWebsites)}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Subscription Lifecycle Status Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative overflow-hidden rounded-3xl border border-gray-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between h-full"
                >
                    <div>
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Subscription Status</h3>
                                    <p className="text-sm text-gray-500 dark:text-zinc-400 capitalize">{status || 'Active'}</p>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {status === 'expired' ? 'Expired' : 'Active'}
                            </span>
                        </div>
                        
                        <div className="space-y-3.5 text-sm mt-4">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800/80 pb-3.5">
                                <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Billing Cycle
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-zinc-100">
                                    {currentSubscription?.billingCycle || 'Monthly'}
                                    {planPrice > 0 && ` / ${formattedPrice}`}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800/80 pb-3.5">
                                <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                                    <History className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Started
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-zinc-100">
                                    {currentSubscription?.startDate ? (
                                        new Date(currentSubscription.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                    ) : currentSubscription?.createdAt ? (
                                        new Date(currentSubscription.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                    ) : (
                                        'Lifetime / Continuous'
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-1 pb-1">
                                <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Expiry / Renewal
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-zinc-100">
                                    {currentSubscription?.subscriptionEndDate ? (
                                        new Date(currentSubscription.subscriptionEndDate).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })
                                    ) : planPrice > 0 ? (
                                        'Active (Auto-Renewing)'
                                    ) : (
                                        'Continuous / Lifetime'
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {currentSubscription?.plan?.price > 0 && (
                        <div className="pt-6 mt-4 border-t border-gray-100 dark:border-zinc-800/80">
                            <button
                                type="button"
                                onClick={() => setIsCancelModalOpen(true)}
                                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
                            >
                                Cancel Current Plan Subscription
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* 180 Pay Subscription Plans Engine */}
            <div className="mt-10 rounded-3xl border border-gray-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl p-6 sm:p-10 shadow-sm dark:shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
                <OneEightyPricingTable
                    appId="8bc81b3e-8510-4144-8c47-c43fe46d71a3"
                    plans={pricingTablePlans}
                    apiBase={
                        process.env.NEXT_PUBLIC_CORE_BACKEND_URL ||
                        (typeof window !== 'undefined' &&
                        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                            ? 'http://localhost:4003'
                            : 'https://services.180workspace.com')
                    }
                    title="180workspace Subscription Plans"
                    subtitle="Powered by 180 Pay. Choose the sovereign tier tailored for your growth."
                    theme="auto"
                    accentColor="#6366f1"
                    currentPlanId={currentSubscription?.planId || effectivePlan?.id}
                    activePlanCode={displayPlanName}
                    onSelectPlan={async (plan) => {
                        const targetPlan = plans.find(
                            p => p.planName?.toLowerCase() === plan.name?.toLowerCase() ||
                                 (plan.planCode && p.planName?.toLowerCase().includes(plan.planCode.replace('180-', '')))
                        );
                        const planId = targetPlan?.id || plan.id || plan.planCode;
                        const isCurrentActive =
                            (currentSubscription?.planId && currentSubscription.planId === planId) ||
                            (currentSubscription?.plan?.planName?.toLowerCase() === plan.name?.toLowerCase());

                        if (isCurrentActive) {
                            if (currentSubscription?.plan?.price > 0) {
                                setIsCancelModalOpen(true);
                            }
                            return;
                        }

                        router.push(`/settings/platform-billing/checkout?planId=${planId}`);
                    }}
                />
            </div>

            <ConfirmModal 
                isOpen={isCancelModalOpen}
                title="Cancel Subscription?"
                message="Are you sure you want to cancel your subscription?&#10;&#10;• Your previous payments will not be refunded.&#10;• Your auto-pay will be automatically disabled.&#10;• You will lose access to premium apps and revert to the free Kickstart plan."
                confirmText="Cancel Subscription"
                cancelText="Keep Subscription"
                variant="danger"
                loading={cancelling}
                onConfirm={handleCancelSubscription}
                onCancel={() => setIsCancelModalOpen(false)}
            />
        </div>
    );
}
