"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Zap, Shield, ArrowRight, Package, Clock, History, AlertCircle, Database, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LogoLoader } from "@workspace/ui";
import { SubscriptionPlan } from '@/components/shared/SubscriptionPlan';
import { UsageProgressBar } from '@/components/ui/UsageProgressBar';
import toast from 'react-hot-toast';

declare global { interface Window { Razorpay: any; } }

export default function PlatformBillingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [billingInfo, setBillingInfo] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [currencyInfo, setCurrencyInfo] = useState({ symbol: '$', rate: 1, code: 'USD' });
    const [storageQty, setStorageQty] = useState(1);
    const [teamQty, setTeamQty] = useState(1);
    const [appQty, setAppQty] = useState(1);

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

        // Load Razorpay Script
        if (typeof window !== 'undefined' && !window.Razorpay) {
            const s = document.createElement('script');
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            s.async = true;
            document.body.appendChild(s);
        }
    }, []);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <LogoLoader className="h-10 w-10 animate-spin text-indigo-500" />
            </div>
        );
    }

    const { currentSubscription, status } = billingInfo || {};
    const isTrial = currentSubscription?.plan?.planName === 'Free Trial';
    const trialDaysLeft = currentSubscription?.endDate ? Math.ceil((new Date(currentSubscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const maxStorage = currentSubscription?.plan?.maxStorageBytes || 0;
    const totalStorage = maxStorage;
    const storageUsed = billingInfo?.companyConfig?.storageUsedBytes || 0;
    const storagePercentage = totalStorage > 0 ? Math.min(100, Math.round((storageUsed / totalStorage) * 100)) : 0;

    const maxUsers = currentSubscription?.plan?.maxUsers || 0;
    const totalMaxUsers = maxUsers;
    const teamMembersCount = billingInfo?.teamMembersCount || 0;
    const usersPercentage = totalMaxUsers > 0 ? Math.min(100, Math.round((teamMembersCount / totalMaxUsers) * 100)) : 0;

    const maxApps = currentSubscription?.plan?.maxApps || 0;
    const appsCount = billingInfo?.activeAppsCount || 0; // Fallback if API doesn't return it yet

    const formatLimit = (limit?: number) => {
        if (limit === undefined || limit === null) return undefined;
        return limit < 0 || limit >= 999 ? 'Unlimited' : limit.toString();
    };

    const planPrice = currentSubscription?.plan?.price || 0;
    const planCurrency = currentSubscription?.plan?.currency || 'USD';
    const formattedPrice = planPrice > 0 
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: planCurrency, maximumFractionDigits: 2 }).format(planPrice) 
        : 'Free';

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-12">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Platform Billing</h1>
                <p className="text-muted-foreground">Manage your workspace subscription, billing, and storage.</p>
            </div>

            {/* Current Plan Overview */}
            <div className="grid gap-6 md:grid-cols-2">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm flex flex-col h-full"
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <LogoLoader className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
                            <p className="text-sm text-gray-500">{currentSubscription?.plan?.planName || 'No Active Plan'}</p>
                        </div>
                    </div>

                    {isTrial && (
                        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                                <div>
                                    <h4 className="font-medium text-amber-900">Trial Ends in {Math.max(0, trialDaysLeft)} Days</h4>
                                    <p className="mt-1 text-sm text-amber-700">
                                        Upgrade now to ensure uninterrupted access to your workspace features.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6 mt-2 flex-grow">
                        <div>
                            <UsageProgressBar 
                                label="Storage Usage"
                                current={storageUsed}
                                max={totalStorage}
                                formattedCurrent={formatBytes(storageUsed)}
                                formattedMax={formatLimit(totalStorage) === 'Unlimited' ? 'Unlimited' : formatBytes(totalStorage)}
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
                                formattedMax={formatLimit(maxApps)}
                            />
                        </div>
                        <div>
                            <UsageProgressBar 
                                label="Websites Count"
                                current={billingInfo?.activeWebsitesCount || 0}
                                max={currentSubscription?.plan?.maxWebsites || 0}
                                formattedMax={formatLimit(currentSubscription?.plan?.maxWebsites)}
                            />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm flex flex-col h-full"
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Subscription Status</h3>
                            <p className="text-sm text-gray-500 capitalize">{status || 'Unknown'}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4 text-sm mt-2">
                        <div className="flex justify-between border-b border-gray-100 pb-4">
                            <span className="text-gray-500 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Billing Cycle</span>
                            <span className="font-medium text-gray-900">
                                {currentSubscription?.billingCycle || 'Monthly'}
                                {planPrice > 0 && ` / ${formattedPrice}`}
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-4">
                            <span className="text-gray-500 flex items-center gap-2"><History className="w-4 h-4" /> Started</span>
                            <span className="font-medium text-gray-900">{currentSubscription?.startDate ? new Date(currentSubscription.startDate).toLocaleDateString() : (currentSubscription?.createdAt ? new Date(currentSubscription.createdAt).toLocaleDateString() : 'N/A')}</span>
                        </div>
                        <div className="flex justify-between pb-2 pt-2">
                            <span className="text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4" /> Ends</span>
                            <span className="font-medium text-gray-900">{currentSubscription?.endDate ? new Date(currentSubscription.endDate).toLocaleDateString() : 'Never give up'}</span>
                        </div>
                    </div>
                </motion.div>
            </div>



            {/* Plans */}
            <div className="mt-12">
                <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-6">Available Plans</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <SubscriptionPlan
                            key={plan.id}
                            id={plan.id}
                            name={plan.planName}
                            description={`Best for ${plan.planName.toLowerCase()} teams`}
                            price={plan.price}
                            currencySymbol={currencyInfo.symbol}
                            features={plan.features || []}
                            isPopular={plan.price === 12 || plan.price === 15 || plan.planName.toLowerCase().includes('momentum')}
                            badgeText={plan.price === 12 ? "Clever People Plan" : plan.price === 15 ? "Most Secret Plan" : undefined}
                            theme={plan.price === 15 ? "violet" : "indigo"}
                            isSelected={currentSubscription?.planId === plan.id}
                            onSelect={async () => {
                                if (currentSubscription?.planId === plan.id) return;
                                router.push(`/settings/platform-billing/checkout?planId=${plan.id}`);
                            }}
                            buttonText={currentSubscription?.planId === plan.id ? 'Current Active Plan' : 'Upgrade'}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// force refresh
