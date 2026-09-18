"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  GitFork, ArrowLeft, Plus, Play, Layers, ShieldCheck, Shield,
  Trash2, ArrowUp, ArrowDown, ExternalLink, Power, Check, Copy, Globe, Smartphone, Bot, Clock, Code, Flame,
  ArrowRightLeft, Eye, BarChart3, Activity
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader, ConfirmModal, UniversalDateTimePicker } from '@workspace/ui';
import InfoTooltip from '@/components/ui/InfoTooltip';
import CustomSelect from '@/components/ui/CustomSelect';
import CreateRuleModal from '../../../_components/CreateRuleModal';
import EditRuleModal from '../../../_components/EditRuleModal';
import EmbedTagModal from '../../../_components/EmbedTagModal';
import EditLinkModal from '../../../_components/EditLinkModal';
import LinkAnalyticsTab from './_components/LinkAnalyticsTab';

export default function SmartLinkRuleCanvasPage() {
  const params = useParams();
  const linkId = params?.linkId as string;

  const [linkData, setLinkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rules' | 'analytics'>('rules');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteRuleConfirm, setDeleteRuleConfirm] = useState<{ isOpen: boolean; rule: any; loading: boolean }>({
    isOpen: false,
    rule: null,
    loading: false
  });

  const [fallbackUrl, setFallbackUrl] = useState('');
  const [safePageProxyMode, setSafePageProxyMode] = useState(false);
  const [savingFallback, setSavingFallback] = useState(false);
  const [copied, setCopied] = useState(false);

  // Security & Warmup Shield Controls
  const [datacenterBlocked, setDatacenterBlocked] = useState(true);
  const [warmupUntil, setWarmupUntil] = useState<string>('');
  const [rampUpEnabled, setRampUpEnabled] = useState(true);
  const [rampUpDurationHours, setRampUpDurationHours] = useState(12);
  const [shieldMode, setShieldMode] = useState<'server' | 'client_shield'>('server');
  const [savingShield, setSavingShield] = useState(false);

  const fetchLinkDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/traffic-director/links/${linkId}`);
      const lk = res.data.data.link;
      setLinkData(lk);
      setFallbackUrl(lk.fallbackUrl);
      setSafePageProxyMode(Boolean(lk.safePageProxyMode));
      setDatacenterBlocked(lk.datacenterBlocked ?? true);
      setWarmupUntil(lk.warmupUntil ? new Date(lk.warmupUntil).toISOString() : '');
      setRampUpEnabled(lk.rampUpEnabled !== undefined && lk.rampUpEnabled !== null ? (lk.rampUpDurationHours === 24 && !lk.rampUpEnabled ? true : lk.rampUpEnabled) : true);
      setRampUpDurationHours((lk.rampUpDurationHours && lk.rampUpDurationHours !== 24) ? lk.rampUpDurationHours : 12);
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
        shieldMode,
        safePageProxyMode
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
    if (savingFallback) return;
    try {
      setSavingFallback(true);
      await api.put(`/api/v1/traffic-director/links/${linkId}`, { 
        fallbackUrl,
        safePageProxyMode: true
      });
      toast.success('Safe page settings saved!');
      fetchLinkDetails();
    } catch (error) {
      toast.error('Failed to update fallback settings');
    } finally {
      setSavingFallback(false);
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

  const confirmDeleteRule = async () => {
    if (!deleteRuleConfirm.rule) return;
    try {
      setDeleteRuleConfirm(prev => ({ ...prev, loading: true }));
      await api.delete(`/api/v1/traffic-director/rules/${deleteRuleConfirm.rule.id}`);
      setLinkData((prev: any) => ({
        ...prev,
        rules: prev.rules.filter((r: any) => r.id !== deleteRuleConfirm.rule.id)
      }));
      toast.success('Rule removed');
      setDeleteRuleConfirm({ isOpen: false, rule: null, loading: false });
    } catch (error) {
      toast.error('Failed to delete rule');
      setDeleteRuleConfirm(prev => ({ ...prev, loading: false }));
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
        linkId={linkId}
        customDomain={linkData.customDomain}
        shieldMode={shieldMode}
        onDomainUpdated={() => fetchLinkDetails()}
      />

      <EditLinkModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        link={linkData}
        onSuccess={() => fetchLinkDetails()}
      />

      <ConfirmModal
        isOpen={deleteRuleConfirm.isOpen}
        title="Delete Routing Rule"
        message={`Are you sure you want to delete "${deleteRuleConfirm.rule?.name || 'this rule'}"? Traffic will no longer be evaluated against its conditions.`}
        confirmText="Delete Rule"
        cancelText="Cancel"
        onConfirm={confirmDeleteRule}
        onCancel={() => setDeleteRuleConfirm({ isOpen: false, rule: null, loading: false })}
        loading={deleteRuleConfirm.loading}
        variant="danger"
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
          >
            <Code className="w-3.5 h-3.5" />
            <span>{shieldMode === 'client_shield' ? 'Get Embed Snippets' : 'Smart Link Setup'}</span>
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Routing Rules & Setup</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeTab === 'rules' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {linkData.rules?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Traffic Analytics & Cloaking Breakdown</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeTab === 'analytics' ? 'bg-indigo-500 text-white' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
          }`}>
            {linkData.totalClicks || 0} views
          </span>
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <LinkAnalyticsTab linkId={linkId} linkData={linkData} />
      ) : (
        <div className="space-y-6">
          {/* Deployment Strategy Switcher & Status Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Deployment Architecture
                  </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                shieldMode === 'server' 
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
              }`}>
                {shieldMode === 'server' ? 'Smart Link (No Code)' : 'Code Injection Tag'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              {shieldMode === 'server'
                ? 'Traffic Director reverse-proxies your safe page to bots (200 OK) and routes humans to offers with zero code.'
                : 'Pasting the JS tag into your safe page website lets you cloak traffic directly on your own host.'}
            </p>
          </div>

          {/* Quick Switch Buttons */}
          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl shrink-0">
            <button
              onClick={async () => {
                setShieldMode('server');
                try {
                  await api.put(`/api/v1/traffic-director/links/${linkId}`, { shieldMode: 'server' });
                  toast.success('Switched to Smart Link Mode');
                } catch(e) {}
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                shieldMode === 'server'
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Smart Link</span>
            </button>

            <button
              onClick={async () => {
                setShieldMode('client_shield');
                try {
                  await api.put(`/api/v1/traffic-director/links/${linkId}`, { shieldMode: 'client_shield' });
                  toast.success('Switched to Code Injection Mode');
                } catch(e) {}
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                shieldMode === 'client_shield'
                  ? 'bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Code Injection Tag</span>
            </button>
          </div>
        </div>

        {/* Dynamic Contextual Action Bar */}
        {shieldMode === 'server' ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Connected Host:{' '}
                <strong className="font-mono text-indigo-600 dark:text-indigo-400">
                  {linkData.customDomain ? linkData.customDomain : 'No custom domain connected yet'}
                </strong>
              </span>
            </div>
            <button
              onClick={() => setIsEmbedModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition shrink-0 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>View Smart Link & Domains</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <Shield className="w-4 h-4 text-purple-500 shrink-0" />
              <span>Paste snippet tag into your landing page <code className="bg-purple-100 dark:bg-purple-950 px-1 py-0.5 rounded font-mono text-[11px]">&lt;head&gt;</code></span>
            </div>
            <button
              onClick={() => setIsEmbedModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Get Embed Snippets & Verify</span>
            </button>
          </div>
        )}
      </div>

      {/* Advanced Security, Shielding & Warmup Settings - 1 Line */}
      <div className="p-3.5 px-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white">Security & Warmup Controls</h3>
              <InfoTooltip content="Configure scanner evasion, cloud datacenter firewall, and DSP review warmup." />
            </div>
          </div>
          <button
            onClick={handleUpdateShieldSettings}
            disabled={savingShield}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold disabled:opacity-50 transition shadow-xs cursor-pointer"
          >
            {savingShield ? (
              <>
                <LogoLoader className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Saving...</span>
              </>
            ) : (
              'Save Shield Settings'
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Datacenter ASN Firewall */}
          <div className="p-2.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-900 dark:text-white">Datacenter ASN Firewall</span>
              <InfoTooltip content="Instantly drops traffic originating from AWS, GCP, Azure, Meta, DigitalOcean, and Hetzner hosting subnets to fallback safe page." />
            </div>
            <input
              type="checkbox"
              checked={datacenterBlocked}
              onChange={(e) => setDatacenterBlocked(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
            />
          </div>

          {/* 2. Temporal Warmup Window */}
          <div className="p-2.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-gray-900 dark:text-white">DSP Warmup</span>
              <InfoTooltip content="100% of visitors see the clean Safe Page during your ad QA review window." />
              {warmupUntil && new Date(warmupUntil).getTime() > Date.now() && (
                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.5 rounded">
                  Active
                </span>
              )}
            </div>
            <UniversalDateTimePicker
              value={warmupUntil}
              onChange={(val) => setWarmupUntil(val || '')}
              mode="datetime"
              disablePast={true}
              placeholder="Set warmup end..."
              presets={[
                { label: '+6h', offsetHours: 6 },
                { label: '+12h', offsetHours: 12 },
                { label: '+24h', offsetHours: 24 },
                { label: '+48h', offsetHours: 48 },
              ]}
            />
          </div>

          {/* 3. Stealth Ramp-Up Settings */}
          <div className="p-2.5 px-3 rounded-lg bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-xs font-semibold text-gray-900 dark:text-white">Stealth Ramp-Up</span>
              <InfoTooltip content="Gradually scales redirects (10% → 100%) after DSP warmup expires to eliminate conversion cliffs and protect ad accounts." />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-[11px] text-gray-600 dark:text-gray-400 flex items-center gap-1 font-medium">
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={rampUpDurationHours}
                  onChange={(e) => setRampUpDurationHours(Number(e.target.value))}
                  className="w-10 px-1 py-0.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[11px] text-center text-gray-900 dark:text-white font-mono"
                />
                <span>h</span>
              </label>
              <input
                type="checkbox"
                checked={rampUpEnabled}
                onChange={(e) => setRampUpEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fallback Destination Target Box */}
      <div className="p-4 px-5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-dashed border-gray-200 dark:border-gray-800 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-mono text-[11px] font-bold text-gray-600 dark:text-gray-400">
              {shieldMode === 'server' ? 'SAFE PAGE ORIGIN' : 'FINAL FALLBACK'}
            </span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {shieldMode === 'server' ? 'Compliant Safe Page URL' : 'Default Destination Target'}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            Mirrored to review bots & non-matching traffic with HTTP 200 OK (URL preserved)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="url"
            value={fallbackUrl}
            onChange={(e) => setFallbackUrl(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder={shieldMode === 'server' ? 'https://example.com/safe-recipe-page' : 'https://example.com/main-landing'}
          />
          <button
            onClick={handleUpdateFallback}
            disabled={savingFallback}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 text-xs font-semibold transition shrink-0 cursor-pointer disabled:opacity-50"
          >
            {savingFallback ? (
              <>
                <LogoLoader className="w-3.5 h-3.5 animate-spin text-white dark:text-gray-900" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Safe Page URL</span>
            )}
          </button>
        </div>
      </div>

      {/* Rules Decision Sequence Banner */}
      <div className="p-3 px-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Priority Matrix Evaluation (Top-to-Bottom)</span>
            <InfoTooltip content="Requests are evaluated against each rule in sequence. The first rule whose complete condition set matches will handle the redirect. If no rules match, the request will drop through to the default Fallback Target." />
          </div>
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
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">IF:</span>
                      {conditions.length > 0 ? (
                        conditions.map((c: any, cIdx: number) => {
                          const configMap: Record<string, { label: string }> = {
                            os: { label: 'OS' },
                            device_type: { label: 'Device' },
                            bot_status: { label: 'Bot Status' },
                            sec_ch_ua: { label: 'Client Hints' },
                            gpu_renderer: { label: 'GPU' },
                            network_type: { label: 'Network' },
                            asn_provider: { label: 'Cloud ASN' },
                            geo_country: { label: 'Country' },
                            geo_region: { label: 'Region' },
                            geo_city: { label: 'City' },
                            geo_postal_code: { label: 'Postal' },
                            geo_timezone: { label: 'Timezone' },
                            touch_support: { label: 'Touch Screen' },
                            battery_valid: { label: 'Battery' },
                            referrer: { label: 'Referrer' },
                            language: { label: 'Language' },
                            query_param: { label: 'Query' },
                            header: { label: 'Header' },
                          };

                          const opMap: Record<string, { symbol: string; isNegation: boolean }> = {
                            equals: { symbol: '=', isNegation: false },
                            not_equals: { symbol: '≠', isNegation: true },
                            in: { symbol: 'in', isNegation: false },
                            not_in: { symbol: 'not in', isNegation: true },
                            starts_with: { symbol: 'starts with', isNegation: false },
                            contains: { symbol: 'contains', isNegation: false },
                            not_contains: { symbol: 'excludes', isNegation: true },
                            regex: { symbol: 'regex', isNegation: false },
                          };

                          const config = configMap[c.type] || { label: c.type };
                          const opConfig = opMap[c.operator] || { symbol: c.operator, isNegation: false };
                          const rawValues = String(c.value || '').split(',').map((s: string) => s.trim()).filter(Boolean);

                          return (
                            <div
                              key={cIdx}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border shadow-2xs transition ${
                                opConfig.isNegation
                                  ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                                  : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200'
                              }`}
                            >
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {c.key ? `${config.label}(${c.key})` : config.label}
                              </span>
                              <span className={`font-mono text-[11px] font-bold ${opConfig.isNegation ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                {opConfig.symbol}
                              </span>

                              {/* Value badges */}
                              {rawValues.length <= 2 ? (
                                <div className="flex items-center gap-1">
                                  {rawValues.map((v: string, vIdx: number) => (
                                    <span
                                      key={vIdx}
                                      className={`px-1.5 py-0.5 rounded font-mono font-bold text-[11px] ${
                                        opConfig.isNegation
                                          ? 'bg-rose-100/70 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200'
                                          : 'bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200'
                                      }`}
                                    >
                                      {v}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1" title={rawValues.join(', ')}>
                                  <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[11px] ${
                                    opConfig.isNegation
                                      ? 'bg-rose-100/70 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200'
                                      : 'bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200'
                                  }`}>
                                    {rawValues.slice(0, 2).join(', ')}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-gray-200/70 dark:bg-gray-700/70 text-[10px] font-bold text-gray-700 dark:text-gray-300">
                                    +{rawValues.length - 2} more
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
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
                      onClick={() => setDeleteRuleConfirm({ isOpen: true, rule, loading: false })}
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
      </div>
    </div>
  )}
</div>
  );
}
