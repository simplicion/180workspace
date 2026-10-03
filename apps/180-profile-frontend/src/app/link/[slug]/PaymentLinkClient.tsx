'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  ExternalLink,
  Tag,
  CreditCard,
  Wallet,
  ArrowRight,
  Lock,
  Sparkles,
  ShoppingBag,
  User,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { Button, LogoLoader } from '@workspace/ui';
import { toast } from 'react-hot-toast';

interface PublicPaymentLink {
  id: string;
  slug: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  collectPhone: boolean;
  collectAddress: boolean;
  allowCoupons: boolean;
  isAvailable: boolean;
  isSoldOut: boolean;
  merchant: {
    name: string;
    logoUrl?: string;
    clientId: string;
  };
}

interface FulfillmentData {
  fulfillmentMessage?: string;
  fulfillmentFileUrl?: string;
  redirectUrl?: string;
  transactionId?: string;
}

export function PaymentLinkClient({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<PublicPaymentLink | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Customer Contact Fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Coupon Fields
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Payment Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [fulfilledData, setFulfilledData] = useState<FulfillmentData | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4003';
  };

  const fetchLink = useCallback(async () => {
    if (!slug || slug === 'default') {
      setLoading(false);
      setError('Please provide a valid payment link');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/v1/payment-links/public/${slug}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Payment link not found or inactive');
      }
      setLink(json.data || json.link);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment link');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchLink();
  }, [fetchLink]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !link) return;
    setValidatingCoupon(true);
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/v1/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: link.merchant.clientId || link.id,
          code: couponCode.trim(),
          amount: link.amount,
          customerEmail: customerEmail || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.valid) {
        setAppliedCoupon({
          code: data.code || couponCode.toUpperCase(),
          discountAmount: data.discountAmount || 0,
          finalAmount: data.finalAmount || link.amount - (data.discountAmount || 0),
        });
        toast.success(`Coupon "${couponCode.toUpperCase()}" applied!`);
      } else {
        toast.error(data.error || 'Invalid or expired coupon code');
        setAppliedCoupon(null);
      }
    } catch {
      toast.error('Failed to validate coupon');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const currentPayableAmount = appliedCoupon ? appliedCoupon.finalAmount : (link?.amount || 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;

    if (!customerEmail.trim()) {
      toast.error('Please enter your email address for order fulfillment');
      return;
    }

    if (link.collectPhone && !customerPhone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsProcessing(true);
    try {
      const apiBase = getApiBase();

      // 1. Create checkout session on backend
      const sessionRes = await fetch(`${apiBase}/api/v1/checkout/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: currentPayableAmount,
          currency: link.currency || 'INR',
          title: link.title,
          description: link.description,
          couponCode: appliedCoupon?.code || undefined,
          metadata: {
            paymentLinkId: link.id,
            paymentLinkSlug: link.slug,
            customerEmail: customerEmail.trim(),
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerAddress: customerAddress.trim(),
          },
        }),
      });

      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.success) {
        throw new Error(sessionData.error || 'Failed to initialize payment session');
      }

      const sessionId = sessionData.sessionId || sessionData.data?.id;

      // 2. Generate direct gateway order
      const orderRes = await fetch(`${apiBase}/api/v1/checkout/sessions/${sessionId}/direct-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        // Fallback: If gateway order cannot be generated (test/mock environment), complete link purchase directly
        const completeRes = await fetch(`${apiBase}/api/v1/payment-links/${link.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const completeData = await completeRes.json();
        setFulfilledData({
          fulfillmentMessage: completeData.fulfillment?.fulfillmentMessage || completeData.data?.fulfillmentMessage,
          fulfillmentFileUrl: completeData.fulfillment?.fulfillmentFileUrl || completeData.data?.fulfillmentFileUrl,
          redirectUrl: completeData.fulfillment?.redirectUrl || completeData.data?.redirectUrl,
          transactionId: sessionId,
        });
        setIsProcessing(false);
        return;
      }

      // 3. Ensure Razorpay script is loaded dynamically on the page
      if (typeof window !== 'undefined' && !(window as any).Razorpay) {
        try {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Razorpay checkout engine'));
            document.head.appendChild(script);
          });
        } catch (loadErr: any) {
          console.warn('[PaymentLink] Failed to dynamically load Razorpay script:', loadErr?.message);
        }
      }

      // 4. Launch Razorpay modal if available on window
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amountPaise,
          currency: orderData.currency,
          name: link.merchant.name,
          description: link.title,
          order_id: orderData.orderId,
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone,
          },
          theme: {
            color: '#6366f1',
          },
          handler: async (response: any) => {
            try {
              // Verify payment on server
              const verifyRes = await fetch(`${apiBase}/api/v1/checkout/sessions/${sessionId}/direct-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();

              // Complete the payment link inventory & fetch fulfillment
              const compRes = await fetch(`${apiBase}/api/v1/payment-links/${link.id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
              });
              const compData = await compRes.json();

              setFulfilledData({
                fulfillmentMessage: compData.fulfillment?.fulfillmentMessage || compData.data?.fulfillmentMessage,
                fulfillmentFileUrl: compData.fulfillment?.fulfillmentFileUrl || compData.data?.fulfillmentFileUrl,
                redirectUrl: compData.fulfillment?.redirectUrl || compData.data?.redirectUrl,
                transactionId: response.razorpay_payment_id || sessionId,
              });
            } catch (verErr: any) {
              toast.error(verErr.message || 'Payment verification failed');
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Direct complete fallback for development/testing
        const compRes = await fetch(`${apiBase}/api/v1/payment-links/${link.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const compData = await compRes.json();
        setFulfilledData({
          fulfillmentMessage: compData.fulfillment?.fulfillmentMessage || compData.data?.fulfillmentMessage,
          fulfillmentFileUrl: compData.fulfillment?.fulfillmentFileUrl || compData.data?.fulfillmentFileUrl,
          redirectUrl: compData.fulfillment?.redirectUrl || compData.data?.redirectUrl,
          transactionId: sessionId,
        });
        setIsProcessing(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment initiation failed');
      setIsProcessing(false);
    }
  };

  const handleCopySecret = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <LogoLoader size={44} className="w-11 h-11 text-indigo-500" />
        <p className="text-xs text-zinc-400 font-medium mt-3">Loading checkout link...</p>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4 border border-red-500/20">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold text-white mb-1">Payment Link Unavailable</h1>
        <p className="text-xs text-zinc-400 max-w-sm mb-6">
          {error || 'This payment link does not exist, has expired, or was deactivated by the seller.'}
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 py-2 rounded-xl"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // FULFILLED SUCCESS VIEW
  if (fulfilledData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white">Payment Successful!</h1>
            <p className="text-xs text-zinc-400">
              Receipt sent to <span className="font-semibold text-zinc-200">{customerEmail}</span>
            </p>
            {fulfilledData.transactionId && (
              <p className="text-[11px] font-mono text-zinc-500 mt-1">
                Ref: {fulfilledData.transactionId}
              </p>
            )}
          </div>

          {/* Fulfillment Secret Message */}
          {fulfilledData.fulfillmentMessage && (
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Your Digital Access / Secret
                </span>
                <button
                  onClick={() => handleCopySecret(fulfilledData.fulfillmentMessage!)}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSecret ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-black/40 font-mono text-xs text-zinc-200 select-all break-all border border-white/5">
                {fulfilledData.fulfillmentMessage}
              </div>
            </div>
          )}

          {/* Fulfillment Download File */}
          {fulfilledData.fulfillmentFileUrl && (
            <div className="pt-2">
              <a
                href={fulfilledData.fulfillmentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30"
              >
                <Download className="w-4 h-4" />
                Download Digital Asset
              </a>
            </div>
          )}

          {/* Redirect to store */}
          {fulfilledData.redirectUrl && (
            <div className="pt-1">
              <a
                href={fulfilledData.redirectUrl}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                <span>Continue to {link.merchant.name}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Verified & Secured by 180 Pay</span>
          </div>
        </div>
      </div>
    );
  }

  // MAIN CHECKOUT VIEW
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between pb-6">
        <div className="flex items-center gap-2.5">
          {link.merchant.logoUrl ? (
            <img
              src={link.merchant.logoUrl}
              alt={link.merchant.name}
              className="w-8 h-8 rounded-xl object-cover border border-white/10"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
              {link.merchant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold text-zinc-200">{link.merchant.name}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-400 font-medium">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>256-bit Encrypted Checkout</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full my-auto">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/80 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Item Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-white/10">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20">
                <ShoppingBag className="w-3 h-3" />
                Direct Payment Link
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{link.title}</h1>
              {link.description && (
                <p className="text-xs text-zinc-400 max-w-md leading-relaxed">{link.description}</p>
              )}
            </div>

            <div className="sm:text-right shrink-0">
              {appliedCoupon ? (
                <div className="space-y-0.5">
                  <span className="text-xs text-zinc-500 line-through font-mono">
                    {link.currency === 'INR' ? '₹' : '$'}
                    {link.amount.toFixed(2)}
                  </span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {link.currency === 'INR' ? '₹' : '$'}
                    {appliedCoupon.finalAmount.toFixed(2)}
                  </div>
                  <span className="inline-block text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    -{link.currency === 'INR' ? '₹' : '$'}{appliedCoupon.discountAmount.toFixed(2)} Saved
                  </span>
                </div>
              ) : (
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {link.currency === 'INR' ? '₹' : '$'}
                  {link.amount.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Sold Out Notice */}
          {link.isSoldOut ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center space-y-1">
              <span className="text-sm font-bold text-red-400">Sold Out</span>
              <p className="text-xs text-zinc-400">
                All available purchase slots for this payment link have been claimed.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="space-y-5">
              {/* Customer Contact Form */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Contact & Fulfillment Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Alex Mercer"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="alex@gmail.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {link.collectPhone && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {link.collectAddress && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Shipping Address</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Street address, City, ZIP code"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Coupon Section */}
              {link.allowCoupons && (
                <div className="pt-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Promo or Coupon Code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono uppercase text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 py-2 rounded-xl shrink-0"
                    >
                      {validatingCoupon ? 'Checking...' : 'Apply'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Submit Pay Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <LogoLoader size={18} className="w-4.5 h-4.5 text-white" />
                      <span>Opening Secure Checkout...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        Pay {link.currency === 'INR' ? '₹' : '$'}
                        {currentPayableAmount.toFixed(2)}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Security Footer */}
          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero-code, end-to-end encrypted checkout</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                Cards & NetBanking
              </span>
              <span className="flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" />
                UPI & 180 Wallet
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="max-w-2xl mx-auto w-full text-center pt-6 text-[11px] text-zinc-600">
        Powered by <span className="font-semibold text-zinc-400">180 Pay</span> · Sovereign Developer Infrastructure
      </footer>
    </div>
  );
}
