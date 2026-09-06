"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  Bot, Phone, Play, Pause, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, 
  Sparkles, Sliders, Clock, Users, ArrowUpRight, Copy, Check,
  Mic, Wand2, Trash2, Edit3, Activity, Zap, BarChart3, 
  DollarSign, RefreshCw, AlertCircle, PhoneCall, ChevronRight,
  Settings2, ShieldAlert, Layers, MessageSquare, Headphones, FileText
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { locationService } from '@/lib/location-service';
import { UniversalSkeleton, ConfirmModal, PlatformModal } from '@workspace/ui';
import { BrowserSoftphoneModal } from '../../_components/BrowserSoftphoneModal';
import { CreateCampaignDrawer } from '../../_components/CreateCampaignDrawer';
import { AgentGuardrailsEditor } from '../../_components/AgentGuardrailsEditor';
import clsx from 'clsx';

const CARTESIA_VOICES = [
  { id: '694f12bc-9263-4416-a1d8-0402e1c6e1d2', name: 'Maya - Indian English (Warm & Professional)', gender: 'Female' },
  { id: 'a0e99841-438c-4a64-b679-ae501e7d6091', name: 'Barbershop Man - US English (Deep & Confident)', gender: 'Male' },
  { id: '256191b9-3bf6-42d7-a50d-8ea13a8f4c39', name: 'Sarah - British English (Polite Executive)', gender: 'Female' },
  { id: '79a125e8-cd45-4c13-8a67-188112f4dd22', name: 'Alex - US English (Fast & Energetic)', gender: 'Male' }
];

const AVAILABLE_TOOLS = [
  { id: 'search_knowledge_base', label: 'Search Knowledge Base (RAG)', desc: 'Autonomous semantic search across uploaded corporate documents' },
  { id: 'check_product_price', label: 'Live Catalog & Price Query', desc: 'Queries real-time product prices from company offerings' },
  { id: 'create_crm_client', label: 'Create CRM Leads & Clients', desc: 'Save contact details and client inquiries directly to CRM' },
  { id: 'book_appointment', label: 'Schedule Appointments', desc: 'Creates calendar events in 180 Calendar with availability check' },
  { id: 'create_sales_order', label: 'Generate Sales Orders', desc: 'Creates draft orders and quotation in 180 Finance' },
  { id: 'send_sms_confirmation', label: 'Send SMS Receipts', desc: 'Dispatches instant SMS order receipt via Telnyx' },
  { id: 'create_task', label: 'Create Project Tasks', desc: 'Generates assignable sprint tickets in 180 Projects' }
];

function AgentDetailContent() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const { company } = useAuth();
  const currencyCode = (company?.currency || 'USD').toUpperCase();
  const currencySymbol = company?.currencySymbol || locationService.getCurrencySymbol(currencyCode);

  const [activeTab, setActiveTab] = useState<'activity' | 'config' | 'guardrails'>(
    initialTab === 'guardrails' ? 'guardrails' : initialTab === 'config' ? 'config' : 'activity'
  );
  const [data, setData] = useState<any>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [briefing, setBriefing] = useState<any>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  // Operational Modals
  const [isAssignWorkOpen, setIsAssignWorkOpen] = useState(false);
  const [isSoftphoneOpen, setIsSoftphoneOpen] = useState(false);
  const [isTrainerOpen, setIsTrainerOpen] = useState(false);
  const [naturalTrainingText, setNaturalTrainingText] = useState('');
  const [trainingBusy, setTrainingBusy] = useState(false);

  // Configuration Form State
  const [configForm, setConfigForm] = useState({
    name: '',
    role: '',
    language: 'en-US',
    voiceId: CARTESIA_VOICES[0].id,
    firstMessage: '',
    systemPrompt: '',
    allowBargeIn: true,
    voiceSpeed: 1.0,
    voiceTemperature: 0.7,
    maxDurationSeconds: 600,
    isActive: true,
    assignedPhoneId: '',
    enabledToolNames: [] as string[]
  });

  const fetchAgent = async () => {
    try {
      setLoading(true);
      const [agentRes, numbersRes] = await Promise.all([
        api.get(`/api/v1/voiceforce/agents/${id}`),
        api.get('/api/v1/voiceforce/numbers').catch(() => ({ data: { data: [] } }))
      ]);

      if (agentRes.data?.success && agentRes.data.data) {
        const ag = agentRes.data.data.agent;
        setData(agentRes.data.data);
        setPhoneNumbers(numbersRes.data?.data || []);
        if (agentRes.data.data.briefing) {
          setBriefing(agentRes.data.data.briefing);
        }

        const currentPhoneId = ag.assignedNumbers?.[0]?.id || '';
        setConfigForm({
          name: ag.name || '',
          role: ag.role || '',
          language: ag.language || 'en-US',
          voiceId: ag.voiceId || CARTESIA_VOICES[0].id,
          firstMessage: ag.firstMessage || '',
          systemPrompt: ag.systemPrompt || '',
          allowBargeIn: ag.allowBargeIn ?? true,
          voiceSpeed: ag.voiceSpeed || 1.0,
          voiceTemperature: ag.voiceTemperature || 0.7,
          maxDurationSeconds: ag.maxDurationSeconds || 600,
          isActive: ag.isActive ?? true,
          assignedPhoneId: currentPhoneId,
          enabledToolNames: Array.isArray(ag.enabledToolNames) ? ag.enabledToolNames : ['search_knowledge_base']
        });
      }
    } catch (err: any) {
      toast.error('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBriefing = async () => {
    try {
      setGeneratingBriefing(true);
      const res = await api.post(`/api/v1/voiceforce/agents/${id}/briefing/generate`);
      if (res.data?.briefing) {
        setBriefing(res.data.briefing);
        toast.success(`Executive briefing refreshed!`);
      }
    } catch {
      toast.error('Failed to generate agent performance briefing');
    } finally {
      setGeneratingBriefing(false);
    }
  };

  useEffect(() => {
    if (id) fetchAgent();
  }, [id]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'guardrails') setActiveTab('guardrails');
    else if (tab === 'config') setActiveTab('config');
    else if (tab === 'train') setIsTrainerOpen(true);
    else if (tab === 'mic' || tab === 'softphone') setIsSoftphoneOpen(true);
    else if (tab === 'assign') setIsAssignWorkOpen(true);
  }, [searchParams]);

  const handleCopyPhone = (number: string) => {
    navigator.clipboard.writeText(number);
    setCopiedPhone(true);
    toast.success('Direct phone line copied');
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleToggleStatus = async () => {
    if (!data?.agent) return;
    const newStatus = !data.agent.isActive;
    try {
      await api.put(`/api/v1/voiceforce/agents/${id}`, { isActive: newStatus });
      setData((prev: any) => ({
        ...prev,
        agent: { ...prev.agent, isActive: newStatus }
      }));
      setConfigForm((prev) => ({ ...prev, isActive: newStatus }));
      toast.success(newStatus ? `${data.agent.name} is now Active` : `${data.agent.name} is now Paused`);
    } catch {
      toast.error('Failed to update agent status');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      await api.put(`/api/v1/voiceforce/agents/${id}`, configForm);
      toast.success('AI Employee configuration saved successfully!');
      fetchAgent();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleApplyTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalTrainingText.trim()) return;

    try {
      setTrainingBusy(true);
      const res = await api.post(`/api/v1/voiceforce/agents/${id}/train/apply`, {
        instruction: naturalTrainingText.trim()
      });

      if (res.data?.success) {
        toast.success(`🎉 ${data.agent.name}'s system brain updated with new training!`);
        setIsTrainerOpen(false);
        setNaturalTrainingText('');
        fetchAgent();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to apply natural language training');
    } finally {
      setTrainingBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <div className="flex items-center gap-3">
          <UniversalSkeleton className="w-8 h-8 rounded-xl" />
          <UniversalSkeleton className="w-48 h-6" />
        </div>
        <UniversalSkeleton className="w-full h-40 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <UniversalSkeleton className="h-28 rounded-2xl" />
          <UniversalSkeleton className="h-28 rounded-2xl" />
          <UniversalSkeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data?.agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <Bot className="w-12 h-12 text-gray-400 mb-3" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Employee Not Found</h2>
        <p className="text-xs text-gray-500 mt-1">This voice agent may have been removed or reassigned.</p>
        <Link
          href="/voiceforce/agents"
          className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold"
        >
          Back to AI Employees
        </Link>
      </div>
    );
  }

  const { agent, metrics, recentCalls } = data;
  const assignedLine = agent.assignedNumbers?.[0]?.e164Number;
  const ongoingTasks = metrics?.ongoingTasks || 0;
  const completedTasks = metrics?.completedTasks || 0;
  const totalTasks = ongoingTasks + completedTasks;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── Breadcrumbs & Navigation ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/voiceforce/agents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All AI Employees</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 font-mono">Agent ID: {agent.id.slice(0, 8)}...</span>
        </div>
      </div>

      {/* ─── Agent Profile Hero Command Center ─────────────────────────────── */}
      <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Identity & Status */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-purple-500/20 flex-shrink-0">
              {agent.name.charAt(0).toUpperCase()}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                  {agent.name}
                </h1>
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                    agent.isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                  )}
                >
                  <span className={clsx("w-2 h-2 rounded-full", agent.isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400")} />
                  <span>{agent.isActive ? 'Active & Ready to Call' : 'Paused'}</span>
                </button>
              </div>

              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {agent.role}
              </p>

              {/* Direct Phone Line Chip */}
              <div className="pt-1 flex flex-wrap items-center gap-2">
                {assignedLine ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800 text-xs font-semibold text-purple-700 dark:text-purple-300 font-mono">
                    <Phone className="w-3.5 h-3.5 text-purple-600" />
                    <span>{assignedLine}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(assignedLine)}
                      className="text-purple-500 hover:text-purple-700 dark:hover:text-purple-200 cursor-pointer"
                      title="Copy phone line"
                    >
                      {copiedPhone ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-300">
                    <Phone className="w-3 h-3" /> No Direct Line Assigned
                  </span>
                )}

                <span className="text-[11px] text-gray-400">
                  Cartesia Sonic Engine • Sub-90ms latency
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Assign Work / Launch Campaign */}
            <button
              type="button"
              onClick={() => setIsAssignWorkOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Assign Work</span>
            </button>

            {/* Test Mic / Softphone Sandbox */}
            <button
              type="button"
              onClick={() => setIsSoftphoneOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 px-4 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-indigo-500" />
              <span>Test Mic</span>
            </button>

            {/* Train with AI */}
            <button
              type="button"
              onClick={() => setIsTrainerOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 px-4 py-2.5 text-xs font-bold text-purple-700 dark:text-purple-300 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Train with AI</span>
            </button>
          </div>
        </div>

        {/* Top-Level Tabs */}
        <div className="mt-8 flex gap-2 border-b border-gray-100 dark:border-gray-800 pt-2">
          {[
            { id: 'activity', label: 'Activity & Performance', icon: Activity },
            { id: 'config', label: 'Configuration & Brain', icon: Settings2 },
            { id: 'guardrails', label: 'Guardrails & Trust', icon: ShieldAlert }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  "flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer",
                  isSelected
                    ? "border-purple-600 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Tab 1: Activity & Operations ──────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 6 Bento KPI Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Total Calls</span>
              <span className="text-xl font-black text-gray-900 dark:text-white mt-1 block">
                {metrics?.totalCalls || 0}
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">Dispatched & Inbound</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Talk Time</span>
              <span className="text-xl font-black text-gray-900 dark:text-white mt-1 block">
                {Math.floor((metrics?.totalTalkTimeSeconds || 0) / 60)}m {(metrics?.totalTalkTimeSeconds || 0) % 60}s
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">Audio stream duration</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Success Rate</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                {metrics?.successRate || 0}%
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">Positive resolution</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Leads Captured</span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                {metrics?.leadsCaptured || 0}
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">Added to 180 CRM</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Orders / Bookings</span>
              <span className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 block">
                {metrics?.ordersBooked || 0}
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">Generated via tools</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Telephony Cost</span>
              <span className="text-xl font-black text-gray-900 dark:text-white mt-1 block">
                {currencySymbol}{metrics?.totalCostInr?.toFixed(2) || '0.00'}
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">Wholesale + Engine</span>
            </div>
          </div>

          {/* Ongoing vs Completed Task Progress Bar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Work Sprint & Task Execution Telemetry
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Real-time status of calling batches and ongoing telephone tasks assigned to {agent.name}.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  {ongoingTasks} Tasks Ongoing
                </span>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {completedTasks} Tasks Completed
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${taskProgress}%` }}
              />
            </div>
          </div>

          {/* Autonomous Daily Executive Voice AI Briefing */}
          {briefing && (
            <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Daily Executive Voice AI Briefing
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60">
                        {new Date(briefing.briefingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Autonomous synthesis of caller intentions, captured leads, and action items</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateBriefing}
                  disabled={generatingBriefing}
                  className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold border border-gray-200 dark:border-gray-700 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={clsx("w-3.5 h-3.5", generatingBriefing && "animate-spin text-indigo-600")} />
                  <span>{generatingBriefing ? 'Synthesizing...' : 'Refresh Briefing'}</span>
                </button>
              </div>

              {/* Key Metrics Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                  <span className="text-gray-400 block mb-0.5">Labor Hours Saved</span>
                  <span className="text-lg font-black text-gray-900 dark:text-white">{briefing.laborHoursSaved || 0} hrs</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                  <span className="text-gray-400 block mb-0.5">Missed Calls Recovered</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{briefing.missedCallsSaved || 0}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                  <span className="text-gray-400 block mb-0.5">Appointments Booked</span>
                  <span className="text-lg font-black text-purple-600 dark:text-purple-400">{briefing.appointmentsBooked || 0}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                  <span className="text-gray-400 block mb-0.5">Revenue Influenced</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{currencySymbol}{briefing.revenueInfluenced || 0}</span>
                </div>
              </div>

              {/* Top Inquiries & Action Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Top Inquiries */}
                <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40 space-y-2">
                  <h4 className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Top Customer Inquiries Today</span>
                  </h4>
                  <ul className="space-y-1.5 text-gray-700 dark:text-gray-300">
                    {Array.isArray(briefing.topInquiries) && briefing.topInquiries.length > 0 ? (
                      briefing.topInquiries.map((inq: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span>{inq}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-400 italic">No inquiries recorded today</li>
                    )}
                  </ul>
                </div>

                {/* Action Items for Owner */}
                <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40 space-y-2">
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Recommended Business Follow-ups</span>
                  </h4>
                  <ul className="space-y-1.5 text-gray-700 dark:text-gray-300">
                    {Array.isArray(briefing.actionItems) && briefing.actionItems.length > 0 ? (
                      briefing.actionItems.map((act: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{act}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-400 italic">All call actions handled autonomously</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Recent Call Records & Customer Reconnection Stream */}
          <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Call Records & Activity Stream
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Forensic turn-by-turn logs and customer reconnection context.
                </p>
              </div>

              <Link
                href="/voiceforce/calls"
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <span>View All System Calls</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentCalls.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                <Headphones className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No calls dispatched yet</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Click &quot;Assign Work&quot; to queue customer numbers or test via softphone.</p>
                <button
                  type="button"
                  onClick={() => setIsAssignWorkOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Assign First Work Sprint
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 dark:border-gray-800 text-[11px] uppercase tracking-wider text-gray-400">
                    <tr>
                      <th className="py-3 px-3 font-semibold">Customer / Phone</th>
                      <th className="py-3 px-3 font-semibold">Direction</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold">Duration</th>
                      <th className="py-3 px-3 font-semibold">Cost</th>
                      <th className="py-3 px-3 font-semibold">Outcome & Sentiment</th>
                      <th className="py-3 px-3 font-semibold text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-gray-700 dark:text-gray-300">
                    {recentCalls.map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="py-3.5 px-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 dark:text-white font-mono text-xs">
                                {c.recipientPhone || 'Anonymous Caller'}
                              </span>
                              {c.isReturningCustomer && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                                  Returning ({c.totalPriorCallsWithCompany}x)
                                </span>
                              )}
                            </div>
                            {c.recipientName && (
                              <span className="text-[11px] text-gray-500 block">{c.recipientName}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 capitalize text-xs">
                          {c.direction || 'outbound'}
                        </td>

                        <td className="py-3.5 px-3">
                          <span className={clsx(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold capitalize",
                            c.status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                            c.status === 'failed' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400' :
                            'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          )}>
                            {c.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-xs">
                          {c.durationSeconds || 0}s
                        </td>

                        <td className="py-3.5 px-3 font-mono text-xs font-semibold text-gray-900 dark:text-white">
                          {c.companyCurrencySymbol || currencySymbol}{Number(c.estimatedCostInr || 0).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {c.sentiment && (
                              <span className={clsx(
                                "px-1.5 py-0.2 rounded text-[10px] font-semibold",
                                c.sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                                c.sentiment === 'Negative' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              )}>
                                {c.sentiment}
                              </span>
                            )}
                            {c.callOutcome && (
                              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                {c.callOutcome.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <Link
                            href={`/voiceforce/calls/${c.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab 2: Configuration & Brain ──────────────────────────────────── */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="p-6 md:p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Employee Persona & Brain Settings
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Configure voice acoustic synthesis, prompt cadence, and connected 180workspace business tools.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{savingConfig ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Employee Name
              </label>
              <input
                type="text"
                required
                value={configForm.name}
                onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2 px-3 text-xs text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Job Role / Specialty
              </label>
              <input
                type="text"
                required
                value={configForm.role}
                onChange={(e) => setConfigForm({ ...configForm, role: e.target.value })}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2 px-3 text-xs text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Cartesia Neural Voice
              </label>
              <select
                value={configForm.voiceId}
                onChange={(e) => setConfigForm({ ...configForm, voiceId: e.target.value })}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2 px-3 text-xs text-gray-900 dark:text-white"
              >
                {CARTESIA_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                Dedicated Direct Phone Line
              </label>
              <select
                value={configForm.assignedPhoneId}
                onChange={(e) => setConfigForm({ ...configForm, assignedPhoneId: e.target.value })}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2 px-3 text-xs text-gray-900 dark:text-white"
              >
                <option value="">No Direct Line Assigned</option>
                {phoneNumbers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.e164Number} {p.friendlyName ? `(${p.friendlyName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
              First Spoken Greeting (Upon Call Pickup)
            </label>
            <input
              type="text"
              value={configForm.firstMessage}
              onChange={(e) => setConfigForm({ ...configForm, firstMessage: e.target.value })}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2 px-3 text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
              Autonomous Behavior System Prompt
            </label>
            <textarea
              rows={8}
              value={configForm.systemPrompt}
              onChange={(e) => setConfigForm({ ...configForm, systemPrompt: e.target.value })}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2.5 px-3 text-xs font-mono text-gray-900 dark:text-white leading-relaxed"
            />
          </div>

          {/* Permitted Tools Checkboxes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
              Permitted 180workspace Business Tools ({configForm.enabledToolNames.length} Enabled)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {AVAILABLE_TOOLS.map((tool) => {
                const isChecked = configForm.enabledToolNames.includes(tool.id);
                return (
                  <label
                    key={tool.id}
                    className={clsx(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      isChecked
                        ? "border-purple-500/40 bg-purple-50/40 dark:bg-purple-950/30"
                        : "border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-850"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setConfigForm((prev) => ({
                          ...prev,
                          enabledToolNames: isChecked
                            ? prev.enabledToolNames.filter((t) => t !== tool.id)
                            : [...prev.enabledToolNames, tool.id]
                        }));
                      }}
                      className="mt-0.5 h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">{tool.label}</span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">{tool.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </form>
      )}

      {/* ─── Tab 3: Guardrails & Trust ──────────────────────────────────────── */}
      {activeTab === 'guardrails' && (
        <AgentGuardrailsEditor
          agentId={agent.id}
          agentName={agent.name}
          onSaved={fetchAgent}
        />
      )}

      {/* ─── Modals ────────────────────────────────────────────────────────── */}
      {/* Outbound Campaign & Direct Dispatch Drawer */}
      <CreateCampaignDrawer
        isOpen={isAssignWorkOpen}
        onClose={() => setIsAssignWorkOpen(false)}
        agents={[agent]}
        numbers={phoneNumbers}
        defaultAgentId={agent.id}
        defaultPhoneId={agent.assignedNumbers?.[0]?.id}
        onSuccess={fetchAgent}
      />

      {/* Browser Softphone Sandbox Modal */}
      <BrowserSoftphoneModal
        isOpen={isSoftphoneOpen}
        onClose={() => setIsSoftphoneOpen(false)}
        agents={[agent]}
        voiceAgentId={agent.id}
        selectedAgentId={agent.id}
      />

      {/* Natural Language Prompt Trainer Modal */}
      <PlatformModal
        isOpen={isTrainerOpen}
        onClose={() => setIsTrainerOpen(false)}
        title={`Train ${agent.name} with AI`}
        icon={Wand2}
        iconColorClass="text-purple-600 dark:text-purple-400"
        iconBgClass="bg-purple-50 dark:bg-purple-950/50"
        subHeader="Explain adjustments in natural language. Our autonomous compiler refines the prompt while preserving safety."
        maxWidthClass="max-w-lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsTrainerOpen(false)}
              disabled={trainingBusy}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyTraining}
              disabled={trainingBusy || !naturalTrainingText.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {trainingBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{trainingBusy ? 'Compiling Brain...' : 'Apply Training'}</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <textarea
            rows={5}
            value={naturalTrainingText}
            onChange={(e) => setNaturalTrainingText(e.target.value)}
            placeholder="e.g. When callers ask about table reservations, always verify if they have any food allergies first, and mention our chef's weekend special."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-3 text-xs text-gray-900 dark:text-white leading-relaxed"
          />
        </div>
      </PlatformModal>
    </div>
  );
}

export default function AgentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 max-w-7xl mx-auto pb-16 p-6">
          <div className="flex items-center gap-3">
            <UniversalSkeleton className="w-8 h-8 rounded-xl" />
            <UniversalSkeleton className="w-48 h-6" />
          </div>
          <UniversalSkeleton className="w-full h-40 rounded-3xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <UniversalSkeleton className="h-24 rounded-2xl" />
            <UniversalSkeleton className="h-24 rounded-2xl" />
            <UniversalSkeleton className="h-24 rounded-2xl" />
            <UniversalSkeleton className="h-24 rounded-2xl" />
            <UniversalSkeleton className="h-24 rounded-2xl" />
            <UniversalSkeleton className="h-24 rounded-2xl" />
          </div>
        </div>
      }
    >
      <AgentDetailContent />
    </Suspense>
  );
}
