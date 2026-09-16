'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ChevronRight, LayoutDashboard, CreditCard, Sparkles, PartyPopper } from 'lucide-react';
import { useSubscription } from '@/lib/useSubscription';
import { useSettings } from '@/lib/settings-context';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import api from '@/lib/api';

function SuccessContent() {
    const searchParams = useSearchParams();
    const { plan: subPlan, subscription, isTrialing, refresh } = useSubscription();
    const { platform } = useSettings();
    const [fetchedPlan, setFetchedPlan] = useState<any>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    
    const planId = searchParams?.get('planId');

    const expiryDate = isTrialing ? subscription?.trialEndDate : subscription?.subscriptionEndDate;

    useEffect(() => {
        // Force a refresh of the subscription context to ensure the rest of the app gets the update
        refresh();

        if (planId) {
            setIsLoadingPlan(true);
            api.get('/api/v1/platform-billing/plans')
                .then(res => {
                    const found = res.data.plans.find((p: any) => p.id === planId);
                    if (found) setFetchedPlan(found);
                })
                .catch(console.error)
                .finally(() => setIsLoadingPlan(false));
        } else {
            setIsLoadingPlan(false);
        }
    }, [planId, refresh]);

    useEffect(() => {
        // Fire confetti celebration on mount
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({
                ...defaults, particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults, particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    const containerVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.15
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    const formatStorage = (bytes?: number) => {
        if (bytes === undefined || bytes === null) return 'N/A';
        if (bytes < 0) return 'Unlimited';
        const gb = bytes / (1024 * 1024 * 1024);
        return gb >= 1000 ? 'Unlimited' : `${Math.round(gb)}GB`;
    };

    const formatLimit = (limit?: number) => {
        if (limit === undefined || limit === null) return 'N/A';
        return limit < 0 || limit >= 100 ? 'Unlimited' : limit.toString();
    };

    const plan = fetchedPlan || subPlan;
    
    const hasAI = plan?.features?.some((f: string) => f.toLowerCase().includes('ai assistant'));
    const hasEmail = plan?.features?.some((f: string) => f.toLowerCase().includes('custom email'));

    const displayPrice = fetchedPlan ? fetchedPlan.price : (plan?.price ? Math.round(plan.price * ((platform as any)?.rate || 1)) : 0);
    const currency = fetchedPlan ? fetchedPlan.currency : ((platform as any)?.currency || 'USD');
    let currencySymbol = '$';
    try {
        currencySymbol = (0).toLocaleString('en-US', { style: 'currency', currency: currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\d/g, '').trim();
    } catch (e) {
        currencySymbol = currency;
    }

    if (isLoadingPlan) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 pt-16 w-full h-full overflow-hidden bg-[#FAFAFA] flex flex-col items-center justify-center p-4">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <div className="w-[800px] h-[400px] bg-gradient-to-b from-emerald-100/50 via-indigo-50/30 to-transparent blur-3xl rounded-[100%] opacity-80"></div>
            </div>

            <motion.div 
                className="relative z-10 flex flex-col items-center text-center w-full max-w-4xl h-full justify-center pb-10"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* Logo & Success Icon */}
                <motion.div variants={itemVariants} className="relative inline-flex items-center justify-center mb-8 mt-4">
                    <div className="absolute inset-0 bg-emerald-400/20 blur-xl rounded-full"></div>
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="relative px-8 py-5 bg-white rounded-3xl shadow-2xl shadow-emerald-500/10 flex items-center justify-center border border-emerald-100/50 z-10"
                    >
                        <img src="/black text logo.svg" alt="180workspace Logo" className="h-10 object-contain relative z-10" />
                    </motion.div>
                </motion.div>

                {/* Headers */}
                <motion.div variants={itemVariants} className="w-full">
                    <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
                        Payment Successful!
                    </h1>
                    <p className="text-sm text-slate-500 mb-2 font-medium">
                        Your <strong className="text-slate-800">{plan?.planName || 'Subscription'}</strong> is now active.
                    </p>
                    
                    {displayPrice > 0 && (
                        <p className="text-sm font-semibold text-emerald-600 mb-6 bg-emerald-50 inline-block px-3 py-1 rounded-full border border-emerald-100">
                            Next monthly charge: {currencySymbol}{displayPrice.toLocaleString('en-IN')}/month
                        </p>
                    )}

                    {/* Max 10 word motivation line */}
                    <div className="mb-8 mt-2 bg-gradient-to-r from-slate-100/80 via-white to-slate-100/80 p-3 rounded-2xl border border-slate-200/60 inline-block shadow-sm">
                        <p className="font-black text-slate-800 text-lg tracking-wide uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-900">
                            YOUR WORKSPACE IS NOW READY TO SCALE UNSTOPPABLY!
                        </p>
                    </div>
                </motion.div>

                {/* Subscription Details (Grid) */}
                <motion.div variants={itemVariants} className="w-full grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-transform">
                        <div className="text-slate-400 mb-2 group-hover:text-indigo-500 transition-colors"><Sparkles className="w-5 h-5" /></div>
                        <p className="text-2xl font-black text-slate-900">{formatLimit(plan?.maxUsers)}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Team Users</p>
                    </div>
                    <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-transform">
                        <div className="text-slate-400 mb-2 group-hover:text-emerald-500 transition-colors"><LayoutDashboard className="w-5 h-5" /></div>
                        <p className="text-2xl font-black text-slate-900">{formatLimit(plan?.maxApps)}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Active Apps</p>
                    </div>
                    <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-transform">
                        <div className="text-slate-400 mb-2 group-hover:text-amber-500 transition-colors"><CreditCard className="w-5 h-5" /></div>
                        <p className="text-2xl font-black text-slate-900">{formatStorage(plan?.maxStorageBytes)}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Cloud Storage</p>
                    </div>
                    <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-transform">
                        <div className="text-slate-400 mb-2 group-hover:text-blue-500 transition-colors"><Sparkles className="w-5 h-5" /></div>
                        <p className="text-2xl font-black text-slate-900">{formatLimit(plan?.maxWebsites)}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Websites</p>
                    </div>
                </motion.div>

                {/* Additional Capabilities (if any) */}
                {(hasAI || hasEmail) && (
                    <motion.div variants={itemVariants} className="w-full flex justify-center gap-4 mb-8">
                        {hasAI && (
                            <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-100 px-4 py-2 rounded-full text-indigo-700 text-sm font-semibold">
                                <PartyPopper className="w-4 h-4" /> AI Assistant Included
                            </div>
                        )}
                        {hasEmail && (
                            <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-100 px-4 py-2 rounded-full text-emerald-700 text-sm font-semibold">
                                <CheckCircle2 className="w-4 h-4" /> Custom SMTP Configured
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto">
                    <Link
                        href='/'
                        className="w-full px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group hover:shadow-lg active:scale-[0.98]"
                    >
                        <LayoutDashboard className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        Go to Dashboard
                    </Link>
                    <Link
                        href='/settings/platform-billing'
                        className="w-full px-6 py-3.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 group hover:shadow-md active:scale-[0.98]"
                    >
                        Billing Details
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        }>
            <SuccessContent />
        </Suspense>
    );
}
