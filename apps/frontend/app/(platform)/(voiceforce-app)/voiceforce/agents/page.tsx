"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bot, Plus, ArrowLeft, Check, Sparkles, Volume2, 
  Trash2, ShieldCheck, Sliders, Phone, BrainCircuit, Headphones, 
  CheckCircle2, AlertCircle, Edit3, Power, ExternalLink, Copy
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  ConfirmModal, 
  UniversalSkeleton 
} from '@workspace/ui';
import { UniversalSlideDrawer } from '../_components/UniversalSlideDrawer';

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

const DEFAULT_FORM = {
  name: 'Maya',
  role: 'Customer Support & Inbound Sales Specialist',
  language: 'en-US',
  voiceId: CARTESIA_VOICES[0].id,
  firstMessage: 'Hello! This is Maya from 180workspace. How may I assist your business today?',
  systemPrompt: `You are Maya, an autonomous voice employee for 180workspace. You are warm, professional, empathetic, and efficient.
When the customer mentions items they want to order, verify prices, check availability, confirm the order details, and execute the appropriate business tool. Keep replies brief (under 2 sentences) for natural conversational pacing.`,
  allowBargeIn: true,
  maxDurationSeconds: 600,
  voiceSpeed: 1.0,
  temperature: 0.6,
  fallbackPhone: '',
  assignedPhoneId: '',
  enabledToolNames: ['search_knowledge_base', 'check_product_price', 'create_crm_client', 'book_appointment']
};

export default function VoiceforceAgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  
  // Deletion confirmation modal
  const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState(DEFAULT_FORM);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const [agentsRes, numbersRes] = await Promise.all([
        api.get('/api/v1/voiceforce/agents'),
        api.get('/api/v1/voiceforce/numbers').catch(() => ({ data: { data: [] } }))
      ]);
      setAgents(agentsRes.data?.data || []);
      setPhoneNumbers(numbersRes.data?.data || []);
    } catch (err: any) {
      toast.error('Failed to load voice agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleOpenCreate = () => {
    setEditingAgent(null);
    setForm(DEFAULT_FORM);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (ag: any) => {
    setEditingAgent(ag);
    const currentPhoneId = ag.assignedNumbers?.[0]?.id || '';
    setForm({
      name: ag.name || '',
      role: ag.role || '',
      language: ag.language || 'en-US',
      voiceId: ag.voiceId || CARTESIA_VOICES[0].id,
      firstMessage: ag.firstMessage || '',
      systemPrompt: ag.systemPrompt || '',
      allowBargeIn: ag.allowBargeIn ?? true,
      maxDurationSeconds: ag.maxDurationSeconds || 600,
      voiceSpeed: ag.voiceSpeed || 1.0,
      temperature: ag.voiceTemperature || 0.6,
      fallbackPhone: ag.fallbackPhone || '',
      assignedPhoneId: currentPhoneId,
      enabledToolNames: Array.isArray(ag.enabledToolNames) && ag.enabledToolNames.length > 0 
        ? ag.enabledToolNames 
        : ['search_knowledge_base']
    });
    setIsDrawerOpen(true);
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim() || !form.systemPrompt.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      if (editingAgent) {
        // Update existing agent via PUT
        const res = await api.put(`/api/v1/voiceforce/agents/${editingAgent.id}`, {
          ...form,
          assignedPhoneId: form.assignedPhoneId || null,
          voiceTemperature: form.temperature
        });
        if (res.data?.success) {
          toast.success(`Voice Agent "${form.name}" updated successfully!`);
          setIsDrawerOpen(false);
          fetchAgents();
        }
      } else {
        // Create new agent via POST
        const res = await api.post('/api/v1/voiceforce/agents', {
          ...form,
          assignedPhoneId: form.assignedPhoneId || null,
          voiceTemperature: form.temperature
        });
        if (res.data?.success) {
          toast.success(`Voice Agent "${form.name}" deployed successfully!`);
          setIsDrawerOpen(false);
          fetchAgents();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (ag: any) => {
    const nextState = ag.isActive === false ? true : false;
    try {
      await api.put(`/api/v1/voiceforce/agents/${ag.id}`, { isActive: nextState });
      toast.success(`Agent "${ag.name}" is now ${nextState ? 'Active' : 'Paused'}`);
      fetchAgents();
    } catch (err: any) {
      toast.error('Failed to update agent status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/api/v1/voiceforce/agents/${agentToDelete.id}`);
      toast.success(`Agent "${agentToDelete.name}" deleted`);
      setAgentToDelete(null);
      fetchAgents();
    } catch (err: any) {
      toast.error('Failed to delete agent');
    } finally {
      setDeleting(false);
    }
  };

  const toggleTool = (toolId: string) => {
    setForm(prev => {
      const exists = prev.enabledToolNames.includes(toolId);
      return {
        ...prev,
        enabledToolNames: exists
          ? prev.enabledToolNames.filter(t => t !== toolId)
          : [...prev.enabledToolNames, toolId]
      };
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link 
              href="/voiceforce" 
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Back to Voiceforce Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">AI Voice Employees</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pl-9">
            Configure custom neural voice personas, speaking cadences, and business tool permissions.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Deploy New Employee</span>
        </button>
      </div>

      {/* Production Launch Checklist Banner */}
      {showOnboarding && (
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-950/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Voiceforce 5-Step Production Launch Checklist</h3>
            </div>
            <button
              onClick={() => setShowOnboarding(false)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            <div className={`p-3 rounded-xl border transition-all ${
              agents.length > 0 
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300' 
                : 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
            }`}>
              <span className="font-bold block mb-0.5">1. AI Employee</span>
              <span>{agents.length > 0 ? '✅ Deployed' : '⚠️ Pending creation'}</span>
            </div>
            <Link href="/voiceforce/numbers" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:border-indigo-300 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 transition-colors block">
              <span className="font-bold block mb-0.5">2. Phone Line</span>
              <span>📞 Connect Caller ID →</span>
            </Link>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">
              <span className="font-bold block mb-0.5">3. Business Brain</span>
              <span>🏷️ Catalog & Live Pricing</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">
              <span className="font-bold block mb-0.5">4. Softphone Test</span>
              <span>🎙️ ₹0 In-Browser Trial</span>
            </div>
            <Link href="/voiceforce/campaigns" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:border-indigo-300 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 transition-colors block">
              <span className="font-bold block mb-0.5">5. Outbound Scale</span>
              <span>🚀 100+ Batch Campaign →</span>
            </Link>
          </div>
        </div>
      )}

      {/* Roster Display */}
      {loading ? (
        <div className="p-4">
          <UniversalSkeleton type="kanban" />
        </div>
      ) : agents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/50">
            <Bot className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No Voice Employees Deployed Yet</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Create your first AI voice persona (like Maya or Sarah) to handle inbound customer questions and outbound campaigns autonomously.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            Deploy Maya (Default Assistant)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((ag) => {
            const isAgentActive = ag.isActive !== false;

            return (
              <div 
                key={ag.id} 
                className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 flex flex-col justify-between hover:border-indigo-500/40 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50 font-bold text-lg flex-shrink-0">
                        {ag.name[0]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{ag.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{ag.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActive(ag)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isAgentActive 
                            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60' 
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                        title={isAgentActive ? "Pause Employee" : "Activate Employee"}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(ag)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-gray-200/80 dark:border-gray-700/80 transition-colors cursor-pointer"
                        title="Edit Persona & Tools"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setAgentToDelete({ id: ag.id, name: ag.name })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-gray-200/80 dark:border-gray-700/80 transition-colors cursor-pointer"
                        title="Delete Agent"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                      <span>Status</span>
                      <span className={`font-semibold flex items-center gap-1.5 ${isAgentActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${isAgentActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                        {isAgentActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                      <span>Voice Model</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Cartesia Sonic (Sub-90ms)</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                      <span>Barge-In (Interruption)</span>
                      <span className={`font-medium ${ag.allowBargeIn ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`}>
                        {ag.allowBargeIn ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Permitted Business Tools</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Array.isArray(ag.enabledToolNames) && ag.enabledToolNames.length > 0 ? (
                        ag.enabledToolNames.map((tool: string) => (
                          <span 
                            key={tool} 
                            className="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 text-[10px] font-medium text-gray-700 dark:text-gray-300"
                          >
                            {tool.replace(/_/g, ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">No business tools assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Direct Dedicated Phone Line for Customers */}
                  {ag.assignedNumbers && ag.assignedNumbers.length > 0 ? (
                    <div className="mt-4 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block">Customer Direct Line</span>
                          <span className="text-xs font-mono font-bold text-gray-900 dark:text-white truncate block">
                            {ag.assignedNumbers[0].e164Number}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(ag.assignedNumbers[0].e164Number);
                          toast.success(`Copied ${ag.assignedNumbers[0].e164Number}! Share with your clients.`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-700 border border-indigo-200/80 dark:border-indigo-700 text-[11px] font-semibold flex items-center gap-1 transition-all shadow-xs flex-shrink-0 cursor-pointer"
                        title="Copy direct phone number to give to customers"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
                      <span className="text-[11px] text-gray-400">No direct phone line linked</span>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ag)}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        + Assign Number
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <Link 
                    href="/voiceforce/numbers"
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                  >
                    <span>{ag.assignedNumbers?.length || 0} phone line(s)</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </Link>

                  <button
                    onClick={() => handleOpenEdit(ag)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Configure Persona →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Universal Slide Drawer: Deploy / Edit AI Voice Employee */}
      <UniversalSlideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingAgent ? `Configure ${editingAgent.name}` : "Deploy AI Voice Employee"}
        subtitle={editingAgent ? "Update neural voice persona, system prompts, and business tool permissions." : "Train an autonomous agent with business tools, voice personas, and guardrails."}
        icon={Bot}
        iconColorClass="text-indigo-600 dark:text-indigo-400"
        iconBgClass="bg-indigo-50 dark:bg-indigo-950/60"
        maxWidthClass="max-w-xl"
        onSubmit={handleSaveAgent}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {saving ? 'Saving Changes...' : editingAgent ? 'Save Updates' : 'Deploy Voice Employee'}
            </button>
          </>
        }
      >
        {/* Agent Identity */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            1. Identity & Role
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Employee Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Job Role</label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                required
              />
            </div>
          </div>
        </div>

        {/* Voice Persona */}
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            2. Voice Persona & Accent
          </h4>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Cartesia Sonic Neural Voice (Sub-90ms First-Chunk Audio)
            </label>
            <select
              value={form.voiceId}
              onChange={(e) => setForm({ ...form, voiceId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              {CARTESIA_VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Initial Greeting (First Spoken Message upon Pickup)
            </label>
            <input
              type="text"
              value={form.firstMessage}
              onChange={(e) => setForm({ ...form, firstMessage: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* System Prompt */}
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            3. Business Instructions & Prompts
          </h4>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Autonomous Behavior System Prompt
            </label>
            <textarea
              rows={4}
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
              required
            />
          </div>
        </div>

        {/* Permitted Business Tools */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              4. Permitted 180workspace Tools
            </h4>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              {form.enabledToolNames.length} selected
            </span>
          </div>

          <div className="space-y-2.5">
            {AVAILABLE_TOOLS.map((tool) => {
              const isChecked = form.enabledToolNames.includes(tool.id);
              return (
                <div
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isChecked 
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-sm' 
                      : 'bg-gray-50/60 dark:bg-gray-800/40 border-gray-200/80 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="pr-3">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{tool.label}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{tool.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center border flex-shrink-0 transition-colors ${
                    isChecked 
                      ? 'bg-indigo-600 border-indigo-600 text-white' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                  }`}>
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Telephony Parameters */}
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            5. Telephony Guardrails & Pacing
          </h4>
          
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80 space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 mb-2">
                <span className="font-semibold">Max Call Duration</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {Math.round(form.maxDurationSeconds / 60)} mins ({form.maxDurationSeconds}s)
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={1800}
                step={60}
                value={form.maxDurationSeconds}
                onChange={(e) => setForm({ ...form, maxDurationSeconds: parseInt(e.target.value, 10) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 mb-2">
                <span className="font-semibold">Speaking Pace / Speed</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{form.voiceSpeed}x</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.3}
                step={0.05}
                value={form.voiceSpeed}
                onChange={(e) => setForm({ ...form, voiceSpeed: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 mb-2">
                <span className="font-semibold">LLM Temperature (Creativity)</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{form.temperature}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.1}
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Human Escalation Transfer Number (PSTN)
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210 (Optional PSTN number)"
                value={form.fallbackPhone}
                onChange={(e) => setForm({ ...form, fallbackPhone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="bargeIn"
                checked={form.allowBargeIn}
                onChange={(e) => setForm({ ...form, allowBargeIn: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
              />
              <label htmlFor="bargeIn" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer font-medium">
                Allow conversational interruption (Barge-in: stops talking instantly when human speaks)
              </label>
            </div>
          </div>
        </div>

        {/* Inbound Phone Line Linking */}
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            6. Inbound Direct Line & Outbound Caller ID
          </h4>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Assign Dedicated Business Phone Number
              </label>
              <select
                value={form.assignedPhoneId}
                onChange={(e) => setForm({ ...form, assignedPhoneId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="">No phone number linked (Web Softphone only)</option>
                {phoneNumbers.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.e164Number} {p.friendlyName ? `(${p.friendlyName})` : ''} - [{p.status?.toUpperCase() || 'ACTIVE'}]
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                When customers dial this number, {form.name || 'this agent'} will answer immediately, handle inquiries, take bookings, record conversations, and store transcripts.
              </p>
            </div>
          </div>
        </div>
      </UniversalSlideDrawer>

      {/* Delete Agent Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(agentToDelete)}
        onClose={() => setAgentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete AI Voice Employee"
        message={`Are you sure you want to delete ${agentToDelete?.name}? Any assigned numbers or ongoing call routes for this employee will be disconnected.`}
        confirmText={deleting ? "Deleting..." : "Delete Employee"}
        cancelText="Keep Employee"
        isDestructive={true}
      />
    </div>
  );
}
