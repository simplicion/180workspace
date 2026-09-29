'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Key,
  Copy,
  Check,
  RotateCw,
  Save,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Shield,
  CreditCard,
  Webhook,
  Send,
  Terminal,
  AlertCircle,
  Zap,
  ExternalLink,
  Users,
  Landmark,
  Activity,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  UniversalSkeleton,
  PlatformModal,
  FavoriteButton,
  LogoLoader,
  HelpIcon,
  AILogoIcon,
} from '@workspace/ui';

interface DeveloperAppDetail {
  id: string;
  name: string;
  description: string;
  clientId: string;
  clientSecretHint: string;
  redirectUris: string[];
  allowedOrigins: string[];
  allowedScopes: string[];
  isVerified: boolean;
  isActive: boolean;
  enableAuth: boolean;
  enablePay: boolean;
  webhookUrl: string;
  webhookSecret: string;
  createdAt: string;
}

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params?.id as string;

  const [app, setApp] = useState<DeveloperAppDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [redirectUrisInput, setRedirectUrisInput] = useState('');
  const [allowedOriginsInput, setAllowedOriginsInput] = useState('');
  const [allowedScopes, setAllowedScopes] = useState<string[]>([]);

  // Services & Webhook State
  const [enableAuth, setEnableAuth] = useState(true);
  const [enablePay, setEnablePay] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isRotatingWebhook, setIsRotatingWebhook] = useState(false);

  // Test Webhook Dispatcher State
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    statusCode: number;
    latencyMs: number;
    signature: string;
    targetUrl: string;
    message: string;
    response: string;
  } | null>(null);

  // Secret Rotation Modal
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [newSecretRevealed, setNewSecretRevealed] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [hasAcknowledgedSecret, setHasAcknowledgedSecret] = useState(false);

  // Danger Zone
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Payout states
  const [payoutBalance, setPayoutBalance] = useState<number>(0);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [bankAccNumber, setBankAccNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

  // Real-Time Auth Logs & Live Users Telemetry
  const [authLogs, setAuthLogs] = useState<{ logs: any[]; totalUsers: number; activeSessionsCount: number } | null>(null);
  const [loadingAuthLogs, setLoadingAuthLogs] = useState(false);

  // Financial Analytics & Transactions Ledger
  const [paymentAnalytics, setPaymentAnalytics] = useState<{
    grossVolume: number;
    thisMonthVolume: number;
    lastMonthVolume: number;
    pendingSettlements: number;
    withdrawableBalance: number;
    currency: string;
    totalTransactionsCount: number;
    transactions: any[];
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Settlement Bank Details State
  const [bankDetails, setBankDetails] = useState<{
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
  } | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const getApiBase = () => {
    if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_CORE_BACKEND_URL || 'http://localhost:4003';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:4003' : (process.env.NEXT_PUBLIC_CORE_BACKEND_URL || 'https://services.180workspace.com');
  };

  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (_) {
      clearTimeout(timer);
      return null;
    }
  };

  const fetchAuthLogs = async () => {
    setLoadingAuthLogs(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();
      const res = await fetchWithTimeout(`${apiBase}/api/v1/developer/apps/${appId}/auth-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && res.ok) {
        const data = await res.json();
        if (data.success) setAuthLogs(data.data);
      }
    } catch (_) {}
    finally { setLoadingAuthLogs(false); }
  };

  const fetchPaymentAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();
      const res = await fetchWithTimeout(`${apiBase}/api/v1/developer/apps/${appId}/payment-analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && res.ok) {
        const data = await res.json();
        if (data.success) {
          setPaymentAnalytics(data.data);
          if (data.data.withdrawableBalance !== undefined) {
            setPayoutBalance(data.data.withdrawableBalance);
          }
        }
      }
    } catch (_) {}
    finally { setLoadingAnalytics(false); }
  };

  const fetchBankDetails = async () => {
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();
      const res = await fetchWithTimeout(`${apiBase}/api/v1/developer/apps/${appId}/bank-details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setBankDetails(data.data);
          if (data.data.accountHolderName) setBankHolder(data.data.accountHolderName);
          if (data.data.accountNumber) setBankAccNumber(data.data.accountNumber);
          if (data.data.ifscCode) setBankIfsc(data.data.ifscCode);
          if (data.data.upiId) setUpiId(data.data.upiId);
        }
      }
    } catch (_) {}
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankHolder || (!bankAccNumber && !upiId)) {
      toast.error('Account holder name and Account Number or UPI ID are required');
      return;
    }
    setSavingBank(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/v1/developer/apps/${appId}/bank-details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountHolderName: bankHolder,
          accountNumber: bankAccNumber,
          ifscCode: bankIfsc,
          upiId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save bank details');
      toast.success('Settlement bank account saved successfully!');
      setBankDetails(data.data);
      setShowBankModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Error saving bank details');
    } finally {
      setSavingBank(false);
    }
  };

  const handleOpenPayoutModal = () => {
    if (!bankDetails || (!bankDetails.accountNumber && !bankDetails.upiId)) {
      toast('Please set up your settlement bank details first', { icon: '🏦' });
      setShowBankModal(true);
      return;
    }
    if (bankDetails.upiId) {
      setPayoutMethod('UPI');
      setUpiId(bankDetails.upiId);
    } else {
      setPayoutMethod('BANK_TRANSFER');
      setBankHolder(bankDetails.accountHolderName || '');
      setBankAccNumber(bankDetails.accountNumber || '');
      setBankIfsc(bankDetails.ifscCode || '');
    }
    setShowPayoutModal(true);
  };

  useEffect(() => {
    fetchAppDetails();
    fetchPayouts();
    fetchAuthLogs();
    fetchPaymentAnalytics();
    fetchBankDetails();
  }, [appId]);

  const fetchPayouts = async () => {
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();
      let res = await fetchWithTimeout(`${apiBase}/api/v1/identity/developer/apps/${appId}/payouts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res || !res.ok) {
        res = await fetchWithTimeout(`${apiBase}/api/oauth/developer/apps/${appId}/payouts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (res && res.ok) {
        const data = await res.json();
        if (data.success) {
          setPayoutBalance(data.data.availableBalance || 0);
          setPayouts(data.data.payouts || []);
        }
      }
    } catch (e) {}
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payoutAmount);
    if (!amountNum || amountNum < 100) {
      toast.error('Minimum payout amount is ₹100');
      return;
    }
    if (amountNum > payoutBalance) {
      toast.error('Requested amount exceeds available balance');
      return;
    }

    setIsRequestingPayout(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();
      let res = await fetch(`${apiBase}/api/oauth/developer/apps/${appId}/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amountNum,
          payoutMethod,
          accountDetails:
            payoutMethod === 'UPI'
              ? { upiId }
              : { accountNumber: bankAccNumber, ifscCode: bankIfsc, accountHolderName: bankHolder },
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to submit payout request');

      toast.success('Payout request submitted for review!');
      setShowPayoutModal(false);
      setPayoutAmount('');
      fetchPayouts();
    } catch (err: any) {
      toast.error(err.message || 'Payout request failed');
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const fetchAppDetails = async () => {
    setLoading(true);
    const token = localStorage.getItem('platform_auth_token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const apiBase = getApiBase();
      let res = await fetchWithTimeout(`${apiBase}/api/v1/identity/developer/apps/${appId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res || !res.ok) {
        res = await fetchWithTimeout(`${apiBase}/api/oauth/developer/apps/${appId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (!res || !res.ok) {
        throw new Error('Failed to load application details');
      }

      const data = await res.json();
      const appData = data.app;
      setApp(appData);
      setName(appData.name);
      setDescription(appData.description || '');
      setRedirectUrisInput((appData.redirectUris || []).join('\n'));
      setAllowedOriginsInput((appData.allowedOrigins || []).join('\n'));
      setAllowedScopes(appData.allowedScopes || []);
      setEnableAuth(appData.enableAuth ?? true);
      setEnablePay(appData.enablePay ?? true);
      setWebhookUrl(appData.webhookUrl || '');
      setWebhookSecret(appData.webhookSecret || '');
    } catch (err: any) {
      toast.error(err.message || 'Error loading application');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('App name cannot be empty');
      return;
    }

    const redirectUris = redirectUrisInput
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    const isProd = window.location.protocol === 'https:';
    for (const uri of redirectUris) {
      if (isProd && !uri.startsWith('https://') && !uri.startsWith('http://localhost') && !uri.startsWith('http://127.0.0.1')) {
        if (!uri.includes('://')) {
          toast.error(`Invalid redirect URI format: ${uri}`);
          return;
        }
      }
    }

    const allowedOrigins = allowedOriginsInput
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();

      let res = await fetch(`${apiBase}/api/v1/identity/developer/apps/${appId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          redirectUris,
          allowedOrigins,
          allowedScopes,
          enableAuth,
          enablePay,
          webhookUrl: webhookUrl.trim(),
        }),
      });

      if (!res.ok) {
        res = await fetch(`${apiBase}/api/oauth/developer/apps/${appId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            redirectUris,
            allowedOrigins,
            allowedScopes,
            enableAuth,
            enablePay,
            webhookUrl: webhookUrl.trim(),
          }),
        });
      }

      if (!res.ok) throw new Error('Failed to update app');
      toast.success('Application settings updated successfully');
      fetchAppDetails();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRotateWebhookSecret = async () => {
    if (!confirm('Are you sure you want to rotate your webhook signing secret? You will need to update the secret on your backend server.')) {
      return;
    }
    setIsRotatingWebhook(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();

      let res = await fetch(`${apiBase}/api/v1/identity/developer/apps/${appId}/rotate-webhook-secret`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        res = await fetch(`${apiBase}/api/oauth/developer/apps/${appId}/rotate-webhook-secret`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Webhook secret rotation failed');

      setWebhookSecret(data.webhookSecret);
      toast.success('Webhook signing secret rotated successfully');
      fetchAppDetails();
    } catch (err: any) {
      toast.error(err.message || 'Webhook secret rotation failed');
    } finally {
      setIsRotatingWebhook(false);
    }
  };

  const handleSendTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please enter and save a valid Webhook URL first');
      return;
    }

    setIsTestingWebhook(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();

      let res = await fetch(`${apiBase}/api/v1/identity/developer/apps/${appId}/test-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: webhookUrl.trim() }),
      });

      if (!res.ok) {
        res = await fetch(`${apiBase}/api/oauth/developer/apps/${appId}/test-webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: webhookUrl.trim() }),
        });
      }

      const data = await res.json();
      setTestResult({
        success: data.success,
        statusCode: data.statusCode || (res.ok ? 200 : 500),
        latencyMs: data.latencyMs || 0,
        signature: data.signature || '',
        targetUrl: data.targetUrl || webhookUrl,
        message: data.message || '',
        response: typeof data.response === 'string' ? data.response : JSON.stringify(data.response || ''),
      });

      if (data.success) {
        toast.success(`Webhook test delivered! HTTP ${data.statusCode} (${data.latencyMs}ms)`);
      } else {
        toast.error(`Webhook test responded with HTTP ${data.statusCode}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch test webhook');
      setTestResult({
        success: false,
        statusCode: 0,
        latencyMs: 0,
        signature: '',
        targetUrl: webhookUrl,
        message: err.message,
        response: 'Connection or timeout error reaching webhook endpoint',
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleRotateSecret = async () => {
    setIsRotating(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();

      let res = await fetch(`${apiBase}/api/v1/identity/developer/apps/${appId}/rotate-secret`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        res = await fetch(`${apiBase}/api/oauth/developer/apps/${appId}/rotate-secret`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Rotation failed');

      setNewSecretRevealed(data.clientSecret);
      setSecretCopied(false);
      setHasAcknowledgedSecret(false);
      fetchAppDetails();
    } catch (err: any) {
      toast.error(err.message || 'Rotation failed');
    } finally {
      setIsRotating(false);
    }
  };

  const handleRevokeTokens = async () => {
    if (!confirm('Are you sure you want to revoke all issued tokens for this application? All active user sessions using this app will be terminated.')) {
      return;
    }

    setIsRevoking(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();

      let res = await fetch(`${apiBase}/api/v1/identity/developer/apps/${appId}/revoke-tokens`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        res = await fetch(`${apiBase}/api/oauth/developer/apps/${appId}/revoke-tokens`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (!res.ok) throw new Error('Revocation failed');
      toast.success('All active tokens revoked successfully');
    } catch (err: any) {
      toast.error(err.message || 'Token revocation failed');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDeleteApp = async () => {
    if (deleteConfirmText !== app?.name) {
      toast.error('Application name does not match');
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();

      let res = await fetch(`${apiBase}/api/v1/identity/developer/apps/${appId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        res = await fetch(`${apiBase}/api/oauth/developer/apps/${appId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (!res.ok) throw new Error('Deletion failed');
      toast.success('Application deleted');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 shadow-sm">
          <UniversalSkeleton type="form" />
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-12 text-center space-y-4 max-w-lg mx-auto shadow-sm dark:shadow-2xl">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Application not found</p>
        <Link href="/" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
          Return to Applications List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-zinc-200 dark:border-white/10">
        <Link
          href="/"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Applications</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">{app.name}</h1>
              {app.isVerified && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              <FavoriteButton
                recordId={app.id}
                type="Project"
                label={app.name}
                href={`/apps/${app.id}`}
                className="min-h-[36px] min-w-[36px] p-1.5"
              />
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Active
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">Client ID: {app.clientId}</p>
          </div>

          <div className="flex items-center gap-2">
            <HelpIcon slug="developer-app-settings" helpText="Application configuration guide" className="min-h-[44px] min-w-[44px]" />
            <Link
              href="/docs"
              className="px-4 py-2 min-h-[44px] flex items-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white shadow-sm transition-all"
            >
              SDK Documentation
            </Link>
          </div>
        </div>
      </div>

      {/* Credentials Card */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-5 shadow-sm dark:shadow-2xl">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-bold text-zinc-950 dark:text-white">OAuth 2.0 Credentials</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Client ID</label>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 font-mono text-xs text-zinc-900 dark:text-white">
              <span className="flex-1 truncate">{app.clientId}</span>
              <button
                onClick={() => copyToClipboard(app.clientId, 'client')}
                className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
              >
                {copiedKey === 'client' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Client Secret</label>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 font-mono text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex-1">
                {app.clientSecretHint ? `••••••••••••${app.clientSecretHint}` : 'Public PKCE Client'}
              </span>
              {app.clientSecretHint && (
                <button
                  onClick={() => setShowRotateModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Rotate</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Services & Capabilities Toggle Card */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Core Products & Capabilities</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Enable or disable standalone 180 services for this Client ID in real time.
            </p>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">Single Client ID Architecture</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 180 Identity Service Toggle */}
          <div
            onClick={() => setEnableAuth(!enableAuth)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
              enableAuth
                ? 'bg-blue-500/5 border-blue-500/40 shadow-sm'
                : 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-white/10 opacity-70'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${enableAuth ? 'bg-blue-500/20 text-blue-500' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-zinc-950 dark:text-white">180 Identity</h3>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    enableAuth
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {enableAuth ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Universal login with WhatsApp OTP, Google SSO, and sovereign @usernames. Issues RS256 asymmetric JWKS access tokens.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-white/5 text-[11px]">
              <span className="text-zinc-500">OAuth 2.0 / OIDC Protocol</span>
              <span className={`font-semibold ${enableAuth ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'}`}>
                {enableAuth ? 'Enabled' : 'Click to Enable'}
              </span>
            </div>
          </div>

          {/* 180 Pay Service Toggle */}
          <div
            onClick={() => setEnablePay(!enablePay)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
              enablePay
                ? 'bg-purple-500/5 border-purple-500/40 shadow-sm'
                : 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-white/10 opacity-70'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${enablePay ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-zinc-950 dark:text-white">180 Pay</h3>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    enablePay
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {enablePay ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                1-Click Sovereign Wallet & UPI checkout popup. Dedicated 180 Pay engine processes payments with 2-way verification.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-white/5 text-[11px]">
              <span className="text-zinc-500">Sovereign Wallet Checkout</span>
              <span className={`font-semibold ${enablePay ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400'}`}>
                {enablePay ? 'Enabled' : 'Click to Enable'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Authentication Logs & Active Users Card */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Real-Time Authentication Logs & Live Users</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Live audit stream of users who have authorized and logged into this application via 180 Identity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{authLogs?.activeSessionsCount || 0} Active Sessions</span>
            </span>
            <button
              type="button"
              onClick={fetchAuthLogs}
              disabled={loadingAuthLogs}
              className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Refresh auth logs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loadingAuthLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-1">
            <span className="text-[11px] font-medium text-zinc-500">Total Authenticated Users</span>
            <p className="text-xl font-extrabold text-zinc-950 dark:text-white font-mono">{authLogs?.totalUsers || 0}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-1">
            <span className="text-[11px] font-medium text-zinc-500">Active Token Sessions</span>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{authLogs?.activeSessionsCount || 0}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-medium text-zinc-500">Protocol Security</span>
            <p className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 pt-1">
              <Shield className="w-3.5 h-3.5" />
              <span>OIDC 2.0 PKCE Verified</span>
            </p>
          </div>
        </div>

        {/* Auth Stream Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Live User Activity Stream
          </h3>
          {loadingAuthLogs ? (
            <div className="py-8 text-center text-xs text-zinc-400">Loading telemetry stream...</div>
          ) : authLogs && authLogs.logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                <thead className="border-b border-zinc-200 dark:border-white/10 text-zinc-400 text-[11px] uppercase">
                  <tr>
                    <th className="pb-2">User Profile</th>
                    <th className="pb-2">Auth Channel</th>
                    <th className="pb-2">Session Status</th>
                    <th className="pb-2 text-right">Authorized At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                  {authLogs.logs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-600 text-xs overflow-hidden">
                            {log.user.avatar ? (
                              <img src={log.user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              log.user.name?.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-950 dark:text-white leading-tight">{log.user.name}</div>
                            <div className="text-[10px] text-zinc-400 font-mono">{log.user.email || log.user.username || '180 Identity'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 font-medium">{log.authMethod}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'ACTIVE_SESSION'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {log.status === 'ACTIVE_SESSION' ? 'Active Token' : 'Expired'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-[11px] text-zinc-500">
                        {new Date(log.grantedAt).toLocaleDateString()} {new Date(log.grantedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 text-center space-y-2">
              <p className="text-xs text-zinc-500">No users have signed into this app yet.</p>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                Embed the &lt;OneEightyAuthButton /&gt; or script to start authenticating users.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Webhook & 2-Way Payment Verification Engine Card */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Webhook className="w-4 h-4 text-emerald-500" />
              <span>Payment Verification Webhook Engine</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Two-way server verification flow. All webhooks are signed using HMAC-SHA256 (<code className="text-emerald-500">X-180-Signature</code>).
            </p>
          </div>

          <button
            type="button"
            onClick={handleSendTestWebhook}
            disabled={isTestingWebhook || !webhookUrl}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isTestingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Send Test Webhook</span>
          </button>
        </div>

        {/* 2-Way Verification Architecture Banner */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>2-Way Sovereign Payment Verification Workflow</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 space-y-1">
              <div className="font-bold text-zinc-900 dark:text-zinc-200">1. Verification Leg 1</div>
              <div>Customer pays in 180 popup. 180 Pay Gateway confirms instant capture.</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 space-y-1">
              <div className="font-bold text-zinc-900 dark:text-zinc-200">2. Verification Leg 2</div>
              <div>180 Platform dispatches signed webhook with <code className="text-emerald-500">X-180-Signature</code> to your server.</div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 space-y-1">
              <div className="font-bold text-zinc-900 dark:text-zinc-200">3. Fulfillment</div>
              <div>Your server confirms signature and unlocks the product/subscription to the user.</div>
            </div>
          </div>
        </div>

        {/* Webhook Configuration Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Webhook Endpoint URL (HTTPS recommended)
            </label>
            <input
              type="url"
              placeholder="https://api.yourdomain.com/webhooks/180-pay"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Webhook Signing Secret
              </label>
              <button
                type="button"
                onClick={handleRotateWebhookSecret}
                disabled={isRotatingWebhook}
                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCw className={`w-2.5 h-2.5 ${isRotatingWebhook ? 'animate-spin' : ''}`} />
                <span>Rotate Secret</span>
              </button>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 font-mono text-xs text-zinc-900 dark:text-white">
              <span className="flex-1 truncate px-1 text-emerald-600 dark:text-emerald-400">
                {webhookSecret || 'whsec_••••••••••••••••••••••••'}
              </span>
              {webhookSecret && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookSecret, 'webhookSecret')}
                  className="p-1 text-zinc-400 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
                  title="Copy Webhook Secret"
                >
                  {copiedKey === 'webhookSecret' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Test Webhook Result Console */}
        {testResult && (
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-300 font-bold">Webhook Delivery Telemetry</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    testResult.success
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  HTTP {testResult.statusCode}
                </span>
                <span className="text-zinc-500 text-[10px]">{testResult.latencyMs}ms</span>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="text-zinc-400">
                <span className="text-zinc-500">Destination:</span> {testResult.targetUrl}
              </div>
              {testResult.signature && (
                <div className="text-zinc-400 truncate">
                  <span className="text-zinc-500">X-180-Signature:</span> {testResult.signature}
                </div>
              )}
              <div className="text-zinc-400">
                <span className="text-zinc-500">Status Message:</span> {testResult.message}
              </div>
              {testResult.response && (
                <div className="pt-1.5">
                  <span className="text-zinc-500 block mb-1">Server Response:</span>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 overflow-x-auto text-[10px] max-h-24 select-all">
                    {testResult.response}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 180 Pay Revenue & Payment Analytics Card */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>180 Pay Revenue & Payment Analytics</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Comprehensive analytics on collections, monthly volume, settlements, and incoming transaction receipts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchPaymentAnalytics}
              disabled={loadingAnalytics}
              className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Refresh payment analytics"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loadingAnalytics ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Financial KPI Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-1">
            <span className="text-[11px] font-medium text-zinc-500">Total Lifetime Volume</span>
            <p className="text-xl font-extrabold text-zinc-950 dark:text-white font-mono">
              ₹{(paymentAnalytics?.grossVolume || 0).toFixed(2)}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Gross captured
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-1">
            <span className="text-[11px] font-medium text-zinc-500">Last Month's Volume</span>
            <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
              ₹{(paymentAnalytics?.lastMonthVolume || 0).toFixed(2)}
            </p>
            <span className="text-[10px] text-zinc-400">Previous calendar month</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 space-y-1">
            <span className="text-[11px] font-medium text-zinc-500">In-Flight Settlements</span>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              ₹{(paymentAnalytics?.pendingSettlements || 0).toFixed(2)}
            </p>
            <span className="text-[10px] text-amber-500">Pending capture/settle</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 space-y-1">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Withdrawable Balance</span>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              ₹{(payoutBalance || 0).toFixed(2)}
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">Ready for withdrawal</span>
          </div>
        </div>

        {/* Recent Transactions Ledger */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Incoming Payments Ledger
          </h3>
          {paymentAnalytics && paymentAnalytics.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                <thead className="border-b border-zinc-200 dark:border-white/10 text-zinc-400 text-[11px] uppercase">
                  <tr>
                    <th className="pb-2">Session ID / Title</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                  {paymentAnalytics.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2.5">
                        <div className="font-semibold text-zinc-950 dark:text-white">{tx.title || 'Checkout'}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">{tx.id.slice(0, 16)}...</div>
                      </td>
                      <td className="py-2.5">
                        {tx.customer ? (
                          <div>
                            <div className="font-medium text-zinc-900 dark:text-zinc-200">{tx.customer.name}</div>
                            <div className="text-[10px] text-zinc-400">{tx.customer.email || '180 User'}</div>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Guest</span>
                        )}
                      </td>
                      <td className="py-2.5 font-bold text-zinc-950 dark:text-white font-mono">
                        ₹{tx.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.status === 'CAPTURED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : tx.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-[11px] text-zinc-500">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 italic py-2">No incoming payments recorded yet for this app.</p>
          )}
        </div>
      </div>

      {/* Earnings & Manual Payouts Card */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">Earnings & 180 Pay Payouts</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Revenue collected via 1-Click 180 Profile Checkout. Request manual bank/UPI withdrawals below.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenPayoutModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Request Payout</span>
          </button>
        </div>

        {/* Linked Settlement Bank Details */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-bold text-zinc-900 dark:text-white">Settlement Account Configuration</span>
              {bankDetails?.accountNumber || bankDetails?.upiId ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Verified</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">Setup Required</span>
              )}
            </div>
            {bankDetails?.accountNumber || bankDetails?.upiId ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {bankDetails.accountHolderName} • {bankDetails.upiId ? `UPI: ${bankDetails.upiId}` : `A/C: ••••••${bankDetails.accountNumber?.slice(-4)} (${bankDetails.ifscCode})`}
              </p>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                You must link your bank account or UPI ID to withdraw funds to your account.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowBankModal(true)}
            className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-white dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors self-start sm:self-auto cursor-pointer"
          >
            {bankDetails?.accountNumber || bankDetails?.upiId ? 'Update Bank Account' : 'Set Up Settlement Account'}
          </button>
        </div>

        {/* Balance Stat */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Withdrawable Revenue Balance</span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            ₹{payoutBalance.toFixed(2)}
          </span>
        </div>

        {/* Payout History Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Withdrawal History
          </h3>
          {payouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                <thead className="border-b border-zinc-200 dark:border-white/10 text-zinc-400 text-[11px] uppercase">
                  <tr>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Method</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5">{new Date(p.requestedAt).toLocaleDateString()}</td>
                      <td className="py-2.5 font-medium">{p.payoutMethod}</td>
                      <td className="py-2.5 font-bold text-zinc-900 dark:text-white">₹{p.amount.toFixed(2)}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 italic py-2">No payout requests submitted yet.</p>
          )}
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSaveChanges} className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
          <h2 className="text-base font-bold text-zinc-950 dark:text-white">Application Configuration</h2>
          <Button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Settings</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Application Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Redirect URIs (One per line)
          </label>
          <textarea
            rows={3}
            value={redirectUrisInput}
            onChange={(e) => setRedirectUrisInput(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Allowed Web Origins (CORS)
          </label>
          <textarea
            rows={2}
            value={allowedOriginsInput}
            onChange={(e) => setAllowedOriginsInput(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </form>

      {/* Danger Zone */}
      <div className="rounded-3xl border border-red-200 dark:border-red-500/20 bg-red-50/20 dark:bg-zinc-950 p-6 sm:p-8 space-y-4 shadow-sm dark:shadow-2xl">
        <h2 className="text-base font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
        <div className="divide-y divide-zinc-200 dark:divide-white/5 text-xs text-zinc-700 dark:text-zinc-300">
          <div className="py-3.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-zinc-900 dark:text-white">Revoke All Active Tokens</div>
              <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                Immediately invalidates all issued access and refresh tokens for this app.
              </div>
            </div>
            <button
              type="button"
              onClick={handleRevokeTokens}
              disabled={isRevoking}
              className="px-3.5 py-2 rounded-xl bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 font-semibold cursor-pointer transition-colors"
            >
              {isRevoking ? 'Revoking...' : 'Revoke Tokens'}
            </button>
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-zinc-900 dark:text-white">Delete Application</div>
              <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                Permanently removes this application and all associated grants.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer transition-colors shadow-sm"
            >
              Delete App
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: SECRET ROTATION
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showRotateModal}
        onClose={() => setShowRotateModal(false)}
        title="Rotate Client Secret"
        icon={RotateCw}
        iconBgClass="bg-amber-500/10"
        iconColorClass="text-amber-600 dark:text-amber-400"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4 text-zinc-900 dark:text-white">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Rotating your Client Secret will immediately issue a new secret. To prevent downtime, previous secrets have a 24-hour grace window.
          </p>

          {newSecretRevealed ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-emerald-600 dark:text-emerald-400 break-all select-all">
                {newSecretRevealed}
              </div>
              <Button
                onClick={() => {
                  copyToClipboard(newSecretRevealed, 'newSecret');
                  setSecretCopied(true);
                }}
                className="w-full py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                {secretCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{secretCopied ? 'Copied to Clipboard!' : 'Copy New Secret'}</span>
              </Button>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ack-rot"
                  checked={hasAcknowledgedSecret}
                  onChange={(e) => setHasAcknowledgedSecret(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <label htmlFor="ack-rot" className="text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer">
                  I have copied and safely stored this new secret.
                </label>
              </div>
              <Button
                disabled={!hasAcknowledgedSecret}
                onClick={() => {
                  setShowRotateModal(false);
                  setNewSecretRevealed(null);
                }}
                className="w-full py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowRotateModal(false)}
                className="px-4 py-2 min-h-[44px] text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRotateSecret}
                disabled={isRotating}
                className="px-4 py-2 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg cursor-pointer flex items-center gap-2"
              >
                {isRotating ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : <RotateCw className="w-4 h-4" />}
                <span>Confirm Rotation</span>
              </Button>
            </div>
          )}
        </div>
      </PlatformModal>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: DELETE APPLICATION
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Deletion"
        icon={AlertCircle}
        iconBgClass="bg-red-500/10"
        iconColorClass="text-red-600 dark:text-red-400"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4 text-zinc-900 dark:text-white">
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            To delete this application permanently, type its exact name <strong className="text-zinc-950 dark:text-white">{app.name}</strong> below:
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-red-500 transition-colors"
            placeholder="Type app name to confirm"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 min-h-[44px] text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
            >
              Cancel
            </Button>
            <button
              onClick={handleDeleteApp}
              disabled={deleteConfirmText !== app.name || isDeleting}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer transition-colors flex items-center gap-2"
            >
              {isDeleting ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : null}
              <span>Delete Forever</span>
            </button>
          </div>
        </div>
      </PlatformModal>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: PAYOUT REQUEST
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        title="Request Revenue Payout"
        icon={CreditCard}
        iconBgClass="bg-purple-500/10"
        iconColorClass="text-purple-600 dark:text-purple-400"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleRequestPayout} className="space-y-4 text-zinc-900 dark:text-white">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Available to withdraw: <strong className="text-emerald-500">₹{payoutBalance.toFixed(2)}</strong>
          </p>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
              Withdrawal Amount (INR)
            </label>
            <input
              type="number"
              min="100"
              max={payoutBalance}
              placeholder="Enter amount (min ₹100)"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
              Payout Method
            </label>
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
            >
              <option value="UPI">UPI ID (Instant Transfer)</option>
              <option value="BANK_TRANSFER">Bank Account (NEFT/IMPS)</option>
            </select>
          </div>

          {payoutMethod === 'UPI' ? (
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                UPI ID
              </label>
              <input
                type="text"
                placeholder="username@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  placeholder="Full Name as per Bank"
                  value={bankHolder}
                  onChange={(e) => setBankHolder(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  Account Number
                </label>
                <input
                  type="text"
                  placeholder="Bank Account Number"
                  value={bankAccNumber}
                  onChange={(e) => setBankAccNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="HDFC0001234"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setShowPayoutModal(false)}
              className="px-4 py-2 min-h-[44px] text-xs text-zinc-600 dark:text-zinc-300"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isRequestingPayout}
              className="px-5 py-2 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition-colors shadow-md flex items-center gap-2"
            >
              {isRequestingPayout ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : null}
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </PlatformModal>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: BANK SETTLEMENT SETUP
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        title="Settlement Bank Information"
        icon={Landmark}
        iconBgClass="bg-purple-500/10"
        iconColorClass="text-purple-600 dark:text-purple-400"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveBankDetails} className="space-y-4 text-zinc-900 dark:text-white">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Configure your registered bank account or UPI ID to receive automatic & manual revenue withdrawals.
          </p>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
              Account Holder Full Name *
            </label>
            <input
              type="text"
              placeholder="Full Name as per Bank"
              value={bankHolder}
              onChange={(e) => setBankHolder(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                Bank Account Number
              </label>
              <input
                type="text"
                placeholder="000123456789"
                value={bankAccNumber}
                onChange={(e) => setBankAccNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="HDFC0001234"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white uppercase focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
              UPI ID (Optional for Instant Payouts)
            </label>
            <input
              type="text"
              placeholder="developer@okhdfcbank"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setShowBankModal(false)}
              className="px-4 py-2 min-h-[44px] text-xs text-zinc-600 dark:text-zinc-300"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={savingBank}
              className="px-5 py-2 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition-colors shadow-md flex items-center gap-2"
            >
              {savingBank ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : null}
              <span>Save Settlement Account</span>
            </button>
          </div>
        </form>
      </PlatformModal>
    </div>
  );
}

