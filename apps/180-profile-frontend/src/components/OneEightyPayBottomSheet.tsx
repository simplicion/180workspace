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
  Search,
} from 'lucide-react';
import { Button, LogoLoader } from '@workspace/ui';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
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
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });

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

  // Dynamic Gateway Methods (Live from Razorpay / Stripe)
  const [gatewayMethods, setGatewayMethods] = useState<{
    gateway: string;
    isIndia: boolean;
    defaultMethod: 'UPI' | 'CARD' | 'NETBANKING';
    priorityOrder: PaymentCategory[];
    supportsUpi: boolean;
    supportsCard: boolean;
    supportsNetbanking: boolean;
    cardNetworks: string[];
    banks: Array<{ code: string; name: string; short: string; popular: boolean }>;
    popularBanks: Array<{ code: string; name: string; short: string; popular: boolean }>;
  } | null>(null);

  // Bank selection & Dedicated Search Screen
  const [selectedBank, setSelectedBank] = useState<string>('HDFC');
  const [isBankSearchOpen, setIsBankSearchOpen] = useState<boolean>(false);
  const [bankSearchQuery, setBankSearchQuery] = useState<string>('');

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
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const desktop = !isMobile;
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

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const upiIntentString = useMemo(() => {
    const pa = '180pay@okhdfcbank';
    const pn = encodeURIComponent('180 Sovereign Wallet Topup');
    const am = Number(finalAmount || 0).toFixed(2);
    const cu = 'INR';
    const tr = activeOrderId || `topup_${Date.now()}`;
    const tn = encodeURIComponent(`Top-up Wallet ₹${am}`);
    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tr=${tr}&tn=${tn}`;
  }, [finalAmount, activeOrderId]);

  useEffect(() => {
    if (!isOpen || !upiIntentString) return;
    QRCode.toDataURL(upiIntentString, {
      width: 256,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [isOpen, upiIntentString]);
  useEffect(() => {
    if (!isOpen) return;

    fetch(getCoreApiUrl('/api/v1/checkout/methods?currency=INR&country=IN'))
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setGatewayMethods(res.data);
          if (res.data.priorityOrder && res.data.priorityOrder.length > 0) {
            setActiveCategory((prev) =>
              res.data.priorityOrder.includes(prev) ? prev : (res.data.defaultMethod || res.data.priorityOrder[0])
            );
          }
          if (res.data.banks && res.data.banks.length > 0) {
            const firstBank = res.data.popularBanks?.[0]?.code || res.data.banks[0].code;
            setSelectedBank((prev) => prev || firstBank);
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const allBanks = useMemo(() => gatewayMethods?.banks || [], [gatewayMethods]);
  const popularBanksList = useMemo(() => {
    if (gatewayMethods?.popularBanks && gatewayMethods.popularBanks.length > 0) {
      return gatewayMethods.popularBanks.slice(0, 6);
    }
    return allBanks.slice(0, 6);
  }, [gatewayMethods, allBanks]);

  const filteredBanks = useMemo(() => {
    if (!bankSearchQuery.trim()) return allBanks;
    const q = bankSearchQuery.toLowerCase();
    return allBanks.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.short && b.short.toLowerCase().includes(q))
    );
  }, [allBanks, bankSearchQuery]);

  const selectedBankObj = useMemo(() => {
    return allBanks.find((b) => b.code === selectedBank);
  }, [allBanks, selectedBank]);

  const getBankColor = (code: string) => {
    const colors = ['#004c8f', '#280071', '#b02a30', '#97144d', '#ed1c24', '#a20034', '#0d5c3a', '#007079', '#d97706', '#4338ca'];
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const availableCategories: PaymentCategory[] = useMemo(() => {
    if (gatewayMethods?.priorityOrder && gatewayMethods.priorityOrder.length > 0) {
      return gatewayMethods.priorityOrder.filter((cat) => {
        if (cat === 'UPI') return gatewayMethods.supportsUpi;
        if (cat === 'CARD') return gatewayMethods.supportsCard;
        if (cat === 'NETBANKING') return gatewayMethods.supportsNetbanking;
        return true;
      });
    }
    return ['UPI', 'CARD', 'NETBANKING'];
  }, [gatewayMethods]);

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

  // Live polling: Automatically detect real payment while in confirming state or while QR is open
  useEffect(() => {
    if (!isOpen || !activeOrderId || completed) return;
    const shouldPoll = isConfirming || (activeCategory === 'UPI' && upiMode === 'QR');
    if (!shouldPoll) return;

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
            setIsConfirming(false);
            const creditedBalance = data.newBalance ?? currentBalance + finalAmount;
            setCompletedDetails({
              txId: data.transactionId || activeOrderId,
              amount: finalAmount,
              newBalance: creditedBalance,
              method: 'UPI (Razorpay Confirmed)',
              date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
            setCompleted(true);
            onSuccess(creditedBalance);
            toast.success(`Wallet credited with ₹${finalAmount.toFixed(2)}!`);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('180_wallet_updated', {
                  detail: { balance: creditedBalance },
                })
              );
            }
          }
        })
        .catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, activeCategory, upiMode, activeOrderId, completed, isConfirming, finalAmount, currentBalance, onSuccess]);

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
      let orderKeyId = (gatewayMethods as any)?.keyId || '';
      let amountPaise = Math.round(finalAmount * 100);

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
      orderKeyId = orderData.keyId || orderData.data?.keyId || orderKeyId;
      amountPaise = orderData.amountPaise || orderData.data?.amountPaise || amountPaise;
      setActiveOrderId(orderId);

      // Directly use Razorpay Checkout for all methods including UPI

      // Case B: Card or Netbanking flow via Razorpay Checkout
      const loadRzp = (): Promise<boolean> => {
        return new Promise((resolve) => {
          if ((window as any).Razorpay) return resolve(true);
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.async = true;
          s.onload = () => resolve(true);
          s.onerror = () => resolve(false);
          document.body.appendChild(s);
        });
      };

      setProcessingStep('Opening secure payment gateway...');
      const rzpLoaded = await loadRzp();

      if (rzpLoaded && (window as any).Razorpay) {
        setLoading(false);
        setProcessingStep('');
        const options: any = {
          key: orderKeyId || (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_placeholder'),
          amount: amountPaise,
          currency: 'INR',
          name: '180 Sovereign Wallet',
          description: `Top-up Wallet ₹${finalAmount.toFixed(2)}`,
          order_id: orderId,
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || '',
            method: activeCategory === 'CARD' ? 'card' : activeCategory === 'NETBANKING' ? 'netbanking' : 'upi',
          },
          notes: {
            userId: user?.id,
            category: activeCategory,
          },
          theme: {
            color: '#2563eb',
          },
          handler: async (response: any) => {
            setIsConfirming(true);
            try {
              const verifyRes = await fetch(getCoreApiUrl('/api/oauth/wallet/topup/verify'), {
                method: 'POST',
                headers: authHeaders,
                credentials: 'include',
                body: JSON.stringify({
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  amount: finalAmount,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                const creditedBalance = verifyData.data?.newBalance ?? currentBalance + finalAmount;
                setIsConfirming(false);
                setCompletedDetails({
                  txId: response.razorpay_payment_id,
                  amount: finalAmount,
                  newBalance: creditedBalance,
                  method: activeCategory === 'CARD' ? 'Credit / Debit Card' : `Netbanking (${selectedBankObj?.name || selectedBank})`,
                  date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                });
                setCompleted(true);
                onSuccess(creditedBalance);
                toast.success(`Wallet credited with ₹${finalAmount.toFixed(2)}!`);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('180_wallet_updated', {
                      detail: { balance: creditedBalance },
                    })
                  );
                }
              } else {
                setIsConfirming(false);
                toast.error(verifyData.error || 'Payment verification failed');
              }
            } catch {
              setIsConfirming(false);
              toast.error('Network error during verification');
            }
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
              setIsConfirming(false);
            },
          },
        };

        const rzpInstance = new (window as any).Razorpay(options);
        rzpInstance.open();
        return;
      }

      // Fallback: Transition to confirming screen and poll
      setIsConfirming(true);
      setLoading(false);
      setProcessingStep('');
    } catch (err: any) {
      setIsConfirming(false);
      toast.error(err.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
      setProcessingStep('');
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!activeOrderId) return;
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('platform_auth_token') ||
          localStorage.getItem('token') ||
          localStorage.getItem('accessToken')
        : null;

    if (!token) return;

    const checkToast = toast.loading('Checking bank payment status with Razorpay...');
    try {
      const res = await fetch(getCoreApiUrl(`/api/oauth/wallet/topup/status/${activeOrderId}`), {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.isPaid) {
        toast.success('Payment verified successfully!', { id: checkToast });
        setIsConfirming(false);
        const creditedBalance = data.newBalance ?? currentBalance + finalAmount;
        setCompletedDetails({
          txId: data.transactionId || activeOrderId,
          amount: finalAmount,
          newBalance: creditedBalance,
          method: 'UPI (Razorpay Verified)',
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        setCompleted(true);
        onSuccess(creditedBalance);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('180_wallet_updated', {
              detail: { balance: creditedBalance },
            })
          );
        }
      } else {
        toast.error('Payment not detected yet. Please approve the payment in your UPI app and try again.', { id: checkToast });
      }
    } catch {
      toast.error('Unable to verify with banking rail. Please try again.', { id: checkToast });
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
            <div className="py-8 px-4 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center justify-center">
              {/* Spinning 180 Logo with glowing radar ring */}
              <div className="relative flex items-center justify-center py-2">
                <div className="absolute w-32 h-32 rounded-full bg-blue-500/15 dark:bg-blue-500/10 animate-ping" />
                <div className="absolute w-28 h-28 rounded-full border-2 border-dashed border-blue-400/40 animate-spin" />
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/25 relative z-10">
                  <LogoLoader size={38} className="text-white" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Waiting for UPI payment...
                </h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold">
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                  <span>Auto-confirming in real-time</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed pt-1">
                  Approve the transaction of <strong className="text-slate-800 dark:text-zinc-200">₹{finalAmount.toFixed(2)}</strong> on your UPI app (Google Pay, PhonePe, Paytm, or BHIM).
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  Do not close or refresh this sheet.
                </p>
              </div>

              {/* Progress Steps */}
              <div className="w-full max-w-sm bg-slate-50 dark:bg-zinc-900/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2.5 text-left text-xs">
                <div className="flex items-center justify-between text-slate-700 dark:text-zinc-300 font-semibold">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>UPI Transaction Initiated</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-600">DONE</span>
                </div>
                <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-semibold">
                  <div className="flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Verifying Razorpay Banking Rail</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold animate-pulse">CHECKING</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 dark:text-zinc-500">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-zinc-700 shrink-0" />
                    <span>Crediting Sovereign Wallet</span>
                  </div>
                  <span className="text-[10px] font-mono">PENDING</span>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full max-w-sm space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleCheckPaymentStatus}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/20 active:scale-[0.99]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>I Have Already Paid (Check Now)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Payment Method / Cancel</span>
                </button>
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

              {/* Dynamic Payment Category Tabs: UPI, CARD, NETBANKING based on Gateway priorityOrder & country */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Payment Options ({gatewayMethods?.gateway === 'STRIPE' ? 'Stripe Backed' : 'Razorpay Powered'})
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Zero Redirect
                  </span>
                </div>

                <div
                  className={`grid ${
                    availableCategories.length === 1
                      ? 'grid-cols-1'
                      : availableCategories.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                  } gap-1.5 bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl border border-slate-200/80 dark:border-zinc-800 text-[11px]`}
                >
                  {availableCategories.map((category) => {
                    const isActive = activeCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setActiveCategory(category);
                          if (category === 'UPI' && isDesktop) setUpiMode('QR');
                        }}
                        className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {category === 'UPI' && <QrCode className="w-3.5 h-3.5" />}
                          {category === 'CARD' && <CreditCard className="w-3.5 h-3.5" />}
                          {category === 'NETBANKING' && <Building2 className="w-3.5 h-3.5" />}
                          <span>
                            {category === 'UPI'
                              ? 'UPI & QR'
                              : category === 'CARD'
                              ? 'Cards'
                              : 'Netbanking'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
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

                    {/* QR Code view */}
                    {upiMode === 'QR' && (
                      <div className="text-center py-3 space-y-3.5 bg-gradient-to-b from-blue-50/50 to-slate-50/50 dark:from-blue-950/20 dark:to-zinc-900/40 p-4 rounded-2xl border border-blue-100/80 dark:border-blue-900/30">
                        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/25">
                          <QrCode className="w-8 h-8" />
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            Official Razorpay Dynamic UPI QR
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto">
                            Scannable by PhonePe, Google Pay, Paytm, BHIM & CRED via official NPCI banking rail.
                          </p>
                        </div>

                        {/* Supported Apps Badges */}
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400 font-semibold">
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

                        <button
                          type="button"
                          onClick={handleExecutePayment}
                          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/20 active:scale-[0.99]"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>Display Scannable UPI QR (₹{finalAmount.toFixed(2)})</span>
                        </button>

                        <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Zero-Redirect • 100% NPCI & RBI Regulated</span>
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
                  <>
                    {isBankSearchOpen ? (
                      /* Dedicated Search Screen */
                      <div className="space-y-3 animate-in fade-in-50 duration-150">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => {
                              setIsBankSearchOpen(false);
                              setBankSearchQuery('');
                            }}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 cursor-pointer hover:underline"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Back to Popular Banks</span>
                          </button>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {filteredBanks.length} Live Banks
                          </span>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            autoFocus
                            value={bankSearchQuery}
                            onChange={(e) => setBankSearchQuery(e.target.value)}
                            placeholder="Search bank name (e.g. HDFC, Axis, SBI, ICICI)..."
                            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                          />
                          {bankSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setBankSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Scrollable Live Banks List */}
                        <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-zinc-800/60">
                          {filteredBanks.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                              <Building2 className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-600" />
                              <p className="font-semibold">No banks matching "{bankSearchQuery}"</p>
                              <p className="text-[11px]">Check spelling or browse all {allBanks.length} banks from Razorpay</p>
                            </div>
                          ) : (
                            filteredBanks.map((b) => {
                              const isSelected = selectedBank === b.code;
                              const color = getBankColor(b.code);
                              return (
                                <button
                                  key={b.code}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBank(b.code);
                                    setIsBankSearchOpen(false);
                                    setBankSearchQuery('');
                                  }}
                                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-1 ring-blue-500/30'
                                      : 'hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-800 dark:text-zinc-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <div
                                      style={{ backgroundColor: color }}
                                      className="w-7 h-7 rounded-lg text-white font-extrabold text-[9px] flex items-center justify-center shrink-0 shadow-2xs uppercase"
                                    >
                                      {b.short?.slice(0, 3) || b.code.slice(0, 3)}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs font-semibold block truncate leading-tight">
                                        {b.name}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {b.code} {b.popular && '• Popular'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="shrink-0 flex items-center gap-1.5">
                                    {isSelected ? (
                                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-slate-400 hover:text-blue-600 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                                        Select
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Popular Banks view with Search Trigger */
                      <div className="space-y-3.5 animate-in fade-in-50 duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                            Popular Indian Banks
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Razorpay Live Netbanking
                          </span>
                        </div>

                        {/* Popular Bank Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {popularBanksList.map((b) => {
                            const isSelected = selectedBank === b.code;
                            const color = getBankColor(b.code);
                            return (
                              <button
                                key={b.code}
                                type="button"
                                onClick={() => setSelectedBank(b.code)}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-1 ring-blue-500/20'
                                    : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-1">
                                  <div
                                    style={{ backgroundColor: color }}
                                    className="w-6 h-6 rounded-lg text-white font-bold text-[8px] flex items-center justify-center shrink-0 shadow-2xs uppercase"
                                  >
                                    {b.short?.slice(0, 3) || b.code.slice(0, 3)}
                                  </div>
                                  <span className="text-xs font-bold truncate">
                                    {b.name.split('-')[0].replace('Bank', '').trim() || b.short}
                                  </span>
                                </div>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Dedicated Bank Search Screen Trigger Button */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setIsBankSearchOpen(true)}
                            className="w-full p-2.5 rounded-xl border border-dashed border-blue-300 dark:border-blue-800/80 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-900 dark:text-blue-300 flex items-center justify-between transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                              <span>
                                {selectedBankObj && !popularBanksList.some((p) => p.code === selectedBank)
                                  ? `Selected: ${selectedBankObj.name}`
                                  : `Search from all ${allBanks.length > 0 ? allBanks.length : '40+'} banks...`}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/50 flex items-center gap-1">
                              Search Banks <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
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
                          : `Pay ₹${finalAmount.toFixed(2)} via ${
                              activeCategory === 'UPI'
                                ? 'UPI'
                                : activeCategory === 'CARD'
                                ? 'Card'
                                : `Netbanking (${selectedBankObj?.short || selectedBank})`
                            }`}
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
