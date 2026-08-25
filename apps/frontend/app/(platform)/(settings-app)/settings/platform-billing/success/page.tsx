'use client';

import Link from 'next/link';
import { CheckCircle2, ChevronRight, LayoutDashboard, CreditCard, Sparkles, PartyPopper } from 'lucide-react';
import { useSubscription } from '@/lib/useSubscription';

export default function PaymentSuccessPage() {
    const { plan, subscription, isTrialing } = useSubscription();

    const expiryDate = isTrialing ? subscription?.trialEndDate : subscription?.subscriptionEndDate;

    return (
        <div className="max-w-3xl mx-auto py-12 px-4 text-center">
            <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                <div className="relative w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/40 rotate-12 animate-in zoom-in spin-in-12 duration-700">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg rotate-12 animate-bounce">
                    <PartyPopper className="w-6 h-6 text-white" />
                </div>
            </div>

            <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight grayscale-0">Payment Successful!</h1>
            <p className="text-lg text-slate-500 mb-12 max-w-lg mx-auto leading-relaxed">
                Welcome to the next level of management. Your <strong>{plan?.planName || 'Premium'}</strong> plan is now active and your account has been upgraded.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 text-left">
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Plan</p>
                            <p className="font-bold text-slate-900">{plan?.planName || 'Pro'} Plan</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Max Users</span>
                            <span className="font-bold text-slate-900">{plan?.maxUsers || 'Unlimited'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Status</span>
                            <span className="font-bold text-emerald-600 uppercase text-[10px] tracking-widest">Active</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Billing Info</p>
                            <p className="font-bold text-slate-900">Renewal Date</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Next Due</span>
                            <span className="font-bold text-slate-900">
                                {expiryDate ? new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Cycle</span>
                            <span className="font-bold text-slate-900 capitalize">{plan?.billingCycle || 'Monthly'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                    href='/'
                    className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group"
                >
                    <LayoutDashboard className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Go to Dashboard
                </Link>
                <Link
                    href='/settings/platform-billing'
                    className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group"
                >
                    View Billing History
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <p className="mt-12 text-sm text-slate-400">
                A confirmation email has been sent to your registered email address.
            </p>
        </div>
    );
}
