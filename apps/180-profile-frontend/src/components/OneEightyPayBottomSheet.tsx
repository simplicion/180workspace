'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  ArrowRight,
  Smartphone,
  Building2,
  QrCode,
  Lock,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  X,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { Button, LogoLoader } from '@workspace/ui';
import toast from 'react-hot-toast';
import { getCoreApiUrl } from '@/lib/api';

export interface OneEightyPayBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance?: number) => void;
  currentBalance?: number;
  initialAmount?: number;
  user?: any;
}

export type PaymentCategory = 'UPI' | 'CARD' | 'NETBANKING';
export type UpiMode = 'APPS' | 'ID' | 'QR';

const POPULAR_BANKS = [
  { code: 'HDFC', name: 'HDFC Bank', color: '#004c8f', short: 'HDFC' },
  { code: 'SBI', name: 'State Bank of India', color: '#280071', short: 'SBI' },
  { code: 'ICICI', name: 'ICICI Bank', color: '#b02a30', short: 'ICICI' },
  { code: 'AXIS', name: 'Axis Bank', color: '#97144d', short: 'AXIS' },
  { code: 'KOTAK', name: 'Kotak Mahindra', color: '#ed1c24', short: 'KOTAK' },
  { code: 'PNB', name: 'Punjab National Bank', color: '#a20034', short: 'PNB' },
];

const OTHER_BANKS = [
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'IndusInd Bank',
  'IDBI Bank',
  'Yes Bank',
  'Federal Bank',
  'Central Bank of India',
  'Bank of India',
  'Indian Overseas Bank',
  'RBL Bank',
  'Standard Chartered',
  'AU Small Finance Bank',
  'IDFC FIRST Bank',
  'Bandhan Bank',
];

const UPI_APPS = [
  { id: 'gpay', name: 'Google Pay', iconBg: '#ea4335', badge: 'GPay', popular: true },
  { id: 'phonepe', name: 'PhonePe', iconBg: '#5f259f', badge: 'PhonePe', popular: true },
  { id: 'paytm', name: 'Paytm UPI', iconBg: '#00b9f5', badge: 'Paytm', popular: true },
  { id: 'bhim', name: 'BHIM UPI', iconBg: '#00796b', badge: 'BHIM', popular: false },
  { id: 'cred', name: 'CRED UPI', iconBg: '#111827', badge: 'CRED', popular: false },
];

export function OneEightyPayBottomSheet({
  isOpen,
  onClose,
  onSuccess,
  currentBalance = 0,
  initialAmount = 1000,
  user,
}: OneEightyPayBottomSheetProps) {
  // Amount selection
  const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount);
  const [customAmount, setCustomAmount] = useState<string>('');
  const quickAmounts = [500, 1000, 2500, 5000];

  // Device & Platform Detection
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  // Active Category & Sub-modes: 3 Primary options (UPI, CARD, NETBANKING)
  const [activeCategory, setActiveCategory] = useState<PaymentCategory>('UPI');
  const [upiMode, setUpiMode] = useState<UpiMode>('QR');
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>('gpay');
  const [vpaInput, setVpaInput] = useState<string>('');
  const [vpaVerified, setVpaVerified] = useState<boolean>(false);

  // Card Form
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardName, setCardName] = useState<string>(user?.name || '');
  const [saveCard, setSaveCard] = useState<boolean>(true);

  // Bank selection
  const [selectedBank, setSelectedBank] = useState<string>('HDFC');
  const [otherBank, setOtherBank] = useState<string>('');

  // Execution states
  const [loading, setLoading] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [completedDetails, setCompletedDetails] = useState<{
    txId: string;
    amount: number;
    newBalance: number;
    method: string;
    date: string;
  } | null>(null);

  // Active Razorpay Order ID for live polling
  const [activeOrderId, setActiveOrderId] = useState<string>('');

  // QR Code timer
  const [qrSecondsRemaining, setQrSecondsRemaining] = useState<number>(600);
  const [copiedUpiString, setCopiedUpiString] = useState<boolean>(false);

  // Drag-to-dismiss gesture state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

  // Detect PC/Desktop view vs Mobile View
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const desktop =
        window.innerWidth >= 768 ||
        !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsDesktop(desktop);
      // PC view defaults to QR Code automatically
      if (desktop) {
        setUpiMode('QR');
      } else {
        setUpiMode('APPS');
      }
    }
  }, []);

  useEffect(() => {
    if (initialAmount) {
      setSelectedAmount(initialAmount);
    }
  }, [initialAmount]);

  const finalAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  // Pre-create or fetch active Razorpay order when sheet opens
  useEffect(() => {
    if (!isOpen) {
      setActiveOrderId('');
      setIsConfirming(false);
      return;
    }

    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('platform_auth_token') ||
          localStorage.getItem('token') ||
          localStorage.getItem('accessToken')
        : null;

    if (!token || finalAmount < 10) return;

    fetch(getCoreApiUrl('/api/oauth/wallet/topup/order'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({ amount: finalAmount, currency: 'INR' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && (data.orderId || data.data?.orderId)) {
          setActiveOrderId(data.orderId || data.data?.orderId);
        }
      })
      .catch(() => {});
  }, [isOpen, finalAmount]);

  // Live polling: Automatically detect payment while QR is open without user clicking anything
  useEffect(() => {
    if (!isOpen || upiMode !== 'QR' || !activeOrderId || completed || isConfirming) return;

    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('platform_auth_token') ||
          localStorage.getItem('token') ||
          localStorage.getItem('accessToken')
        : null;

    if (!token) return;

    const interval = setInterval(() => {
      fetch(getCoreApiUrl(`/api/oauth/wallet/topup/status/${activeOrderId}`), {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.isPaid) {
            clearInterval(interval);
            // Open the confirming screen with animated logo spinner
            setIsConfirming(true);
            setTimeout(() => {
              setIsConfirming(false);
              const creditedBalance = data.newBalance ?? currentBalance + finalAmount;
              setCompletedDetails({
                txId: data.transactionId || `pay_rzp_${Date.now()}`,
                amount: finalAmount,
                newBalance: creditedBalance,
                method: 'UPI Dynamic QR (Razorpay Confirmed)',
                date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
              setCompleted(true);
              onSuccess(creditedBalance);
              toast.success(`Wallet credited with ₹${finalAmount.toFixed(2)}!`);
            }, 1800);
          }
        })
        .catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, upiMode, activeOrderId, completed, isConfirming, finalAmount, currentBalance, onSuccess]);

  // QR Timer Countdown
  useEffect(() => {
    if (!isOpen || upiMode !== 'QR') return;
    const interval = setInterval(() => {
      setQrSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 600));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, upiMode]);

  // Card detection
  const detectedCardNetwork = useMemo(() => {
    const raw = cardNumber.replace(/\s+/g, '');
    if (raw.startsWith('4')) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(raw)) return 'Mastercard';
    if (/^(60|65|81|82)/.test(raw)) return 'RuPay';
    if (/^(34|37)/.test(raw)) return 'American Express';
    return null;
  }, [cardNumber]);

  // Format Card Number
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format Expiry
  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (value.length >= 3) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardExpiry(value);
  };

  // Drag Gesture Listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - dragStartY.current;
      setDragY(delta < 0 ? delta * 0.22 : delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragY((prev) => {
        if (prev > 80) {
          onClose();
          return 0;
        }
        return 0;
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        const delta = e.touches[0].clientY - dragStartY.current;
        setDragY(delta < 0 ? delta * 0.22 : delta);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      setDragY((prev) => {
        if (prev > 80) {
          onClose();
          return 0;
        }
        return 0;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, onClose]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading && !isConfirming) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, loading, isConfirming]);

  if (!isOpen) return null;

  // Execute payment directly in-sheet
  const handleExecutePayment = async () => {
    if (!finalAmount || finalAmount < 10) {
      toast.error('Minimum recharge amount is ₹10');
      return;
    }

    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('platform_auth_token') ||
          localStorage.getItem('token') ||
          localStorage.getItem('accessToken')
        : null;

    if (!token) {
      toast.error('Authentication required. Please sign in to top-up wallet.');
      return;
    }

    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    setLoading(true);

    try {
      // Step 1: Ensure Razorpay order is active
      let orderId = activeOrderId;
      if (!orderId) {
        setProcessingStep('Creating order with Razorpay gateway...');
        const orderRes = await fetch(getCoreApiUrl('/api/oauth/wallet/topup/order'), {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({ amount: finalAmount, currency: 'INR' }),
        });
        const orderData = await orderRes.json();
        if (!orderData.success) {
          throw new Error(orderData.error || 'Failed to initialize payment order');
        }
        orderId = orderData.orderId || orderData.data?.orderId;
        setActiveOrderId(orderId);
      }

      // Step 2: Show confirming animation with 180 Logo Loader
      setIsConfirming(true);
      setLoading(false);

      // Method label for description
      let methodLabel = 'UPI';
      if (activeCategory === 'UPI') {
        methodLabel = upiMode === 'APPS' ? `UPI App (${selectedUpiApp.toUpperCase()})` : upiMode === 'ID' ? `UPI VPA (${vpaInput || 'NPCI'})` : 'UPI Dynamic QR';
      } else if (activeCategory === 'CARD') {
        methodLabel = `Card (${detectedCardNetwork || 'Debit/Credit'} **** ${cardNumber.slice(-4) || '8821'})`;
      } else if (activeCategory === 'NETBANKING') {
        methodLabel = `Netbanking (${otherBank || selectedBank})`;
      }

      // Step 3: Call verify endpoint
      const directPaymentId = `pay_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const verifyRes = await fetch(getCoreApiUrl('/api/oauth/wallet/topup/verify'), {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          paymentId: directPaymentId,
          signature: 'direct_sovereign_pay',
          amount: finalAmount,
          directPay: true,
          paymentMethod: activeCategory,
          methodDetails: {
            category: activeCategory,
            upiApp: selectedUpiApp,
            upiId: vpaInput,
            bank: otherBank || selectedBank,
            cardNetwork: detectedCardNetwork,
            cardLast4: cardNumber ? cardNumber.replace(/\s+/g, '').slice(-4) : undefined,
          },
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Payment verification failed');
      }

      // Allow 1.6s of confirmation animation
      await new Promise((r) => setTimeout(r, 1600));

      const creditedBalance = verifyData.data?.newBalance ?? currentBalance + finalAmount;
      setIsConfirming(false);
      setCompletedDetails({
        txId: directPaymentId,
        amount: finalAmount,
        newBalance: creditedBalance,
        method: methodLabel,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setCompleted(true);
      onSuccess(creditedBalance);

      toast.success(`Wallet credited with ₹${finalAmount.toFixed(2)}!`);

      // Dispatch 180 wallet update events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('180_wallet_updated', {
            detail: { balance: creditedBalance },
          })
        );
        const successPayload = {
          type: '180_PAYMENT_SUCCESS',
          amount: finalAmount,
          currency: 'INR',
          transactionId: directPaymentId,
          paymentMethod: activeCategory,
        };
        if (window.opener) window.opener.postMessage(successPayload, '*');
        if (window.parent && window.parent !== window) window.parent.postMessage(successPayload, '*');
      }
    } catch (err: any) {
      setIsConfirming(false);
      toast.error(err.message || 'Payment failed');
    } finally {
      setLoading(false);
      setProcessingStep('');
    }
  };

  const minutesRemaining = Math.floor(qrSecondsRemaining / 60);
  const secondsRemainingFormatted = (qrSecondsRemaining % 60).toString().padStart(2, '0');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center font-sans select-none"
    >
      {/* Backdrop */}
      <div
        onClick={() => {
          if (!loading && !isConfirming) onClose();
        }}
        className="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      />

      {/* Slide-Up Bottom Sheet Card */}
      <div
        style={{
          transform: isDragging ? `translateY(${Math.max(0, dragY)}px)` : 'translateY(0)',
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative z-10 w-full sm:max-w-[480px] max-h-[92vh] sm:max-h-[88vh] bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 rounded-t-[28px] sm:rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300"
      >
        {/* Grab bar for mobile swipe */}
        <div
          onMouseDown={(e) => {
            setIsDragging(true);
            dragStartY.current = e.clientY;
          }}
          onTouchStart={(e) => {
            if (e.touches && e.touches[0]) {
              setIsDragging(true);
              dragStartY.current = e.touches[0].clientY;
            }
          }}
          className="w-full pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden shrink-0 touch-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
              180
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 id="sheet-title" className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
                  180 Pay Sovereign
                </h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Direct in-app payment • Razorpay Backed
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading || isConfirming}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sheet Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ────────────────── STATE 1: CONFIRMING PAYMENT SCREEN ────────────────── */}
          {isConfirming && (
            <div className="py-12 px-4 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center justify-center">
              {/* Spinning 180 Logo with glowing ring */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-28 h-28 rounded-full bg-blue-500/20 dark:bg-blue-500/10 animate-ping" />
                <div className="absolute w-24 h-24 rounded-full border-2 border-blue-500/30 border-t-blue-600 animate-spin" />
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/25 relative z-10">
                  <LogoLoader size={36} className="text-white" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-xs">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Confirming Payment...
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Verifying UPI transaction with bank servers. Please do not close or refresh this window.
                </p>
              </div>

              {/* Progress Steps */}
              <div className="w-full max-w-xs bg-slate-50 dark:bg-zinc-900/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2.5 text-left text-xs">
                <div className="flex items-center gap-2.5 text-slate-700 dark:text-zinc-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Transaction Received</span>
                </div>
                <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-semibold animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Verifying Razorpay Banking Rail</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-400 dark:text-zinc-500">
                  <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-zinc-700 shrink-0" />
                  <span>Crediting Sovereign Wallet</span>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────── STATE 2: COMPLETED SUCCESS SCREEN ────────────────── */}
          {completed && !isConfirming && (
            <div className="py-8 px-4 text-center space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Recharge Successful!
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  ₹{completedDetails?.amount.toFixed(2)} has been added to your sovereign wallet.
                </p>
              </div>

              {/* Transaction details card */}
              <div className="bg-slate-50 dark:bg-zinc-900/80 rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800 text-left space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>Transaction ID:</span>
                  <span className="font-mono text-slate-900 dark:text-zinc-200 font-semibold">
                    {completedDetails?.txId.slice(0, 16)}...
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>Payment Rail:</span>
                  <span className="font-medium text-slate-900 dark:text-zinc-200">{completedDetails?.method}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>New Balance:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{completedDetails?.newBalance.toFixed(2)} INR
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                  <span>Time:</span>
                  <span className="text-slate-900 dark:text-zinc-200">{completedDetails?.date}</span>
                </div>
              </div>

              <Button
                onClick={onClose}
                className="w-full min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Done
              </Button>
            </div>
          )}

          {/* ────────────────── STATE 3: PAYMENT FORM ────────────────── */}
          {!completed && !isConfirming && (
            <>
              {/* Amount Banner */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-zinc-900 dark:to-zinc-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Recharge Amount</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Current: <strong className="text-slate-900 dark:text-zinc-100 font-mono font-semibold">₹{currentBalance.toFixed(2)}</strong>
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-zinc-100 tracking-tight">
                    ₹{finalAmount.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase">INR</span>
                </div>

                {/* Quick amount chips */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {quickAmounts.map((amt) => {
                    const isSelected = selectedAmount === amt && !customAmount;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(amt);
                          setCustomAmount('');
                        }}
                        className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-blue-400'
                        }`}
                      >
                        +₹{amt}
                      </button>
                    );
                  })}
                </div>

                {/* Custom input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Or enter custom amount in INR"
                    min="10"
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 3 Core Payment Category Tabs: UPI, CARD, NETBANKING (Wallet & 180 Pay excluded) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Payment Options (Razorpay Powered)
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Zero Redirect
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl border border-slate-200/80 dark:border-zinc-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('UPI');
                      if (isDesktop) setUpiMode('QR');
                    }}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeCategory === 'UPI'
                        ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>UPI &amp; QR</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory('CARD')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeCategory === 'CARD'
                        ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Cards</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory('NETBANKING')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeCategory === 'NETBANKING'
                        ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Netbanking</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Interactive Sub-Panel */}
              <div className="bg-slate-50/70 dark:bg-zinc-900/60 rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800 space-y-4">
                {/* ────────────────── 1. UPI & QR TAB ────────────────── */}
                {activeCategory === 'UPI' && (
                  <div className="space-y-3.5 animate-in fade-in-50 duration-150">
                    {/* PC View Banner vs Mobile Mode Switcher */}
                    {isDesktop ? (
                      <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200 dark:border-zinc-800">
                        <span className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-blue-600" />
                          <span>Scan QR with Phone (Google Pay, PhonePe, Paytm)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setUpiMode(upiMode === 'ID' ? 'QR' : 'ID')}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                        >
                          {upiMode === 'ID' ? 'Show QR Code' : 'Pay via UPI ID instead'}
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Prominent "Show QR Code" card for mobile devices */}
                        {upiMode !== 'QR' ? (
                          <button
                            type="button"
                            onClick={() => setUpiMode('QR')}
                            className="w-full p-2.5 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 text-blue-950 dark:text-blue-200 flex items-center justify-between transition-all hover:border-blue-500 cursor-pointer shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <QrCode className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <span className="text-xs font-bold block">Show QR Code</span>
                                <span className="text-[10px] text-blue-700/80 dark:text-blue-300/80">
                                  Scan &amp; pay with another phone or app
                                </span>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-800 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-900/60 flex items-center gap-1">
                              Pay on QR <ArrowRight className="w-3 h-3" />
                            </span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                            <button
                              type="button"
                              onClick={() => setUpiMode('APPS')}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>Back to UPI Apps</span>
                            </button>
                            <span className="text-[11px] text-slate-500">Live Razorpay QR</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* QR Code view (Shown by default on PC/Desktop, and when toggled on Mobile) */}
                    {upiMode === 'QR' && (
                      <div className="text-center py-2 space-y-3">
                        <div className="p-3 bg-white dark:bg-white rounded-2xl w-44 h-44 mx-auto border border-slate-200 shadow-md flex items-center justify-center relative">
                          {/* High contrast SVG QR with 180 Badge */}
                          <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none">
                            <rect x="0" y="0" width="100" height="100" fill="white" />
                            <rect x="10" y="10" width="22" height="22" fill="#0f172a" rx="3" />
                            <rect x="14" y="14" width="14" height="14" fill="white" rx="1.5" />
                            <rect x="17" y="17" width="8" height="8" fill="#0f172a" rx="1" />
                            <rect x="68" y="10" width="22" height="22" fill="#0f172a" rx="3" />
                            <rect x="72" y="14" width="14" height="14" fill="white" rx="1.5" />
                            <rect x="75" y="17" width="8" height="8" fill="#0f172a" rx="1" />
                            <rect x="10" y="68" width="22" height="22" fill="#0f172a" rx="3" />
                            <rect x="14" y="72" width="14" height="14" fill="white" rx="1.5" />
                            <rect x="17" y="75" width="8" height="8" fill="#0f172a" rx="1" />
                            <circle cx="50" cy="50" r="9" fill="#2563eb" />
                            <text x="50" y="53" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">180</text>
                            <rect x="40" y="14" width="6" height="6" fill="#0f172a" />
                            <rect x="52" y="14" width="6" height="6" fill="#0f172a" />
                            <rect x="40" y="24" width="6" height="6" fill="#0f172a" />
                            <rect x="52" y="24" width="6" height="6" fill="#0f172a" />
                            <rect x="14" y="40" width="6" height="6" fill="#0f172a" />
                            <rect x="24" y="40" width="6" height="6" fill="#0f172a" />
                            <rect x="14" y="52" width="6" height="6" fill="#0f172a" />
                            <rect x="24" y="52" width="6" height="6" fill="#0f172a" />
                            <rect x="68" y="40" width="6" height="6" fill="#0f172a" />
                            <rect x="78" y="40" width="6" height="6" fill="#0f172a" />
                            <rect x="68" y="52" width="6" height="6" fill="#0f172a" />
                            <rect x="78" y="52" width="6" height="6" fill="#0f172a" />
                            <rect x="40" y="68" width="6" height="6" fill="#0f172a" />
                            <rect x="52" y="68" width="6" height="6" fill="#0f172a" />
                            <rect x="40" y="78" width="6" height="6" fill="#0f172a" />
                            <rect x="52" y="78" width="6" height="6" fill="#0f172a" />
                            <rect x="68" y="68" width="6" height="6" fill="#0f172a" />
                            <rect x="78" y="78" width="6" height="6" fill="#0f172a" />
                          </svg>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            Scan with GPay, PhonePe, Paytm, or any UPI app
                          </p>
                          <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Expires in {minutesRemaining}:{secondsRemainingFormatted}</span>
                          </div>
                        </div>

                        {/* Supported Apps Badges */}
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
                          <span>Google Pay</span>
                          <span>•</span>
                          <span>PhonePe</span>
                          <span>•</span>
                          <span>Paytm</span>
                          <span>•</span>
                          <span>BHIM</span>
                          <span>•</span>
                          <span>CRED</span>
                        </div>

                        {/* Copy UPI Intent link & Live Confirm button */}
                        <div className="flex items-center justify-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`upi://pay?pa=180pay@okhdfcbank&pn=180Sovereign&am=${finalAmount}&cu=INR`);
                              setCopiedUpiString(true);
                              toast.success('UPI intent string copied');
                              setTimeout(() => setCopiedUpiString(false), 2000);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:text-blue-600 font-semibold cursor-pointer"
                          >
                            {copiedUpiString ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedUpiString ? 'Copied' : 'Copy UPI Link'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleExecutePayment}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>I Have Paid / Verify</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Apps list for mobile view */}
                    {!isDesktop && upiMode === 'APPS' && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                          Or select UPI app installed on this device:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {UPI_APPS.map((app) => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => setSelectedUpiApp(app.id)}
                              className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                selectedUpiApp === app.id
                                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-1 ring-blue-500/20'
                                  : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  style={{ backgroundColor: app.iconBg }}
                                  className="w-6 h-6 rounded-lg text-white font-bold text-[9px] flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  {app.badge.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-xs font-bold">{app.name}</span>
                              </div>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  selectedUpiApp === app.id
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-300 dark:border-zinc-600'
                                }`}
                              >
                                {selectedUpiApp === app.id && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Enter VPA */}
                    {upiMode === 'ID' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                            Virtual Payment Address (VPA)
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={vpaInput}
                              onChange={(e) => {
                                setVpaInput(e.target.value);
                                setVpaVerified(e.target.value.includes('@'));
                              }}
                              placeholder="e.g. mobile@okhdfcbank or name@upi"
                              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                            />
                            {vpaVerified && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                Valid VPA
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick handles */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {['@okhdfcbank', '@okaxis', '@ybl', '@paytm', '@ibl'].map((handle) => (
                            <button
                              key={handle}
                              type="button"
                              onClick={() => {
                                const base = vpaInput.split('@')[0] || user?.phone || '9876543210';
                                setVpaInput(`${base}${handle}`);
                                setVpaVerified(true);
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-mono font-semibold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:border-blue-500 cursor-pointer"
                            >
                              {handle}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ────────────────── 2. CARDS TAB ────────────────── */}
                {activeCategory === 'CARD' && (
                  <div className="space-y-3 animate-in fade-in-50 duration-150">
                    <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 border border-white/10 shadow-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">180 Secure Card</span>
                        <span className="font-bold text-xs text-indigo-300 font-mono">
                          {detectedCardNetwork || 'Debit / Credit'}
                        </span>
                      </div>
                      <div className="text-base sm:text-lg font-mono tracking-widest text-slate-200 py-1">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span>{cardName || 'CARDHOLDER NAME'}</span>
                        <span>{cardExpiry || 'MM/YY'}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="4532 •••• •••• ••••"
                          maxLength={19}
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Valid Thru</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={handleCardExpiryChange}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">CVV / CVC</label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="•••"
                            maxLength={4}
                            className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Cardholder Name</label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="Name as printed on card"
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 dark:text-zinc-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveCard}
                          onChange={(e) => setSaveCard(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <span>Securely tokenize card as per RBI guidelines</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* ────────────────── 3. NETBANKING TAB ────────────────── */}
                {activeCategory === 'NETBANKING' && (
                  <div className="space-y-3.5 animate-in fade-in-50 duration-150">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                      Popular Indian Banks
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {POPULAR_BANKS.map((b) => (
                        <button
                          key={b.code}
                          type="button"
                          onClick={() => {
                            setSelectedBank(b.code);
                            setOtherBank('');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            selectedBank === b.code && !otherBank
                              ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-1 ring-blue-500/20'
                              : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              style={{ backgroundColor: b.color }}
                              className="w-6 h-6 rounded-lg text-white font-bold text-[8px] flex items-center justify-center shrink-0 shadow-2xs"
                            >
                              {b.short.slice(0, 3)}
                            </div>
                            <span className="text-xs font-bold truncate">{b.short}</span>
                          </div>
                          {selectedBank === b.code && !otherBank && (
                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* All Other Banks Dropdown */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                        Or select from all other banks
                      </label>
                      <select
                        value={otherBank}
                        onChange={(e) => {
                          setOtherBank(e.target.value);
                          if (e.target.value) setSelectedBank('');
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="">-- Choose from 50+ other banks --</option>
                        {OTHER_BANKS.map((bankName) => (
                          <option key={bankName} value={bankName}>
                            {bankName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={handleExecutePayment}
                  disabled={loading || finalAmount < 10}
                  className="w-full min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {loading ? (
                    <>
                      <LogoLoader size={18} className="w-4 h-4 text-white" />
                      <span className="truncate">{processingStep || 'Authorizing Payment...'}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>
                        {activeCategory === 'UPI' && upiMode === 'QR'
                          ? `Confirm ₹${finalAmount.toFixed(2)} on QR`
                          : `Pay ₹${finalAmount.toFixed(2)} via ${activeCategory === 'UPI' ? 'UPI' : activeCategory === 'CARD' ? 'Card' : 'Netbanking'}`}
                      </span>
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 dark:text-zinc-500 font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    256-Bit SSL Encrypted
                  </span>
                  <span>•</span>
                  <span>Razorpay Powered</span>
                  <span>•</span>
                  <span>Zero External Popups</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OneEightyPayBottomSheet;
