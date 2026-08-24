'use client';

import { LogoLoader, Button, Input, Card, CardHeader, CardTitle, CardContent } from "@workspace/ui";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CreditCard, Check, Shield, ArrowLeft, Tag, AlertCircle, Users, Zap, Building2, Calendar, Lock, CheckCircle2 } from 'lucide-react';
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

    const planId = searchParams?.get('planId');
    const addonType = searchParams?.get('addonType');
    const [plan, setPlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [coupon, setCoupon] = useState('');
    const [couponResult, setCouponResult] = useState<any>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);

    const effectivePlatformName = platform?.platformName || 'Platform';
    const currency = plan?.currency || platform?.currency || 'USD';
    let currencySym = '$';
    try {
        currencySym = (0).toLocaleString('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).replace(/\d/g, '').trim();
    } catch (e) {
        currencySym = currency;
    }
    useEffect(() => {
        if (!planId && !addonType) {
            router.push('/dashboard/settings/platform-billing');
            return;
        }

        const fetchPlan = async () => {
            try {
                if (addonType) {
                    // Get dynamic rate from the platform config
                    const dynamicRate = platform?.rate || 1;
                    const qty = parseInt(searchParams?.get('quantity') || '1', 10);
                    
                    if (addonType === 'storage') {
                        setPlan({
                            planName: `${qty * 5}GB Storage Add-on`,
                            price: Math.round(0.60 * dynamicRate) * qty, // $0.60 base price
                            billingCycle: 'One-time',
                            features: [`${qty * 5}GB Additional Workspace Storage`, 'Immediate Activation', 'Never Expires'],
                            isAddon: true,
                            addonType: 'storage',
                            currency: currency,
                            quantity: qty
                        });
                    } else if (addonType === 'team') {
                        setPlan({
                            planName: `${qty} Team Member Add-on`,
                            price: Math.round(1 * dynamicRate) * qty, // $1.00 base price
                            billingCycle: 'One-time',
                            features: [`${qty} Extra Team Member Seat${qty > 1 ? 's' : ''}`, 'Immediate Activation', 'Never Expires'],
                            isAddon: true,
                            addonType: 'team',
                            currency: currency,
                            quantity: qty
                        });
                    } else if (addonType === 'app') {
                        setPlan({
                            planName: `${qty} App Add-on`,
                            price: Math.round(0.50 * dynamicRate) * qty, // $0.50 base price
                            billingCycle: 'One-time',
                            features: [`${qty} Extra App${qty > 1 ? 's' : ''}`, 'Immediate Activation', 'Never Expires'],
                            isAddon: true,
                            addonType: 'app',
                            currency: currency,
                            quantity: qty
                        });
                    } else {
                        router.push('/dashboard/settings/platform-billing');
                    }
                    setLoading(false);
                    return;
                }

                const { data } = await api.get('/api/v1/platform-billing/plans');
                const selected = data.plans.find((p: any) => p.id === planId);
                if (!selected) {
                    toast.error('Invalid plan selected');
                    router.push('/dashboard/settings/platform-billing');
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
    }, [planId, addonType, router, currency]);

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
            const { data } = await api.post('/api/v1/platform-billing/coupon', {
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

            if (plan.isAddon) {
                const { data: order } = await api.post(`/api/v1/platform-billing/${plan.addonType}/checkout`, {
                    gigabytes: plan.addonType === 'storage' ? 5 * (plan.quantity || 1) : undefined,
                    users: plan.addonType === 'team' ? plan.quantity || 1 : undefined,
                    apps: plan.addonType === 'app' ? plan.quantity || 1 : undefined
                });

                if (order.providerName === 'razorpay') {
                    if (typeof window !== 'undefined' && !window.Razorpay) {
                        toast.error('Payment gateway SDK not loaded');
                        setPaymentLoading(false);
                        return;
                    }

                    const options = {
                        key: order.keyId,
                        amount: order.amount,
                        currency: order.currency || platform?.currency || 'INR',
                        name: settings?.companyName || effectivePlatformName,
                        description: `Purchase ${plan.planName}`,
                        order_id: order.orderId,
                        handler: async (response: any) => {
                            try {
                                await api.post(`/api/v1/platform-billing/${plan.addonType}/verify`, {
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_signature: response.razorpay_signature,
                                    ...(plan.addonType === 'team' ? { users: plan.quantity || 1 } : {}),
                                    ...(plan.addonType === 'storage' ? { gigabytes: 5 * (plan.quantity || 1) } : {}),
                                    ...(plan.addonType === 'app' ? { apps: plan.quantity || 1 } : {}),
                                });
                                refresh();
                                router.push('/dashboard/settings/platform-billing/success');
                            } catch (err) {
                                router.push('/dashboard/settings/platform-billing/failed');
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
                throw new Error(`Unsupported payment provider for addons: ${order.providerName}`);
            }

            const { data: order } = await api.post('/api/v1/platform-billing/plan/checkout', {
                planId: plan.id,
                ...(couponResult && { couponCode: couponResult.code || coupon })
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
                    name: settings?.companyName || effectivePlatformName,
                    description: `Setup e-Mandate for ${plan.planName}`,
                    subscription_id: order.subscriptionId,
                    handler: async (response: any) => {
                        try {
                            await api.post('/api/v1/platform-billing/plan/verify', {
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_subscription_id: response.razorpay_subscription_id, 
                                razorpay_signature: response.razorpay_signature,
                                planId: plan.id,
                                ...(couponResult && { couponCode: couponResult.code || coupon })
                            });
                            refresh();
                            router.push('/dashboard/settings/platform-billing/success');
                        } catch (err) {
                            router.push('/dashboard/settings/platform-billing/failed');
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
                <LogoLoader className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!plan) return null;

    const subTotal = plan?.price || 0;
    let discountAmount = 0;
    if (couponResult) {
        if (couponResult.discountType === 'percentage') {
            discountAmount = subTotal * (couponResult.discountValue / 100);
        } else {
            discountAmount = couponResult.discountValue;
        }
    }
    const discountedTotal = Math.max(0, subTotal - discountAmount);
    const taxAmount = discountedTotal * 0.18; // 18% GST on the discounted total
    let finalPrice = discountedTotal + taxAmount;
    
    // Enforce a minimum validation charge: 0.5% of the original subtotal, but never less than 1 base unit
    if (finalPrice <= 0) {
        finalPrice = Math.max(1, subTotal * 0.005);
    }

    return (
        <div className="min-h-[80vh] relative overflow-hidden bg-slate-50/50 dark:bg-black/20 rounded-2xl">
            {/* Background elements */}
            <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent -z-10" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 blur-[100px] rounded-full -z-10" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/20 blur-[100px] rounded-full -z-10" />
            
            <div className="max-w-5xl mx-auto py-12 px-6 relative z-10">
                <Toaster position="top-center" />

                <Button
                    variant="glass"
                    onClick={() => router.back()}
                    className="flex items-center gap-2 mb-8 group w-fit text-slate-600 dark:text-slate-300"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Plans
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Plan Details - Left Column */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="space-y-1.5">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Checkout</h1>
                            <p className="text-slate-500 text-sm">Review your plan details and complete the secure payment.</p>
                        </div>

                        <Card className="bg-white/80 dark:bg-black/60 backdrop-blur-md border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                        <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100 dark:border-white/10">
                            <div className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-xl">
                                <LogoLoader className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    {plan.planName.toLowerCase().includes('plan') ? plan.planName : `${plan.planName} Plan`}
                                </h1>
                                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">{plan.billingCycle || 'Monthly'} Subscription</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Plan Highlights</h4>
                                <ul className="space-y-2.5">
                                    {plan.features.filter((f: string) => !f.toLowerCase().includes('trial') && !f.toLowerCase().includes('days')).map((f: string, i: number) => (
                                        <li key={i} className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-sm font-medium">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-slate-50/80 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800 space-y-3">
                                <h4 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Secure Payment</h4>
                                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                                    <Shield className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">Industry-standard SSL encryption</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                                    <Lock className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">Powered by Razorpay Secure</span>
                                </div>
                            </div>
                        </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-500">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong>Automatic Access:</strong> Your plan will be activated immediately after verification. Any existing limits will be automatically updated.
                        </div>
                    </div>
                </div>

                {/* Pricing Summary - Right Column */}
                <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                    <Card className="rounded-3xl bg-white dark:bg-black/60 shadow-2xl shadow-indigo-100/50 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] border border-slate-100 dark:border-white/10">
                        <CardHeader className="p-8 pb-0">
                            <CardTitle className="text-lg font-bold">Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-6">

                        <div className="space-y-4 pb-6 border-b border-slate-100 text-sm">
                            <div className="flex justify-between items-center text-slate-500">
                                <span>Subtotal</span>
                                <span>{currencySym}{subTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between items-center text-emerald-500">
                                    <span>Discount</span>
                                    <span>-{currencySym}{discountAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-slate-500">
                                <span>GST (18%)</span>
                                <span>{currencySym}{taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        <div className="py-4 flex justify-between items-end">
                            <div>
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Amount</p>
                                <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{currencySym}{finalPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-md p-3 mb-5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                            {discountedTotal <= 0 ? (
                                <span>
                                    <strong className="text-slate-700 dark:text-slate-300 font-medium">Setup Validation:</strong> A nominal fee of {currencySym}{finalPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })} is required today for gateway validation. Your subscription will renew at {currencySym}{(subTotal + (subTotal * 0.18)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}/month starting next billing cycle.
                                </span>
                            ) : (
                                <span>
                                    <strong className="text-slate-700 dark:text-slate-300 font-medium">Subscription Terms:</strong> You will be charged {currencySym}{finalPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })} today. 
                                    {discountAmount > 0 
                                        ? ` Your subscription will renew at ${currencySym}${(subTotal + (subTotal * 0.18)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}/month starting next billing cycle.` 
                                        : ' This is a recurring monthly subscription.'}
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            {plan.price > 0 && !plan.isAddon && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Have a coupon?</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={coupon}
                                            onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponResult(null); }}
                                            placeholder="SALE10"
                                            className="flex-1 h-10 rounded-lg text-sm text-slate-900 dark:text-white"
                                        />
                                        <Button
                                            variant="secondary"
                                            onClick={validateCoupon}
                                            disabled={!coupon || couponLoading || paymentLoading}
                                            className="px-4 py-2 h-10 rounded-lg text-sm font-medium transition-all"
                                        >
                                            {couponLoading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Apply'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={handlePayment}
                                disabled={paymentLoading}
                                className={`w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-slate-300 disabled:text-slate-500 font-medium rounded-lg transition-all flex items-center justify-center gap-2 text-sm group shadow-sm`}
                            >
                                {paymentLoading ? (
                                    <>
                                        <LogoLoader className="w-4 h-4 animate-spin" />
                                        Activating...
                                    </>
                                ) : (
                                    <>
                                        {plan.price === 0 ? <Zap className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                                        {plan.price === 0 ? 'Activate Plan' : 'Complete Purchase'}
                                    </>
                                )}
                            </Button>

                            <p className="text-center text-[10px] text-slate-400 font-medium">
                                By clicking &quot;Complete Purchase&quot;, you agree to our Terms of Service and Refund Policy.
                            </p>
                        </div>
                        </CardContent>
                    </Card>

                    <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border border-primary/10 space-y-3">
                        <div className="flex items-start gap-3">
                            <Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Billing for {user?.role} account</p>
                            </div>
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
                <LogoLoader className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    );
}
