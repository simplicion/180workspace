"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  Bot, Phone, Play, Pause, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, 
  Sparkles, Sliders, Clock, Users, ArrowUpRight, Copy, Check,
  Mic, Wand2, Trash2, Edit3, Activity, Zap, BarChart3, 
  DollarSign, RefreshCw, AlertCircle, PhoneCall, ChevronRight,
  Settings2, ShieldAlert, Layers, MessageSquare, Headphones, FileText,
  Volume2, Radio, Globe, Languages, Cpu, RotateCcw, HelpCircle, Database, Plus
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { locationService } from '@/lib/location-service';
import { UniversalSkeleton, PlatformModal } from '@workspace/ui';
import { BrowserSoftphoneModal } from '../../_components/BrowserSoftphoneModal';
import { CreateCampaignDrawer } from '../../_components/CreateCampaignDrawer';
import { AgentGuardrailsEditor } from '../../_components/AgentGuardrailsEditor';
import { LinkExistingRagVaultDrawer } from '../../_components/LinkExistingRagVaultModal';
import { CartesiaVoiceSelectorModal, CartesiaVoiceItem } from '../../_components/CartesiaVoiceSelectorModal';
import { VoiceCloningModal } from '../../_components/VoiceCloningModal';
import { 
  CARTESIA_SUPPORTED_LANGUAGES, 
  CARTESIA_REGIONAL_GROUPS, 
  getCartesiaLanguageByCode 
} from '@/lib/cartesia-languages';
import clsx from 'clsx';

const CARTESIA_VOICES = [
  { id: '694f12bc-9263-4416-a1d8-0402e1c6e1d2', name: 'Maya - Indian English (Warm & Professional)', gender: 'Female' },
  { id: 'a0e99841-438c-4a64-b679-ae501e7d6091', name: 'Barbershop Man - US English (Deep & Confident)', gender: 'Male' },
  { id: '256191b9-3bf6-42d7-a50d-8ea13a8f4c39', name: 'Sarah - British English (Polite Executive)', gender: 'Female' },
  { id: '79a125e8-cd45-4c13-8a67-188112f4dd22', name: 'Alex - US English (Fast & Energetic)', gender: 'Male' }
];

const AVAILABLE_TOOLS = [
  { id: 'search_business_knowledge', label: 'Dedicated Business RAG (50MB Documents)', desc: 'Instant semantic vector search across uploaded company manuals, policies, and catalogs' },
  { id: 'search_knowledge_base', label: 'Search Workspace Documents', desc: 'Autonomous semantic search across general corporate documents' },
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

  // Dedicated RAG Memory Vaults State
  const [linkedVaults, setLinkedVaults] = useState<any[]>([]);
  const [loadingVaults, setLoadingVaults] = useState(false);
  const [isLinkVaultDrawerOpen, setIsLinkVaultDrawerOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [briefing, setBriefing] = useState<any>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  // Cartesia Voice Studio & Modals
  const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);
  const [isCloningModalOpen, setIsCloningModalOpen] = useState(false);
  const [selectedVoiceDetails, setSelectedVoiceDetails] = useState<{
    id: string;
    name: string;
    description?: string;
    language?: string;
    gender?: string;
    isCloned?: boolean;
  } | null>(null);

  // In-line Live Audio Preview Player State
  const [isPlayingTestAudio, setIsPlayingTestAudio] = useState(false);
  const [generatingTestAudio, setGeneratingTestAudio] = useState(false);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

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
    voiceId: 'cfce9402-0067-458b-95a7-95846f469406',
    voiceName: 'Sheryl - Warm Briefing',
    modelId: 'sonic-3.6',
    voiceSpeed: 1.0,
    voiceVolume: 1.0,
    voiceTemperature: 0.7,
    emotionPreset: 'positivity:high',
    sttModel: 'ink-2',
    turnStartThreshold: 0.8,
    turnEndTimeoutMs: 5600,
    keyterms: '180workspace, Support, Order, Booking',
    sampleRate: 44100,
    normalization: 'auto',
    firstMessage: '',
    systemPrompt: '',
    allowBargeIn: true,
    inactivityTimeoutMs: 5000,
    maxDurationSeconds: 600,
    isActive: true,
    assignedPhoneId: '',
    enabledToolNames: [] as string[]
  });

  const fetchAgent = async () => {
    try {
      setLoading(true);
      const [agentRes, numbersRes, voicesRes] = await Promise.all([
        api.get(`/api/v1/voiceforce/agents/${id}`),
        api.get('/api/v1/voiceforce/numbers').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/voices').catch(() => ({ data: { data: [] } }))
      ]);

      if (agentRes.data?.success && agentRes.data.data) {
        const ag = agentRes.data.data.agent;
        setData(agentRes.data.data);
        setPhoneNumbers(numbersRes.data?.data || []);
        if (agentRes.data.data.briefing) {
          setBriefing(agentRes.data.data.briefing);
        }

        const allVoices: CartesiaVoiceItem[] = voicesRes.data?.data || [];
        const matchedVoice = allVoices.find(v => v.id === ag.voiceId);
        if (matchedVoice) {
          setSelectedVoiceDetails(matchedVoice);
        } else {
          setSelectedVoiceDetails({
            id: ag.voiceId || 'cfce9402-0067-458b-95a7-95846f469406',
            name: ag.name ? `${ag.name} Persona` : 'Cartesia Studio Voice',
            description: 'Custom Neural Persona',
            language: ag.language || 'en',
            gender: 'female',
            isCloned: false
          });
        }

        const currentPhoneId = ag.assignedNumbers?.[0]?.id || '';
        setConfigForm({
          name: ag.name || '',
          role: ag.role || '',
          language: ag.language || 'en-US',
          voiceId: ag.voiceId || 'cfce9402-0067-458b-95a7-95846f469406',
          voiceName: matchedVoice?.name || ag.name || 'Sheryl - Warm Briefing',
          modelId: ag.llmModel?.includes('sonic') ? ag.llmModel : 'sonic-3.6',
          voiceSpeed: ag.voiceSpeed ?? 1.0,
          voiceVolume: 1.0,
          voiceTemperature: ag.voiceTemperature ?? 0.7,
          emotionPreset: 'positivity:high',
          sttModel: ag.sttModel || 'ink-2',
          turnStartThreshold: 0.8,
          turnEndTimeoutMs: 5600,
          keyterms: `${ag.name || '180workspace'}, Support, Booking, Orders`,
          sampleRate: 44100,
          normalization: 'auto',
          firstMessage: ag.firstMessage || '',
          systemPrompt: ag.systemPrompt || '',
          allowBargeIn: ag.allowBargeIn ?? true,
          inactivityTimeoutMs: ag.inactivityTimeoutMs ?? 5000,
          maxDurationSeconds: ag.maxDurationSeconds ?? 600,
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

  const handleTestVoiceAudio = async () => {
    if (isPlayingTestAudio && testAudioRef.current) {
      testAudioRef.current.pause();
      setIsPlayingTestAudio(false);
      return;
    }

    try {
      setGeneratingTestAudio(true);
      const matchedLang = getCartesiaLanguageByCode(configForm.language);
      const textToSpeak = configForm.firstMessage?.trim() ||
        matchedLang?.sampleGreeting ||
        `Hello! I am ${configForm.name || 'your AI employee'}. How can I assist your business today?`;

      const emotionTag = configForm.emotionPreset === 'warm' ? ['positivity:high'] :
        configForm.emotionPreset === 'curious' ? ['curiosity'] :
        configForm.emotionPreset === 'urgent' ? ['surprise'] :
        configForm.emotionPreset === 'professional' ? ['neutral'] :
        ['positivity:high'];

      const res = await api.post('/api/v1/voiceforce/voices/preview', {
        voiceId: configForm.voiceId,
        text: textToSpeak,
        modelId: configForm.modelId || 'sonic-3.6',
        speed: configForm.voiceSpeed,
        volume: configForm.voiceVolume || 1.0,
        emotion: configForm.emotionPreset === 'professional' ? 'neutral' : configForm.emotionPreset === 'curious' ? 'calm' : 'neutral',
        locale: configForm.language,
        normalization: configForm.normalization,
        sampleRate: configForm.sampleRate || 44100
      });

      if (res.data?.data?.audioBase64) {
        if (testAudioRef.current) testAudioRef.current.pause();
        const audio = new Audio(res.data.data.audioBase64);
        testAudioRef.current = audio;
        setIsPlayingTestAudio(true);
        setGeneratingTestAudio(false);

        audio.onended = () => {
          setIsPlayingTestAudio(false);
          testAudioRef.current = null;
        };
        audio.onerror = () => {
          setIsPlayingTestAudio(false);
          testAudioRef.current = null;
          toast.error('Failed to play audio sample');
        };

        await audio.play();
      }
    } catch (err: any) {
      setGeneratingTestAudio(false);
      setIsPlayingTestAudio(false);
      toast.error(err.response?.data?.error || 'Voice test preview failed');
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

  const fetchLinkedVaults = async () => {
    if (!id) return;
    try {
      setLoadingVaults(true);
      const res = await api.get(`/api/v1/voiceforce/agents/${id}/vaults`);
      if (res.data?.linkedVaults) {
        setLinkedVaults(res.data.linkedVaults);
      } else if (res.data?.vaults) {
        setLinkedVaults(res.data.vaults);
      }
    } catch (err) {
      console.warn('Failed to load linked vaults for agent', err);
    } finally {
      setLoadingVaults(false);
    }
  };

  const handleUnlinkVault = async (vaultId: string) => {
    const updatedIds = linkedVaults.filter(v => v.id !== vaultId).map(v => v.id);
    try {
      await api.put(`/api/v1/voiceforce/agents/${id}/vaults`, { vaultIds: updatedIds });
      setLinkedVaults(prev => prev.filter(v => v.id !== vaultId));
      toast.success('RAG Memory Vault unlinked');
    } catch {
      toast.error('Failed to unlink RAG vault');
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (id) {
      fetchAgent();
      fetchLinkedVaults();
    }
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
        <div className="mt-8 flex gap-2 border-b border-gray-100 dark:border-gray-800 pt-2 overflow-x-auto">
          {[
            { id: 'activity', label: 'Activity & Performance', icon: Activity },
            { id: 'config', label: 'Configuration & Persona', icon: Settings2 },
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

      {/* ─── Tab 2: Configuration & Brain (Cartesia Neural Voice Studio) ────── */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="p-6 md:p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-7 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Employee Persona, Voice Studio & Brain Settings
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Customize Cartesia neural speech synthesis, speaking pace, emotion vibe, and connected business tools.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex-shrink-0"
            >
              {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{savingConfig ? 'Saving Studio...' : 'Save Configuration'}</span>
            </button>
          </div>

          {/* Section 1: Core Identity & Assigned Lines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Employee Name *
              </label>
              <input
                type="text"
                required
                value={configForm.name}
                onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2.5 px-3.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Job Role / Specialty *
              </label>
              <input
                type="text"
                required
                value={configForm.role}
                onChange={(e) => setConfigForm({ ...configForm, role: e.target.value })}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2.5 px-3.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Primary Spoken Language
                </label>
                <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-850">
                  {CARTESIA_SUPPORTED_LANGUAGES.length}+ Languages & Accents
                </span>
              </div>
              <select
                value={configForm.language}
                onChange={(e) => setConfigForm({ ...configForm, language: e.target.value })}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2.5 px-3 text-xs text-gray-900 dark:text-white outline-none cursor-pointer font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                {CARTESIA_REGIONAL_GROUPS.map((region) => {
                  const regionalLangs = CARTESIA_SUPPORTED_LANGUAGES.filter(l => l.region === region);
                  if (regionalLangs.length === 0) return null;
                  return (
                    <optgroup key={region} label={`─── ${region} (${regionalLangs.length}) ───`}>
                      {regionalLangs.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} {lang.nativeName} — {lang.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Dedicated Direct Line
              </label>
              <select
                value={configForm.assignedPhoneId}
                onChange={(e) => setConfigForm({ ...configForm, assignedPhoneId: e.target.value })}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2.5 px-3 text-xs text-gray-900 dark:text-white outline-none cursor-pointer"
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

          {/* Section 2: Cartesia Neural Voice Persona Card (Hero Studio Box) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-pink-50/40 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-pink-950/20 border border-purple-200/80 dark:border-purple-800/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0 text-white",
                  selectedVoiceDetails?.isCloned
                    ? "bg-gradient-to-tr from-amber-500 to-orange-400"
                    : selectedVoiceDetails?.gender === 'female'
                      ? "bg-gradient-to-tr from-pink-500 to-purple-600"
                      : "bg-gradient-to-tr from-blue-500 to-indigo-600"
                )}>
                  {(selectedVoiceDetails?.name || configForm.voiceName || 'SV').slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                      Active Cartesia Voice Persona
                    </span>
                    {selectedVoiceDetails?.isCloned ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        CUSTOM CLONE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        SONIC 3.6 NEURAL
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                    {selectedVoiceDetails?.name || configForm.voiceName}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {selectedVoiceDetails?.description || 'Sub-90ms Generative Neural Voice Persona'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Live Test Audio Button */}
                <button
                  type="button"
                  onClick={handleTestVoiceAudio}
                  disabled={generatingTestAudio}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer",
                    isPlayingTestAudio
                      ? "bg-rose-600 text-white shadow-rose-600/20 scale-105"
                      : "bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 hover:bg-purple-50"
                  )}
                >
                  {generatingTestAudio ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : isPlayingTestAudio ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Preview</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Test Spoken Voice</span>
                    </>
                  )}
                </button>

                {/* Browse 900+ Voices */}
                <button
                  type="button"
                  onClick={() => setIsVoiceSelectorOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Browse 900+ Voices</span>
                </button>

                {/* Clone New Voice */}
                <button
                  type="button"
                  onClick={() => setIsCloningModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Clone your own voice"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Clone</span>
                </button>
              </div>
            </div>

            {/* Audio waveform / playback indicator */}
            {isPlayingTestAudio && (
              <div className="p-3 rounded-xl bg-purple-100/70 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between text-xs text-purple-900 dark:text-purple-200 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                  <span className="font-semibold">Playing live neural synthesis preview...</span>
                </div>
                <span className="text-[11px] font-mono text-purple-700 dark:text-purple-300">
                  Cartesia Sonic-3.6 ({configForm.voiceSpeed}x pace)
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Acoustic Synthesis & Tone Engine */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-850/60 border border-gray-200 dark:border-gray-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Acoustic Synthesis & Audio Format Controls
                </h4>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cartesia API: 2026-08-14</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Cartesia Model Engine */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Cartesia TTS Model
                </label>
                <select
                  value={configForm.modelId}
                  onChange={(e) => setConfigForm({ ...configForm, modelId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="sonic-3.6">Sonic 3.6 (Flagship Sub-90ms - Best Quality)</option>
                  <option value="sonic-multilingual">Sonic Multilingual (35+ Languages & Indic)</option>
                  <option value="sonic-english">Sonic English (Ultra-Low Latency)</option>
                  <option value="sonic-3.5">Sonic 3.5 (Stable Enterprise)</option>
                  <option value="sonic-turbo">Sonic Turbo (High Concurrency)</option>
                </select>
              </div>

              {/* Speaking Pace / Speed */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Speaking Pace / Speed
                  </label>
                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                    {configForm.voiceSpeed.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.5"
                  step="0.05"
                  value={configForm.voiceSpeed}
                  onChange={(e) => setConfigForm({ ...configForm, voiceSpeed: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                  <button type="button" onClick={() => setConfigForm({ ...configForm, voiceSpeed: 0.85 })} className="hover:text-purple-600 cursor-pointer">0.85x</button>
                  <button type="button" onClick={() => setConfigForm({ ...configForm, voiceSpeed: 1.0 })} className="hover:text-purple-600 font-bold text-gray-600 dark:text-gray-300 cursor-pointer">1.0x</button>
                  <button type="button" onClick={() => setConfigForm({ ...configForm, voiceSpeed: 1.15 })} className="hover:text-purple-600 cursor-pointer">1.15x</button>
                  <button type="button" onClick={() => setConfigForm({ ...configForm, voiceSpeed: 1.3 })} className="hover:text-purple-600 cursor-pointer">1.3x</button>
                </div>
              </div>

              {/* Volume Gain (0.5x to 2.0x) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Acoustic Output Volume
                  </label>
                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                    {(configForm.voiceVolume || 1.0).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={configForm.voiceVolume || 1.0}
                  onChange={(e) => setConfigForm({ ...configForm, voiceVolume: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                  <button type="button" onClick={() => setConfigForm({ ...configForm, voiceVolume: 0.75 })} className="hover:text-purple-600 cursor-pointer">0.75x Soft</button>
                  <button type="button" onClick={() => setConfigForm({ ...configForm, voiceVolume: 1.0 })} className="hover:text-purple-600 font-bold text-gray-600 dark:text-gray-300 cursor-pointer">1.0x Natural</button>
                  <button type="button" onClick={() => setConfigForm({ ...configForm, voiceVolume: 1.35 })} className="hover:text-purple-600 cursor-pointer">1.35x Boost</button>
                </div>
              </div>

              {/* Audio Format & Sample Rate */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Acoustic Pipeline Sample Rate
                </label>
                <select
                  value={configForm.sampleRate || 44100}
                  onChange={(e) => setConfigForm({ ...configForm, sampleRate: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value={44100}>44,100 Hz (Studio High-Fi - Softphone & Web)</option>
                  <option value={24000}>24,000 Hz (Wideband HD Voice)</option>
                  <option value={16000}>16,000 Hz (Standard Telephony PSTN / SIP)</option>
                  <option value={8000}>8,000 Hz (Narrowband Legacy G.711)</option>
                </select>
              </div>
            </div>

            {/* Sonic Emotion & Energy Presets */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Sonic Emotion & Conversational Energy Tone
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'positivity:high', label: '🌟 Upbeat & Cheerful', desc: 'Customer Delight' },
                  { id: 'warm', label: '💖 Warm & Empathetic', desc: 'Support & Care' },
                  { id: 'curious', label: '🔍 Inquisitive & Engaging', desc: 'Lead Discovery' },
                  { id: 'professional', label: '👔 Crisp & Executive', desc: 'Corporate Desk' },
                  { id: 'urgent', label: '⚡ Energetic & Direct', desc: 'High-Impact Sales' }
                ].map((emo) => (
                  <button
                    key={emo.id}
                    type="button"
                    onClick={() => setConfigForm({ ...configForm, emotionPreset: emo.id })}
                    className={clsx(
                      "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                      configForm.emotionPreset === emo.id
                        ? "bg-purple-50 dark:bg-purple-950/50 border-purple-500 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-750 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <div className="text-xs font-bold">{emo.label}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{emo.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: STT Real-Time Turn Detection & Keyterms Boosting */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-850/60 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-600" />
                  <span>Real-Time STT Engine & Auto Turn Detection</span>
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Powered by Cartesia Ink-2 / Ink-Preview: joint speech transcription with transformer turn-taking.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={configForm.allowBargeIn}
                  onChange={(e) => setConfigForm({ ...configForm, allowBargeIn: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-200 dark:border-gray-750 text-xs">
              {/* STT Model */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  STT Model Architecture
                </label>
                <select
                  value={configForm.sttModel}
                  onChange={(e) => setConfigForm({ ...configForm, sttModel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="ink-2">Cartesia Ink-2 (Auto Turn Detection - Recommended)</option>
                  <option value="ink-preview">Cartesia Ink-Preview (Auto Multi-language & Indic)</option>
                  <option value="ink-whisper">Cartesia Ink-Whisper (Continuous Dictation)</option>
                  <option value="nova-3">Deepgram Nova-3 (Cascaded Fallback)</option>
                </select>
              </div>

              {/* Turn Detection Sensitivity */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Turn Start Sensitivity: {configForm.turnStartThreshold || 0.8}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.9"
                  step="0.05"
                  value={configForm.turnStartThreshold || 0.8}
                  onChange={(e) => setConfigForm({ ...configForm, turnStartThreshold: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Higher = requires clear speech start. Default: 0.8</p>
              </div>

              {/* Turn End Timeout */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Turn End Timeout: {((configForm.turnEndTimeoutMs || 5600) / 1000).toFixed(1)}s
                </label>
                <input
                  type="range"
                  min="1000"
                  max="8000"
                  step="200"
                  value={configForm.turnEndTimeoutMs || 5600}
                  onChange={(e) => setConfigForm({ ...configForm, turnEndTimeoutMs: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Max silence before turn closure. Default: 5.6s</p>
              </div>
            </div>

            {/* Keyterms Acoustic Boosting */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Domain Keyterms Acoustic Prompting (Brand Names, Products, Medical SKUs)
              </label>
              <input
                type="text"
                value={configForm.keyterms}
                onChange={(e) => setConfigForm({ ...configForm, keyterms: e.target.value })}
                placeholder="e.g. 180workspace, Invoice #, Order Status, Dr. Sharma, Oil Change"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 px-3 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Cartesia STT will prioritize and accurately transcribe these exact words even in loud background noise (up to 100 terms).
              </p>
            </div>
          </div>

          {/* Section 5: First Spoken Greeting & System Prompt */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              First Spoken Greeting (Upon Call Pickup)
            </label>
            <input
              type="text"
              value={configForm.firstMessage}
              onChange={(e) => setConfigForm({ ...configForm, firstMessage: e.target.value })}
              placeholder="e.g. Hi there! Thanks for calling our service center. How can I help you today?"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-2.5 px-3.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Autonomous Behavior System Prompt
            </label>
            <textarea
              rows={8}
              value={configForm.systemPrompt}
              onChange={(e) => setConfigForm({ ...configForm, systemPrompt: e.target.value })}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 py-3 px-3.5 text-xs font-mono text-gray-900 dark:text-white leading-relaxed outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {/* Section 6: Permitted 180workspace Business Tools */}
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

          {/* Section 7: Add Your RAG & Custom Memory Vaults */}
          <div className="rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    RAG Knowledge Engine
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    {linkedVaults.length} Vault(s) Connected
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1.5">
                  Add Your RAG & Custom Memory Vaults
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Attach custom created 50MB RAG memory vaults (product catalogs, repair manuals, warranty policies, FAQs) to empower this voice employee with deep facts.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsLinkVaultDrawerOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{linkedVaults.length > 0 ? 'Manage Linked RAG' : 'Add Your RAG'}</span>
              </button>
            </div>

            {/* Linked Vaults Grid or Empty State */}
            {loadingVaults ? (
              <div className="py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-500" />
                <span>Loading linked RAG vaults...</span>
              </div>
            ) : linkedVaults.length === 0 ? (
              <div
                onClick={() => setIsLinkVaultDrawerOpen(true)}
                className="p-5 rounded-xl border border-dashed border-purple-300 dark:border-purple-800/60 bg-white/60 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-900 transition-all text-center cursor-pointer group"
              >
                <Database className="w-7 h-7 text-purple-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  No RAG memory vaults linked to this agent yet
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Click here or &quot;Add Your RAG&quot; to open the side drawer and connect custom created 50MB vaults from 180 Documents.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {linkedVaults.map((vault) => (
                  <div
                    key={vault.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/40 shadow-xs flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{vault.name}</h4>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-mono rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          #{vault.category || vault.mode || 'vault'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnlinkVault(vault.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Unlink this vault"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {vault.purposeDescription && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                        {vault.purposeDescription}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-1.5 font-mono">
                      <span>{vault.totalChunks || 0} chunks</span>
                      <span>{formatBytes(vault.totalSizeBytes || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      )}

      {/* ─── Tab 4: Guardrails & Trust ──────────────────────────────────────── */}
      {activeTab === 'guardrails' && (
        <AgentGuardrailsEditor
          agentId={agent.id}
          agentName={agent.name}
          onSaved={fetchAgent}
        />
      )}

      {/* ─── Modals ────────────────────────────────────────────────────────── */}
      {/* Cartesia 900+ Voice Catalog Selector Modal */}
      <CartesiaVoiceSelectorModal
        isOpen={isVoiceSelectorOpen}
        onClose={() => setIsVoiceSelectorOpen(false)}
        selectedVoiceId={configForm.voiceId}
        onSelectVoice={(voice) => {
          setSelectedVoiceDetails(voice);
          setConfigForm((prev) => ({
            ...prev,
            voiceId: voice.id,
            voiceName: voice.name,
            language: voice.language === 'hi' ? 'hi-IN' : prev.language
          }));
          toast.success(`Selected voice: ${voice.name}`);
        }}
        onOpenCloning={() => setIsCloningModalOpen(true)}
      />

      {/* Instant Voice Cloning Modal */}
      <VoiceCloningModal
        isOpen={isCloningModalOpen}
        onClose={() => setIsCloningModalOpen(false)}
        onVoiceCloned={(newVoice) => {
          setSelectedVoiceDetails(newVoice);
          setConfigForm((prev) => ({
            ...prev,
            voiceId: newVoice.id,
            voiceName: newVoice.name
          }));
          toast.success(`Voice cloned & selected for ${agent.name}!`);
        }}
      />

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

      {/* Slide-over Side Drawer for Adding Custom RAG Vaults */}
      <LinkExistingRagVaultDrawer
        isOpen={isLinkVaultDrawerOpen}
        onClose={() => setIsLinkVaultDrawerOpen(false)}
        agentId={id}
        agentName={configForm.name || 'AI Voice Employee'}
        onSuccess={fetchLinkedVaults}
      />
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

