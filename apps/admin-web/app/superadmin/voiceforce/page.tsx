'use client';

import { useEffect, useState } from 'react';
import { 
  PhoneCall, ShieldAlert, Activity, Server, Radio, Zap,
  TrendingUp, RefreshCw, AlertTriangle, Building2, CheckCircle2,
  XCircle, Clock, DollarSign, Bot
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { Skeleton } from '@workspace/ui';

export default function SuperadminVoiceforcePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [halting, setHalting] = useState(false);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await saApi.get('/voiceforce');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load Voiceforce platform status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s live polling
    return () => clearInterval(interval);
  }, []);

  const handleGlobalHalt = async () => {
    if (!confirm('⚠️ EMERGENCY ACTION: Are you sure you want to pause all active campaigns platform-wide?')) return;
    try {
      setHalting(true);
      const res = await saApi.post('/voiceforce/killswitch', { action: 'halt_all_campaigns' });
      if (res.data?.success) {
        toast.success(res.data.message || 'All campaigns halted');
        loadData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to execute killswitch');
    } finally {
      setHalting(false);
    }
  };

  const handleSuspendTenant = async (companyId: string, companyName: string) => {
    if (!confirm(`Are you sure you want to suspend Voiceforce calling for "${companyName}"?`)) return;
    try {
      setSuspendingId(companyId);
      const res = await saApi.post('/voiceforce/killswitch', { action: 'suspend_tenant', companyId });
      if (res.data?.success) {
        toast.success(`Voiceforce suspended for ${companyName}`);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to suspend tenant');
    } finally {
      setSuspendingId(null);
    }
  };

  const metrics = data?.metrics || {};
  const providers = data?.providers || [];
  const tenants = data?.tenants || [];

  return (
    <div className="space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <PhoneCall className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">180 Voiceforce SFU & Telephony</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Global real-time monitoring of LiveKit WebRTC SFU, Telnyx SIP trunks, AI engines, and tenant calling ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleGlobalHalt}
            disabled={halting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{halting ? 'Halting...' : 'Halt All Campaigns'}</span>
          </button>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Live Concurrent Calls</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {loading ? <Skeleton className="h-7 w-16" /> : metrics.liveSessions || 0}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Sub-500ms SFU latency
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="text-xs text-slate-500 mb-2">Total Platform Calls</div>
          <div className="text-2xl font-bold text-slate-900">
            {loading ? <Skeleton className="h-7 w-16" /> : metrics.totalSessions || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.completedSessions || 0} completed
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="text-xs text-slate-500 mb-2">Deployed AI Employees</div>
          <div className="text-2xl font-bold text-slate-900">
            {loading ? <Skeleton className="h-7 w-16" /> : metrics.totalAgents || 0}
          </div>
          <p className="text-[11px] text-indigo-600 mt-1 flex items-center gap-1">
            <Bot className="w-3 h-3" /> Across {metrics.totalCompanies || 0} workspaces
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="text-xs text-slate-500 mb-2">Active Campaigns</div>
          <div className="text-2xl font-bold text-slate-900">
            {loading ? <Skeleton className="h-7 w-16" /> : metrics.totalCampaigns || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">BullMQ queue active</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="text-xs text-slate-500 mb-2">Gross Unit Margin</div>
          <div className="text-2xl font-bold text-emerald-600">
            {loading ? <Skeleton className="h-7 w-16" /> : `${metrics.grossMarginPercent || 48.8}%`}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            COGS ₹{metrics.blendedCogsPerMinInr || '1.28'}/m vs ₹{metrics.retailRatePerMinInr || '2.50'}/m
          </p>
        </div>
      </div>

      {/* Provider Status Matrix */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-600" />
          <span>Core Telephony & AI Provider Mesh</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {providers.map((p: any) => (
            <div key={p.name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">{p.name}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                    {p.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  {p.port ? `Port ${p.port}` : p.endpoint || p.fallback || 'Online'}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Latency</span>
                <span className="font-semibold text-indigo-600">{p.latencyMs}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Tenant Ledger & Activity Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Tenant Voiceforce Usage & Prepaid Ledgers</h3>
          </div>
          <span className="text-xs text-slate-500">{tenants.length} tenants configured</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Tenant Workspace</th>
                <th className="px-4 py-3">AI Agents</th>
                <th className="px-4 py-3">Total Calls</th>
                <th className="px-4 py-3">Active Campaigns</th>
                <th className="px-4 py-3">Voice Balance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading tenant ledgers...</td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No active tenants using Voiceforce yet.</td>
                </tr>
              ) : (
                tenants.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{t.name}</td>
                    <td className="px-4 py-3">{t._count?.voiceAgents || 0}</td>
                    <td className="px-4 py-3">{t._count?.callSessions || 0}</td>
                    <td className="px-4 py-3">{t._count?.callCampaigns || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${t.voiceBalanceInr >= 15 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ₹{(t.voiceBalanceInr || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSuspendTenant(t.id, t.name)}
                        disabled={suspendingId === t.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {suspendingId === t.id ? 'Suspending...' : 'Suspend Voice'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
