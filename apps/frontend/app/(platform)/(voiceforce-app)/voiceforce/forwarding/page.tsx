"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PhoneForwarded, ArrowLeft, Plus, Play, Trash2, Edit3, 
  Smartphone, Bot, Clock, Users, ArrowRight, ShieldCheck, 
  AlertCircle, Radio, PhoneCall, Headphones, CheckCircle2,
  Sparkles, RefreshCw, Music
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal, UniversalSkeleton } from '@workspace/ui';
import { ForwardingRuleDrawer } from '../_components/ForwardingRuleDrawer';
import { CallQueueDrawer } from '../_components/CallQueueDrawer';
import { BrowserSoftphoneModal } from '../_components/BrowserSoftphoneModal';
import { ForwardingSimulationModal } from '../_components/ForwardingSimulationModal';

export default function VoiceforceForwardingPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [waitingCallers, setWaitingCallers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer & Modals
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<any | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Queue Management
  const [queueToDelete, setQueueToDelete] = useState<any | null>(null);
  const [deletingQueue, setDeletingQueue] = useState(false);

  // Rule Pipeline Simulation Modal
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [ruleToSimulate, setRuleToSimulate] = useState<any | null>(null);

  // Softphone Takeover Modal
  const [isSoftphoneOpen, setIsSoftphoneOpen] = useState(false);
  const [softphoneAgent, setSoftphoneAgent] = useState<any | null>(null);
  const [takeoverData, setTakeoverData] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes, numsRes, agentsRes, queuesRes] = await Promise.all([
        api.get('/api/v1/voiceforce/forwarding').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/numbers').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/agents').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/queues').catch(() => ({ data: { data: [] } }))
      ]);

      const ruleList = rulesRes.data?.data || [];
      const queueList = queuesRes.data?.data || [];

      setRules(ruleList);
      setPhoneNumbers(numsRes.data?.data || []);
      setAgents(agentsRes.data?.data || []);
      setQueues(queueList);

      // If queue exists, load live waiting callers
      if (queueList.length > 0) {
        const callersRes = await api.get(`/api/v1/voiceforce/queues/${queueList[0].id}/waiting`).catch(() => ({ data: { data: [] } }));
        setWaitingCallers(callersRes.data?.data || []);
      }
    } catch (err: any) {
      toast.error('Failed to load forwarding configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setRuleToEdit(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (rule: any) => {
    setRuleToEdit(rule);
    setIsDrawerOpen(true);
  };

  const handleDeleteRule = async () => {
    if (!ruleToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/api/v1/voiceforce/forwarding/${ruleToDelete.id}`);
      toast.success('Forwarding rule deleted');
      setRuleToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to delete forwarding rule');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleRuleActive = async (rule: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !rule.isActive;
    try {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: nextState } : r));
      await api.put(`/api/v1/voiceforce/forwarding/${rule.id}`, { isActive: nextState });
      toast.success(`Rule "${rule.name}" ${nextState ? 'activated' : 'paused'}`);
    } catch (err: any) {
      toast.error('Failed to update rule status');
      fetchData();
    }
  };

  const handleTakeoverCaller = async (queueId: string) => {
    try {
      const res = await api.post(`/api/v1/voiceforce/queues/${queueId}/dequeue-takeover`);
      if (res.data?.success) {
        toast.success(`Connected to caller ${res.data.data.caller.callerPhone}!`);
        setTakeoverData(res.data.data);
        setSoftphoneAgent(agents[0] || null);
        setIsSoftphoneOpen(true);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to take over call');
    }
  };

  const handleDeleteQueue = async () => {
    if (!queueToDelete) return;
    try {
      setDeletingQueue(true);
      await api.delete(`/api/v1/voiceforce/queues/${queueToDelete.id}`);
      toast.success(`Hold queue "${queueToDelete.name}" deleted`);
      setQueueToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete queue');
    } finally {
      setDeletingQueue(false);
    }
  };

  const handleSimulateCaller = async (queueId: string) => {
    try {
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      await api.post(`/api/v1/voiceforce/queues/${queueId}/simulate`, {
        callerPhone: `+1 (555) 019-${randomDigits}`,
        callerName: `Test Caller #${randomDigits}`
      });
      toast.success('Test caller placed in queue! Check live monitor.');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to enqueue test caller');
    }
  };

  const totalWaiting = waitingCallers.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <Link 
              href="/voiceforce" 
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200/60 dark:border-gray-700/60"
              title="Back to Voiceforce Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Call Forwarding & Hunt Groups
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                  Carrier B2BUA
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Cascade incoming calls between multiple sales reps, AI employees, or hold queues when lines are busy.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="Refresh Routing State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Forwarding Rule</span>
          </button>
        </div>
      </div>

      {/* Top Telephony Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Active Pipelines</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <PhoneForwarded className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{rules.length}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configured forwarding rules</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hold Queue Backlog</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Headphones className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalWaiting}</div>
            {totalWaiting > 0 && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Callers on hold with music</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Avg Cascade Hops</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">1.8 hops</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Before call answered</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Zero-Drop Rate</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">99.4%</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Protected via overflow queue</p>
          </div>
        </div>
      </div>

      {/* Live Call Queue Monitor (Active Callers on Hold) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Live Call Queue & Hold Room</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Callers currently listening to hold music while waiting for the next available sales rep or AI agent.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsQueueDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Hold Queue</span>
            </button>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
              {totalWaiting} Waiting
            </span>
          </div>
        </div>

        {waitingCallers.length === 0 ? (
          <div className="py-6 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>All queues clear. Incoming callers are answered instantly without hold delays.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {waitingCallers.map((caller) => (
              <div 
                key={caller.callSessionId} 
                className="p-4 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-sm flex-shrink-0">
                    #{caller.position}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{caller.callerPhone}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Wait Time: <span className="font-semibold text-amber-700 dark:text-amber-300">{caller.waitSeconds}s</span> • Listening to Soothing Hold Chime
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTakeoverCaller(caller.queueId)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Answer in Browser</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configured Hold Rooms & Overflow Queues Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Headphones className="w-5 h-5 text-amber-500" />
              <span>Configured Hold Rooms & Overflow Queues</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage hold capacities, ambient chime audio streams, and automated queue dispatch.
            </p>
          </div>
          <button
            onClick={() => setIsQueueDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Hold Room</span>
          </button>
        </div>

        {queues.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-3">
            <Headphones className="w-8 h-8 text-amber-500 mx-auto opacity-70" />
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No active hold queues configured yet. Create a queue to hold callers when lines are busy.
            </p>
            <button
              onClick={() => setIsQueueDrawerOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-500 cursor-pointer"
            >
              Create First Hold Queue
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queues.map((q) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{q.name}</h3>
                      <span className="text-[10px] font-mono text-gray-400">ID: {q.id.substring(0, 8)}...</span>
                    </div>
                    <button
                      onClick={() => setQueueToDelete(q)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200/60 dark:border-amber-800/50 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Max {q.maxQueueSize} Callers
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold border border-gray-200 dark:border-gray-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {Math.round(q.maxWaitTimeSec / 60)}m Timeout
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      q.announcePosition
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200'
                    }`}>
                      {q.announcePosition ? 'Position Announced' : 'Chime Only'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-850 border border-gray-200/60 dark:border-gray-750 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="truncate text-[11px]">
                      {q.holdMusicUrl ? q.holdMusicUrl : 'Default Soothing Corporate Chime'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100 dark:border-gray-800 text-center">
                    <div>
                      <div className="text-xs text-gray-400">Processed</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white font-mono">{q.totalProcessed || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Avg Wait</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white font-mono">{q.avgWaitSeconds || 0}s</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Waiting</div>
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">{q.currentWaiting || 0}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => handleSimulateCaller(q.id)}
                    className="w-full py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-amber-200 dark:border-amber-800/60"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Simulate Test Caller In Queue</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Forwarding Pipelines List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Forwarding Pipelines</h2>
          <span className="text-xs text-gray-500">{rules.length} total rules configured</span>
        </div>

        {loading ? (
          <UniversalSkeleton type="kanban" />
        ) : rules.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/50">
              <PhoneForwarded className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">No Call Forwarding Rules Active</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto leading-relaxed">
                Connect your business phone number to a cascading hunt group. If Line 1 is busy, calls automatically forward to Line 2, Line 3, or an active hold queue.
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              Create First Forwarding Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => {
              const dests = Array.isArray(rule.destinations) ? rule.destinations : [];
              return (
                <div 
                  key={rule.id}
                  className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-indigo-500/40 transition-all space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{rule.name}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                          {rule.strategy.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          rule.isActive 
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                        }`}>
                          {rule.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Inbound Advertised Line: <span className="font-bold text-gray-900 dark:text-white font-mono">{rule.phoneNumber?.e164Number || 'Dedicated Line'}</span> ({rule.phoneNumber?.friendlyName || 'Main DID'})
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* 1-Click Instant Active/Inactive Toggle */}
                      <label 
                        className="relative inline-flex items-center cursor-pointer" 
                        title={rule.isActive ? "Pause Rule" : "Activate Rule"}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={rule.isActive}
                          onChange={(e) => handleToggleRuleActive(rule, e as any)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>

                      {/* 1-Click Simulation Tester */}
                      <button
                        onClick={() => {
                          setRuleToSimulate(rule);
                          setIsSimulationOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800/50"
                        title="Simulate inbound call cascade"
                      >
                        <Play className="w-3.5 h-3.5 fill-indigo-600 dark:fill-indigo-400" />
                        <span>Test Simulation</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(rule)}
                        className="p-2 rounded-xl text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        title="Edit rule"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRuleToDelete(rule)}
                        className="p-2 rounded-xl text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Visual Step-by-Step Waterfall Pipeline Diagram */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2.5">
                      Routing Sequence ({dests.length} Forwarding Hops):
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {/* Origin */}
                      <div className="flex-shrink-0 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs">
                        <div className="text-[10px] uppercase font-bold text-gray-400">Caller Dials</div>
                        <div className="font-bold text-gray-900 dark:text-white font-mono mt-0.5">
                          {rule.phoneNumber?.e164Number || 'Main DID'}
                        </div>
                      </div>

                      {/* Sequence Hops */}
                      {dests.map((dest: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 text-xs min-w-[170px]">
                            <div className="flex items-center justify-between text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                              <span>Hop #{idx + 1}</span>
                              <span>Ring: {dest.timeoutSec || rule.ringTimeoutSec}s</span>
                            </div>
                            <div className="font-bold text-gray-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                              {dest.type === 'agent' ? (
                                <Bot className="w-3.5 h-3.5 text-indigo-500" />
                              ) : (
                                <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                              <span className="truncate">{dest.name || dest.e164}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5 truncate">
                              {dest.type === 'agent' ? 'AI Voice Employee' : dest.e164}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Fallback Termination */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs min-w-[140px]">
                          <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                            If All Busy
                          </div>
                          <div className="font-bold text-gray-900 dark:text-white capitalize mt-0.5">
                            {rule.fallbackType.replace('_', ' ')}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">Fail-Safe Action</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Call Queue Creation Drawer */}
      <CallQueueDrawer
        isOpen={isQueueDrawerOpen}
        onClose={() => setIsQueueDrawerOpen(false)}
        onSuccess={fetchData}
      />

      {/* Forwarding Rule Slide Drawer */}
      <ForwardingRuleDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchData}
        ruleToEdit={ruleToEdit}
        phoneNumbers={phoneNumbers}
        agents={agents}
        queues={queues}
      />

      {/* Delete Rule Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(ruleToDelete)}
        onClose={() => setRuleToDelete(null)}
        onConfirm={handleDeleteRule}
        title="Delete Call Forwarding Rule"
        message={`Are you sure you want to remove the forwarding rule "${ruleToDelete?.name}"? Inbound calls will return to direct agent answering.`}
        confirmText={deleting ? "Deleting..." : "Delete Rule"}
        cancelText="Cancel"
        isDestructive={true}
      />

      {/* Delete Queue Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(queueToDelete)}
        onClose={() => setQueueToDelete(null)}
        onConfirm={handleDeleteQueue}
        title="Delete Hold Room Queue"
        message={`Are you sure you want to remove the hold queue "${queueToDelete?.name}"? Any currently waiting callers will be disconnected.`}
        confirmText={deletingQueue ? "Deleting..." : "Delete Queue"}
        cancelText="Cancel"
        isDestructive={true}
      />

      {/* Real-time Forwarding Rule Simulation Modal */}
      <ForwardingSimulationModal
        isOpen={isSimulationOpen}
        onClose={() => {
          setIsSimulationOpen(false);
          setRuleToSimulate(null);
        }}
        rule={ruleToSimulate}
      />

      {/* In-Browser Softphone Takeover Modal */}
      <BrowserSoftphoneModal
        isOpen={isSoftphoneOpen}
        onClose={() => {
          setIsSoftphoneOpen(false);
          setTakeoverData(null);
        }}
        agents={agents}
        selectedAgentId={softphoneAgent?.id}
        takeoverData={takeoverData}
      />
    </div>
  );
}
