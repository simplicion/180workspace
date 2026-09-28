'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Wallet,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Lock,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button, LogoLoader, AILogoIcon } from '@workspace/ui';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function StandaloneCheckoutPage() {
  const params = useParams();
  const sessionId = (params?.sessionId as string) || '';

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);

  const fetchSessionAndWallet = async () => {
    try {
      const [sessionRes, walletRes] = await Promise.all([
        fetch(`/api/oauth/checkout/sessions/${sessionId}`),
        fetch('/api/oauth/wallet', { credentials: 'include' }),
      ]);

      const sessionData = await sessionRes.json();
      if (sessionData.success) {
        setSession(sessionData.data);
      } else {
        throw new Error(sessionData.error || 'Failed to load checkout details');
      }

      const walletData = await walletRes.json();
      if (walletData.success) {
        setWallet(walletData.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading payment session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndWallet();
  }, [sessionId]);

  const handlePay = async () => {
    setPaying(true);
    const toastId = toast.loading('Authorizing payment with 180 Profile...');

    try {
      const res = await fetch(`/api/oauth/checkout/sessions/${sessionId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Payment failed');
      }

      toast.success('Payment completed successfully!', { id: toastId });
      setCompleted(true);

      // Notify opener window if opened in a popup
      if (window.opener) {
        window.opener.postMessage(
          {
            type: '180_PAYMENT_SUCCESS',
            sessionId,
            transactionId: data.data.transactionId,
          },
          '*'
        );
      }

      // Auto redirect or close after 2 seconds
      setTimeout(() => {
        if (data.data.returnUrl) {
          window.location.href = data.data.returnUrl;
        } else if (window.opener) {
          window.close();
        }
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || 'Payment authorization failed', { id: toastId });
    } finally {
      setPaying(false);
    }
  };

  const handleInlineRecharge = async () => {
    if (!session) return;
    const deficit = Math.max(10, Math.ceil(session.amount - (wallet?.balance || 0)));

    setTopupLoading(true);
    const toastId = toast.loading('Initializing Razorpay top-up...');

    try {
      const res = await fetch('/api/oauth/wallet/topup/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: deficit, currency: 'INR' }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to initialize recharge');

      const { orderId, amountPaise, keyId } = data.data;

      const options = {
        key: keyId,
        amount: amountPaise,
        currency: 'INR',
        name: '180 Profile Instant Recharge',
        description: `Top-Up to complete purchase with ${session.app?.name}`,
        order_id: orderId,
        theme: { color: '#7c3aed' },
        handler: async function (response: any) {
          toast.loading('Crediting wallet balance...', { id: toastId });
          try {
            const verifyRes = await fetch('/api/oauth/wallet/topup/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                amount: deficit,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              toast.success(`Wallet topped up with ₹${deficit}!`, { id: toastId });
              fetchSessionAndWallet();
            }
          } catch (e: any) {
            toast.error(e.message || 'Verification failed', { id: toastId });
          } finally {
            setTopupLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            toast.dismiss(toastId);
            setTopupLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      toast.dismiss(toastId);
    } catch (err: any) {
      toast.error(err.message || 'Top-up failed', { id: toastId });
      setTopupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center space-y-4 max-w-lg mx-auto flex flex-col items-center justify-center border border-slate-200 shadow-xl">
        <LogoLoader size={40} className="w-10 h-10 text-purple-600" />
        <p className="text-xs text-slate-500 font-medium">Loading 180 Pay checkout...</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div 
        role="alert" 
        aria-live="assertive"
        className="bg-white rounded-3xl p-8 text-center space-y-5 border border-emerald-200 max-w-lg mx-auto shadow-xl animate-in zoom-in-95"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Payment Authorized!</h2>
          <p className="text-xs text-slate-600">
            ₹{session?.amount?.toFixed(2)} paid to <strong className="text-slate-900">{session?.app?.name}</strong>.
          </p>
        </div>
        <p className="text-[11px] text-slate-500">Redirecting back to application...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div 
        role="alert"
        aria-live="assertive"
        className="bg-white rounded-3xl p-8 text-center space-y-4 max-w-lg mx-auto border border-rose-200 shadow-xl"
      >
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Session Not Found or Expired</h2>
        <p className="text-xs text-slate-500">This checkout session is no longer active.</p>
      </div>
    );
  }

  const userBalance = wallet?.balance ?? 0;
  const hasEnoughBalance = userBalance >= session.amount;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-slate-200 max-w-lg mx-auto text-slate-900">
      {/* Vendor Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-[1px] shadow-sm shrink-0 overflow-hidden">
            <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center font-bold text-purple-700 text-xs">
              {session.app?.name ? session.app.name.slice(0, 2).toUpperCase() : 'APP'}
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 tracking-tight">
              {session.app?.name}
              {session.app?.isVerified && (
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              )}
            </h1>
            <span className="text-[11px] text-slate-500 font-medium">180 Verified Sovereign Vendor</span>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
          <AILogoIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          180 Pay
        </span>
      </div>

      {/* Item Summary */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">{session.title}</h2>
            {session.description && (
              <p className="text-xs text-slate-500 mt-0.5">{session.description}</p>
            )}
          </div>
          <div className="text-right">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              ₹{session.amount.toFixed(2)}
            </span>
            <div className="text-[10px] text-slate-400 uppercase font-mono">{session.currency}</div>
          </div>
        </div>
      </div>

      {/* User Wallet Balance Pill */}
      <div className="rounded-2xl p-4 border border-slate-200 bg-slate-50/60 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <Wallet className="w-3.5 h-3.5 text-purple-600" />
            Your 180 Profile Balance:
          </span>
          <span className="font-bold text-slate-900">₹{userBalance.toFixed(2)}</span>
        </div>

        {hasEnoughBalance ? (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 text-slate-600">
            <span>Balance after payment:</span>
            <span className="font-bold text-emerald-600">
              ₹{(userBalance - session.amount).toFixed(2)}
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-rose-600 flex items-center gap-1 pt-1 font-semibold">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Insufficient balance (₹{(session.amount - userBalance).toFixed(2)} needed)</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-2">
        {hasEnoughBalance ? (
          <Button
            onClick={handlePay}
            disabled={paying}
            className="w-full min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{paying ? 'Authorizing Payment...' : `Authorize & Pay ₹${session.amount.toFixed(2)}`}</span>
          </Button>
        ) : (
          <Button
            onClick={handleInlineRecharge}
            disabled={topupLoading}
            className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>{topupLoading ? 'Launching Razorpay...' : `Recharge & Pay via Razorpay`}</span>
          </Button>
        )}

        <button
          onClick={() => {
            if (session.cancelUrl) {
              window.location.href = session.cancelUrl;
            } else if (window.opener) {
              window.close();
            }
          }}
          className="w-full py-2.5 min-h-[44px] rounded-xl text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Cancel and return to {session.app?.name || 'app'}
        </button>
      </div>
    </div>
  );
}
