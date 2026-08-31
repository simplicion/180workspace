"use client";

import { useState, useEffect } from 'react';
import { Link as LinkIcon, Sparkles, Globe, Shield, CheckCircle2, XCircle, Loader2, ArrowRightLeft, Eye } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlatformModal } from '@/components/shared/PlatformModal';
import { LogoLoader } from '@workspace/ui';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLink: any) => void;
}

export default function CreateLinkModal({ isOpen, onClose, onSuccess }: CreateLinkModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'>('idle');
  const [slugMessage, setSlugMessage] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [safePageProxyMode, setSafePageProxyMode] = useState(false);
  const [description, setDescription] = useState('');
  const [shieldMode, setShieldMode] = useState<'server' | 'client_shield'>('server');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-_]/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
    }
  };

  // Live real-time slug availability check (debounced 300ms)
  useEffect(() => {
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!cleanSlug) {
      setSlugStatus('idle');
      setSlugMessage('');
      return;
    }

    if (cleanSlug.length < 2) {
      setSlugStatus('invalid');
      setSlugMessage('Slug must be at least 2 characters.');
      return;
    }

    setSlugStatus('checking');
    setSlugMessage('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/api/v1/traffic-director/check-slug', {
          params: { slug: cleanSlug }
        });

        if (res.data?.data?.available) {
          setSlugStatus('available');
          setSlugMessage('Slug is available!');
        } else {
          setSlugStatus('unavailable');
          setSlugMessage(res.data?.data?.reason || 'This slug is already in use. Please pick another.');
        }
      } catch (err: any) {
        setSlugStatus('unavailable');
        setSlugMessage(err.response?.data?.error || 'Could not verify slug availability.');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [slug]);

  const isFormValid = Boolean(
    name.trim() &&
    fallbackUrl.trim() &&
    slug.trim() &&
    slugStatus === 'available'
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading || !isFormValid) return;

    if (!name.trim() || !slug.trim() || !fallbackUrl.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (slugStatus !== 'available') {
      toast.error('Please choose an available routing slug');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/api/v1/traffic-director/links', {
        name: name.trim(),
        slug: slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        fallbackUrl: fallbackUrl.trim(),
        description: description.trim() || undefined,
        datacenterBlocked: true,
        shieldMode,
        safePageProxyMode,
        rampUpEnabled: true,
        rampUpDurationHours: 12
      });

      toast.success('Smart Link created successfully!');
      onSuccess(res.data.data.link);
      onClose();
      // Reset form
      setName('');
      setSlug('');
      setSlugStatus('idle');
      setSlugMessage('');
      setFallbackUrl('');
      setSafePageProxyMode(false);
      setDescription('');
      setShieldMode('server');
    } catch (error: any) {
      console.error('Failed to create link:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to create Smart Link');
    } finally {
      setLoading(false);
    }
  };

  const baseUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
    : (process.env.NEXT_PUBLIC_APP_URL || '');

  return (
    <PlatformModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Smart Link"
      icon={LinkIcon}
      iconColorClass="text-indigo-600 dark:text-indigo-400"
      iconBgClass="bg-indigo-50 dark:bg-indigo-950/50"
      subHeader={
        <p className="px-6 text-xs text-gray-500 dark:text-gray-400 -mt-2 pb-2">
          Define dynamic routing rules and multi-variant landing targets
        </p>
      }
      maxWidthClass="max-w-lg"
      onSubmit={handleSubmit}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!isFormValid || loading || slugStatus === 'checking'}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-md transition cursor-pointer ${
              isFormValid && !loading
                ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-indigo-500/20'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
            }`}
          >
            {loading ? (
              <LogoLoader className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Create Link
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-1">
        {/* Strategy Choice */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Deployment Architecture
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShieldMode('server')}
              className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                shieldMode === 'server'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Smart Link</span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                No code needed on safe page. Automatic 200 OK reverse proxy.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setShieldMode('client_shield')}
              className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                shieldMode === 'client_shield'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Self-Hosted Code Injection</span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                Paste pixel tag into your website &lt;head&gt;. Submit your own URL.
              </p>
            </button>
          </div>
        </div>

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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Routing Slug <span className="text-rose-500">*</span>
            </label>
            {slugStatus === 'checking' && (
              <span className="text-[11px] text-gray-400 flex items-center gap-1 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking...
              </span>
            )}
            {slugStatus === 'available' && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Available
              </span>
            )}
            {slugStatus === 'unavailable' && (
              <span className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
                <XCircle className="w-3.5 h-3.5" /> Already Taken
              </span>
            )}
            {slugStatus === 'invalid' && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Too short
              </span>
            )}
          </div>

          <div className={`flex items-center rounded-xl border transition bg-gray-50 dark:bg-gray-800/50 overflow-hidden focus-within:ring-2 ${
            slugStatus === 'available'
              ? 'border-emerald-400 dark:border-emerald-600 focus-within:ring-emerald-500'
              : slugStatus === 'unavailable'
              ? 'border-rose-400 dark:border-rose-600 focus-within:ring-rose-500'
              : 'border-gray-200 dark:border-gray-700 focus-within:ring-indigo-500'
          }`}>
            <span className="px-3 text-xs text-gray-400 font-mono">/r/</span>
            <input
              type="text"
              required
              placeholder="summer-promo"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
              className="w-full py-2.5 pr-2 bg-transparent text-gray-900 dark:text-white text-sm font-mono focus:outline-none"
            />
            <div className="pr-3 flex items-center">
              {slugStatus === 'checking' && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
              {slugStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {slugStatus === 'unavailable' && <XCircle className="w-4 h-4 text-rose-500" />}
            </div>
          </div>

          {slugMessage && (
            <p className={`text-[11px] mt-1 font-medium ${
              slugStatus === 'available'
                ? 'text-emerald-600 dark:text-emerald-400'
                : slugStatus === 'unavailable'
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-gray-400'
            }`}>
              {slugMessage}
            </p>
          )}

          <p className="text-[11px] text-gray-400 mt-1">
            Public edge redirect: <code className="text-indigo-500 font-mono">{baseUrl || 'https://yourdomain.com'}/r/{slug || '...'}</code>
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

        {shieldMode === 'server' && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Fallback Delivery Action
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSafePageProxyMode(false)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                  !safePageProxyMode
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>302 Browser Redirect</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  Standard redirect. Browser address bar changes to destination URL.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSafePageProxyMode(true)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                  safePageProxyMode
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>In-Place Reverse Proxy</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  Mirrors safe page with HTTP 200 OK. URL stays on your link.
                </p>
              </button>
            </div>
          </div>
        )}

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
      </div>
    </PlatformModal>
  );
}
