"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  PhoneCall, Bot, Smartphone, Megaphone, Activity, Plus, Play, 
  RefreshCw, CheckCircle2, Clock, Coins, ArrowUpRight, 
  Radio, X, Sparkles, ChevronRight, Mic, Users, ArrowRight,
  Database, Calendar, ShoppingBag, Brain, Gauge, PhoneForwarded,
  Lock, AlertTriangle, FileText, Wand2, Check
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSubscription } from '@/lib/useSubscription';
import { useAuth } from '@/lib/auth-context';
import { locationService } from '@/lib/location-service';
import { UniversalSkeleton, FeatureLock } from '@workspace/ui';
import { BrowserSoftphoneModal } from './_components/BrowserSoftphoneModal';
import { WalletLedgerDrawer } from './_components/WalletLedgerDrawer';
import { CreateCampaignDrawer } from './_components/CreateCampaignDrawer';
import clsx from 'clsx';

/**
 * 180 Voiceforce: Central Operations Dashboard
 * 
 * Capabilities:
 * - Enterprise AI voice employee overview with active call metrics
 * - Live prepaid wallet balance management with atomic recharge & auto-topup rules
 * - Connected Enterprise Business Brain context widget (Catalog truth + CRM recognition + Calendar)
 * - Browser WebRTC softphone tester for zero-cost internal testing
 * - Instant outbound telephone dialer & high-throughput campaigns drawer
 * - Infinite scroll lazy loading for recent call logs
 */
export default function VoiceforceDashboardPage() {
  const { companyConfig, loading: subLoading } = useSubscription();
  const { company } = useAuth();
  const currencyCode = (company?.currency || 'USD').toUpperCase();
  const currencySymbol = company?.currencySymbol || locationService.getCurrencySymbol(currencyCode);
  const isUsd = currencyCode === 'USD';

  const [metrics, setMetrics] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [numbers, setNumbers] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [forwardingRulesCount, setForwardingRulesCount] = useState<number>(0);
  const [queuesCount, setQueuesCount] = useState<number>(0);
  const [campaignsCount, setCampaignsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers State
  const [isCampaignDrawerOpen, setIsCampaignDrawerOpen] = useState(false);
  const [isSoftphoneOpen, setIsSoftphoneOpen] = useState(false);
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false);

  // Lazy Loading Infinite Scroll State for Recent Call Stream
  const [callsPage, setCallsPage] = useState(1);
  const [hasMoreCalls, setHasMoreCalls] = useState(true);
  const [loadingMoreCalls, setLoadingMoreCalls] = useState(false);
  const callStreamContainerRef = useRef<HTMLDivElement>(null);

  const enabledApps = Array.isArray(companyConfig?.enabledApps) ? companyConfig.enabledApps : [];
  const hasApp = enabledApps.includes('voiceforce') || enabledApps.includes('operations') || enabledApps.length === 0;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, agentsRes, numbersRes, callsRes, rulesRes, queuesRes, campaignsRes] = await Promise.all([
        api.get('/api/v1/voiceforce/metrics').catch(() => ({ data: { data: null } })),
        api.get('/api/v1/voiceforce/agents').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/numbers').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/calls?page=1&limit=10').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/forwarding').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/queues').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/campaigns').catch(() => ({ data: { data: [] } }))
      ]);

      setMetrics(metricsRes.data?.data || null);
      setAgents(agentsRes.data?.data || []);
      setNumbers(numbersRes.data?.data || []);
      
      const initialCalls = callsRes.data?.data || [];
      setRecentCalls(initialCalls);
      setCallsPage(1);
      const totalPages = callsRes.data?.pagination?.totalPages || 1;
      setHasMoreCalls(initialCalls.length >= 10 && totalPages > 1);

      setForwardingRulesCount((rulesRes.data?.data || []).length);
      setQueuesCount((queuesRes.data?.data || []).length);
      setCampaignsCount((campaignsRes.data?.data || []).length);
    } catch (err: any) {
      console.error('Error loading Voiceforce dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreCalls = async () => {
    if (loadingMoreCalls || !hasMoreCalls) return;
    try {
      setLoadingMoreCalls(true);
      const nextPage = callsPage + 1;
      const res = await api.get(`/api/v1/voiceforce/calls?page=${nextPage}&limit=10`);
      const newCalls = res.data?.data || [];
      const pagination = res.data?.pagination;

      if (newCalls.length === 0 || (pagination && nextPage >= pagination.totalPages)) {
        setHasMoreCalls(false);
      }

      setRecentCalls(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const uniqueNew = newCalls.filter((c: any) => !existingIds.has(c.id));
        return [...prev, ...uniqueNew];
      });
      setCallsPage(nextPage);
    } catch (err) {
      console.error('Failed to lazy load calls:', err);
    } finally {
      setLoadingMoreCalls(false);
    }
  };

  const handleCallsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      if (hasMoreCalls && !loadingMoreCalls) {
        loadMoreCalls();
      }
    }
  };

  useEffect(() => {
    if (hasApp) {
      fetchData();
      // Auto-refresh every 4s for active call tracking
      const interval = setInterval(async () => {
        try {
          const [metricsRes, callsRes] = await Promise.all([
            api.get('/api/v1/voiceforce/metrics').catch(() => ({ data: { data: null } })),
            api.get('/api/v1/voiceforce/calls?page=1&limit=10').catch(() => ({ data: { data: [] } }))
          ]);
          if (metricsRes.data?.data) setMetrics(metricsRes.data.data);
          if (callsRes.data?.data) {
            const freshTopCalls = callsRes.data.data;
            setRecentCalls(prev => {
              const freshMap = new Map(freshTopCalls.map((c: any) => [c.id, c]));
              const updatedExisting = prev.map(c => freshMap.get(c.id) || c);
              const existingIds = new Set(prev.map(c => c.id));
              const brandNew = freshTopCalls.filter((c: any) => !existingIds.has(c.id));
              return [...brandNew, ...updatedExisting];
            });
          }
        } catch {}
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [hasApp]);

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
  const minRequired = Number(metrics?.wallet?.minRequiredInr || (isUsd ? 10 : 200));
  const recommendedInr = Number(metrics?.wallet?.recommendedInr || (isUsd ? 50 : 1000));
  const ratePerMinute = Number(metrics?.wallet?.ratePerMinuteInr || (isUsd ? 0.053 : 6.10));
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
              <Coins className="w-3 h-3" />
              <span>Balance: {currencySymbol}{walletBalance.toFixed(2)}</span>
              <span className="text-[10px] bg-amber-200/70 dark:bg-amber-800/60 px-1.5 py-0.2 rounded-full font-bold">+ Manage</span>
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
            Autonomous AI voice employees for customer calling, appointments, and live catalog orders at ~{currencySymbol}{ratePerMinute.toFixed(2)}/min.
          </p>
        </div>

        {/* Action Controls: Test in Browser & Instant Call Drawer */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsSoftphoneOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-sm font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Test in Browser (Free)</span>
          </button>

          <button
            onClick={() => {
              if (isLocked) {
                toast.error(`Voiceforce is locked. Minimum ${currencySymbol}${minRequired.toFixed(2)} wallet balance required to make calls. Please top up ${currencySymbol}${recommendedInr.toFixed(2)}.`);
                setIsWalletDrawerOpen(true);
                return;
              }
              setIsCampaignDrawerOpen(true);
            }}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-all cursor-pointer",
              isLocked
                ? "bg-gray-400 dark:bg-gray-700 hover:bg-gray-500"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
            )}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{isLocked ? `Locked (Min ${currencySymbol}${minRequired.toFixed(0)})` : 'Instant Call'}</span>
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
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform font-bold text-sm">
              {currencySymbol}
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {currencySymbol}{walletBalance.toFixed(2)}
            </div>
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
      <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-50/80 via-indigo-50/70 to-purple-50/80 dark:from-violet-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 border border-violet-200/90 dark:border-violet-800/50 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-600/25 flex-shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Connected Enterprise Business Brain & RAG Vaults</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 max-w-2xl">
                AI employees speak official product pricing, recognize CRM customers, access 5GB scoped RAG vaults, and book appointments into 180 Calendar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/voiceforce/brain"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-sm shadow-violet-600/20 transition-all cursor-pointer"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Open Business Brain & Vaults</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/documents"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>180 Documents</span>
            </Link>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-violet-100 dark:border-violet-900/40 flex items-center gap-3 text-xs font-semibold text-gray-700 dark:text-gray-300 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-violet-100 dark:border-violet-900/40 shadow-2xs">
            <ShoppingBag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Authoritative Catalog Pricing</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-violet-100 dark:border-violet-900/40 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>CRM Client Recognition</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-violet-100 dark:border-violet-900/40 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Calendar Booking</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-violet-100 dark:border-violet-900/40 shadow-2xs">
            <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>5GB Scoped RAG Vaults</span>
          </div>
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

            <div 
              ref={callStreamContainerRef}
              onScroll={handleCallsScroll}
              className="mt-3 divide-y divide-gray-100 dark:divide-gray-800 max-h-[580px] overflow-y-auto pr-1"
            >
              {recentCalls.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400">
                  No call sessions recorded yet. Launch an instant call or campaign to begin.
                </div>
              ) : (
                <>
                  {recentCalls.map((call) => (
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
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1",
                              call.status === 'completed' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40" :
                              call.status === 'in_progress' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 animate-pulse" :
                              call.status === 'dialing' ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-800 animate-pulse" :
                              call.status === 'ringing' ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-800 animate-pulse" :
                              call.status === 'no_answer' ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-800" :
                              call.status === 'busy' ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200 dark:border-orange-800" :
                              call.status === 'failed' ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-800" :
                              "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse"
                            )}>
                              {call.status === 'in_progress' ? 'Live Talking' :
                               call.status === 'dialing' ? 'Dialing...' :
                               call.status === 'ringing' ? 'Ringing...' :
                               call.status === 'no_answer' ? "Didn't Answer" :
                               call.status === 'busy' ? 'Line Busy' :
                               call.status === 'failed' ? 'Failed' :
                               call.status === 'completed' ? 'Completed' : 'Queued'}
                            </span>
                          </div>
                          {call.disconnectReason && (call.status === 'failed' || call.status === 'no_answer' || call.status === 'busy') ? (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 truncate max-w-[280px]" title={call.disconnectReason}>
                              ⚠️ {call.disconnectReason}
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              Agent: <strong className="text-gray-700 dark:text-gray-300 font-medium">{call.voiceAgent?.name || 'Autonomous Agent'}</strong> • {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3 flex-shrink-0">
                        <div>
                          <div className="text-xs font-bold text-gray-900 dark:text-white">
                            {call.companyCurrencySymbol || currencySymbol}{call.estimatedCostInr ? Number(call.estimatedCostInr).toFixed(2) : '0.00'}
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {call.durationSeconds || 0}s
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  ))}

                  {/* Lazy Loading More Indicator */}
                  {loadingMoreCalls && (
                    <div className="py-3 flex items-center justify-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading more calls...</span>
                    </div>
                  )}

                  {/* End of call stream notice */}
                  {!hasMoreCalls && recentCalls.length > 0 && (
                    <div className="py-3 text-center text-[11px] text-gray-400 dark:text-gray-500">
                      All recorded calls loaded ({recentCalls.length})
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Campaign & Direct Dial Drawer */}
      <CreateCampaignDrawer
        isOpen={isCampaignDrawerOpen}
        onClose={() => setIsCampaignDrawerOpen(false)}
        agents={agents}
        numbers={numbers}
        initialMode="single"
        onSuccess={fetchData}
      />

      {/* Browser WebRTC Softphone Modal (₹0 Telecom Cost) */}
      <BrowserSoftphoneModal
        isOpen={isSoftphoneOpen}
        onClose={() => setIsSoftphoneOpen(false)}
        agents={agents || []}
        voiceAgentId={agents?.[0]?.id || ''}
        voiceAgentName={agents?.[0]?.name || 'Test AI Agent'}
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
