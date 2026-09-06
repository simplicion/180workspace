"use client";

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Code, 
  Layers, Plus, Trash2, Edit3, Check, DollarSign, Clock, 
  MapPin, ShieldAlert, Sparkles, RefreshCw, Copy, Eye, FileText
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export interface GuardrailRuleDo {
  id: string;
  category: 'service' | 'compliance' | 'sales' | 'escalation';
  rule: string;
  instruction: string;
  priority: 'critical' | 'high' | 'standard';
}

export interface GuardrailRuleDont {
  id: string;
  category: 'pricing' | 'competitors' | 'legal' | 'pii' | 'topics';
  rule: string;
  constraint: string;
  enforcement: 'strict_block' | 'polite_decline' | 'escalate_human';
}

export interface GuardrailRuleSet {
  version: number;
  dos: GuardrailRuleDo[];
  donts: GuardrailRuleDont[];
}

interface AgentGuardrailsEditorProps {
  agentId: string;
  agentName: string;
  onSaved?: () => void;
}

const DEFAULT_DOS: GuardrailRuleDo[] = [
  {
    id: 'do-1',
    category: 'compliance',
    rule: 'Disclose AI Identity',
    instruction: 'Politely inform the customer you are an autonomous AI voice assistant if asked directly.',
    priority: 'critical'
  },
  {
    id: 'do-2',
    category: 'service',
    rule: 'Verify Delivery Address',
    instruction: 'Always repeat customer street name, unit number, and postal code before booking delivery.',
    priority: 'high'
  },
  {
    id: 'do-3',
    category: 'escalation',
    rule: 'Escalate Legal Mentions',
    instruction: 'Immediately trigger warm human handoff if caller mentions attorneys, lawsuits, or regulatory bodies.',
    priority: 'critical'
  },
  {
    id: 'do-4',
    category: 'sales',
    rule: 'Offer Standard 10% Retention Discount',
    instruction: 'If a prospective lead hesitates on price, you are permitted to offer up to 10% promotional discount.',
    priority: 'standard'
  }
];

const DEFAULT_DONTS: GuardrailRuleDont[] = [
  {
    id: 'dont-1',
    category: 'pii',
    rule: 'Never Collect Credit Card Numbers',
    constraint: 'Voice PCI DSS prohibited: Never ask caller to read 16-digit card numbers or CVV codes out loud.',
    enforcement: 'strict_block'
  },
  {
    id: 'dont-2',
    category: 'competitors',
    rule: 'Never Criticize Competitors',
    constraint: 'Refrain from disparaging competitor brands or comparing unverified competitor pricing.',
    enforcement: 'polite_decline'
  },
  {
    id: 'dont-3',
    category: 'pricing',
    rule: 'Never Promise Unauthorized Delivery Windows',
    constraint: 'Do not promise same-day delivery under 60 minutes without direct dispatch confirmation.',
    enforcement: 'polite_decline'
  },
  {
    id: 'dont-4',
    category: 'legal',
    rule: 'Never Provide Binding Legal Commitments',
    constraint: 'State that quotations are estimates subject to written contract approval.',
    enforcement: 'escalate_human'
  }
];

export function AgentGuardrailsEditor({ agentId, agentName, onSaved }: AgentGuardrailsEditorProps) {
  const [activeSubTab, setActiveSubTab] = useState<'dos' | 'donts'>('dos');
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Financial & Operational Caps
  const [caps, setCaps] = useState({
    maxDiscountPercent: 10.0,
    maxDiscountAmount: 50.0,
    maxOrderValue: 1000.0,
    minLeadTimeHours: 2,
    maxDeliveryKm: 6.0,
    pciRedactionEnabled: true
  });

  // Typed Rules (Do's and Don'ts)
  const [rules, setRules] = useState<GuardrailRuleSet>({
    version: 1,
    dos: DEFAULT_DOS,
    donts: DEFAULT_DONTS
  });

  // Raw JSON String state for Monaco/Raw editor
  const [rawJsonText, setRawJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // New Rule Form State
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newDo, setNewDo] = useState<Omit<GuardrailRuleDo, 'id'>>({
    category: 'service',
    rule: '',
    instruction: '',
    priority: 'high'
  });
  const [newDont, setNewDont] = useState<Omit<GuardrailRuleDont, 'id'>>({
    category: 'pricing',
    rule: '',
    constraint: '',
    enforcement: 'polite_decline'
  });

  // Fetch Existing Guardrails
  const fetchGuardrails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/voiceforce/agents/${agentId}/guardrails`);
      if (res.data?.guardrail) {
        const g = res.data.guardrail;
        setCaps({
          maxDiscountPercent: g.maxDiscountPercent ?? 10.0,
          maxDiscountAmount: g.maxDiscountAmount ?? 50.0,
          maxOrderValue: g.maxOrderValue ?? 1000.0,
          minLeadTimeHours: g.minLeadTimeHours ?? 2,
          maxDeliveryKm: g.maxDeliveryKm ?? 6.0,
          pciRedactionEnabled: g.pciRedactionEnabled ?? true
        });

        if (g.rules && typeof g.rules === 'object') {
          const loadedRules: GuardrailRuleSet = {
            version: g.rules.version || 1,
            dos: Array.isArray(g.rules.dos) && g.rules.dos.length > 0 ? g.rules.dos : DEFAULT_DOS,
            donts: Array.isArray(g.rules.donts) && g.rules.donts.length > 0 ? g.rules.donts : DEFAULT_DONTS
          };
          setRules(loadedRules);
          setRawJsonText(JSON.stringify(loadedRules, null, 2));
        } else {
          const initialRules = { version: 1, dos: DEFAULT_DOS, donts: DEFAULT_DONTS };
          setRules(initialRules);
          setRawJsonText(JSON.stringify(initialRules, null, 2));
        }
      }
    } catch {
      const initialRules = { version: 1, dos: DEFAULT_DOS, donts: DEFAULT_DONTS };
      setRules(initialRules);
      setRawJsonText(JSON.stringify(initialRules, null, 2));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) fetchGuardrails();
  }, [agentId]);

  // Sync Visual Changes to JSON
  const updateRulesAndSyncJson = (newRules: GuardrailRuleSet) => {
    setRules(newRules);
    setRawJsonText(JSON.stringify(newRules, null, 2));
  };

  // Sync JSON Changes to Visual
  const handleRawJsonChange = (text: string) => {
    setRawJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.dos) || !Array.isArray(parsed.donts)) {
        setJsonError('JSON must contain "dos" and "donts" arrays');
        return;
      }
      setRules(parsed);
      setJsonError(null);
    } catch (err: any) {
      setJsonError('Invalid JSON format: ' + err.message);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      setRawJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
      toast.success('JSON formatted');
    } catch {
      toast.error('Cannot format invalid JSON');
    }
  };

  // Rule Handlers
  const handleAddDo = () => {
    if (!newDo.rule.trim()) return toast.error('Please specify the rule title');
    const created: GuardrailRuleDo = {
      ...newDo,
      id: `do-${Date.now()}`
    };
    updateRulesAndSyncJson({ ...rules, dos: [...rules.dos, created] });
    setNewDo({ category: 'service', rule: '', instruction: '', priority: 'high' });
    setIsAddingRule(false);
    toast.success('Permitted behavior rule added');
  };

  const handleAddDont = () => {
    if (!newDont.rule.trim()) return toast.error('Please specify the boundary title');
    const created: GuardrailRuleDont = {
      ...newDont,
      id: `dont-${Date.now()}`
    };
    updateRulesAndSyncJson({ ...rules, donts: [...rules.donts, created] });
    setNewDont({ category: 'pricing', rule: '', constraint: '', enforcement: 'polite_decline' });
    setIsAddingRule(false);
    toast.success('Prohibited boundary added');
  };

  const handleDeleteDo = (id: string) => {
    updateRulesAndSyncJson({ ...rules, dos: rules.dos.filter(d => d.id !== id) });
    toast.success('Rule removed');
  };

  const handleDeleteDont = (id: string) => {
    updateRulesAndSyncJson({ ...rules, donts: rules.donts.filter(d => d.id !== id) });
    toast.success('Boundary removed');
  };

  // Save to Backend
  const handleSave = async () => {
    if (jsonError) {
      toast.error('Please fix JSON formatting errors before saving');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/api/v1/voiceforce/agents/${agentId}/guardrails`, {
        ...caps,
        rules: rules
      });
      toast.success(`Guardrails & trust policies saved for ${agentName}!`);
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save guardrails');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header & Mode Controls ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Guardrails & Safety Engine
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase">
              Gold Standard JSON Schema
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Deterministic rules compiled into {agentName}&apos;s real-time prompt and tool execution pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Dual-Mode Toggle */}
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === 'visual'
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Visual Builder</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('json')}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === 'json'
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw JSON Editor</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || Boolean(jsonError)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>{saving ? 'Saving...' : 'Save Guardrails'}</span>
          </button>
        </div>
      </div>

      {/* ─── Mode 1: Visual Rule Builder ───────────────────────────────────── */}
      {viewMode === 'visual' && (
        <div className="space-y-6">
          {/* Subtab Switch: What to Do vs What NOT to Do */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('dos');
                setIsAddingRule(false);
              }}
              className={clsx(
                "flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-bold transition-all cursor-pointer",
                activeSubTab === 'dos'
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>What to Do ({rules.dos.length} Permitted SOPs)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('donts');
                setIsAddingRule(false);
              }}
              className={clsx(
                "flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-bold transition-all cursor-pointer",
                activeSubTab === 'donts'
                  ? "border-rose-600 text-rose-600 dark:text-rose-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <XCircle className="w-4 h-4 text-rose-500" />
              <span>What NOT to Do ({rules.donts.length} Strict Prohibitions)</span>
            </button>
          </div>

          {/* Subtab 1: What to Do */}
          {activeSubTab === 'dos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Mandatory behaviors, required greeting protocols, customer escalation criteria, and standard sales procedures.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingRule(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add What to Do</span>
                </button>
              </div>

              {/* Add New Do Form */}
              {isAddingRule && (
                <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> New Permitted Behavior Rule
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingRule(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Rule Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Always state 14-day return policy"
                        value={newDo.rule}
                        onChange={(e) => setNewDo({ ...newDo, rule: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-xs text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                      <select
                        value={newDo.priority}
                        onChange={(e) => setNewDo({ ...newDo, priority: e.target.value as any })}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-xs text-gray-900 dark:text-white"
                      >
                        <option value="critical">Critical (Must Follow)</option>
                        <option value="high">High (Recommended)</option>
                        <option value="standard">Standard (Default)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Detailed Operating Instruction</label>
                    <textarea
                      rows={2}
                      placeholder="Specify the exact instructions the AI must execute..."
                      value={newDo.instruction}
                      onChange={(e) => setNewDo({ ...newDo, instruction: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-xs text-gray-900 dark:text-white leading-relaxed"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingRule(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddDo}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                    >
                      Save Rule
                    </button>
                  </div>
                </div>
              )}

              {/* Do's Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {rules.dos.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs hover:border-emerald-500/40 transition-colors flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={clsx(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            item.priority === 'critical' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800' :
                            item.priority === 'high' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          )}>
                            {item.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 capitalize">
                            {item.category}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDo(item.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white mt-2">
                        {item.rule}
                      </h4>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                        {item.instruction}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 2: What NOT to Do */}
          {activeSubTab === 'donts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Strict boundaries, forbidden competitor mentions, unauthorized discount promises, and off-limit topics.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingRule(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add What NOT to Do</span>
                </button>
              </div>

              {/* Add New Don't Form */}
              {isAddingRule && (
                <div className="p-4 rounded-2xl border-2 border-rose-500/40 bg-rose-50/20 dark:bg-rose-950/20 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> New Prohibited Boundary
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingRule(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Boundary Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Never mention competitor brand X"
                        value={newDont.rule}
                        onChange={(e) => setNewDont({ ...newDont, rule: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-xs text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Enforcement Action</label>
                      <select
                        value={newDont.enforcement}
                        onChange={(e) => setNewDont({ ...newDont, enforcement: e.target.value as any })}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-xs text-gray-900 dark:text-white"
                      >
                        <option value="strict_block">Strict Block (Refuse)</option>
                        <option value="polite_decline">Polite Decline</option>
                        <option value="escalate_human">Escalate to Staff</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Constraint Explanation</label>
                    <textarea
                      rows={2}
                      placeholder="Explain what must not happen and how the AI should handle breaches..."
                      value={newDont.constraint}
                      onChange={(e) => setNewDont({ ...newDont, constraint: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-xs text-gray-900 dark:text-white leading-relaxed"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingRule(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddDont}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                    >
                      Save Boundary
                    </button>
                  </div>
                </div>
              )}

              {/* Don'ts Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {rules.donts.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs hover:border-rose-500/40 transition-colors flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={clsx(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            item.enforcement === 'strict_block' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800' :
                            item.enforcement === 'escalate_human' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400 border border-purple-200 dark:border-purple-800' :
                            'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          )}>
                            {item.enforcement.replace(/_/g, ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 capitalize">
                            {item.category}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDont(item.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Boundary"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white mt-2">
                        {item.rule}
                      </h4>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                        {item.constraint}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Mode 2: Raw JSON Editor ────────────────────────────────────────── */}
      {viewMode === 'json' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Live JSON document for power users and AI policy pipelines. Edits sync bidirectionally with the Visual Builder.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFormatJson}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                Format JSON
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-900">
            <textarea
              rows={18}
              value={rawJsonText}
              onChange={(e) => handleRawJsonChange(e.target.value)}
              className="w-full p-4 font-mono text-xs text-emerald-400 bg-gray-950/80 focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed resize-y"
            />
          </div>

          {jsonError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
