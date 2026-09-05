"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PhoneCall, Bot, Smartphone, Megaphone, Activity, Plus, Play, 
  RefreshCw, CheckCircle2, Clock, IndianRupee, ArrowUpRight, ShieldCheck, 
  Radio, X, Sparkles, ChevronRight, Mic
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSubscription } from '@/lib/useSubscription';
import { LogoLoader, FeatureLock } from '@workspace/ui';
import { BrowserSoftphoneModal } from './_components/BrowserSoftphoneModal';

export default function VoiceforceDashboardPage() {
  const { companyConfig, loading: subLoading } = useSubscription();
  const [metrics, setMetrics] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [numbers, setNumbers] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Dial Modal State
  const [isDialModalOpen, setIsDialModalOpen] = useState(false);
  const [isSoftphoneOpen, setIsSoftphoneOpen] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(250);
  const [isRecharging, setIsRecharging] = useState(false);
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
      const [metricsRes, agentsRes, numbersRes, callsRes] = await Promise.all([
        api.get('/api/v1/voiceforce/metrics').catch(() => ({ data: { data: null } })),
        api.get('/api/v1/voiceforce/agents').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/numbers').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/calls').catch(() => ({ data: { data: [] } }))
      ]);

      setMetrics(metricsRes.data?.data || null);
      setAgents(agentsRes.data?.data || []);
      setNumbers(numbersRes.data?.data || []);
      setRecentCalls((callsRes.data?.data || []).slice(0, 10));

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

  const handleWalletRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargeAmount || rechargeAmount <= 0) {
      toast.error('Please enter a valid recharge amount');
      return;
    }

    try {
      setIsRecharging(true);
      const res = await api.post('/api/v1/voiceforce/wallet/recharge', {
        amountInr: rechargeAmount,
        paymentRef: `manual_topup_${Date.now()}`
      });

      if (res.data?.success) {
        toast.success(`Wallet credited with ₹${rechargeAmount.toFixed(2)}!`);
        setIsRechargeModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to recharge wallet');
    } finally {
      setIsRecharging(false);
    }
  };

  if (subLoading || (loading && !metrics)) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!hasApp) {
    return <FeatureLock requiredApp="180 Voiceforce" />;
  }

  const walletBalance = metrics?.wallet?.balanceInr ?? 0.0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-purple-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <PhoneCall className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">180 Voiceforce</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              LiveKit Room Media + Telnyx Trunk
            </span>
            <button
              onClick={() => setIsRechargeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer transition-colors"
            >
              <IndianRupee className="w-3 h-3" />
              <span>Balance: ₹{walletBalance.toFixed(2)}</span>
              <span className="text-[10px] bg-amber-500/30 px-1.5 py-0.2 rounded-full font-bold">+ Top Up</span>
            </button>
          </div>
          <p className="text-sm text-slate-300">
            Autonomous AI voice employees for customer calling, appointments, and live catalog orders at ~₹1.28/min.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => fetchData()}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/voiceforce/agents"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium border border-white/10 transition-colors"
          >
            <Bot className="w-4 h-4 text-indigo-300" />
            <span>AI Employees</span>
          </Link>

          <button
            onClick={() => setIsSoftphoneOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 transition-all cursor-pointer"
          >
            <Mic className="w-4 h-4 text-violet-200" />
            <span>Test in Browser (₹0)</span>
          </button>

          <button
            onClick={() => setIsDialModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Instant Call</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Wallet Balance Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-300">Voice Balance</span>
            <IndianRupee className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-amber-300">₹{walletBalance.toFixed(2)}</span>
            </div>
            <button
              onClick={() => setIsRechargeModalOpen(true)}
              className="mt-2 text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 cursor-pointer flex items-center gap-1"
            >
              <span>Recharge Wallet</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Live Calls */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Active Live Calls</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{metrics?.activeCallsCount || 0}</span>
            <span className="text-xs text-emerald-400 font-medium">In Progress</span>
          </div>
        </div>

        {/* Answer Rate */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Answer Rate</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{metrics?.answerRate ?? 0}%</span>
            <span className="text-xs text-slate-400 font-medium">connected</span>
          </div>
        </div>

        {/* Avg Duration */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Avg Duration</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{metrics?.avgDurationSec ?? 0}</span>
            <span className="text-xs text-slate-400 font-medium">seconds</span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Conversions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400">{metrics?.conversionRate ?? 0}%</span>
            <span className="text-xs text-slate-400 font-medium">deals/orders</span>
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/voiceforce/agents"
          className="group p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 border border-white/10 transition-all shadow-md"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Bot className="w-5 h-5" />
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-white">Configure AI Employees</h3>
          <p className="text-xs text-slate-400 mt-1">
            Build custom voice personas with prompt guardrails, Cartesia voices, and 180workspace tools.
          </p>
        </Link>

        <Link
          href="/voiceforce/numbers"
          className="group p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 border border-white/10 transition-all shadow-md"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-white">Phone Numbers & Caller ID</h3>
          <p className="text-xs text-slate-400 mt-1">
            Buy dedicated virtual numbers or verify your existing business mobile for outbound caller ID.
          </p>
        </Link>

        <Link
          href="/voiceforce/campaigns"
          className="group p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 border border-white/10 transition-all shadow-md"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Megaphone className="w-5 h-5" />
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-white">Outbound Call Campaigns</h3>
          <p className="text-xs text-slate-400 mt-1">
            Launch automated multi-call batches with CPS throttles and automatic follow-up task creation.
          </p>
        </Link>

        <Link
          href="/voiceforce/compliance"
          className="group p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 border border-white/10 transition-all shadow-md"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-base font-semibold text-white">Compliance & DNC List</h3>
          <p className="text-xs text-slate-400 mt-1">
            TRAI/TCPA legal calling hours, Do-Not-Call suppression, and mandatory recording disclosures.
          </p>
        </Link>
      </div>

      {/* Recent Call Logs */}
      <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Call Sessions</h2>
            <p className="text-xs text-slate-400">Real-time transcripts, duration, sentiment, and executed tools.</p>
          </div>
          <Link
            href="/voiceforce/calls"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <span>View All Calls</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentCalls.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <PhoneCall className="w-8 h-8 mx-auto text-slate-500 mb-2 opacity-50" />
            <p className="text-sm">No call sessions recorded yet.</p>
            <p className="text-xs text-slate-500 mt-1">Click "Instant Call" to launch your first test call.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentCalls.map((call) => (
              <div key={call.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`p-2 rounded-xl text-xs font-semibold ${
                    call.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    call.status === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    <PhoneCall className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{call.recipientPhone}</span>
                      {call.recipientName && (
                        <span className="text-xs text-slate-400 font-normal">({call.recipientName})</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Agent: <span className="text-indigo-300 font-medium">{call.voiceAgent?.name || 'Voice Agent'}</span> • {new Date(call.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {call.sentiment && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      call.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400' :
                      call.sentiment === 'negative' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-slate-500/10 text-slate-300'
                    }`}>
                      {call.sentiment}
                    </span>
                  )}
                  <div className="text-right">
                    <span className="text-sm font-medium text-white">{call.durationSeconds || 0}s</span>
                    <p className="text-xs text-slate-400">₹{call.estimatedCostInr || '0.00'}</p>
                  </div>
                  <Link
                    href={`/voiceforce/calls/${call.id}`}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instant Call Modal */}
      {isDialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsDialModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Play className="w-5 h-5 fill-indigo-400" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Instant Outbound Call</h3>
                <p className="text-xs text-slate-400">Make an AI employee call a customer immediately.</p>
              </div>
            </div>

            <form onSubmit={handleLaunchCall} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select AI Employee</label>
                <select
                  value={dialForm.voiceAgentId}
                  onChange={(e) => setDialForm({ ...dialForm, voiceAgentId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                >
                  {agents.length === 0 ? (
                    <option value="">No agents found (Create one first)</option>
                  ) : (
                    agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>{ag.name} ({ag.role})</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Customer Phone Number (E.164)</label>
                <input
                  type="text"
                  placeholder="+919876543210 or +14155552671"
                  value={dialForm.recipientPhone}
                  onChange={(e) => setDialForm({ ...dialForm, recipientPhone: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Customer Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={dialForm.recipientName}
                  onChange={(e) => setDialForm({ ...dialForm, recipientName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDialModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dialing || agents.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {dialing ? 'Dialing Phone...' : 'Start Call Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voice Wallet Top Up Modal */}
      {isRechargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsRechargeModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <IndianRupee className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Top Up Voice Wallet</h3>
                <p className="text-xs text-slate-400">Current Balance: ₹{walletBalance.toFixed(2)} (Estimated ~₹1.28/min)</p>
              </div>
            </div>

            <form onSubmit={handleWalletRecharge} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Select Amount (INR)</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[100, 250, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        rechargeAmount === amt
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-medium text-slate-400 mb-1">Custom Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Approximate Calling Time:</span>
                  <span className="text-white font-medium">~{Math.round(rechargeAmount / 1.28)} mins</span>
                </div>
                <div className="flex justify-between">
                  <span>Per-second Billing:</span>
                  <span className="text-emerald-400 font-medium">Strict 60s minimum + exact</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRechargeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecharging || rechargeAmount <= 0}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isRecharging ? 'Processing...' : `Add ₹${rechargeAmount} to Wallet`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zero-Cost In-Browser Softphone Tester Modal */}
      <BrowserSoftphoneModal
        isOpen={isSoftphoneOpen}
        onClose={() => setIsSoftphoneOpen(false)}
        agents={agents}
        onCallEnded={() => fetchData()}
      />
    </div>
  );
}
