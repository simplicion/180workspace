"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
    CreditCard, Zap, Shield, ArrowRight, Package, Clock, History, 
    AlertCircle, Database, Users, CheckCircle2, FolderGit2, Lock, Sparkles, Check
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LogoLoader, ConfirmModal } from "@workspace/ui";
import { OneEightyPricingTable, PricingPlan } from '@workspace/identity-sdk';
import { UsageProgressBar } from '@/components/ui/UsageProgressBar';
import { useTheme } from '@/lib/theme-context';
import toast from 'react-hot-toast';

export default function PlatformBillingPage() {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
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
            toast.success('Subscription cancelled successfully. Reverted to Free Starter tier.');
            setIsCancelModalOpen(false);
            window.location.reload();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to cancel subscription');
        } finally {
            setCancelling(false);
        }
    };

    const { currentSubscription, status } = billingInfo || {};

    const isTrial = billingInfo?.isTrialing || currentSubscription?.status?.toLowerCase() === 'trial';
    const trialDaysLeft = billingInfo?.daysLeft || 0;

    // Baseline or effective plan resolution
    const effectivePlan = currentSubscription?.plan || 
        billingInfo?.plan || 
        plans.find((p: any) => p.price === 0) || 
        null;

    const isMomentum = effectivePlan?.planName?.toLowerCase().includes('momentum');
    const isLimitless = isTrial || effectivePlan?.planName?.toLowerCase().includes('limitless');

    const displayPlanName = isTrial 
        ? '180 Limitless'
        : (currentSubscription?.plan?.planName || effectivePlan?.planName || '180 Free Starter');

    const formatBytes = (bytes: number) => {
        if (!bytes || bytes <= 0) return '0 MB';
        const mb = bytes / (1024 * 1024);
        if (mb >= 1024) {
            return (mb / 1024).toFixed(1) + ' GB';
        }
        return Math.round(mb) + ' MB';
    };

    // Limits & quotas strictly aligned with tier rules:
    // Team Members: Free = 1, Momentum = 5, Limitless = 20
    const totalMaxUsers = billingInfo?.maxUsers ?? (isLimitless ? 20 : (isMomentum ? 5 : 1));
    const teamMembersCount = billingInfo?.teamMembersCount || 1;

    // Projects: Free = 2, Momentum = 5, Limitless = 20
    const totalMaxProjects = billingInfo?.maxProjects ?? (isLimitless ? 20 : (isMomentum ? 5 : 2));
    const activeProjectsCount = billingInfo?.activeProjectsCount || 0;

    // Cloud Storage: Free = 512 MB, Momentum = 1 GB, Limitless = 5 GB
    const totalStorage = billingInfo?.maxStorageBytes ?? (isLimitless ? 5 * 1024 * 1024 * 1024 : (isMomentum ? 1024 * 1024 * 1024 : 512 * 1024 * 1024));
    const storageUsed = billingInfo?.storageUsedBytes || billingInfo?.companyConfig?.storageUsedBytes || 0;

    const planPrice = isTrial ? 0 : (currentSubscription?.plan?.price ?? effectivePlan?.price ?? 0);
    const planCurrency = currencyInfo.code || currentSubscription?.plan?.currency || effectivePlan?.currency || 'USD';
    const formattedPrice = planPrice > 0 
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: planCurrency, maximumFractionDigits: 0 }).format(planPrice) 
        : (isTrial ? '15-Day Free Trial' : 'Free Starter');

    // Filter plans to exclusively present the 2 active paid plans ($17 Momentum & $20 Limitless)
    const pricingTablePlans: PricingPlan[] = useMemo(() => {
        const filtered = plans
            .filter((p: any) => {
                const name = (p.planName || '').toLowerCase();
                const code = (p.planCode || '').toLowerCase();
                const price = Number(p.price || 0);
                return name.includes('momentum') || name.includes('limitless') ||
                       code.includes('momentum') || code.includes('limitless') ||
                       price === 17 || price === 20;
            })
            .sort((a: any, b: any) => Number(a.price || 0) - Number(b.price || 0));

        const rawList = filtered.length > 0 ? filtered : [
            {
                id: 'momentum',
                planCode: '180-momentum',
                planName: '180 Momentum',
                price: 17,
                yearlyPrice: 163,
                currency: currencyInfo.code || 'USD',
                features: [
                    'Access to 8 Applications (Projects, CRM, Finance, Website Builder, Voice Force, etc.)',
                    'Up to 5 Team Members Included',
                    'Up to 5 Active Projects',
                    '1 GB High-Speed Cloud Storage',
                    'Orbit AI Copilot Access',
                    'Custom Email SMTP Integration',
                    'Priority Email & Ticket Support',
                    '15-Day Free Trial Included'
                ],
                trialDays: 15
            },
            {
                id: 'limitless',
                planCode: '180-limitless',
                planName: '180 Limitless',
                price: 20,
                yearlyPrice: 192,
                currency: currencyInfo.code || 'USD',
                features: [
                    'Unlimited Access to All Platform Applications (including HR, Advertising & Traffic Director)',
                    'Up to 20 Team Members Included',
                    'Up to 20 Active Projects',
                    '5 GB High-Speed Cloud Storage',
                    'Sub-5ms Traffic Director & Bot Shield',
                    'Dedicated Team & Priority Support',
                    'Full AI Assistant & Agent Access',
                    '15-Day Free Trial Included'
                ],
                trialDays: 15
            }
        ];

        return rawList.map((p: any) => {
            const isMom = p.planName?.toLowerCase().includes('momentum') || p.price === 17;
            const isLim = p.planName?.toLowerCase().includes('limitless') || p.price === 20;

            const description = isMom
                ? 'High-growth platform suite with AI copilot, unified CRM, and multi-app orchestration.'
                : 'Full unrestricted sovereignty across all platform apps with 20 seats & edge speed.';

            const isCurrent = !isTrial && (
                (currentSubscription?.planId && currentSubscription.planId === p.id) ||
                (currentSubscription?.plan?.planName && currentSubscription.plan.planName.toLowerCase() === p.planName?.toLowerCase())
            );

            return {
                id: p.id,
                planCode: p.planCode || (isMom ? '180-momentum' : '180-limitless'),
                name: p.planName,
                description,
                monthlyAmount: Number(p.price || (isMom ? 17 : 20)),
                yearlyAmount: p.yearlyPrice ? Number(p.yearlyPrice) : (isMom ? 163 : 192),
                currency: p.currency || currencyInfo.code || 'USD',
                isPopular: isMom,
                badgeText: isMom ? 'Most Popular' : 'Complete Suite',
                badgeColor: isMom ? 'indigo' : 'violet',
                features: Array.isArray(p.features) && p.features.length > 0 ? p.features : [
                    `Up to ${isMom ? 5 : 20} Team Members`,
                    `Up to ${isMom ? 5 : 20} Active Projects`,
                    `${isMom ? '1 GB' : '5 GB'} Cloud Storage`,
                    `${isMom ? '8 Applications' : 'All Platform Applications'}`,
                    '15-Day Free Trial Included'
                ],
                trialDays: 15,
                buttonText: isCurrent 
                    ? 'Current Active Plan' 
                    : (isTrial && isLim ? 'Current Trial Tier' : 'Start 15-Day Free Trial')
            };
        });
    }, [plans, currencyInfo.code, currentSubscription, isTrial]);

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
                        Platform Billing & Resource Quotas
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                        Sovereign subscription management with exact quota isolation and card-free 15-day trial.
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
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
                                    <Zap className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Workspace Tier</h3>
                                    <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">{displayPlanName}</p>
                                </div>
                            </div>
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                                {planPrice > 0 ? `${formattedPrice}/mo` : (isTrial ? '15-Day Trial' : 'Free Tier')}
                            </span>
                        </div>

                        {/* Trial Banner */}
                        {isTrial && (
                            <div className="mb-6 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-4">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-amber-900 dark:text-amber-300 text-sm">
                                            15-Day Free Trial Active ({Math.max(0, trialDaysLeft)} Days Left)
                                        </h4>
                                        <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-400/90 leading-relaxed">
                                            Your team has unmetered access to the complete 180 Limitless suite (20 members, 20 projects, 5GB storage, and all platform apps).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Free Tier Info Banner */}
                        {!isTrial && planPrice === 0 && (
                            <div className="mb-6 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
                                            Free Starter Workspace
                                        </h4>
                                        <p className="mt-1 text-xs text-blue-800/90 dark:text-blue-400/90 leading-relaxed">
                                            Only default platform apps (Projects, Communications, Workspace Tools) are active. Upgrade to Momentum ($17) or Limitless ($20) to unlock CRM, Finance, Website Builder, Voice Force, HR & Advertising.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Live Quota Usage Progress Bars */}
                        <div className="space-y-5 mt-2">
                            <div>
                                <UsageProgressBar 
                                    label="Team Members"
                                    current={teamMembersCount}
                                    max={totalMaxUsers}
                                    formattedCurrent={`${teamMembersCount}`}
                                    formattedMax={`${totalMaxUsers} seat${totalMaxUsers > 1 ? 's' : ''}`}
                                />
                            </div>
                            <div>
                                <UsageProgressBar 
                                    label="Active Projects"
                                    current={activeProjectsCount}
                                    max={totalMaxProjects}
                                    formattedCurrent={`${activeProjectsCount}`}
                                    formattedMax={`${totalMaxProjects} project${totalMaxProjects > 1 ? 's' : ''}`}
                                />
                            </div>
                            <div>
                                <UsageProgressBar 
                                    label="Cloud Storage"
                                    current={storageUsed}
                                    max={totalStorage}
                                    formattedCurrent={formatBytes(storageUsed)}
                                    formattedMax={formatBytes(totalStorage)}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Subscription Lifecycle Status & Apps Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative overflow-hidden rounded-3xl border border-gray-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between h-full"
                >
                    <div>
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shadow-sm">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Subscription Status</h3>
                                    <p className="text-sm text-gray-500 dark:text-zinc-400 capitalize">
                                        {isTrial ? '15-Day Free Trial' : (status || (planPrice === 0 ? 'Free Starter' : 'Active'))}
                                    </p>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {status === 'expired' ? 'Expired' : (isTrial ? 'Trialing' : 'Active')}
                            </span>
                        </div>
                        
                        <div className="space-y-3.5 text-sm mt-4">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800/80 pb-3.5">
                                <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Billing Cycle
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-zinc-100">
                                    {planPrice > 0 ? `Monthly / ${formattedPrice}` : (isTrial ? '15-Day Free Trial' : 'Free Forever')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800/80 pb-3.5">
                                <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                                    <History className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Account Created
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-zinc-100">
                                    {currentSubscription?.createdAt ? (
                                        new Date(currentSubscription.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                    ) : (
                                        'Active Workspace'
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800/80 pb-3.5">
                                <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Expiry / Renewal
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-zinc-100">
                                    {isTrial ? (
                                        `${Math.max(0, trialDaysLeft)} days remaining`
                                    ) : currentSubscription?.subscriptionEndDate ? (
                                        new Date(currentSubscription.subscriptionEndDate).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })
                                    ) : planPrice > 0 ? (
                                        'Active (Auto-Renewing)'
                                    ) : (
                                        'No Expiration (Free Starter)'
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Entitlement App Badges */}
                        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-zinc-800/80">
                            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5">
                                Application Access Tier
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                                    <Check className="w-3 h-3" /> Projects
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                                    <Check className="w-3 h-3" /> Communications
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                                    <Check className="w-3 h-3" /> Workspace Tools
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                                    isMomentum || isLimitless
                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40'
                                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500'
                                }`}>
                                    {isMomentum || isLimitless ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />} CRM & Finance
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                                    isMomentum || isLimitless
                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40'
                                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500'
                                }`}>
                                    {isMomentum || isLimitless ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />} Web Builder & Voice Force
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                                    isLimitless
                                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40'
                                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500'
                                }`}>
                                    {isLimitless ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />} HR, Ads & Traffic Director
                                </span>
                            </div>
                        </div>
                    </div>

                    {currentSubscription?.plan?.price > 0 && !isTrial && (
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

            {/* 180 Pay Sovereign Pricing Table Section (2 Active Plans) */}
            <div className="mt-10 rounded-3xl border border-gray-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl p-6 sm:p-10 shadow-sm dark:shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
                <div className="text-center max-w-2xl mx-auto mb-8">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50">
                        15-Day Free Trial on All Plans
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-3">
                        Choose Your Workspace Tier
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-zinc-400 mt-2">
                        Transparent pricing designed for modern teams. No per-seat hidden fees or long-term lock-in.
                    </p>
                </div>

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
                    title=""
                    subtitle=""
                    theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                    accentColor="#6366f1"
                    currentPlanId={currentSubscription?.planId || effectivePlan?.id}
                    activePlanCode={displayPlanName}
                    onSelectPlan={async (plan) => {
                        const targetPlan = plans.find(
                            p => p.planName?.toLowerCase() === plan.name?.toLowerCase() ||
                                 (plan.planCode && p.planName?.toLowerCase().includes(plan.planCode.replace('180-', '')))
                        );
                        const planId = targetPlan?.id || plan.id || plan.planCode;
                        const isCurrentActive = !isTrial && (
                            (currentSubscription?.planId && currentSubscription.planId === planId) ||
                            (currentSubscription?.plan?.planName?.toLowerCase() === plan.name?.toLowerCase())
                        );

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
                message="Are you sure you want to cancel your subscription?&#10;&#10;• Your auto-pay will be automatically disabled.&#10;• You will revert to the 180 Free Starter tier.&#10;• Access to premium apps (CRM, Finance, Web Builder, etc.) will be locked."
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
