"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GitFork, Link as LinkIcon, Plus, Search, Copy, Check, ExternalLink, 
  Trash2, Settings2, Power, Filter, ArrowRight 
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader } from '@workspace/ui';
import CreateLinkModal from '../../_components/CreateLinkModal';
import EditLinkModal from '../../_components/EditLinkModal';

export default function SmartLinksDirectoryPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/traffic-director/links', {
        params: { search: search || undefined }
      });
      setLinks(res.data?.data?.links || []);
    } catch (error: any) {
      console.error('Failed to fetch links:', error);
      setLinks([]);
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
    try {
      const updated = !link.isActive;
      await api.put(`/api/v1/traffic-director/links/${link.id}`, { isActive: updated });
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, isActive: updated } : l));
      toast.success(`Link is now ${updated ? 'Active' : 'Paused'}`);
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this Smart Link and all its rules?')) return;
    try {
      await api.delete(`/api/v1/traffic-director/links/${linkId}`);
      setLinks(prev => prev.filter(l => l.id !== linkId));
      toast.success('Link deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete link');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <CreateLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchLinks()}
      />

      <EditLinkModal
        isOpen={Boolean(editingLink)}
        onClose={() => setEditingLink(null)}
        link={editingLink}
        onSuccess={() => fetchLinks()}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Links Directory</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Dynamic redirect links with multi-dimensional conditional routing rules
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          Create Smart Link
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by link name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Links List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : links.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {links.map((link) => (
            <div
              key={link.id}
              className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${link.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{link.name}</h3>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    /r/{link.slug}
                    <button
                      onClick={() => handleCopy(link.slug, link.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1 transition"
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
                    <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold">
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

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => handleToggleActive(link)}
                  className={`p-2.5 rounded-xl border transition ${
                    link.isActive 
                      ? 'border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' 
                      : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title={link.isActive ? 'Pause Link' : 'Activate Link'}
                >
                  <Power className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setEditingLink(link)}
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  title="Edit Metadata & Domain"
                >
                  <Settings2 className="w-4 h-4" />
                </button>

                <Link
                  href={`/traffic-director/links/${link.id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-100 text-xs font-semibold transition active:scale-95"
                >
                  Rules Canvas
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => handleDelete(link.id)}
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  title="Delete Link"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 space-y-3">
          <GitFork className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No Smart Links Found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Create your first dynamic link to start routing users based on device, geography, headers, and crawlers.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            Create Smart Link
          </button>
        </div>
      )}
    </div>
  );
}
