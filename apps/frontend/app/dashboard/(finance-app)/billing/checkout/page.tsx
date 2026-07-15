'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    CreditCard, Check, Shield, ArrowLeft, Tag, Loader2,
    AlertCircle, Users, Zap, Building2, Calendar, Lock, CheckCircle2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/lib/useSubscription';
import { useSettings } from '@/lib/settings-context';

declare global { interface Window { Razorpay: any; } }

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { refresh, paymentsEnabled } = useSubscription();
    const { settings, platform } = useSettings();

    const planId = searchParams.get('planId');
    const [plan, setPlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [coupon, setCoupon] = useState('');
    const [couponResult, setCouponResult] = useState<any>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);

    const effectivePlatformName = platform?.platformName || 'Platform';
    const currencySym = plan?.currency === 'INR' ? '₹' : (plan?.currency === 'USD' ? '$' : (platform?.currency || '₹'));
    const currency = plan?.currency || platform?.currency || 'INR';

    useEffect(() => {
        if (!planId) {
            router.push('/dashboard/billing');
            return;
        }

        const fetchPlan = async () => {
            try {
                const { data } = await api.get('/api/billing/plans');
                const selected = data.plans.find((p: any) => p.id === planId);
                if (!selected) {
                    toast.error('Invalid plan selected');
                    router.push('/dashboard/billing');
                } else {
                    setPlan(selected);
                }
            } catch (err) {
                toast.error('Failed to load plan details');
            } finally {
                setLoading(false);
            }
        };

        fetchPlan();

        fetchPlan();
    }, [planId, router]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !window.Razorpay) {
            const s = document.createElement('script');
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            document.head.appendChild(s);
        }
    }, []);

    const validateCoupon = async () => {
        if (!coupon || !plan) return;
        setCouponLoading(true);
        try {
            const { data } = await api.post('/api/billing/coupon', {
                couponCode: coupon,
                planId: plan.id
            });
            setCouponResult(data);
            toast.success(`Coupon applied! Save ${currency}${data.discountAmount.toLocaleString('en-IN')}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Invalid coupon');
            setCouponResult(null);
        } finally {
            setCouponLoading(false);
        }
    };

    const handlePayment = async () => {
        // Skip payments-enabled check for free plans
        if (plan.price > 0 && !paymentsEnabled) {
            toast.error('Payments are currently disabled. Contact support.');
            return;
        }

        setPaymentLoading(true);
        try {
            // Logic for Free Plans or Trial Plan (Price = 0)
            if (plan.price === 0) {
                await api.post('/api/billing/activate', {
                    planId: plan.id,
                });
                toast.success(`${plan.planName} activated successfully!`);
                refresh();
                router.push('/dashboard/billing/success');
                return;
            }

            const { data: order } = await api.post('/api/billing/mandate/initiate', {
                planId: plan.id,
            });
            // ... (rest of the Razorypay/Stripe logic stays same)

            if (order.providerName === 'stripe') {
                if (order.url) {
                    window.location.href = order.url;
                } else {
                    throw new Error('Missing redirect URL from Stripe provider.');
                }
                return;
            }

            if (order.providerName === 'razorpay') {
                if (typeof window !== 'undefined' && !window.Razorpay) {
                    toast.error('Payment gateway SDK not loaded');
                    setPaymentLoading(false);
                    return;
                }

                const options = {
                    key: order.keyId,
                    amount: order.amount, // already in minor units
                    currency: order.currency || platform?.currency || 'INR',
                    name: settings?.companyName || effectivePlatformName,
                    description: `Setup e-Mandate for ${plan.planName}`,
                    order_id: order.orderId,
                    recurring: 1, // Indicate this is a recurring mandate natively for RAZORPAY
                    handler: async (response: any) => {
                        try {
                            await api.post('/api/billing/mandate/verify', {
                                providerOrderId: response.razorpay_order_id,
                                providerPaymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                                planId: plan.id,
                            });
                            refresh();
                            router.push('/dashboard/billing/success');
                        } catch (err) {
                            router.push('/dashboard/billing/failed');
                        }
                    },
                    prefill: {
                        name: user?.name,
                        email: user?.email,
                    },
                    theme: { color: '#4f46e5' },
                    modal: {
                        ondismiss: () => setPaymentLoading(false)
                    },
                };
                const rz = new window.Razorpay(options);
                rz.open();
                return;
            }

            throw new Error(`Unsupported payment provider configured explicitly: ${order.providerName}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || err.message || 'Failed to initiate payment');
            setPaymentLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!plan) return null;

    const finalPrice = couponResult ? couponResult.finalAmount : plan.price;
    const discountAmount = couponResult ? couponResult.discountAmount : 0;

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <Toaster position="top-center" />

            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-8 font-medium group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Plans
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Plan Details - Left Column */}
                <div className="lg:col-span-7 space-y-8">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checkout</h1>
                        <p className="text-slate-500">Review your plan details and complete the secure payment.</p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Zap className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                    {plan.planName.toLowerCase().includes('plan') ? plan.planName : `${plan.planName} Plan`}
                                </h1>
                                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{plan.billingCycle || 'Monthly'} Subscription</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Plan Highlights</h4>
                                <ul className="space-y-3">
                                    {plan.features.filter((f: string) => !f.toLowerCase().includes('trial') && !f.toLowerCase().includes('days')).map((f: string, i: number) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-600">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm font-medium">{f}</span>
                                        </li>
                                    ))}
                                    {plan.trialDays > 0 && (
                                        <li className="flex items-center gap-3 text-slate-600">
                                            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                            <span className="text-sm font-bold">{plan.trialDays} Days Trial</span>
                                        </li>
                                    )}
                                </ul>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure Payment</h4>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Shield className="w-5 h-5 text-indigo-500" />
                                    <span className="text-sm font-medium">Industry-standard SSL encryption</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Lock className="w-5 h-5 text-indigo-500" />
                                    <span className="text-sm font-medium">Powered by Razorpay Secure</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-800">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                        <div>
                            <strong>Automatic Access:</strong> Your plan will be activated immediately after verification. Any existing trial or plan limits will be updated according to the new plan.
                        </div>
                    </div>
                </div>

                {/* Pricing Summary - Right Column */}
                <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                    <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-100">
                        <h3 className="text-lg font-bold mb-6">Order Summary</h3>

                        <div className="space-y-4 pb-6 border-b border-white/10 text-sm">
                            <div className="flex justify-between items-center opacity-70">
                                <span>Subtotal</span>
                                <span>{currencySym}{plan.price.toLocaleString('en-IN')}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between items-center text-emerald-400">
                                    <span>Discount</span>
                                    <span>-{currencySym}{discountAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center opacity-70">
                                <span>Tax (GST 0%)</span>
                                <span>₹0</span>
                            </div>
                        </div>

                        <div className="py-6 flex justify-between items-end">
                            <div>
                                <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Total Amount</p>
                                <p className="text-4xl font-black italic tracking-tighter">{currencySym}{finalPrice.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-white/40 text-[10px] font-bold uppercase">Due Today</p>
                                <p className="text-indigo-400 font-bold">{currencySym}{plan.price === 0 ? '0' : '1'}</p>
                            </div>
                        </div>

                        {plan.price > 0 ? (
                            <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-xl p-4 mb-6 text-sm text-indigo-200">
                                <strong>Note:</strong> You will only be charged {currencySym}1 today to verify your payment method. The full plan amount will be automatically charged after your trial ends.
                            </div>
                        ) : (
                            <div className="bg-emerald-900/40 border border-emerald-500/30 rounded-xl p-4 mb-6 text-sm text-emerald-200">
                                <strong>Free Activation:</strong> You are activating a free or trial plan. No payment method is required to get started today.
                            </div>
                        )}

                        <div className="space-y-4">
                            {plan.price > 0 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Have a coupon?</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={coupon}
                                            onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponResult(null); }}
                                            placeholder="SALE10"
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                                        />
                                        <button
                                            onClick={validateCoupon}
                                            disabled={!coupon || couponLoading || paymentLoading}
                                            className="px-6 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-xl text-sm font-bold transition-all"
                                        >
                                            {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handlePayment}
                                disabled={paymentLoading}
                                className={`w-full py-5 ${plan.price === 0 ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'} disabled:bg-slate-700 text-white font-black rounded-2xl transition-all shadow-xl ${plan.price === 0 ? 'shadow-emerald-600/20' : 'shadow-indigo-600/20'} flex items-center justify-center gap-3 text-lg group`}
                            >
                                {paymentLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Activating...
                                    </>
                                ) : (
                                    <>
                                        {plan.price === 0 ? <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" /> : <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                                        {plan.price === 0 ? 'Activate Plan' : 'Complete Purchase'}
                                    </>
                                )}
                            </button>

                            <p className="text-center text-[10px] text-white/30 font-medium">
                                By clicking &quot;Complete Purchase&quot;, you agree to our Terms of Service and Refund Policy.
                            </p>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/50 space-y-4">
                        <div className="flex items-start gap-3">
                            <Building2 className="w-5 h-5 text-indigo-500 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-indigo-900">{user?.name}</p>
                                <p className="text-xs text-indigo-600 opacity-70">Billing for {user?.role} account</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    );
}
