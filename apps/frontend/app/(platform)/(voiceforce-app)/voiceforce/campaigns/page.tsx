"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Megaphone, ArrowLeft, Plus, Play, Pause, Square, Clock, 
  Users, CheckCircle2, AlertCircle, Sliders, PhoneForwarded,
  FileSpreadsheet, Eye, RotateCcw, PhoneCall,
  CheckCircle, XCircle, PhoneMissed, Voicemail, Lock
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  UniversalSkeleton 
} from '@workspace/ui';
import { useAuth } from '@/lib/auth-context';
import { locationService } from '@/lib/location-service';
import { UniversalSlideDrawer } from '../_components/UniversalSlideDrawer';
import { CreateCampaignDrawer } from '../_components/CreateCampaignDrawer';
import clsx from 'clsx';

/**
 * 180 Voiceforce: Outbound Campaigns Management
 * 
 * Features:
 * - High-throughput campaign batch creation with Calls-Per-Second (CPS) rate limiting
 * - Outgoing Caller ID line selection (Telnyx DID or Verified Business Line)
 * - Bulk CSV/Excel contact file upload with automatic E.164 sanitization
 * - BullMQ queue pacing, concurrency locks, and pre-campaign financial validation (min ₹200.00)
 * - Real-time campaign contact inspection drawer with per-lead status and one-click retry
 */
export default function VoiceforceCampaignsPage() {
  const { company } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [numbers, setNumbers] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Per-contact Inspection Drawer State
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [inspectCampaignId, setInspectCampaignId] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [retryingFailed, setRetryingFailed] = useState(false);

  /**
   * Fetch campaigns, voice agents, and verified phone numbers for caller ID selection
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      const [campRes, agentsRes, numbersRes, walletRes] = await Promise.all([
        api.get('/api/v1/voiceforce/campaigns').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/agents').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/numbers').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/wallet').catch(() => ({ data: { data: null } }))
      ]);

      const campList = campRes.data?.data || [];
      const agentList = agentsRes.data?.data || [];
      const numList = numbersRes.data?.data || [];
      const wData = walletRes.data?.data || null;

      setCampaigns(campList);
      setAgents(agentList);
      setNumbers(numList);
      setWalletData(wData);
      setWalletBalance(wData?.balanceInr ?? 0);
    } catch (err: any) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /**
   * Open Inspect Contacts Drawer
   */
  const handleOpenInspect = async (campaignId: string) => {
    setInspectCampaignId(campaignId);
    setIsInspectOpen(true);
    setInspectLoading(true);

    try {
      const res = await api.get(`/api/v1/voiceforce/campaigns/${campaignId}`);
      setInspectData(res.data?.data || null);
    } catch (err: any) {
      toast.error('Failed to load campaign contact details');
    } finally {
      setInspectLoading(false);
    }
  };

  /**
   * Retry Unanswered or Failed Contacts
   */
  const handleRetryFailed = async () => {
    if (!inspectData) return;
    const calls = inspectData.calls || [];
    const failedCalls = calls.filter((c: any) => 
      ['failed', 'no_answer', 'busy', 'customer_declined'].includes(c.status)
    );

    if (failedCalls.length === 0) {
      toast('No failed or unanswered contacts to retry.', { icon: 'ℹ️' });
      return;
    }

    try {
      setRetryingFailed(true);
      const retryPhones = failedCalls.map((c: any) => c.recipientPhone);

      // Create a follow-up retry campaign
      const createRes = await api.post('/api/v1/voiceforce/campaigns', {
        name: `${inspectData.name} (Retry Batch)`,
        voiceAgentId: inspectData.voiceAgentId,
        phoneNumberId: inspectData.phoneNumberId || null,
        contactList: retryPhones.map((p: string) => ({ phone: p, name: 'Retry Lead' })),
        maxConcurrent: inspectData.maxConcurrent || 5,
        callsPerSecond: inspectData.callsPerSecond || 1.0,
        retryCount: 1
      });

      const newId = createRes.data?.data?.id;
      if (newId) {
        await api.post(`/api/v1/voiceforce/campaigns/${newId}/launch`);
        toast.success(`Launched retry campaign for ${retryPhones.length} contacts!`);
        setIsInspectOpen(false);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to launch retry batch');
    } finally {
      setRetryingFailed(false);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await api.post(`/api/v1/voiceforce/campaigns/${id}/pause`);
      toast.success('Campaign paused');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to pause campaign');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.post(`/api/v1/voiceforce/campaigns/${id}/resume`);
      toast.success('Campaign resumed');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resume campaign');
    }
  };

  const handleStop = async (id: string) => {
    try {
      await api.post(`/api/v1/voiceforce/campaigns/${id}/stop`);
      toast.success('Campaign stopped');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to stop campaign');
    }
  };

  const handleDirectLaunch = async (id: string) => {
    try {
      await api.post(`/api/v1/voiceforce/campaigns/${id}/launch`);
      toast.success('Campaign launched into BullMQ queue');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to launch campaign');
    }
  };

  const getCallStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle className="w-3 h-3 text-emerald-500" /> Completed
          </span>
        );
      case 'in_progress':
      case 'ringing':
      case 'dialing':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 animate-pulse">
            <PhoneCall className="w-3 h-3 text-blue-500" /> Dialing
          </span>
        );
      case 'no_answer':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <PhoneMissed className="w-3 h-3 text-amber-500" /> No Answer
          </span>
        );
      case 'busy':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
            Busy
          </span>
        );
      case 'voicemail':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
            <Voicemail className="w-3 h-3 text-indigo-500" /> Voicemail
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
            <XCircle className="w-3 h-3 text-rose-500" /> {status || 'Failed'}
          </span>
        );
    }
  };
  const currencyCode = (walletData?.currency || company?.currency || 'USD').toUpperCase();
  const currencySymbol = walletData?.currencySymbol || company?.currencySymbol || locationService.getCurrencySymbol(currencyCode);
  const isUsd = currencyCode === 'USD';
  const minRequired = Number(walletData?.minRequiredInr || walletData?.constants?.minThresholdInr || (isUsd ? 10 : 200));
  const isLocked = walletData?.isLocked ?? (walletBalance < minRequired);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/voiceforce"
              className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/80 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-200/80 dark:border-gray-700"
              title="Back to Voiceforce Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Call Campaigns</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Bulk AI automated outreach with concurrency pacing, call outcomes, and live conversion analytics.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (isLocked) {
              toast.error(`Voiceforce Calling is Locked. A minimum wallet balance of ${currencySymbol}${minRequired.toFixed(2)} is required to launch campaigns.`);
              return;
            }
            setIsCreateOpen(true);
          }}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md",
            isLocked
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/20 cursor-pointer"
          )}
        >
          {isLocked ? <Lock className="w-4 h-4 text-rose-500" /> : <Plus className="w-4 h-4" />}
          <span>{isLocked ? `Locked (Min ${currencySymbol}${minRequired.toFixed(0)})` : 'New Outbound Campaign'}</span>
        </button>
      </div>

      {/* Campaign List Grid */}
      {loading ? (
        <div className="p-4">
          <UniversalSkeleton type="kanban" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/50">
            <Megaphone className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No Outbound Campaigns Active</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Launch multi-call re-engagement, appointment setting, or client feedback batches executed autonomously by your AI employees.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => {
            const total = camp.totalRecipients || 0;
            const completed = camp.completedCalls || 0;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div 
                key={camp.id} 
                className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 hover:border-indigo-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">{camp.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                        Agent: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{camp.voiceAgent?.name || 'Voice Agent'}</span>
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
                      camp.status === 'running' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60' :
                      camp.status === 'paused' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60' :
                      camp.status === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60' :
                      'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                    }`}>
                      {camp.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Campaign Progress</span>
                      <span className="font-bold text-gray-900 dark:text-white">{pct}% ({completed}/{total})</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-300 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Total Contacts</span>
                      <span className="text-gray-900 dark:text-gray-200 font-semibold">{total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Calls</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rate Limit Pacing</span>
                      <span className="text-gray-900 dark:text-gray-200 font-medium">{camp.callsPerSecond || 1.0} calls/sec</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions: Inspect Contacts & Queue Controls */}
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenInspect(camp.id)}
                    className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-xs font-semibold transition-all cursor-pointer"
                    title="Inspect contact list and call results"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Inspect</span>
                  </button>

                  {camp.status === 'draft' && (
                    <button
                      onClick={() => handleDirectLaunch(camp.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" /> Launch
                    </button>
                  )}
                  {camp.status === 'running' && (
                    <button
                      onClick={() => handlePause(camp.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  )}
                  {camp.status === 'paused' && (
                    <button
                      onClick={() => handleResume(camp.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                  )}
                  {['running', 'paused'].includes(camp.status) && (
                    <button
                      onClick={() => handleStop(camp.id)}
                      className="py-2 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold transition-all cursor-pointer"
                      title="Stop Campaign"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Universal Slide Drawer 1: Create Outbound Campaign (Dual-Mode: Bulk & Single Number) */}
      <CreateCampaignDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        agents={agents}
        numbers={numbers}
        onSuccess={fetchData}
      />

      {/* Universal Slide Drawer 2: Inspect Campaign Contacts */}
      <UniversalSlideDrawer
        isOpen={isInspectOpen}
        onClose={() => setIsInspectOpen(false)}
        title={inspectData?.name || "Inspect Campaign Contacts"}
        subtitle="Individual contact dial status, call durations, and post-call conversational outcomes."
        icon={Users}
        iconColorClass="text-violet-600 dark:text-violet-400"
        iconBgClass="bg-violet-50 dark:bg-violet-950/60"
        maxWidthClass="max-w-2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleRetryFailed}
              disabled={retryingFailed || !inspectData?.calls?.some((c: any) => ['failed', 'no_answer', 'busy'].includes(c.status))}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{retryingFailed ? 'Dispatching Retries...' : 'Retry Failed / Unanswered'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsInspectOpen(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        {inspectLoading ? (
          <div className="p-4 space-y-3">
            <UniversalSkeleton type="list" />
          </div>
        ) : !inspectData ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 p-4">No data loaded.</p>
        ) : (
          <div className="space-y-4">
            {/* Quick Metrics Header */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Leads</span>
                <p className="text-base font-bold text-gray-900 dark:text-white">{inspectData.totalRecipients || inspectData.calls?.length || 0}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-500">Connected</span>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {inspectData.calls?.filter((c: any) => c.status === 'completed').length || 0}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-500">Unanswered</span>
                <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                  {inspectData.calls?.filter((c: any) => ['failed', 'no_answer', 'busy'].includes(c.status)).length || 0}
                </p>
              </div>
            </div>

            {/* Recipient Calls List */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {!inspectData.calls || inspectData.calls.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 dark:text-gray-400">
                  No dialed sessions recorded yet. Calls will appear here as BullMQ worker executes the queue.
                </div>
              ) : (
                inspectData.calls.map((call: any) => (
                  <div 
                    key={call.id}
                    className="p-3 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 dark:text-white">
                          {call.recipientPhone}
                        </span>
                        {call.recipientName && (
                          <span className="text-gray-500 dark:text-gray-400">
                            ({call.recipientName})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        <span>Duration: {call.durationSeconds || 0}s</span>
                        {call.callOutcome && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium capitalize">
                              {call.callOutcome.replace(/_/g, ' ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getCallStatusBadge(call.status)}
                      <Link
                        href={`/voiceforce/calls/${call.id}`}
                        className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="View Call Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </UniversalSlideDrawer>
    </div>
  );
}
