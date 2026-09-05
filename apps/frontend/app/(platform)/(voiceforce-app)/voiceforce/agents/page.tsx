"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bot, Plus, ArrowLeft, Check, Sparkles, Sliders, Volume2, 
  Trash2, ShieldCheck, X
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader } from '@workspace/ui';

const CARTESIA_VOICES = [
  { id: '694f12bc-9263-4416-a1d8-0402e1c6e1d2', name: 'Maya - Indian English (Warm & Professional)', gender: 'Female' },
  { id: 'a0e99841-438c-4a64-b679-ae501e7d6091', name: 'Barbershop Man - US English (Deep & Confident)', gender: 'Male' },
  { id: '256191b9-3bf6-42d7-a50d-8ea13a8f4c39', name: 'Sarah - British English (Polite Executive)', gender: 'Female' },
  { id: '79a125e8-cd45-4c13-8a67-188112f4dd22', name: 'Alex - US English (Fast & Energetic)', gender: 'Male' }
];

const AVAILABLE_TOOLS = [
  { id: 'search_knowledge_base', label: 'Search Company Knowledge Base (RAG)', desc: 'Access internal documents and policies' },
  { id: 'check_product_price', label: 'Live Catalog & Price Query', desc: 'Queries real-time product prices from company offerings' },
  { id: 'create_crm_client', label: 'Create CRM Leads & Clients', desc: 'Save contact details to 180 CRM database' },
  { id: 'book_appointment', label: 'Schedule Customer Appointments', desc: 'Creates calendar events in 180 Calendar' },
  { id: 'create_sales_order', label: 'Generate Sales Orders & Invoices', desc: 'Creates draft orders in 180 Finance' },
  { id: 'send_sms_confirmation', label: 'Send SMS Follow-up / Receipts', desc: 'Dispatches instant SMS via Telnyx' },
  { id: 'create_task', label: 'Create Projects & Sprint Tasks', desc: 'Create tasks directly in 180 Projects' }
];

export default function VoiceforceAgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const [form, setForm] = useState({
    name: 'Maya',
    role: 'Order & Customer Support Specialist',
    language: 'en-US',
    voiceId: CARTESIA_VOICES[0].id,
    firstMessage: 'Hello! This is Maya from ABC Company. How can I assist your order today?',
    systemPrompt: `You are Maya, an autonomous voice employee. You are warm, professional, and efficient.
When the customer mentions items they want to order, verify prices, check availability, confirm the order, and execute the appropriate business tool. Keep replies brief (under 2 sentences).`,
    allowBargeIn: true,
    maxDurationSeconds: 600,
    temperature: 0.6,
    fallbackPhone: '',
    enabledToolNames: ['search_knowledge_base', 'check_product_price', 'create_crm_client', 'book_appointment']
  });

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/voiceforce/agents');
      setAgents(res.data?.data || []);
    } catch (err: any) {
      toast.error('Failed to load voice agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.post('/api/v1/voiceforce/agents', form);
      if (res.data?.success) {
        toast.success(`Voice Agent "${form.name}" created!`);
        setIsCreateOpen(false);
        fetchAgents();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create agent');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to remove this voice agent?')) return;
    try {
      await api.delete(`/api/v1/voiceforce/agents/${id}`);
      toast.success('Agent deleted');
      fetchAgents();
    } catch (err: any) {
      toast.error('Failed to delete agent');
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
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/voiceforce" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Voice Employees</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Configure custom voice personas, speaking cadences, and business tool permissions.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Deploy New Employee</span>
        </button>
      </div>

      {/* Interactive Onboarding Checklist Banner */}
      {showOnboarding && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/30 via-slate-900 to-violet-900/30 border border-indigo-500/20 backdrop-blur-md relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Voiceforce 5-Step Production Launch Checklist</h3>
            </div>
            <button
              onClick={() => setShowOnboarding(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            <div className={`p-2.5 rounded-xl border ${agents.length > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-300'}`}>
              <span className="font-semibold block mb-0.5">1. AI Employee</span>
              <span>{agents.length > 0 ? '✅ Deployed' : '⚠️ Pending creation'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300">
              <span className="font-semibold block mb-0.5">2. Phone Line</span>
              <span>📞 Connect Caller ID</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300">
              <span className="font-semibold block mb-0.5">3. Business Brain</span>
              <span>🏷️ Catalog & Live Pricing</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300">
              <span className="font-semibold block mb-0.5">4. Softphone Test</span>
              <span>🎙️ ₹0 In-Browser Trial</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300">
              <span className="font-semibold block mb-0.5">5. Outbound Scale</span>
              <span>🚀 100+ Number Campaign</span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : agents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/10">
          <Bot className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-white">No Voice Employees Deployed</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Create your first AI voice persona (like Maya or Alex) to handle telephone calls autonomously.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Create Maya (Default Assistant)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((ag) => (
            <div key={ag.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 font-bold text-base">
                      {ag.name[0]}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{ag.name}</h3>
                      <p className="text-xs text-slate-400">{ag.role}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteAgent(ag.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors"
                    title="Delete Agent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Engine</span>
                    <span className="text-slate-200 font-medium">{ag.engineType}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Voice Model</span>
                    <span className="text-indigo-300 font-medium">Cartesia Sonic (90ms)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Barge-In (Interruption)</span>
                    <span className={ag.allowBargeIn ? "text-emerald-400" : "text-slate-400"}>
                      {ag.allowBargeIn ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Permitted Tools</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {Array.isArray(ag.enabledToolNames) && ag.enabledToolNames.map((tool: string) => (
                      <span key={tool} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                <span>{ag.assignedNumbers?.length || 0} phone line(s)</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Agent Drawer / Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative my-8">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Bot className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Deploy AI Voice Employee</h3>
                <p className="text-xs text-slate-400">Train an autonomous agent with business tools and guardrails.</p>
              </div>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Employee Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Job Role</label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Voice & Accent (Cartesia Sonic Generative AI)</label>
                <select
                  value={form.voiceId}
                  onChange={(e) => setForm({ ...form, voiceId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  {CARTESIA_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Initial Phone Greeting (First Message Spoken)</label>
                <input
                  type="text"
                  value={form.firstMessage}
                  onChange={(e) => setForm({ ...form, firstMessage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">System Prompt & Business Instructions</label>
                <textarea
                  rows={4}
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Permitted 180workspace Business Tools</label>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {AVAILABLE_TOOLS.map((tool) => {
                    const isChecked = form.enabledToolNames.includes(tool.id);
                    return (
                      <div
                        key={tool.id}
                        onClick={() => toggleTool(tool.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-semibold text-white">{tool.label}</p>
                          <p className="text-[11px] text-slate-400">{tool.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                          isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Parameters: Duration, Temperature, Fallback */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                    <span>Max Call Duration</span>
                    <span className="font-semibold text-indigo-400">{Math.round(form.maxDurationSeconds / 60)} mins ({form.maxDurationSeconds}s)</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={1800}
                    step={60}
                    value={form.maxDurationSeconds}
                    onChange={(e) => setForm({ ...form, maxDurationSeconds: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                    <span>LLM Temperature (Creativity)</span>
                    <span className="font-semibold text-indigo-400">{form.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Human Escalation Fallback Number (PSTN Transfer)
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210 (Optional PSTN number for human transfer)"
                    value={form.fallbackPhone}
                    onChange={(e) => setForm({ ...form, fallbackPhone: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bargeIn"
                  checked={form.allowBargeIn}
                  onChange={(e) => setForm({ ...form, allowBargeIn: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="bargeIn" className="text-xs text-slate-300">
                  Allow conversational interruption (Barge-in: stops talking when human speaks)
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {saving ? 'Deploying...' : 'Deploy Voice Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
