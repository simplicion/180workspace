"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  GitFork, ArrowLeft, Plus, Play, Layers, ShieldCheck, Shield,
  Trash2, ArrowUp, ArrowDown, ExternalLink, Power, Check, Copy, Globe, Smartphone, Bot, Clock, Code, Flame
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader } from '@workspace/ui';
import CustomSelect from '@/components/ui/CustomSelect';
import CreateRuleModal from '../../../_components/CreateRuleModal';
import EditRuleModal from '../../../_components/EditRuleModal';
import EmbedTagModal from '../../../_components/EmbedTagModal';
import EditLinkModal from '../../../_components/EditLinkModal';

export default function SmartLinkRuleCanvasPage() {
  const params = useParams();
  const linkId = params?.linkId as string;

  const [linkData, setLinkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Advanced Shield & Warmup State
  const [datacenterBlocked, setDatacenterBlocked] = useState(true);
  const [warmupUntil, setWarmupUntil] = useState('');
  const [rampUpEnabled, setRampUpEnabled] = useState(false);
  const [rampUpDurationHours, setRampUpDurationHours] = useState(24);
  const [shieldMode, setShieldMode] = useState('server');
  const [savingShield, setSavingShield] = useState(false);

  const fetchLinkDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/traffic-director/links/${linkId}`);
      const lk = res.data.data.link;
      setLinkData(lk);
      setFallbackUrl(lk.fallbackUrl);
      setDatacenterBlocked(lk.datacenterBlocked ?? true);
      setWarmupUntil(lk.warmupUntil ? new Date(lk.warmupUntil).toISOString().slice(0, 16) : '');
      setRampUpEnabled(lk.rampUpEnabled ?? false);
      setRampUpDurationHours(lk.rampUpDurationHours ?? 24);
      setShieldMode(lk.shieldMode || 'server');
    } catch (error: any) {
      console.error('Failed to fetch link details:', error);
      toast.error('Failed to load link details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShieldSettings = async () => {
    try {
      setSavingShield(true);
      await api.put(`/api/v1/traffic-director/links/${linkId}`, {
        datacenterBlocked,
        warmupUntil: warmupUntil ? new Date(warmupUntil).toISOString() : null,
        rampUpEnabled,
        rampUpDurationHours: Number(rampUpDurationHours),
        shieldMode
      });
      toast.success('Shield & Warmup settings saved!');
      fetchLinkDetails();
    } catch (error) {
      toast.error('Failed to update shield settings');
    } finally {
      setSavingShield(false);
    }
  };

  useEffect(() => {
    if (linkId) {
      fetchLinkDetails();
    }
  }, [linkId]);

  const handleUpdateFallback = async () => {
    try {
      await api.put(`/api/v1/traffic-director/links/${linkId}`, { fallbackUrl });
      toast.success('Fallback URL updated!');
    } catch (error) {
      toast.error('Failed to update fallback URL');
    }
  };

  const handleToggleRuleActive = async (rule: any) => {
    try {
      const updated = !rule.isActive;
      await api.put(`/api/v1/traffic-director/rules/${rule.id}`, { isActive: updated });
      setLinkData((prev: any) => ({
        ...prev,
        rules: prev.rules.map((r: any) => r.id === rule.id ? { ...r, isActive: updated } : r)
      }));
      toast.success(`Rule is now ${updated ? 'Active' : 'Disabled'}`);
    } catch (error) {
      toast.error('Failed to toggle rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/api/v1/traffic-director/rules/${ruleId}`);
      setLinkData((prev: any) => ({
        ...prev,
        rules: prev.rules.filter((r: any) => r.id !== ruleId)
      }));
      toast.success('Rule removed');
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const handleMoveRule = async (index: number, direction: 'up' | 'down') => {
    if (!linkData?.rules) return;
    const newRules = [...linkData.rules];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newRules.length) return;

    const temp = newRules[index];
    newRules[index] = newRules[targetIdx];
    newRules[targetIdx] = temp;

    setLinkData((prev: any) => ({ ...prev, rules: newRules }));

    try {
      await api.post(`/api/v1/traffic-director/links/${linkId}/rules/reorder`, {
        orderedRuleIds: newRules.map(r => r.id)
      });
      toast.success('Priority order updated');
    } catch (error) {
      toast.error('Failed to save priority order');
      fetchLinkDetails();
    }
  };

  const handleCopyUrl = () => {
    const url = `${window.location.origin}/r/${linkData?.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Routing URL copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !linkData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <CreateRuleModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        linkId={linkId}
        onSuccess={() => fetchLinkDetails()}
      />

      <EditRuleModal
        isOpen={Boolean(editingRule)}
        onClose={() => setEditingRule(null)}
        linkId={linkId}
        rule={editingRule}
        onSuccess={() => fetchLinkDetails()}
      />

      <EmbedTagModal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
        slug={linkData.slug}
        linkName={linkData.name}
      />

      <EditLinkModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        link={linkData}
        onSuccess={() => fetchLinkDetails()}
      />

      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/traffic-director/links"
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{linkData.name}</h1>
              <span className={`w-2.5 h-2.5 rounded-full ${linkData.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400 font-mono">/r/{linkData.slug}</span>
              <button onClick={handleCopyUrl} className="text-gray-400 hover:text-indigo-600 transition text-xs flex items-center gap-1">
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition"
          >
            Edit Details
          </button>
          <button
            onClick={() => setIsEmbedModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <Code className="w-3.5 h-3.5" />
            Get Embed Codes
          </button>
          <Link
            href={`/traffic-director/simulator?linkId=${linkId}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50 text-xs font-semibold hover:bg-purple-100 transition"
          >
            <Play className="w-3.5 h-3.5" />
            Simulate
          </Link>
          <button
            onClick={() => setIsRuleModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Meta & Google Ads Deployment Quick-Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border border-indigo-100 dark:border-indigo-900/50 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider">
              Method 1: Gold Standard
            </span>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Run Ads with Your Own Domain (Safe Page Pixel Tag)
            </h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Paste our 1-line stealth script tag on your website safe page. Review bots see your compliant page; real human buyers convert on your target offer.
          </p>
        </div>

        <button
          onClick={() => setIsEmbedModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shrink-0 active:scale-95 transition"
        >
          <Code className="w-3.5 h-3.5" />
          View Embed & Integration Snippets
        </button>
      </div>

      {/* Advanced Security, Shielding & Warmup Settings */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Security, Hardware Shielding & Temporal Warmup</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure scanner evasion, cloud datacenter firewall, and DSP review warmup</p>
            </div>
          </div>
          <button
            onClick={handleUpdateShieldSettings}
            disabled={savingShield}
            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold disabled:opacity-50 transition shadow-sm"
          >
            {savingShield ? 'Saving...' : 'Save Shield Settings'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* 1. Datacenter ASN Firewall */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-900 dark:text-white">Datacenter ASN Firewall</label>
              <input
                type="checkbox"
                checked={datacenterBlocked}
                onChange={(e) => setDatacenterBlocked(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 accent-purple-600"
              />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Instantly drops traffic originating from AWS, GCP, Azure, DigitalOcean, and Hetzner hosting subnets to fallback safe page.
            </p>
          </div>

          {/* 2. Routing Shield Mode */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-2">
            <label className="text-xs font-bold text-gray-900 dark:text-white block">Routing Mode</label>
            <CustomSelect
              value={shieldMode}
              onChange={(e: any) => setShieldMode(e.target.value)}
              options={[
                { value: 'server', label: 'Server Redirect (Sub-3ms Edge)' },
                { value: 'client_shield', label: 'Client Hardware Shield Probe' }
              ]}
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {shieldMode === 'client_shield' ? 'Executes WebGL GPU, touchscreen & battery checks in browser before redirect.' : 'Direct HTTP 302/307 edge evaluation.'}
            </p>
          </div>

          {/* 3. Temporal Warmup Window */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-900 dark:text-white">DSP Approval Warmup Until</label>
              {warmupUntil && new Date(warmupUntil).getTime() > Date.now() && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                  Warmup Active
                </span>
              )}
            </div>
            <input
              type="datetime-local"
              value={warmupUntil}
              onChange={(e) => setWarmupUntil(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              All traffic routes 100% to clean fallback URL during platform review window.
            </p>
          </div>
        </div>

        {/* Stealth Ramp-Up Settings */}
        <div className="p-3.5 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Flame className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">Stealth Traffic Ramp-Up</span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Gradually scale active routing (10% → 100%) after warmup expires to prevent CTR spikes.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <span>Duration:</span>
              <input
                type="number"
                min="1"
                max="168"
                value={rampUpDurationHours}
                onChange={(e) => setRampUpDurationHours(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-center text-gray-900 dark:text-white"
              />
              <span>hours</span>
            </label>
            <input
              type="checkbox"
              checked={rampUpEnabled}
              onChange={(e) => setRampUpEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 accent-purple-600"
            />
          </div>
        </div>
      </div>

      {/* Rules Decision Sequence Banner */}
      <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
          <span className="font-bold">Evaluation Order: Priority Matrix (Top-to-Bottom)</span>
          <p className="text-indigo-700/80 dark:text-indigo-300/70 leading-relaxed">
            Requests are evaluated against each rule in sequence. The first rule whose complete condition set matches will handle the redirect. If no rules match, the request will drop through to the default Fallback Target.
          </p>
        </div>
      </div>

      {/* Rule Canvas List */}
      <div className="space-y-4">
        {linkData.rules && linkData.rules.length > 0 ? (
          linkData.rules.map((rule: any, index: number) => {
            let conditions = [];
            try {
              conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions;
            } catch (e) {
              conditions = [];
            }

            return (
              <div
                key={rule.id}
                className={`p-6 rounded-2xl bg-white dark:bg-gray-900 border transition shadow-sm ${
                  rule.isActive ? 'border-gray-200 dark:border-gray-800' : 'border-gray-100 dark:border-gray-800/40 opacity-60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono text-[11px] font-bold">
                        #{index + 1} Priority
                      </span>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">{rule.name}</h3>
                      <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-[10px] font-semibold uppercase">
                        {rule.actionType}
                      </span>
                      {rule.weight < 100 && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
                          Split: {rule.weight}%
                        </span>
                      )}
                    </div>

                    {/* Conditions Pill Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase">IF:</span>
                      {conditions.length > 0 ? (
                        conditions.map((c: any, cIdx: number) => (
                          <div key={cIdx} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300">
                            {c.type === 'geo_country' && <Globe className="w-3 h-3 text-indigo-500" />}
                            {c.type === 'device_type' && <Smartphone className="w-3 h-3 text-purple-500" />}
                            {c.type === 'bot_status' && <Bot className="w-3 h-3 text-amber-500" />}
                            <span className="font-mono font-semibold">{c.type}</span>
                            <span className="text-gray-400 text-[10px]">{c.operator}</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{c.value}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">No conditions (Matches all traffic)</span>
                      )}
                    </div>

                    {/* Destination URL */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-gray-400 uppercase">THEN ROUTE TO:</span>
                      <a
                        href={rule.destinationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate max-w-md"
                      >
                        {rule.destinationUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Actions & Priority Shift */}
                  <div className="flex items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-gray-800">
                    <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1">
                      <button
                        onClick={() => handleMoveRule(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveRule(index, 'down')}
                        disabled={index === linkData.rules.length - 1}
                        className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleRuleActive(rule)}
                      className={`p-2.5 rounded-xl border transition ${
                        rule.isActive
                          ? 'border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title={rule.isActive ? 'Disable Rule' : 'Enable Rule'}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition"
                      title="Edit Rule Conditions & Target"
                    >
                      <Layers className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 space-y-3">
            <Layers className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No conditional rules added yet</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Add your first routing rule to redirect visitors matching specific countries, devices, or parameters.
            </p>
            <button
              onClick={() => setIsRuleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add First Rule
            </button>
          </div>
        )}

        {/* Fallback Destination Target Box */}
        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-dashed border-gray-200 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-mono text-[11px] font-bold text-gray-600 dark:text-gray-400">
                FINAL FALLBACK
              </span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">Default Destination</span>
            </div>
            <span className="text-xs text-gray-400">Executed when zero rules match</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="url"
              value={fallbackUrl}
              onChange={(e) => setFallbackUrl(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleUpdateFallback}
              className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 text-xs font-semibold transition"
            >
              Save Fallback URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
