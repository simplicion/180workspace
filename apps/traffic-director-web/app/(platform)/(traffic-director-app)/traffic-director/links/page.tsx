"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  GitFork, Link as LinkIcon, Plus, Search, Copy, Check, ExternalLink, 
  Trash2, Settings2, Power, Filter, ArrowRight, CheckSquare, Layers, Lock
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader, ConfirmModal, BulkActionBar } from '@workspace/ui';
import clsx from 'clsx';
import { useSubscription } from '@/lib/useSubscription';
import CreateLinkModal from '../../_components/CreateLinkModal';
import EditLinkModal from '../../_components/EditLinkModal';

export default function SmartLinksDirectoryPage() {
  const router = useRouter();
  const { 
    canCreateMoreLinks, 
    cloakingEnabled, 
    isSubscriptionActive, 
    isTrialExpired,
    currentLinksCount, 
    maxLinks, 
    isUnlimited, 
    planName,
    refresh: refreshSub 
  } = useSubscription();
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; link: any; loading: boolean }>({
    isOpen: false,
    link: null,
    loading: false
  });

  // Multi-selection state
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Fast In-Memory SWR Cache for 0ms Instant Navigation (Slack/Notion Gold Standard)
  const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

  const fetchLinks = async () => {
    const cacheKey = `traffic:links:${search || 'all'}`;
    const cached = swrCacheRef.current.get(cacheKey);

    if (cached) {
      setLinks(cached.data || []);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get('/api/v1/traffic-director/links', {
        params: { search: search || undefined }
      });
      const fetched = res.data?.data?.links || [];
      setLinks(fetched);
      swrCacheRef.current.set(cacheKey, {
        data: fetched,
        timestamp: Date.now()
      });
    } catch (error: any) {
      if (!cached) setLinks([]);
      if (error?.status === 401 || error?.message?.includes('401')) {
        toast.error('Session expired or authentication required. Please sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [search]);

  const handleCopy = (slug: string, id: string) => {
    const url = `${window.location.origin}/r/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Routing URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = async (link: any) => {
    if (!link.isActive && !cloakingEnabled) {
      toast.error('Subscription required: Activate a plan or free trial to enable cloaking routing.');
      router.push('/traffic-director/subscription');
      return;
    }
    try {
      const updated = !link.isActive;
      await api.put(`/api/v1/traffic-director/links/${link.id}`, { isActive: updated });
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, isActive: updated } : l));
      toast.success(`Link is now ${updated ? 'Active' : 'Paused'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const confirmDeleteLink = async () => {
    if (!deleteConfirm.link) return;
    try {
      setDeleteConfirm(prev => ({ ...prev, loading: true }));
      await api.delete(`/api/v1/traffic-director/links/${deleteConfirm.link.id}`);
      setLinks(prev => prev.filter(l => l.id !== deleteConfirm.link.id));
      setSelectedLinkIds(prev => prev.filter(id => id !== deleteConfirm.link.id));
      toast.success('Smart Link deleted successfully');
      setDeleteConfirm({ isOpen: false, link: null, loading: false });
    } catch (error: any) {
      toast.error('Failed to delete link');
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
    }
  };

  // Selection Handlers
  const handleToggleSelectLink = (id: string) => {
    setSelectedLinkIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedLinkIds(links.map(l => l.id));
  };

  const handleDeselectAll = () => {
    setSelectedLinkIds([]);
  };

  const handleSelectAmount = (amount: number) => {
    const targetAmount = Math.min(amount, links.length);
    const selectedSlice = links.slice(0, targetAmount).map(l => l.id);
    setSelectedLinkIds(selectedSlice);
    toast.success(`Selected first ${selectedSlice.length} smart links`);
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedLinkIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await api.post('/api/v1/traffic-director/links/bulk-delete', { linkIds: selectedLinkIds });
      toast.success(`Successfully deleted ${selectedLinkIds.length} links`);
      setLinks(prev => prev.filter(l => !selectedLinkIds.includes(l.id)));
      swrCacheRef.current.clear();
      setSelectedLinkIds([]);
    } catch (error: any) {
      try {
        await Promise.all(selectedLinkIds.map(id => api.delete(`/api/v1/traffic-director/links/${id}`)));
        toast.success(`Deleted ${selectedLinkIds.length} links`);
        setLinks(prev => prev.filter(l => !selectedLinkIds.includes(l.id)));
        swrCacheRef.current.clear();
        setSelectedLinkIds([]);
      } catch (fallbackError: any) {
        toast.error(error.response?.data?.error || 'Failed to delete selected links');
      }
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      <CreateLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchLinks();
          refreshSub();
        }}
      />

      <EditLinkModal
        isOpen={Boolean(editingLink)}
        onClose={() => setEditingLink(null)}
        link={editingLink}
        onSuccess={() => fetchLinks()}
      />

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Smart Link"
        message={`Are you sure you want to delete "${deleteConfirm.link?.name || 'this Smart Link'}" and all its associated routing rules? This action cannot be undone.`}
        confirmText="Delete Link"
        cancelText="Cancel"
        onConfirm={confirmDeleteLink}
        onCancel={() => setDeleteConfirm({ isOpen: false, link: null, loading: false })}
        loading={deleteConfirm.loading}
        variant="danger"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Smart Links Directory</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Dynamic redirect links with multi-dimensional conditional routing rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end mr-1 text-right">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              Allocation: <strong className="text-gray-900 dark:text-white font-mono">{links.length} / {isUnlimited ? '∞' : maxLinks}</strong>
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {planName}
            </span>
          </div>

          <button
            onClick={() => {
              if (!canCreateMoreLinks) {
                toast.error(
                  isTrialExpired 
                    ? 'Your 7-day free trial has expired. Upgrade your subscription to create new links.' 
                    : `Link quota limit reached (${links.length}/${maxLinks}). Upgrade your subscription to create more links.`
                );
                router.push('/traffic-director/subscription');
                return;
              }
              setIsCreateModalOpen(true);
            }}
            className={clsx(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer",
              canCreateMoreLinks
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95"
                : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:border-amber-400"
            )}
            title={canCreateMoreLinks ? 'Create a new Smart Link' : 'Upgrade subscription to create more links'}
          >
            {canCreateMoreLinks ? <Plus className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
            <span>Create Smart Link</span>
            {!canCreateMoreLinks && (
              <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">
                Upgrade
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by link name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/90 text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectedLinkIds.length === links.length && links.length > 0 ? handleDeselectAll : handleSelectAll}
            className="px-3.5 py-2.5 bg-white/80 dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{selectedLinkIds.length === links.length && links.length > 0 ? "Deselect All" : "Select All"}</span>
          </button>
        </div>
      </div>

      {/* Links List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : links.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {links.map((link) => {
            const isSelected = selectedLinkIds.includes(link.id);
            return (
              <div
                key={link.id}
                className={clsx(
                  "p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border transition flex flex-col md:flex-row md:items-center justify-between gap-6",
                  isSelected 
                    ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20" 
                    : "border-gray-200/80 dark:border-white/10 hover:shadow-md hover:border-blue-200 dark:hover:border-zinc-700"
                )}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  {/* Select Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleSelectLink(link.id)}
                    className="mt-1 p-0.5 rounded cursor-pointer"
                    title={isSelected ? "Deselect link" : "Select link"}
                  >
                    <span className={clsx(
                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                      isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-blue-500"
                    )}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </button>

                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${link.isActive && cloakingEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">{link.name}</h3>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 font-mono text-xs text-blue-600 dark:text-blue-400 font-medium">
                        /r/{link.slug}
                        <button
                          onClick={() => handleCopy(link.slug, link.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1 transition cursor-pointer"
                          title="Copy Link URL"
                        >
                          {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {link.tags?.map((tag: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-[10px] font-semibold">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Fallback Target:</span>{' '}
                        <span className="font-mono text-gray-400 truncate inline-block max-w-[240px] align-bottom" title={link.fallbackUrl}>
                          {link.fallbackUrl}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Rules Configured:</span>{' '}
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold">
                          {link.rules?.length || 0}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Total Clicks:</span>{' '}
                        <span className="font-bold text-gray-900 dark:text-white">
                          {(link.totalClicks || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-200/80 dark:border-zinc-800">
                  <button
                    onClick={() => handleToggleActive(link)}
                    className={clsx(
                      "p-2.5 rounded-xl border transition cursor-pointer relative",
                      link.isActive && cloakingEnabled
                        ? 'border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' 
                        : 'border-gray-200 dark:border-zinc-700 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    )}
                    title={
                      !cloakingEnabled 
                        ? 'Cloaking Locked: Subscription required to activate edge routing' 
                        : (link.isActive ? 'Pause Link' : 'Activate Link')
                    }
                  >
                    <Power className="w-4 h-4" />
                    {!cloakingEnabled && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-xs">
                        <Lock className="w-2 h-2" />
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setEditingLink(link)}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                    title="Edit Metadata & Domain"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>

                  <Link
                    href={`/traffic-director/links/${link.id}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-zinc-800/80 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-white/10 hover:bg-blue-100 dark:hover:bg-zinc-800 text-xs font-semibold transition active:scale-95"
                  >
                    Rules Canvas
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, link, loading: false })}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-400 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    title="Delete Link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-zinc-800/80 border border-blue-100 dark:border-white/10 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
            <GitFork className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">No Smart Links Found</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
              Create your first dynamic link to start routing users based on device, geography, headers, and crawlers.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Smart Link
          </button>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedLinkIds.length}
        totalCount={links.length}
        itemLabel="smart links"
        presetAmounts={[5, 10, 25, 50]}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onSelectAmount={handleSelectAmount}
        onDeleteSelected={handleBulkDeleteSelected}
        isDeleting={isBulkDeleting}
        deleteModalTitle={`Delete ${selectedLinkIds.length} Selected Smart Links`}
        deleteModalMessage={`Are you sure you want to permanently delete these ${selectedLinkIds.length} Smart Links and all their routing rules? This action cannot be undone.`}
      />
    </div>
  );
}
