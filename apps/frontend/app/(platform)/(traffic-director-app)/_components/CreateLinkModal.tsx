"use client";

import { useState } from 'react';
import { Link as LinkIcon, Sparkles } from 'lucide-react';
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
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-_]/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!name.trim() || !slug.trim() || !fallbackUrl.trim()) {
      toast.error('Please fill in all required fields');
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
        shieldMode: 'server',
        rampUpEnabled: true,
        rampUpDurationHours: 12
      });

      toast.success('Smart Link created successfully!');
      onSuccess(res.data.data.link);
      onClose();
      // Reset form
      setName('');
      setSlug('');
      setFallbackUrl('');
      setDescription('');
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
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-50 transition cursor-pointer"
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
