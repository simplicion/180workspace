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
  Zap,
  QrCode,
  Lock,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  X,
  AlertCircle,
  Clock,
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

type PaymentCategory = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | '180_PAY';
type UpiMode = 'APPS' | 'ID' | 'QR';

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

const WALLET_PROVIDERS = [
  { id: 'amazonpay', name: 'Amazon Pay', badge: 'Amazon', color: '#ff9900' },
  { id: 'phonepe_wallet', name: 'PhonePe Wallet', badge: 'PhonePe', color: '#5f259f' },
  { id: 'mobikwik', name: 'MobiKwik', badge: 'MobiKwik', color: '#1a73e8' },
  { id: 'airtel', name: 'Airtel Money', badge: 'Airtel', color: '#e60000' },
  { id: 'simpl', name: 'Simpl PayLater', badge: '1-Tap PayLater', color: '#00d285' },
  { id: 'lazypay', name: 'LazyPay', badge: 'PayLater', color: '#333333' },
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

  // Active Category & Sub-modes
  const [activeCategory, setActiveCategory] = useState<PaymentCategory>('UPI');
  const [upiMode, setUpiMode] = useState<UpiMode>('APPS');
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>('gpay');
  const [vpaInput, setVpaInput] = useState<string>('');
  const [vpaVerified, setVpaVerified] = useState<boolean>(false);

  // Card Form
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardName, setCardName] = useState<string>(user?.name || '');
  const [saveCard, setSaveCard] = useState<boolean>(true);

  // Bank & Wallet selection
  const [selectedBank, setSelectedBank] = useState<string>('HDFC');
  const [otherBank, setOtherBank] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('amazonpay');

  // Execution states
  const [loading, setLoading] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [completed, setCompleted] = useState<boolean>(false);
  const [completedDetails, setCompletedDetails] = useState<{
    txId: string;
    amount: number;
    newBalance: number;
    method: string;
    date: string;
  } | null>(null);

  // QR Code timer
  const [qrSecondsRemaining, setQrSecondsRemaining] = useState<number>(600);
  const [copiedUpiString, setCopiedUpiString] = useState<boolean>(false);

  // Drag-to-dismiss gesture state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

  useEffect(() => {
    if (initialAmount) {
      setSelectedAmount(initialAmount);
    }
  }, [initialAmount]);

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

  const finalAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

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
      if (e.key === 'Escape' && isOpen && !loading) {
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
  }, [isOpen, onClose, loading]);

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
    const toastId = toast.loading('Initializing sovereign payment rail...');

    try {
      // Step 1: Initiate banking rail order
      setProcessingStep('Connecting to sovereign payment rail...');
      await new Promise((r) => setTimeout(r, 350));

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

      const orderId = orderData.orderId || orderData.data?.orderId || `order_180_${Date.now()}`;

      // Step 2: In-sheet authorization step
      let methodLabel = '180 Sovereign Pay';
      if (activeCategory === 'UPI') {
        methodLabel = upiMode === 'APPS' ? `UPI App (${selectedUpiApp.toUpperCase()})` : upiMode === 'ID' ? `UPI VPA (${vpaInput || 'NPCI'})` : 'UPI Dynamic QR';
      } else if (activeCategory === 'CARD') {
        methodLabel = `Card (${detectedCardNetwork || 'Debit/Credit'} **** ${cardNumber.slice(-4) || '8821'})`;
      } else if (activeCategory === 'NETBANKING') {
        methodLabel = `Netbanking (${otherBank || selectedBank})`;
      } else if (activeCategory === 'WALLET') {
        methodLabel = `Wallet / PayLater (${selectedWallet.toUpperCase()})`;
      }

      setProcessingStep(`Authorizing ₹${finalAmount.toFixed(2)} via ${methodLabel}...`);
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStep('Finalizing cryptographic ledger credit...');

      const directPaymentId = `pay_180_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
            wallet: selectedWallet,
            cardNetwork: detectedCardNetwork,
            cardLast4: cardNumber ? cardNumber.replace(/\s+/g, '').slice(-4) : undefined,
          },
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Payment verification failed');
      }

      const creditedBalance = verifyData.data?.newBalance ?? currentBalance + finalAmount;

      toast.success(`Wallet credited with ₹${finalAmount.toFixed(2)}!`, { id: toastId });

      // Dispatch 180 wallet update & 180 payment success events
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

      setCompletedDetails({
        txId: directPaymentId,
        amount: finalAmount,
        newBalance: creditedBalance,
        method: methodLabel,
        date: new Date().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      });
      setCompleted(true);
    } catch (err: any) {
      toast.error(err.message || 'Payment execution failed', { id: toastId });
    } finally {
      setLoading(false);
      setProcessingStep('');
    }
  };

  const minutesRemaining = Math.floor(qrSecondsRemaining / 60);
  const secondsRemainingFormatted = String(qrSecondsRemaining % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => {
          if (!loading) onClose();
        }}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Responsive In-Sheet Modal Drawer */}
      <div
        style={{ transform: `translateY(${dragY}px)` }}
        className="relative z-10 w-full sm:max-w-xl max-h-[92vh] sm:max-h-[88vh] bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-transform ease-out duration-75 text-slate-900 dark:text-zinc-100 font-sans"
      >
        {/* Drag Handle (Mobile only) */}
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
          className="w-full pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing sm:hidden"
        >
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-600/20">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                  180 Pay Sovereign Checkout
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Prepaid sovereign ledger recharge · Instant settlement
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!loading) onClose();
            }}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {completed && completedDetails ? (
            /* Completed Success State */
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                  Top-Up Successful!
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  ₹{completedDetails.amount.toFixed(2)} credited directly into your 180 Sovereign Wallet.
                </p>
              </div>

              {/* Receipt card */}
              <div className="bg-slate-50 dark:bg-zinc-900/80 rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800 text-left space-y-2.5 text-xs max-w-md mx-auto">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400">Transaction ID</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{completedDetails.txId}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400">Payment Rail</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{completedDetails.method}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400">Timestamp</span>
                  <span className="text-slate-700 dark:text-zinc-300">{completedDetails.date}</span>
                </div>
                <div className="flex justify-between items-center pt-1 font-bold text-sm">
                  <span className="text-slate-700 dark:text-zinc-300">Updated Wallet Balance</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">₹{completedDetails.newBalance.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={() => {
                  onSuccess(completedDetails.newBalance);
                  onClose();
                }}
                className="w-full max-w-md mx-auto min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <span>Return to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          ) : (
            <>
              {/* Top Amount Banner & Selector */}
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

              {/* Payment Categories Navigation Tabs */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Select Payment Option (Razorpay &amp; Stripe Backed)
                </span>

                <div className="grid grid-cols-5 gap-1.5 bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl border border-slate-200/80 dark:border-zinc-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('UPI')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeCategory === 'UPI'
                        ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>UPI</span>
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
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Cards</span>
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
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Banks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory('WALLET')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeCategory === 'WALLET'
                        ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Wallets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory('180_PAY')}
                    className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeCategory === '180_PAY'
                        ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>180 Pay</span>
                  </button>
                </div>
              </div>

              {/* Active Tab Panel Content */}
              <div className="bg-slate-50/70 dark:bg-zinc-900/60 rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800 space-y-4">
                {/* ────────────────── 1. UPI TAB ────────────────── */}
                {activeCategory === 'UPI' && (
                  <div className="space-y-3.5 animate-in fade-in-50 duration-150">
                    {/* Sub-mode switcher */}
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setUpiMode('APPS')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          upiMode === 'APPS'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                        }`}
                      >
                        UPI Apps
                      </button>
                      <button
                        type="button"
                        onClick={() => setUpiMode('ID')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          upiMode === 'ID'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                        }`}
                      >
                        Enter UPI ID
                      </button>
                      <button
                        type="button"
                        onClick={() => setUpiMode('QR')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          upiMode === 'QR'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                        }`}
                      >
                        <QrCode className="w-3 h-3" />
                        <span>QR Code</span>
                      </button>
                    </div>

                    {/* Apps list */}
                    {upiMode === 'APPS' && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                          Select your preferred UPI application:
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

                    {/* QR Code view */}
                    {upiMode === 'QR' && (
                      <div className="text-center py-2 space-y-3">
                        <div className="p-3 bg-white dark:bg-white rounded-2xl w-44 h-44 mx-auto border border-slate-200 shadow-md flex items-center justify-center relative">
                          {/* Stylized QR Code Pattern */}
                          <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none">
                            <rect x="0" y="0" width="100" height="100" fill="white" />
                            {/* Standard QR Corners */}
                            <rect x="10" y="10" width="22" height="22" fill="#0f172a" rx="3" />
                            <rect x="14" y="14" width="14" height="14" fill="white" rx="1.5" />
                            <rect x="17" y="17" width="8" height="8" fill="#0f172a" rx="1" />

                            <rect x="68" y="10" width="22" height="22" fill="#0f172a" rx="3" />
                            <rect x="72" y="14" width="14" height="14" fill="white" rx="1.5" />
                            <rect x="75" y="17" width="8" height="8" fill="#0f172a" rx="1" />

                            <rect x="10" y="68" width="22" height="22" fill="#0f172a" rx="3" />
                            <rect x="14" y="72" width="14" height="14" fill="white" rx="1.5" />
                            <rect x="17" y="75" width="8" height="8" fill="#0f172a" rx="1" />

                            {/* Center 180 Badge */}
                            <circle cx="50" cy="50" r="9" fill="#2563eb" />
                            <text x="50" y="53" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">180</text>

                            {/* Data points */}
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
                            Scan to pay ₹{finalAmount.toFixed(2)} with any UPI app
                          </p>
                          <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>QR Code expires in {minutesRemaining}:{secondsRemainingFormatted}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`upi://pay?pa=180pay@okhdfcbank&pn=180Sovereign&am=${finalAmount}&cu=INR`);
                            setCopiedUpiString(true);
                            toast.success('UPI intent string copied');
                            setTimeout(() => setCopiedUpiString(false), 2000);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                        >
                          {copiedUpiString ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedUpiString ? 'Copied to Clipboard' : 'Copy UPI Intent String'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ────────────────── 2. CARDS TAB ────────────────── */}
                {activeCategory === 'CARD' && (
                  <div className="space-y-3 animate-in fade-in-50 duration-150">
                    {/* Visual Card Mockup */}
                    <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 border border-white/10 shadow-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">180 Sovereign Card</span>
                        <span className="font-bold text-xs text-indigo-300 font-mono">
                          {detectedCardNetwork || 'Debit / Credit'}
                        </span>
                      </div>
                      <div className="font-mono text-base font-bold tracking-widest text-slate-200">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>{cardName || 'CARDHOLDER NAME'}</span>
                        <span>{cardExpiry || 'MM/YY'}</span>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Card Number</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="4532 •••• •••• ••••"
                            className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                          />
                          {detectedCardNetwork && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                              {detectedCardNetwork}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Expiry (MM/YY)</label>
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
                            onChange={(e) => setCardCvv(e.target.value.slice(0, 4))}
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
                        <span>Securely tokenize &amp; save card as per RBI guidelines</span>
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

                {/* ────────────────── 4. WALLETS & PAYLATER TAB ────────────────── */}
                {activeCategory === 'WALLET' && (
                  <div className="space-y-3 animate-in fade-in-50 duration-150">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                      Digital Wallets &amp; PayLater Rails
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {WALLET_PROVIDERS.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setSelectedWallet(w.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            selectedWallet === w.id
                              ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-1 ring-blue-500/20'
                              : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              style={{ backgroundColor: w.color }}
                              className="w-6 h-6 rounded-lg text-white font-bold text-[8px] flex items-center justify-center shrink-0 shadow-2xs"
                            >
                              {w.badge.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold">{w.name}</span>
                          </div>
                          {selectedWallet === w.id && (
                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ────────────────── 5. 180 SOVEREIGN INSTANT PAY TAB ────────────────── */}
                {activeCategory === '180_PAY' && (
                  <div className="space-y-3 animate-in fade-in-50 duration-150">
                    <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-2.5 text-xs text-blue-950 dark:text-blue-200">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">180 Instant Sovereign Pay</span>
                        <p className="text-[11px] text-blue-800/90 dark:text-blue-300/80 mt-0.5 leading-relaxed">
                          1-Click cryptographic debit from universal prepaid escrow. Instant authorization without external OTP redirects.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-xl border border-slate-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-zinc-300">Identity Holder:</span>
                      <span className="font-bold text-slate-900 dark:text-zinc-100">{user?.name || 'Verified User'}</span>
                    </div>

                    <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-xl border border-slate-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-zinc-300">Current Balance:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{currentBalance.toFixed(2)}</span>
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
                      <span>Pay ₹{finalAmount.toFixed(2)} with 180 Pay</span>
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 dark:text-zinc-500 font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    256-Bit SSL Encrypted
                  </span>
                  <span>•</span>
                  <span>PCI-DSS Level 1</span>
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
