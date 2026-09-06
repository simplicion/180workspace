"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PhoneCall, Bot, Smartphone, Megaphone, Activity, Plus, Play, 
  RefreshCw, CheckCircle2, Clock, IndianRupee, ArrowUpRight, ShieldCheck, 
  Radio, X, Sparkles, ChevronRight, Mic, Users, ArrowRight,
  Database, Calendar, ShoppingBag, Brain, Gauge, PhoneForwarded,
  Lock, AlertTriangle
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSubscription } from '@/lib/useSubscription';
import { UniversalSkeleton, FeatureLock, PlatformModal } from '@workspace/ui';
import { BrowserSoftphoneModal } from './_components/BrowserSoftphoneModal';
import { WalletLedgerDrawer } from './_components/WalletLedgerDrawer';
import clsx from 'clsx';

/**
 * 180 Voiceforce: Central Operations Dashboard
 * 
 * Capabilities:
 * - Enterprise AI voice employee overview with active call metrics
 * - Live prepaid wallet balance management with atomic recharge & auto-topup rules
 * - Connected Enterprise Business Brain context widget (Catalog truth + CRM recognition + Calendar)
 * - Browser WebRTC softphone tester for zero-cost internal testing
 * - Instant outbound telephone dialer with live BullMQ worker queuing
 */
export default function VoiceforceDashboardPage() {
  const { companyConfig, loading: subLoading } = useSubscription();
  const [metrics, setMetrics] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [numbers, setNumbers] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [forwardingRulesCount, setForwardingRulesCount] = useState<number>(0);
  const [queuesCount, setQueuesCount] = useState<number>(0);
  const [campaignsCount, setCampaignsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers State
  const [isDialModalOpen, setIsDialModalOpen] = useState(false);
  const [isSoftphoneOpen, setIsSoftphoneOpen] = useState(false);
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false);

  // Instant Dial Form State
  const [dialForm, setDialForm] = useState({
    recipientPhone: '',
    recipientName: '',
    voiceAgentId: '',
    phoneNumberId: ''
  });
  const [dialing, setDialing] = useState(false);

  const enabledApps = Array.isArray(companyConfig?.enabledApps) ? companyConfig.enabledApps : [];
  const hasApp = enabledApps.includes('voiceforce') || enabledApps.includes('operations') || enabledApps.length === 0;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, agentsRes, numbersRes, callsRes, rulesRes, queuesRes, campaignsRes] = await Promise.all([
        api.get('/api/v1/voiceforce/metrics').catch(() => ({ data: { data: null } })),
        api.get('/api/v1/voiceforce/agents').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/numbers').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/calls').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/forwarding').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/queues').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/campaigns').catch(() => ({ data: { data: [] } }))
      ]);

      setMetrics(metricsRes.data?.data || null);
      setAgents(agentsRes.data?.data || []);
      setNumbers(numbersRes.data?.data || []);
      setRecentCalls((callsRes.data?.data || []).slice(0, 8));
      setForwardingRulesCount((rulesRes.data?.data || []).length);
      setQueuesCount((queuesRes.data?.data || []).length);
      setCampaignsCount((campaignsRes.data?.data || []).length);

      if (agentsRes.data?.data?.length > 0 && !dialForm.voiceAgentId) {
        setDialForm(prev => ({ ...prev, voiceAgentId: agentsRes.data.data[0].id }));
      }
    } catch (err: any) {
      console.error('Error loading Voiceforce dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasApp) {
      fetchData();
    }
  }, [hasApp]);

  const handleLaunchCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialForm.recipientPhone || !dialForm.voiceAgentId) {
      toast.error('Recipient phone and AI agent are required');
      return;
    }

    try {
      setDialing(true);
      const res = await api.post('/api/v1/voiceforce/calls/dispatch-single', dialForm);
      if (res.data?.success) {
        toast.success(`Call dispatched to ${dialForm.recipientPhone}!`);
        setIsDialModalOpen(false);
        setDialForm({ recipientPhone: '', recipientName: '', voiceAgentId: agents[0]?.id || '', phoneNumberId: '' });
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to dispatch call');
    } finally {
      setDialing(false);
    }
  };

  if (subLoading || (loading && !metrics)) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm max-w-7xl mx-auto space-y-6">
        <UniversalSkeleton type="metrics" />
      </div>
    );
  }

  if (!hasApp) {
    return <FeatureLock requiredApp="180 Voiceforce" />;
  }

  const walletBalance = metrics?.wallet?.balanceInr ?? 0.0;
  const minRequired = Number(metrics?.wallet?.minRequiredInr || 200);
  const recommendedInr = Number(metrics?.wallet?.recommendedInr || 1000);
  const ratePerMinute = Number(metrics?.wallet?.ratePerMinuteInr || 6);
  const isLocked = metrics?.wallet?.isLocked ?? (walletBalance < minRequired);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16 max-w-7xl mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              180 Voiceforce
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              Autonomous Voice AI
            </span>
            <button
              onClick={() => setIsWalletDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 cursor-pointer transition-colors"
              title="Open Voice Balance & Ledger"
            >
              <IndianRupee className="w-3 h-3" />
              <span>Balance: ₹{walletBalance.toFixed(2)}</span>
              <span className="text-[10px] bg-amber-200/70 dark:bg-amber-800/60 px-1.5 py-0.2 rounded-full font-bold">+ Manage</span>
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
            Autonomous AI voice employees for customer calling, appointments, and live catalog orders at ~₹{ratePerMinute.toFixed(2)}/min.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchData()}
            className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700/80 text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-700 transition-colors cursor-pointer shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin text-indigo-600")} />
          </button>

          <Link
            href="/voiceforce/agents"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 text-sm font-semibold border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
          >
            <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>AI Employees</span>
          </Link>

          <Link
            href="/voiceforce/forwarding"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 text-sm font-semibold border border-gray-200 dark:border-gray-700 transition-colors shadow-sm"
          >
            <PhoneForwarded className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Call Forwarding</span>
          </Link>

          <button
            onClick={() => setIsSoftphoneOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-sm font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Test in Browser (₹0)</span>
          </button>

          <button
            onClick={() => {
              if (isLocked) {
                toast.error(`Voiceforce is locked. Minimum ₹${minRequired.toFixed(2)} wallet balance required to make calls. Please top up ₹${recommendedInr.toFixed(2)}.`);
                setIsWalletDrawerOpen(true);
                return;
              }
              setIsDialModalOpen(true);
            }}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-all cursor-pointer",
              isLocked
                ? "bg-gray-400 dark:bg-gray-700 hover:bg-gray-500"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
            )}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{isLocked ? `Locked (Min ₹${minRequired.toFixed(0)})` : 'Instant Call'}</span>
          </button>
        </div>
      </div>

      {/* 5 Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Voice Balance */}
        <div 
          onClick={() => setIsWalletDrawerOpen(true)}
          className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-amber-200/80 dark:border-amber-900/40 shadow-sm flex flex-col justify-between hover:border-amber-400 dark:hover:border-amber-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Voice Balance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">₹{walletBalance.toFixed(2)}</div>
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <span>View Ledger & Top Up</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Metric 2: Live Calls */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Live Calls</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.activeCallsCount || 0}</span>
              {(metrics?.activeCallsCount || 0) > 0 && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Simultaneous active sessions</p>
          </div>
        </div>

        {/* Metric 3: Total Minutes */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Minutes</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.totalMinutes || 0} min</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Avg duration: {metrics?.avgDurationSec || 0}s</p>
          </div>
        </div>

        {/* Metric 4: Answer Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Answer Rate</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.answerRate || 0}%</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{metrics?.totalCalls || 0} lifetime calls</p>
          </div>
        </div>

        {/* Metric 5: Conversion Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Goal Conversions</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.conversionRate || 0}%</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Orders & appointments</p>
          </div>
        </div>
      </div>

      {/* Enterprise Business Brain Context Widget */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-50/70 via-indigo-50/60 to-purple-50/70 dark:from-violet-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 border border-violet-100/90 dark:border-violet-900/40 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-600/20 flex-shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Connected Enterprise Business Brain</h3>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                AI employees speak official product pricing, recognize CRM customers, and book appointments into 180 Calendar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 shadow-xs">
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Authoritative Catalog Pricing</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 shadow-xs">
              <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span>CRM Client Recognition</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Calendar Booking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voiceforce Comprehensive Feature Hub Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Voiceforce Operations & Feature Hub</h2>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">All 6 core modules active & synchronized</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. AI Voice Employees */}
          <Link
            href="/voiceforce/agents"
            className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 hover:border-indigo-500/50 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Bot className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                {agents.length} Deployed
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                AI Voice Employees
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Autonomous agents with Cartesia neural TTS, prompt knowledge & tool access.
              </p>
            </div>
          </Link>

          {/* 2. Phone Numbers & DIDs */}
          <Link
            href="/voiceforce/numbers"
            className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 hover:border-emerald-500/50 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                {numbers.length} Numbers
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                Phone Numbers & DIDs
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Purchase international/local carrier DIDs or verify custom caller IDs for instant use.
              </p>
            </div>
          </Link>

          {/* 3. Call Forwarding & Queues (PREMIER HIGHLIGHT) */}
          <Link
            href="/voiceforce/forwarding"
            className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 dark:from-indigo-950/30 dark:via-gray-900 dark:to-purple-950/20 border-2 border-indigo-300/80 dark:border-indigo-700/60 hover:border-indigo-500 hover:shadow-lg transition-all group flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent pointer-events-none" />
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                <PhoneForwarded className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                  {forwardingRulesCount} Rules
                </span>
                {queuesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                    {queuesCount} Queues
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-indigo-950 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                  Call Forwarding & Queues
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-600 text-white uppercase">
                  Premier
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Waterfall overflow, simultaneous hunt groups, multi-agent hold queues & business hours.
              </p>
            </div>
          </Link>

          {/* 4. Call Campaigns */}
          <Link
            href="/voiceforce/campaigns"
            className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 hover:border-violet-500/50 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Megaphone className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60">
                {campaignsCount} Campaigns
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors flex items-center gap-1.5">
                Call Campaigns
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                High-throughput outbound dialers with automated concurrency and lead list scheduling.
              </p>
            </div>
          </Link>

          {/* 5. Live Stream & Logs */}
          <Link
            href="/voiceforce/calls"
            className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 hover:border-blue-500/50 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                {metrics?.totalCalls || 0} Total
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                Live Stream & Logs
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Real-time audio streaming, full turn-by-turn transcripts, and AI post-call analysis.
              </p>
            </div>
          </Link>

          {/* 6. Compliance & DNC */}
          <Link
            href="/voiceforce/compliance"
            className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 hover:border-amber-500/50 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                TRAI & TCPA
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                Compliance & DNC
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Global Do-Not-Call list suppression, consent verification, and automatic scrubbing.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* 2-Column Section: Active AI Employees & Recent Call Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1 Col): AI Voice Employees */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Active AI Employees</h2>
              </div>
              <Link
                href="/voiceforce/agents"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span>View All ({agents.length})</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {agents.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  No AI voice employees configured yet.
                </div>
              ) : (
                agents.slice(0, 4).map((agent) => (
                  <div
                    key={agent.id}
                    className="p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-150 dark:border-gray-750 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 dark:text-white truncate">
                        {agent.name}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {agent.role || 'Assistant'} • Cartesia Sonic-3
                      </div>
                    </div>
                    <span className={clsx(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      agent.isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    )}>
                      {agent.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Link
              href="/voiceforce/numbers"
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-xs font-semibold text-gray-800 dark:text-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Connected Phone Numbers ({numbers.length})</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>

            <Link
              href="/voiceforce/forwarding"
              className="mt-2 flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-xs font-semibold text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <PhoneForwarded className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Call Forwarding & Hunt Groups</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
            </Link>
          </div>
        </div>

        {/* Right Column (2 Cols): Live Call Stream & History */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recent Call Stream</h2>
              </div>
              <Link
                href="/voiceforce/calls"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span>Full Call Stream</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
              {recentCalls.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400">
                  No call sessions recorded yet. Launch an instant call or campaign to begin.
                </div>
              ) : (
                recentCalls.map((call) => (
                  <Link
                    key={call.id}
                    href={`/voiceforce/calls/${call.id}`}
                    className="p-3 flex items-center justify-between gap-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group block rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={clsx(
                        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                        call.direction === 'inbound'
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                          : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                      )}>
                        <PhoneCall className="w-3.5 h-3.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {call.recipientPhone}
                          </span>
                          {call.recipientName && (
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              ({call.recipientName})
                            </span>
                          )}
                          <span className={clsx(
                            "px-2 py-0.2 rounded-full text-[9px] font-bold uppercase",
                            call.status === 'completed' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                            call.status === 'in_progress' ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 animate-pulse" :
                            "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                          )}>
                            {call.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          Agent: <strong className="text-gray-700 dark:text-gray-300 font-medium">{call.voiceAgent?.name || 'Autonomous Agent'}</strong> • {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3 flex-shrink-0">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white">
                          ₹{call.estimatedCostInr ? Number(call.estimatedCostInr).toFixed(2) : '0.00'}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {call.durationSeconds || 0}s
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Instant Dial PlatformModal */}
      <PlatformModal
        isOpen={isDialModalOpen}
        onClose={() => setIsDialModalOpen(false)}
        title="Launch Instant AI Call"
        icon={PhoneCall}
        iconColorClass="text-indigo-600 dark:text-indigo-400"
        iconBgClass="bg-indigo-50 dark:bg-indigo-950/60"
        onSubmit={handleLaunchCall}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsDialModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={dialing}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {dialing ? 'Dialing...' : 'Dispatch Call Now'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Recipient Phone Number *
            </label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210 (E.164 format with country code)"
              value={dialForm.recipientPhone}
              onChange={(e) => setDialForm({ ...dialForm, recipientPhone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Customer Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={dialForm.recipientName}
              onChange={(e) => setDialForm({ ...dialForm, recipientName: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Assign AI Voice Employee *
            </label>
            <select
              required
              value={dialForm.voiceAgentId}
              onChange={(e) => setDialForm({ ...dialForm, voiceAgentId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.role || 'Sales/Support'})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-800 dark:text-indigo-300">
            Calls are dispatched through Telnyx SIP with Cartesia Ink-2 speech recognition and Sonic-3 voice synthesis.
          </div>
        </div>
      </PlatformModal>

      {/* Browser WebRTC Softphone Modal (₹0 Telecom Cost) */}
      <BrowserSoftphoneModal
        isOpen={isSoftphoneOpen}
        onClose={() => setIsSoftphoneOpen(false)}
        agents={agents || []}
        voiceAgentId={dialForm.voiceAgentId || agents?.[0]?.id}
        voiceAgentName={agents?.find(a => a.id === dialForm.voiceAgentId)?.name || agents?.[0]?.name || 'Test AI Agent'}
      />

      {/* Universal Slide Drawer: Wallet Ledger & Auto-Recharge */}
      <WalletLedgerDrawer
        isOpen={isWalletDrawerOpen}
        onClose={() => setIsWalletDrawerOpen(false)}
        onBalanceUpdated={fetchData}
      />
    </div>
  );
}
