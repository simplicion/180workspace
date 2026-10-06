'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  Percent,
  Globe,
  X,
  Zap,
  Smartphone,
  Building2,
  QrCode,
  Clock,
  Search,
} from 'lucide-react';
import { Button, LogoLoader, AILogoIcon } from '@workspace/ui';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { getCoreApiUrl } from '@/lib/api';

const UPI_APPS = [
  { id: 'gpay', name: 'Google Pay', iconBg: '#ea4335', badge: 'GPay', popular: true },
  { id: 'phonepe', name: 'PhonePe', iconBg: '#5f259f', badge: 'PhonePe', popular: true },
  { id: 'paytm', name: 'Paytm UPI', iconBg: '#00b9f5', badge: 'Paytm', popular: true },
  { id: 'bhim', name: 'BHIM UPI', iconBg: '#00796b', badge: 'BHIM', popular: false },
  { id: 'cred', name: 'CRED UPI', iconBg: '#111827', badge: 'CRED', popular: false },
];

export function CheckoutClient({ initialSessionId }: { initialSessionId?: string } = {}) {
  const params = useParams();
  
  // Resilient sessionId extraction for static SSG exports (Cloudflare Pages rewrites)
  const getInitialSessionId = () => {
    if (initialSessionId && initialSessionId !== 'default') return initialSessionId;
    const pId = params?.sessionId as string;
    if (pId && pId !== 'default') return pId;
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/checkout\/([^\/\?#]+)/);
      if (match && match[1] && match[1] !== 'default') return match[1];
    }
    return pId || '';
  };

  const [sessionId, setSessionId] = useState<string>(getInitialSessionId);

  useEffect(() => {
    const currentId = getInitialSessionId();
    if (currentId && currentId !== sessionId) {
      setSessionId(currentId);
    }
  }, [params?.sessionId]);

  const clientSessionId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSid = urlParams.get('clientSessionId');
      if (urlSid) {
        sessionStorage.setItem('180_client_session_id', urlSid);
        return urlSid;
      }
      let storedSid = sessionStorage.getItem('180_client_session_id');
      if (!storedSid) {
        storedSid = 'sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
        sessionStorage.setItem('180_client_session_id', storedSid);
      }
      return storedSid;
    } catch (_) {
      return '';
    }
  }, []);

  useEffect(() => {
    if (!sessionId || sessionId === 'default') return;
    try {
      fetch(getCoreApiUrl(`/api/v1/checkout/sessions/${sessionId}/track-event`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'DRAWER_OPENED',
          clientSessionId: clientSessionId || undefined,
          language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
        }),
      }).catch(() => {});
    } catch (_) {}
  }, [sessionId, clientSessionId]);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [directPayStep, setDirectPayStep] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDetails, setCopiedDetails] = useState(false);
  const [showDevInspector, setShowDevInspector] = useState(false);

  // Device & Platform Detection
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });

  // Sub-states for UPI, Card, Netbanking
  const [upiMode, setUpiMode] = useState<'APPS' | 'ID' | 'QR'>('QR');
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>('gpay');
  const [vpaInput, setVpaInput] = useState<string>('');
  const [vpaVerified, setVpaVerified] = useState<boolean>(false);
  const [qrSecondsRemaining, setQrSecondsRemaining] = useState<number>(600);
  const [copiedUpiString, setCopiedUpiString] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Card Form
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');
  const [saveCard, setSaveCard] = useState<boolean>(true);

  // Dynamic Gateway Methods (Live from Razorpay / Stripe)
  const [gatewayMethods, setGatewayMethods] = useState<{
    gateway: string;
    isIndia: boolean;
    defaultMethod: 'UPI' | 'CARD' | 'NETBANKING';
    priorityOrder: ('UPI' | 'CARD' | 'NETBANKING')[];
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

  // Fetch live gateway payment methods from Razorpay / Stripe
  useEffect(() => {
    if (!sessionId || sessionId === 'default') return;

    const url = session?.id
      ? getCoreApiUrl(`/api/v1/checkout/sessions/${session.id}/methods`)
      : getCoreApiUrl(`/api/v1/checkout/methods?currency=${session?.currency || 'INR'}&country=IN`);

    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setGatewayMethods(res.data);
          if (res.data.priorityOrder && res.data.priorityOrder.length > 0) {
            setSelectedMethod((prev) =>
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
  }, [sessionId, session?.id, session?.currency]);

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

  const isINR = useMemo(() => {
    return (session?.currency || 'INR').toUpperCase() === 'INR';
  }, [session?.currency]);

  const currencySymbol = useMemo(() => {
    if (!session?.currency) return '₹';
    const c = session.currency.toUpperCase();
    if (c === 'USD') return '$';
    if (c === 'EUR') return '€';
    if (c === 'GBP') return '£';
    if (c === 'INR') return '₹';
    return session.currency;
  }, [session?.currency]);

  // Construct real UPI intent string for scannable QR code
  const upiIntentString = useMemo(() => {
    if (!session) return '';
    const pa = '180pay@okhdfcbank';
    const pn = encodeURIComponent(session.app?.name || '180 Sovereign Pay');
    const am = Number(session.amount || 0).toFixed(2);
    const cu = 'INR';
    const tr = session.id || sessionId || `tx_${Date.now()}`;
    const tn = encodeURIComponent(`Pay ${session.title || '180 Order'}`);
    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tr=${tr}&tn=${tn}`;
  }, [session, sessionId]);

  // Generate real mathematically valid QR code image
  useEffect(() => {
    if (!upiIntentString) return;
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
  }, [upiIntentString]);

  const availableCategories = useMemo(() => {
    if (gatewayMethods?.priorityOrder && gatewayMethods.priorityOrder.length > 0) {
      return gatewayMethods.priorityOrder.filter((cat) => {
        if (cat === 'UPI') return isINR && gatewayMethods.supportsUpi !== false;
        if (cat === 'CARD') return gatewayMethods.supportsCard;
        if (cat === 'NETBANKING') return gatewayMethods.supportsNetbanking;
        return true;
      });
    }
    return isINR
      ? (['UPI', 'CARD', 'NETBANKING'] as ('UPI' | 'CARD' | 'NETBANKING')[])
      : (['CARD', 'NETBANKING'] as ('UPI' | 'CARD' | 'NETBANKING')[]);
  }, [gatewayMethods, isINR]);

  // Detect PC/Desktop view vs Mobile View
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const desktop = !isMobile;
      setIsDesktop(desktop);
      // PC view defaults to QR Code automatically and hides mobile UPI Apps
      if (desktop) {
        setUpiMode('QR');
      } else {
        setUpiMode('APPS');
      }
    }
  }, []);

  // Update selectedMethod based on currency and methods
  useEffect(() => {
    if (session) {
      if (!isINR) {
        setSelectedMethod('CARD');
      } else if (gatewayMethods?.defaultMethod && isINR) {
        setSelectedMethod(gatewayMethods.defaultMethod);
      }
    }
  }, [isINR, session, gatewayMethods]);

  // Live polling: Automatically detect payment completion via Razorpay rail
  useEffect(() => {
    if (!sessionId || sessionId === 'default' || completed) return;
    const shouldPoll = isConfirming || (selectedMethod === 'UPI' && upiMode === 'QR');
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      fetch(getCoreApiUrl(`/api/v1/checkout/sessions/${sessionId}`))
        .then((r) => r.json())
        .then((data) => {
          const sess = data.data || data.session || data;
          if (sess && (sess.status === 'COMPLETED' || sess.status === 'CAPTURED' || sess.isPaid)) {
            clearInterval(interval);
            setIsConfirming(true);
            setTimeout(() => {
              setIsConfirming(false);
              setCompleted(true);
              const successPayload = {
                type: '180_PAYMENT_SUCCESS',
                sessionId,
                transactionId: sess.metadata?.razorpayPaymentId || `pay_rzp_${Date.now()}`,
                amount: sess.amount || session?.amount,
                currency: sess.currency || session?.currency || 'INR',
                paymentMethod: 'UPI_QR',
              };
              if (typeof window !== 'undefined') {
                if (window.opener) window.opener.postMessage(successPayload, '*');
                if (window.parent && window.parent !== window) window.parent.postMessage(successPayload, '*');
              }
              toast.success('Payment confirmed successfully!');
              setTimeout(() => {
                if (sess.returnUrl || session?.returnUrl) {
                  window.location.href = sess.returnUrl || session.returnUrl;
                } else if (typeof window !== 'undefined') {
                  if (window.opener) window.close();
                  else if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: '180_PAYMENT_CLOSE', sessionId }, '*');
                  }
                }
              }, 1200);
            }, 1200);
          }
        })
        .catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, selectedMethod, upiMode, completed, isConfirming, session]);

  // QR Timer effect
  useEffect(() => {
    if (selectedMethod !== 'UPI' || upiMode !== 'QR') return;
    const interval = setInterval(() => {
      setQrSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 600));
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedMethod, upiMode]);

  // Card Network detection
  const detectedCardNetwork = useMemo(() => {
    const raw = cardNumber.replace(/\s+/g, '');
    if (raw.startsWith('4')) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(raw)) return 'Mastercard';
    if (/^(60|65|81|82)/.test(raw)) return 'RuPay';
    if (/^(34|37)/.test(raw)) return 'American Express';
    return null;
  }, [cardNumber]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (value.length >= 3) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardExpiry(value);
  };

  // ─── Coupons & Promo Code State ─────────────────────────────────────────────
  const [couponInput, setCouponInput] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);

  // ─── Speculative Zero-Latency Order Pre-Warming Cache ────────────────────────
  const prewarmedOrderRef = React.useRef<{
    orderId: string;
    amountPaise: number;
    keyId: string;
    amount: number;
  } | null>(null);
  const prewarmingPromiseRef = React.useRef<Promise<any> | null>(null);

  // ─── Autonomous Environment Detection ──────────────────────────────────────
  const isProduction = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    const explicitEnv = urlParams.get('env');
    if (explicitEnv === 'production') return true;
    if (explicitEnv === 'development') return false;

    const protocol = window.location.protocol;
    const host = (window.location.hostname || '').toLowerCase();
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.endsWith('.test') ||
      host.endsWith('.internal');

    return protocol === 'https:' && !isLocal;
  }, []);

  // ─── Deterministic 180 Pay Reference Code ───────────────────────────────────
  const [payReferenceCode] = useState(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `180-PAY-${rand}`;
  });

  const handleCopyReferenceCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(payReferenceCode);
      setCopiedCode(true);
      toast.success(`Reference code copied: ${payReferenceCode}`);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyErrorDetails = () => {
    const payload = JSON.stringify(
      {
        referenceCode: payReferenceCode,
        sessionId,
        isProduction,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(payload);
      setCopiedDetails(true);
      toast.success('Payment error diagnostic copied');
      setTimeout(() => setCopiedDetails(false), 2000);
    }
  };

  const handleReturnToApp = () => {
    if (typeof window !== 'undefined') {
      const closePayload = {
        type: '180_PAYMENT_CLOSE',
        sessionId,
        referenceCode: payReferenceCode,
        error: 'SESSION_EXPIRED',
      };
      const closePayloadPay = {
        type: '180_PAY_CLOSE',
        sessionId,
      };

      if (window.parent && window.parent !== window) {
        try { window.parent.postMessage(closePayload, '*'); } catch (_) {}
        try { window.parent.postMessage(JSON.stringify(closePayload), '*'); } catch (_) {}
        try { window.parent.postMessage(closePayloadPay, '*'); } catch (_) {}
        try { window.parent.postMessage(JSON.stringify(closePayloadPay), '*'); } catch (_) {}
      }

      if (window.opener && !window.opener.closed) {
        try { window.opener.postMessage(closePayload, '*'); } catch (_) {}
        try { window.opener.postMessage(JSON.stringify(closePayload), '*'); } catch (_) {}
        try { window.opener.postMessage(closePayloadPay, '*'); } catch (_) {}
        try { window.close(); } catch (_) {}
      }

      if ((!window.parent || window.parent === window) && (!window.opener || window.opener.closed)) {
        window.history.back();
      }
    }
  };

  const handleApplyCoupon = async () => {
    const trimmedCode = couponInput.trim().toUpperCase();
    if (!trimmedCode) {
      toast.error('Please enter a coupon or promo code', { id: 'coupon-toast' });
      return;
    }
    setApplyingCoupon(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('platform_auth_token') ||
            localStorage.getItem('token') ||
            localStorage.getItem('accessToken')
          : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(getCoreApiUrl(`/api/v1/checkout/sessions/${sessionId}/apply-coupon`), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: trimmedCode,
          couponCode: trimmedCode,
          customerEmail: session?.customerEmail || (wallet?.user as any)?.email || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const finalAmt = data.finalAmount !== undefined ? data.finalAmount : (data.session?.amount ?? session?.amount);
        const discountAmt = data.discountAmount !== undefined ? data.discountAmount : (data.session?.discountAmount ?? 0);
        const codeUsed = data.code || trimmedCode;

        setSession((prev: any) => ({
          ...prev,
          ...(data.session || {}),
          originalAmount: prev?.originalAmount || prev?.amount,
          amount: finalAmt,
          couponCode: codeUsed,
          discountAmount: discountAmt,
          app: prev?.app || data.session?.app,
        }));
        toast.success(`Coupon applied: ${codeUsed} (-${session?.currency === 'USD' ? '$' : '₹'}${discountAmt})`, { id: 'coupon-toast' });
        setCouponInput('');
        setShowCouponInput(false);

        if (typeof window !== 'undefined') {
          const couponPayload = {
            type: '180_COUPON_APPLIED',
            sessionId,
            couponCode: codeUsed,
            discountAmount: discountAmt,
            finalAmount: finalAmt,
          };
          if (window.opener && !window.opener.closed) window.opener.postMessage(couponPayload, '*');
          if (window.parent && window.parent !== window) window.parent.postMessage(couponPayload, '*');
        }
      } else {
        toast.error(data.error || 'Invalid or expired coupon code', { id: 'coupon-toast' });
      }
    } catch {
      toast.error('Network error applying coupon', { id: 'coupon-toast' });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      const res = await fetch(getCoreApiUrl(`/api/v1/checkout/sessions/${sessionId}/remove-coupon`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success && data.session) {
        setSession((prev: any) => ({
          ...prev,
          ...data.session,
          app: prev?.app || data.session.app,
        }));
        toast.success('Coupon removed', { id: 'coupon-toast' });
        if (typeof window !== 'undefined') {
          const revertPayload = {
            type: '180_COUPON_REMOVED',
            sessionId,
            finalAmount: data.session.amount,
          };
          if (window.opener && !window.opener.closed) window.opener.postMessage(revertPayload, '*');
          if (window.parent && window.parent !== window) window.parent.postMessage(revertPayload, '*');
        }
      } else {
        toast.error(data.error || 'Failed to remove coupon', { id: 'coupon-toast' });
      }
    } catch {
      toast.error('Network error removing coupon', { id: 'coupon-toast' });
    }
  };

  const fetchSessionAndWallet = async () => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('platform_auth_token') ||
            localStorage.getItem('token') ||
            localStorage.getItem('accessToken')
          : null;
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const [sessionRes, walletRes] = await Promise.all([
        fetch(getCoreApiUrl(`/api/oauth/checkout/sessions/${sessionId}`), { headers: authHeaders, credentials: 'include' }),
        fetch(getCoreApiUrl('/api/oauth/wallet'), { headers: authHeaders, credentials: 'include' }),
      ]);

      let sessionInfo: any = null;
      try {
        const sessionData = await sessionRes.json();
        if (sessionData && sessionData.success) {
          sessionInfo = sessionData.data;
        }
      } catch (_) {}

      const isSandboxSession = Boolean(
        sessionId && (
          sessionId.startsWith('sess_sandbox_') ||
          sessionId.startsWith('sess_demo_') ||
          sessionId.startsWith('sess_180pay_') ||
          sessionId.startsWith('cs_') ||
          sessionId === 'default'
        )
      );

      // Robust fallback for Sandbox / Demo / Sovereign sessions
      if (!sessionInfo && isSandboxSession) {
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const queryAmount = urlParams?.get('amount') ? parseFloat(urlParams.get('amount')!) : 499.0;
        const queryTitle = urlParams?.get('title') || '180 Workspace Plan';
        const queryDesc = urlParams?.get('description') || 'Secure Online Checkout';
        const queryCurrency = urlParams?.get('currency') || 'INR';
        const queryApp = urlParams?.get('appName') || urlParams?.get('app') || '180 Workspace';

        sessionInfo = {
          id: sessionId,
          amount: queryAmount,
          currency: queryCurrency,
          title: queryTitle,
          description: queryDesc,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
          app: {
            id: 'app_180workspace',
            name: queryApp,
            isVerified: true,
          },
        };
      }

      if (sessionInfo) {
        setSession(sessionInfo);
      } else {
        throw new Error('Failed to load checkout details');
      }

      try {
        const walletData = await walletRes.json();
        if (walletData && walletData.success) {
          setWallet(walletData.data);
        }
      } catch (_) {}
    } catch (err: any) {
      toast.error(err.message || 'Error loading payment session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionAndWallet();
    }
  }, [sessionId]);


  // ─── Speculative Order Pre-Warming on Dwell Time (Zero Perceived Latency) ────
  useEffect(() => {
    if (!session || !sessionId || session.status === 'COMPLETED' || !session.amount) return;

    const isSandboxSession = Boolean(
      sessionId && (
        sessionId.startsWith('sess_sandbox_') ||
        sessionId.startsWith('sess_demo_') ||
        sessionId.startsWith('sess_180pay_') ||
        sessionId.startsWith('cs_') ||
        sessionId === 'default'
      )
    );

    if (isSandboxSession && !isProduction) return;

    // If order already pre-warmed for current active session amount, reuse it
    if (prewarmedOrderRef.current && prewarmedOrderRef.current.amount === session.amount) {
      return;
    }

    const prewarm = async () => {
      try {
        const res = await fetch(getCoreApiUrl(`/api/v1/checkout/sessions/${sessionId}/direct-order`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (data.success && (data.data || data.orderId)) {
          const orderInfo = data.data || data;
          const orderObj = {
            orderId: orderInfo.orderId,
            amountPaise: orderInfo.amountPaise,
            keyId: orderInfo.keyId,
            amount: session.amount,
          };
          prewarmedOrderRef.current = orderObj;
          return orderObj;
        }
      } catch (err) {
        console.warn('[180 Pay] Silent background pre-warm:', err);
      }
      return null;
    };

    prewarmingPromiseRef.current = prewarm();
  }, [session?.amount, sessionId, isProduction]);

  const handlePay = async () => {
    setPaying(true);
    const toastId = toast.loading('Authorizing payment with 180 Profile...');

    try {
      const isSandboxSession = Boolean(
        sessionId && (
          sessionId.startsWith('sess_sandbox_') ||
          sessionId.startsWith('sess_demo_') ||
          sessionId.startsWith('sess_180pay_') ||
          sessionId.startsWith('cs_') ||
          sessionId === 'default'
        )
      );

      const isDevOrSandbox = !isProduction || isSandboxSession;

      if (isDevOrSandbox) {
        await new Promise((r) => setTimeout(r, 600));
        const demoTxId = 'tx_180pay_' + Math.random().toString(36).substring(2, 10);
        toast.success('Payment completed successfully!', { id: toastId });
        setCompleted(true);
        setPaying(false);
        const successPayload = {
          type: '180_PAYMENT_SUCCESS',
          sessionId,
          transactionId: demoTxId,
          amount: session?.amount || 499.0,
          currency: session?.currency || 'INR',
        };
        if (typeof window !== 'undefined') {
          if (window.opener) {
            window.opener.postMessage(successPayload, '*');
          }
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(successPayload, '*');
          }
        }
        setTimeout(() => {
          if (session?.returnUrl) {
            window.location.href = session.returnUrl;
          } else if (typeof window !== 'undefined') {
            if (window.opener) {
              window.close();
            } else if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: '180_PAYMENT_CLOSE', sessionId }, '*');
            }
          }
        }, 1200);
        return;
      }

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('platform_auth_token') ||
            localStorage.getItem('token') ||
            localStorage.getItem('accessToken')
          : null;
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(getCoreApiUrl(`/api/oauth/checkout/sessions/${sessionId}/pay`), {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Payment failed');
      }

      toast.success('Payment completed successfully!', { id: toastId });
      setCompleted(true);

      const liveSuccessPayload = {
        type: '180_PAYMENT_SUCCESS',
        sessionId,
        transactionId: data.data?.transactionId,
        amount: session?.amount,
        currency: session?.currency,
      };

      // Notify opener window if opened in a popup or parent window if in bottom sheet
      if (typeof window !== 'undefined') {
        if (window.opener) {
          window.opener.postMessage(liveSuccessPayload, '*');
        }
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(liveSuccessPayload, '*');
        }
      }

      // Auto redirect or close after 2 seconds
      setTimeout(() => {
        if (data.data?.returnUrl || session?.returnUrl) {
          window.location.href = data.data?.returnUrl || session.returnUrl;
        } else if (typeof window !== 'undefined') {
          if (window.opener) {
            window.close();
          } else if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: '180_PAYMENT_CLOSE', sessionId }, '*');
          }
        }
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || 'Payment authorization failed', { id: toastId });
    } finally {
      setPaying(false);
    }
  };

  const handleDirectPayment = async () => {
    if (!session) return;

    if (selectedMethod === 'UPI') {
      setIsConfirming(true);
    }

    setTopupLoading(true);
    setDirectPayStep('Authorizing 180 Pay Sovereign Checkout...');
    const toastId = toast.loading('Authorizing payment in 180 Pay...');

    try {
      const isSandboxSession = Boolean(
        sessionId && (
          sessionId.startsWith('sess_sandbox_') ||
          sessionId.startsWith('sess_demo_') ||
          sessionId.startsWith('sess_180pay_') ||
          sessionId.startsWith('cs_') ||
          sessionId === 'default'
        )
      );

      const isDevOrSandbox = !isProduction || isSandboxSession;

      // In pure sandbox demo without backend or in dev mock mode
      if (isSandboxSession && !isProduction) {
        if (selectedMethod === 'UPI') {
          setIsConfirming(true);
          await new Promise((r) => setTimeout(r, 1800));
          setIsConfirming(false);
        } else {
          setDirectPayStep('Finalizing instant payment...');
          await new Promise((r) => setTimeout(r, 600));
        }
        toast.success('Payment completed successfully!', { id: toastId });
        setCompleted(true);
        setTopupLoading(false);
        setDirectPayStep('');
        const demoTxId = 'tx_direct_' + Math.random().toString(36).substring(2, 10);
        const payload = {
          type: '180_PAYMENT_SUCCESS',
          sessionId,
          transactionId: demoTxId,
          amount: session?.amount,
          currency: session?.currency || 'INR',
          paymentMethod: selectedMethod,
        };
        if (typeof window !== 'undefined') {
          if (window.opener) window.opener.postMessage(payload, '*');
          if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');
          setTimeout(() => {
            if (session?.returnUrl) {
              window.location.href = session.returnUrl;
            } else if (window.opener) {
              window.close();
            } else if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: '180_PAYMENT_CLOSE', sessionId }, '*');
            }
          }, 1200);
        }
        return;
      }

      setDirectPayStep('Creating secure gateway order with Razorpay...');

      const orderRes = await fetch(getCoreApiUrl(`/api/v1/checkout/sessions/${sessionId}/direct-order`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const orderData = await orderRes.json();
      if (!orderData.success || !orderData.orderId) {
        throw new Error(orderData.error || 'Failed to initialize payment order with banking rail');
      }

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

      setDirectPayStep('Opening Razorpay payment gateway...');
      const rzpLoaded = await loadRzp();

      if (rzpLoaded && (window as any).Razorpay) {
        setTopupLoading(false);
        setDirectPayStep('');

        const options: any = {
          key: orderData.keyId,
          amount: orderData.amountPaise,
          currency: session?.currency || 'INR',
          name: session?.app?.name || '180 Sovereign Pay',
          description: session?.title || 'Payment',
          order_id: orderData.orderId,
          prefill: {
            name: (wallet?.user as any)?.name || '',
            email: session?.customerEmail || (wallet?.user as any)?.email || '',
            contact: session?.customerPhone || '',
            method: selectedMethod === 'CARD' ? 'card' : selectedMethod === 'NETBANKING' ? 'netbanking' : 'upi',
          },
          theme: {
            color: '#2563eb',
          },
          handler: async (response: any) => {
            setIsConfirming(true);
            setDirectPayStep('Verifying cryptographic signature with banking rail...');
            try {
              const verifyRes = await fetch(getCoreApiUrl(`/api/v1/checkout/sessions/${sessionId}/direct-verify`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                setIsConfirming(false);
                setCompleted(true);
                toast.success('Payment verified & captured successfully!');

                const liveSuccessPayload = {
                  type: '180_PAYMENT_SUCCESS',
                  sessionId,
                  transactionId: response.razorpay_payment_id,
                  amount: session?.amount,
                  currency: session?.currency,
                  paymentMethod: selectedMethod,
                };

                if (typeof window !== 'undefined') {
                  if (window.opener) window.opener.postMessage(liveSuccessPayload, '*');
                  if (window.parent && window.parent !== window) window.parent.postMessage(liveSuccessPayload, '*');
                }

                if (sessionId && sessionId !== 'default') {
                  fetch(getCoreApiUrl(`/api/v1/checkout/sessions/${sessionId}/track-event`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: 'DIRECT_PAYMENT_COMPLETED', clientSessionId: clientSessionId || undefined }),
                  }).catch(() => {});
                }

                setTimeout(() => {
                  const redirectTarget = verifyData.returnUrl || session?.returnUrl;
                  if (redirectTarget) {
                    window.location.href = redirectTarget;
                  } else if (typeof window !== 'undefined') {
                    if (window.opener) {
                      window.close();
                    } else if (window.parent && window.parent !== window) {
                      window.parent.postMessage({ type: '180_PAYMENT_CLOSE', sessionId }, '*');
                    }
                  }
                }, 1200);
              } else {
                setIsConfirming(false);
                toast.error(verifyData.error || 'Payment signature verification failed');
              }
            } catch {
              setIsConfirming(false);
              toast.error('Network error during payment verification');
            }
          },
          modal: {
            ondismiss: () => {
              setTopupLoading(false);
              setDirectPayStep('');
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      }

      // If Razorpay SDK could not be loaded, transition to confirming view and start polling
      setIsConfirming(true);
      setTopupLoading(false);
      setDirectPayStep('');
    } catch (err: any) {
      toast.error(err.message || 'Payment execution failed', { id: toastId });
    } finally {
      setTopupLoading(false);
      setDirectPayStep('');
    }
  };


  if (loading) {
    return (
      <div className="w-full py-16 text-center space-y-4 flex flex-col items-center justify-center font-sans">
        <LogoLoader size={40} className="w-10 h-10 text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">Loading 180 Pay checkout...</p>
      </div>
    );
  }

  if (isConfirming) {
    return (
      <div 
        role="alert" 
        aria-live="assertive"
        className="w-full py-6 px-4 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center justify-center font-sans"
      >
        {/* Vendor Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 text-left min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              180
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">{session?.app?.name || '180 Sovereign'}</p>
              <p className="text-[10px] text-slate-400">Direct Banking Rail • Razorpay Backed</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
              {currencySymbol}{session?.amount?.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Pulsing Radar Ring & LogoLoader */}
        <div className="relative flex items-center justify-center py-4">
          <div className="absolute w-32 h-32 rounded-full bg-blue-500/15 dark:bg-blue-500/10 animate-ping" />
          <div className="absolute w-28 h-28 rounded-full border-2 border-dashed border-blue-400/40 animate-spin" />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-xl shadow-blue-500/25 relative z-10">
            <LogoLoader size={38} className="text-white" />
          </div>
        </div>

        <div className="space-y-1.5 max-w-sm">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            Waiting for UPI payment...
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold">
            <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
            <span>Auto-confirming in real-time</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed pt-1">
            Approve the payment request of <strong className="text-slate-800 dark:text-zinc-200">{currencySymbol}{session?.amount?.toFixed(2)}</strong> on your UPI app (Google Pay, PhonePe, Paytm, or BHIM).
          </p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            Do not press Back or refresh this window.
          </p>
        </div>

        {/* Live Stepper */}
        <div className="w-full max-w-sm bg-slate-50 dark:bg-zinc-900/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-2.5 text-left text-xs">
          <div className="flex items-center justify-between text-slate-700 dark:text-zinc-300 font-semibold">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>UPI Payment Intent Created</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-600">DONE</span>
          </div>
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-semibold">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>Waiting for Bank Authorization</span>
            </div>
            <span className="text-[10px] font-mono font-bold animate-pulse">CHECKING</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 dark:text-zinc-500">
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-zinc-700 shrink-0" />
              <span>Finalizing Order & Settlement</span>
            </div>
            <span className="text-[10px] font-mono">PENDING</span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full max-w-sm space-y-2 pt-1">
          <button
            type="button"
            onClick={async () => {
              const toastId = toast.loading('Re-checking payment status with bank...');
              try {
                const res = await fetch(getCoreApiUrl(`/api/v1/checkout/sessions/${sessionId}`));
                const data = await res.json();
                const sess = data.data || data.session || data;
                if (sess && (sess.status === 'COMPLETED' || sess.isPaid)) {
                  toast.success('Payment verified!', { id: toastId });
                  setIsConfirming(false);
                  setCompleted(true);
                } else {
                  toast.error('Payment not detected yet. Please approve the payment in your UPI app and try again.', { id: toastId });
                }
              } catch {
                toast.error('Payment verification failed. Please try again.', { id: toastId });
              }
            }}
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

        <p className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Secured by 256-Bit SSL • Direct Sovereign Checkout</span>
        </p>
      </div>
    );
  }

  if (completed) {
    return (
      <div 
        role="alert" 
        aria-live="assertive"
        className="w-full py-12 text-center space-y-5 animate-in zoom-in-95 font-sans"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto animate-bounce shadow-xs">
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
    // ─── 1. PRODUCTION MODE: Enterprise Clean Fallback Screen ───────────────
    if (isProduction && !showDevInspector) {
      return (
        <div 
          role="alert" 
          aria-live="assertive"
          className="w-full py-10 text-center space-y-6 font-sans animate-in zoom-in-95"
        >
          {/* Brand & Security Status */}
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Unable to process payment
            </h2>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Your card, wallet, or bank account has <strong className="text-slate-900 font-bold">NOT</strong> been charged. Please try again or return to the application.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={fetchSessionAndWallet}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-700 active:scale-[0.99] transition-all cursor-pointer shadow-sm min-h-[42px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>

            <button
              type="button"
              onClick={handleReturnToApp}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-[0.99] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[42px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Application</span>
            </button>
          </div>

          {/* Reference Code Telemetry Box */}
          <div className="pt-2 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-3 text-left">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 block">
                  Reference Code
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 select-all">
                  {payReferenceCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyReferenceCode}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Subtle Dev Expander */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDevInspector(true)}
              className="text-[11px] font-medium text-slate-600 hover:text-slate-700 flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              <span>Developer Diagnostics</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }

    // ─── 2. DEVELOPMENT MODE: Full Payment Diagnostic Inspector ────────────
    return (
      <div 
        role="alert" 
        aria-live="assertive"
        className="w-full py-4 space-y-5 font-sans text-left animate-in zoom-in-95"
      >
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-900 relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700">
                  180 Pay Dev Diagnostic
                </span>
                <span className="text-[10px] font-mono text-slate-600">
                  INVALID_SESSION
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                Checkout Session Not Found or Expired
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                The session identifier was not recognized or has exceeded its validity window.
              </p>
            </div>
          </div>
        </div>

        {/* Diagnostics Box */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              Session Diagnostics
            </span>
            <button
              type="button"
              onClick={handleCopyErrorDetails}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              {copiedDetails ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Details</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Reference Code</span>
            <code className="bg-white px-2 py-1 rounded border border-slate-200 font-mono text-[11px] text-blue-700 font-bold break-all select-all">
              {payReferenceCode}
            </code>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-rose-500 font-semibold">Session ID</span>
            <code className="bg-rose-50/80 border border-rose-200 px-2 py-1 rounded font-mono text-[11px] text-rose-700 break-all select-all font-semibold">
              {sessionId || 'N/A'}
            </code>
          </div>
        </div>

        {/* Resolution Guide Callout */}
        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
          <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-blue-950">Local Testing Recommendation</p>
            <p className="text-blue-800/90 leading-relaxed text-[11px]">
              For local sandbox testing, ensure your session prefix starts with <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-blue-900">sess_sandbox_</code> or verify your checkout server endpoint in the{' '}
              <a
                href="http://localhost:3008"
                target="_blank"
                rel="noreferrer"
                className="font-bold underline hover:text-blue-950 inline-flex items-center gap-0.5"
              >
                180 Developer Portal <ExternalLink className="w-2.5 h-2.5 inline" />
              </a>.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={fetchSessionAndWallet}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 active:scale-[0.99] transition-all cursor-pointer shadow-xs min-h-[38px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Fetch</span>
          </button>

          <a
            href="http://localhost:3008"
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-700 active:scale-[0.99] transition-all cursor-pointer shadow-xs min-h-[38px]"
          >
            <span>Developer Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={handleReturnToApp}
            className="py-2 px-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.99] font-bold text-xs transition-all cursor-pointer min-h-[38px]"
          >
            Close
          </button>
        </div>

        {isProduction && showDevInspector ? (
          <button
            type="button"
            onClick={() => setShowDevInspector(false)}
            className="text-[11px] font-medium text-slate-600 hover:text-slate-700 flex items-center justify-center gap-1 mx-auto transition-colors pt-1"
          >
            <ChevronUp className="w-3 h-3" />
            <span>Switch to Standard View</span>
          </button>
        ) : null}
      </div>
    );
  }

  const isSandbox = Boolean(
    sessionId && (
      sessionId.startsWith('sess_sandbox_') ||
      sessionId.startsWith('sess_demo_') ||
      sessionId.startsWith('sess_180pay_') ||
      sessionId.startsWith('cs_') ||
      sessionId === 'default'
    )
  );

  // Check if current user is actively logged into a 180 Profile wallet session
  const isAuthenticatedWithWallet = Boolean(
    wallet &&
    (wallet.userId || wallet.id) &&
    typeof wallet.balance === 'number' &&
    (typeof window !== 'undefined' && Boolean(
      localStorage.getItem('platform_auth_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken')
    ))
  );

  const userBalance = isAuthenticatedWithWallet ? (wallet?.balance ?? 0) : 0;
  const hasEnoughBalance = isAuthenticatedWithWallet && userBalance >= session.amount;

  return (
    <div className="w-full space-y-5 text-slate-900 dark:text-zinc-100 font-sans antialiased">
      {/* Vendor Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-800/80 pb-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1px] shadow-xs shrink-0 overflow-hidden">
            <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center font-bold text-blue-700 dark:text-blue-400 text-xs overflow-hidden">
              {session.app?.logoUrl ? (
                <img
                  src={session.app.logoUrl}
                  alt={session.app.name || 'Merchant'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>{session.app?.name ? session.app.name.slice(0, 2).toUpperCase() : 'ME'}</span>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5 tracking-tight truncate">
              {session.app?.name || 'Merchant'}
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            </h1>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">Verified Merchant</span>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-1.5 shrink-0 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          Verified
        </span>
      </div>

      {/* Item Summary */}
      <div className="bg-white dark:bg-zinc-900/70 rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 tracking-tight leading-snug">{session.title}</h2>
              {(session.mode === 'subscription' || session.metadata?.isSubscription) && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shrink-0">
                  Recurring {session.billingInterval || 'Monthly'}
                </span>
              )}
            </div>
            {session.description && (
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{session.description}</p>
            )}
            {(session.mode === 'subscription' || session.metadata?.isSubscription) && (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                Auto-renews every {session.billingInterval === 'YEARLY' ? 'year' : 'month'}. Cancel anytime.
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="text-xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
              {session.currency === 'USD' ? '$' : '₹'}{session.amount.toFixed(2)}
            </span>
            <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-mono mt-0.5">
              {session.currency} {(session.mode === 'subscription' || session.metadata?.isSubscription) ? '/ mo' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Purchasing Power Parity (PPP) Banner */}
      {(session.metadata?.pppApplied || session.geoPricing || session.metadata?.isPpp) && (
        <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 bg-gradient-to-r from-indigo-50/90 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/30 p-3.5 flex items-center justify-between text-xs text-indigo-950 dark:text-indigo-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-indigo-600/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold block">Purchasing Power Parity</span>
              <span className="text-indigo-800/90 dark:text-indigo-300/80 text-[11px]">
                Regional fair price applied for your country
              </span>
            </div>
          </div>
          <span className="bg-indigo-600 dark:bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-full text-[10px] tracking-wide">
            PPP ACTIVE
          </span>
        </div>
      )}

      {/* Coupon / Promo Code Box */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-3.5 space-y-2 shadow-2xs">
        {session.couponCode ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
              <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Promo code: <strong className="font-mono text-emerald-950 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">{session.couponCode}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                -{session.currency === 'USD' ? '$' : '₹'}{(session.discountAmount || 0).toFixed(2)}
              </span>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                title="Remove coupon"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            {!showCouponInput ? (
              <button
                type="button"
                onClick={() => setShowCouponInput(true)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Have a coupon or promo code?</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in duration-150">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="ENTER PROMO CODE"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-slate-900 dark:text-zinc-100 uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={applyingCoupon || !couponInput.trim()}
                  onClick={handleApplyCoupon}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 shrink-0"
                >
                  {applyingCoupon ? 'Applying...' : 'Apply'}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCouponInput(false);
                    setCouponInput('');
                  }}
                  className="text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 text-xs px-1 cursor-pointer shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Options: Wallet (Only if Authenticated) OR Direct Checkout Badges */}
      {isAuthenticatedWithWallet ? (
        <div className="rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-zinc-300 flex items-center gap-1.5 font-medium">
              <Wallet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              180 Wallet Balance:
            </span>
            <span className="font-bold text-slate-900 dark:text-zinc-100">
              {session.currency === 'USD' ? '$' : '₹'}{userBalance.toFixed(2)}
            </span>
          </div>

          {hasEnoughBalance ? (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-zinc-800 text-slate-600 dark:text-zinc-400">
              <span>Balance after payment:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {session.currency === 'USD' ? '$' : '₹'}{(userBalance - session.amount).toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-slate-200/70 dark:border-zinc-700/60 flex items-center justify-between">
              <span>Pay remaining with UPI / Cards:</span>
              <span className="font-bold text-slate-900 dark:text-zinc-200">
                {session.currency === 'USD' ? '$' : '₹'}{(session.amount - userBalance).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Category Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Payment Options (Razorpay &amp; Stripe Backed)
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Direct In-App Execution
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
                const isActive = selectedMethod === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(category);
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
            {/* 1. UPI Tab */}
            {selectedMethod === 'UPI' && (
              <div className="space-y-3.5 animate-in fade-in-50 duration-150">
                {/* Mobile View QR Toggle Banner */}
                {!isDesktop && (
                  <>
                    {upiMode !== 'QR' ? (
                      <button
                        type="button"
                        onClick={() => setUpiMode('QR')}
                        className="w-full p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 flex items-center justify-between text-left hover:border-blue-400 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <QrCode className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-blue-950 dark:text-blue-200 block">
                              Show QR Code
                            </span>
                            <span className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
                              Scan from another phone or check QR to pay
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

                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-3 text-xs">
                  {!isDesktop && (
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
                  )}
                  <button
                    type="button"
                    onClick={() => setUpiMode('QR')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      upiMode === 'QR'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QR Code</span>
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
                </div>

                {!isDesktop && upiMode === 'APPS' && (
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
                          placeholder="e.g. mobile@okhdfcbank or username@upi"
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

                    <div className="flex flex-wrap items-center gap-1.5">
                      {['@okhdfcbank', '@okaxis', '@ybl', '@paytm', '@ibl'].map((handle) => (
                        <button
                          key={handle}
                          type="button"
                          onClick={() => {
                            const base = vpaInput.split('@')[0] || (wallet?.user as any)?.phone || '9876543210';
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
                      onClick={handleDirectPayment}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/20 active:scale-[0.99]"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Display Scannable UPI QR ({currencySymbol}{session?.amount?.toFixed(2)})</span>
                    </button>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Zero-Redirect • 100% NPCI & RBI Regulated</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. Cards Tab */}
            {selectedMethod === 'CARD' && (
              <div className="space-y-3 animate-in fade-in-50 duration-150">

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
                    <span>Save card securely for 1-click sovereign checkouts</span>
                  </label>
                </div>
              </div>
            )}

            {/* 3. Netbanking Tab */}
            {selectedMethod === 'NETBANKING' && (
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
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2.5 pt-1">
        {hasEnoughBalance ? (
          <>
            <Button
              onClick={handlePay}
              disabled={paying || topupLoading}
              className="w-full min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Lock className="w-4 h-4" />
              <span>
                {paying
                  ? 'Processing Payment...'
                  : session.mode === 'subscription' || session.metadata?.isSubscription
                  ? `Authorize Subscription (${currencySymbol}${session.amount.toFixed(2)})`
                  : `Pay ${currencySymbol}${session.amount.toFixed(2)} with 180 Wallet`}
              </span>
            </Button>

            <button
              type="button"
              onClick={handleDirectPayment}
              disabled={paying || topupLoading}
              className="w-full py-2.5 min-h-[42px] rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{topupLoading ? (directPayStep || 'Executing Direct Payment...') : 'Or Pay via 180 Sovereign Instant Pay'}</span>
            </button>
          </>
        ) : (
          <Button
            onClick={handleDirectPayment}
            disabled={topupLoading || paying}
            className="w-full min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            {topupLoading ? (
              <>
                <LogoLoader size={18} className="w-4 h-4 text-white" />
                <span className="truncate">{directPayStep || 'Executing Payment in 180 Pay...'}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>
                  {selectedMethod === 'UPI'
                    ? upiMode === 'APPS'
                      ? `Pay ${currencySymbol}${session.amount.toFixed(2)} via ${selectedUpiApp.toUpperCase()}`
                      : upiMode === 'ID'
                      ? `Pay ${currencySymbol}${session.amount.toFixed(2)} via UPI ID`
                      : `Confirm ${currencySymbol}${session.amount.toFixed(2)} on QR`
                    : selectedMethod === 'CARD'
                    ? `Pay ${currencySymbol}${session.amount.toFixed(2)} via Card ${detectedCardNetwork ? `(${detectedCardNetwork})` : ''}`
                    : `Pay ${currencySymbol}${session.amount.toFixed(2)} via Netbanking (${selectedBankObj?.short || selectedBank})`}
                </span>
              </>
            )}
          </Button>
        )}

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
    </div>
  );
}
export default CheckoutClient;

