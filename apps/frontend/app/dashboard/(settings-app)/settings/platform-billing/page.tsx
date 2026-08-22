"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Zap, Shield, ArrowRight, Package, Clock, History, AlertCircle, Database, Users } from 'lucide-react';
import api from '@/lib/api';
import { LogoLoader } from "@workspace/ui";
import { SubscriptionPlan } from '@/components/shared/SubscriptionPlan';
import toast from 'react-hot-toast';

declare global { interface Window { Razorpay: any; } }

export default function PlatformBillingPage() {
    const [loading, setLoading] = useState(true);
    const [billingInfo, setBillingInfo] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [currencyInfo, setCurrencyInfo] = useState({ symbol: '$', rate: 1, code: 'USD' });

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
                
                try {
                    const ipRes = await fetch('https://ipapi.co/json/');
                    const ipData = await ipRes.json();
                    if (ipData.country_code === 'IN') {
                        const rateRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                        const rateData = await rateRes.json();
                        setCurrencyInfo({ symbol: '₹', rate: rateData.rates.INR, code: 'INR' });
                    }
                } catch (e) {
                    console.error('Currency fetch failed', e);
                }
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
    const extraStorage = billingInfo?.companyConfig?.extraStoragePurchasedBytes || 0;
    const totalStorage = maxStorage + extraStorage;
    const storageUsed = billingInfo?.companyConfig?.storageUsedBytes || 0;
    const storagePercentage = totalStorage > 0 ? Math.min(100, Math.round((storageUsed / totalStorage) * 100)) : 0;

    const maxUsers = currentSubscription?.plan?.maxUsers || 0;
    const extraTeamMembers = billingInfo?.companyConfig?.extraTeamMembersPurchased || 0;
    const totalMaxUsers = maxUsers + extraTeamMembers;
    const teamMembersCount = billingInfo?.teamMembersCount || 0;
    const usersPercentage = totalMaxUsers > 0 ? Math.min(100, Math.round((teamMembersCount / totalMaxUsers) * 100)) : 0;

    const handleBuyAddon = async (type: 'storage' | 'team') => {
        try {
            toast.loading(`Processing ${type} purchase...`, { id: 'addonPurchase' });
            const { data: checkoutData } = await api.post(`/api/v1/platform-billing/${type}/checkout`, { 
                gigabytes: type === 'storage' ? 5 : undefined,
                users: type === 'team' ? 1 : undefined
            });
            
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: checkoutData.amount,
                currency: checkoutData.currency,
                name: '180Workspace',
                description: `Purchase ${type === 'storage' ? '5GB Storage' : '1 Team Member'}`,
                order_id: checkoutData.orderId,
                handler: async function (response: any) {
                    try {
                        toast.loading('Verifying payment...', { id: 'addonPurchase' });
                        await api.post(`/api/v1/platform-billing/${type}/verify`, {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            ...(type === 'team' ? { users: 1 } : {}),
                            ...(type === 'storage' ? { gigabytes: 5 } : {}),
                        });
                        toast.success('Successfully added!', { id: 'addonPurchase' });
                        setTimeout(() => window.location.reload(), 1500);
                    } catch (err: any) {
                        toast.error(err.response?.data?.error || 'Payment verification failed', { id: 'addonPurchase' });
                    }
                },
                prefill: { name: billingInfo?.companyConfig?.name || 'Company' },
                theme: { color: '#4f46e5' }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                toast.error(response.error?.description || 'Payment failed', { id: 'addonPurchase' });
            });
            rzp.open();
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.response?.data?.details || 'Failed to purchase', { id: 'addonPurchase' });
        }
    };

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
                    className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm"
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <Zap className="h-6 w-6" />
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

                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between border-b border-gray-100 pb-4">
                            <span className="text-gray-500 flex items-center gap-2"><Package className="w-4 h-4" /> Max Apps</span>
                            <span className="font-medium text-gray-900">{currentSubscription?.plan?.maxApps || 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-4">
                            <span className="text-gray-500 flex items-center gap-2"><Shield className="w-4 h-4" /> Max Users</span>
                            <span className="font-medium text-gray-900">{totalMaxUsers > 1000 ? 'Unlimited' : totalMaxUsers} {extraTeamMembers > 0 && <span className="text-xs text-indigo-500 ml-1">(+{extraTeamMembers} Extra)</span>}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Billing Cycle</span>
                            <span className="font-medium text-gray-900">{currentSubscription?.billingCycle || 'Monthly'}</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Subscription Status</h3>
                                <p className="text-sm text-gray-500 capitalize">{status || 'Unknown'}</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4 text-sm mt-4">
                            <div className="flex justify-between border-b border-gray-100 pb-4">
                                <span className="text-gray-500 flex items-center gap-2"><History className="w-4 h-4" /> Started</span>
                                <span className="font-medium text-gray-900">{currentSubscription?.startDate ? new Date(currentSubscription.startDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4" /> Ends</span>
                                <span className="font-medium text-gray-900">{currentSubscription?.endDate ? new Date(currentSubscription.endDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Add-ons & Usage */}
            {currentSubscription?.plan && (
                <div className="grid gap-6 md:grid-cols-2">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                    <Database className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Storage Usage</h3>
                                    <p className="text-sm text-gray-500">{formatBytes(storageUsed)} / {formatBytes(totalStorage)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4 overflow-hidden">
                            <div 
                                className={`h-2.5 rounded-full ${storagePercentage > 90 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${storagePercentage}%` }}
                            ></div>
                        </div>
                        <div className="flex items-center justify-between mt-6">
                            <span className="text-sm text-gray-500">Need more space?</span>
                            <button
                                onClick={() => handleBuyAddon('storage')}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                + 5GB for {currencyInfo.symbol === '₹' ? '₹50' : '$0.60'}
                            </button>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                                    <p className="text-sm text-gray-500">{teamMembersCount} / {totalMaxUsers > 1000 ? 'Unlimited' : totalMaxUsers}</p>
                                </div>
                            </div>
                        </div>
                        {totalMaxUsers < 1000 && (
                            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4 overflow-hidden">
                                <div 
                                    className={`h-2.5 rounded-full ${usersPercentage > 90 ? 'bg-red-500' : 'bg-purple-500'}`} 
                                    style={{ width: `${usersPercentage}%` }}
                                ></div>
                            </div>
                        )}
                        {totalMaxUsers < 1000 && (
                            <div className="flex items-center justify-between mt-6">
                                <span className="text-sm text-gray-500">Grow your team</span>
                                <button
                                    onClick={() => handleBuyAddon('team')}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    + 1 Seat for {currencyInfo.symbol === '₹' ? '₹166' : '$2'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

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
                            price={currencyInfo.symbol === '₹' ? Math.round(plan.price * currencyInfo.rate) : plan.price}
                            currencySymbol={currencyInfo.symbol}
                            features={plan.features || []}
                            isPopular={plan.planName.toLowerCase().includes('pro')}
                            isSelected={currentSubscription?.planId === plan.id}
                            onSelect={async () => {
                                if (currentSubscription?.planId === plan.id) return;
                                try {
                                    toast.loading(`Processing switch to ${plan.planName}...`, { id: 'planSwitch' });
                                    const { data: checkoutData } = await api.post('/api/v1/platform-billing/plan/checkout', { planId: plan.id });
                                    
                                    const options = {
                                        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                                        amount: checkoutData.amount,
                                        currency: checkoutData.currency,
                                        name: '180Workspace',
                                        description: `Upgrade to ${plan.planName}`,
                                        order_id: checkoutData.orderId,
                                        handler: async function (response: any) {
                                            try {
                                                toast.loading('Verifying payment...', { id: 'planSwitch' });
                                                await api.post('/api/v1/platform-billing/plan/verify', {
                                                    razorpay_payment_id: response.razorpay_payment_id,
                                                    razorpay_order_id: response.razorpay_order_id,
                                                    razorpay_signature: response.razorpay_signature,
                                                    planId: plan.id
                                                });
                                                toast.success('Successfully switched plan!', { id: 'planSwitch' });
                                                setTimeout(() => window.location.reload(), 1500);
                                            } catch (err: any) {
                                                toast.error(err.response?.data?.error || 'Payment verification failed', { id: 'planSwitch' });
                                            }
                                        },
                                        prefill: {
                                            name: billingInfo?.company?.name || 'Company',
                                        },
                                        theme: { color: '#4f46e5' }
                                    };

                                    const rzp = new window.Razorpay(options);
                                    rzp.on('payment.failed', function (response: any) {
                                        toast.error(response.error?.description || 'Payment failed', { id: 'planSwitch' });
                                    });
                                    rzp.open();
                                } catch (err: any) {
                                    toast.error(err.response?.data?.error || err.response?.data?.details || 'Failed to switch plan', { id: 'planSwitch' });
                                }
                            }}
                            buttonText={currentSubscription?.planId === plan.id ? 'Current Plan' : 'Upgrade'}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
