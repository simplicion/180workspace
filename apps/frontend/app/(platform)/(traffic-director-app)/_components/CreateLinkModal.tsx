"use client";

import { useState } from 'react';
import { Globe, Link as LinkIcon, Sparkles, Shield, Clock, Zap } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';
import CustomSelect from '@/components/ui/CustomSelect';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLink: any) => void;
}

export default function CreateLinkModal({ isOpen, onClose, onSuccess }: CreateLinkModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [description, setDescription] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [datacenterBlocked, setDatacenterBlocked] = useState(true);
  const [shieldMode, setShieldMode] = useState('server');
  const [warmupUntil, setWarmupUntil] = useState('');
  const [rampUpEnabled, setRampUpEnabled] = useState(false);
  const [rampUpDurationHours, setRampUpDurationHours] = useState(24);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-_]/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !fallbackUrl.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const res = await api.post('/api/v1/traffic-director/links', {
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        fallbackUrl,
        description,
        customDomain: customDomain.trim() || undefined,
        tags,
        datacenterBlocked,
        shieldMode,
        warmupUntil: warmupUntil ? new Date(warmupUntil).toISOString() : null,
        rampUpEnabled,
        rampUpDurationHours: Number(rampUpDurationHours)
      });

      toast.success('Smart Link created successfully!');
      onSuccess(res.data.data.link);
      onClose();
      // Reset form
      setName('');
      setSlug('');
      setFallbackUrl('');
      setDescription('');
      setCustomDomain('');
      setTagsInput('');
      setDatacenterBlocked(true);
      setShieldMode('server');
      setWarmupUntil('');
      setRampUpEnabled(false);
      setRampUpDurationHours(24);
    } catch (error: any) {
      console.error('Failed to create link:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to create Smart Link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Smart Link"
      description="Define dynamic routing rules and multi-variant landing targets"
      icon={<LinkIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
      maxWidth="max-w-lg"
      position="right"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-50 transition"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Create Link
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Link Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Summer Campaign 2026"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Routing Slug <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
            <span className="px-3 text-xs text-gray-400 font-mono">/r/</span>
            <input
              type="text"
              required
              placeholder="summer-promo"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
              className="w-full py-2.5 pr-3.5 bg-transparent text-gray-900 dark:text-white text-sm font-mono focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Public edge redirect: <code className="text-indigo-500 font-mono">https://domain.com/r/{slug || '...'}</code>
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Default Fallback Destination URL <span className="text-rose-500">*</span>
          </label>
          <input
            type="url"
            required
            placeholder="https://example.com/main-landing"
            value={fallbackUrl}
            onChange={(e) => setFallbackUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
          />
          <p className="text-[11px] text-gray-400 mt-1">Served when zero custom rules match or when cloud crawler filtering intercepts.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Custom Domain (Optional)
          </label>
          <input
            type="text"
            placeholder="go.branddomain.com"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Description (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Internal campaign notes or target segment info..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Tags (Comma separated)
          </label>
          <input
            type="text"
            placeholder="google-ads, ios, us-only"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
          />
        </div>

        {/* Shielding & Protection Controls */}
        <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div>
                <label className="text-xs font-bold text-gray-900 dark:text-white block">Datacenter ASN Firewall</label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Instantly drop AWS, GCP, Azure & cloud subnets</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={datacenterBlocked}
              onChange={(e) => setDatacenterBlocked(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 accent-purple-600"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-purple-100 dark:border-purple-900/30">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Routing Mode
              </label>
              <CustomSelect
                value={shieldMode}
                onChange={(e: any) => setShieldMode(e.target.value)}
                options={[
                  { value: 'server', label: 'Server Redirect (3ms Edge HTTP 302)' },
                  { value: 'client_shield', label: 'Hardware Shield Probe (WebGL / Touch / Battery)' }
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Warmup Until (Optional)
              </label>
              <input
                type="datetime-local"
                value={warmupUntil}
                onChange={(e) => setWarmupUntil(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">Forces 100% traffic to compliant fallback safe page during ad review window.</p>
            </div>

            <div className="pt-2 border-t border-purple-100 dark:border-purple-900/30 flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-gray-900 dark:text-white block">Post-Warmup Stealth Ramp-Up</label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Gradually scale targeted traffic (10% → 100%)</p>
              </div>
              <input
                type="checkbox"
                checked={rampUpEnabled}
                onChange={(e) => setRampUpEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 accent-purple-600"
              />
            </div>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
