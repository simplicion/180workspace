"use client";

import { useState, useEffect } from 'react';
import { 
  Database, Check, Sparkles, FolderArchive, Layers, RefreshCw, 
  Search, ShieldCheck, Tag, FileText, CheckCircle2, ChevronRight, X, Plus
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface RagVault {
  id: string;
  name: string;
  mode: 'general' | 'business';
  category?: string;
  purpose?: string;
  totalChunks: number;
  totalSizeBytes: number;
  status: string;
  documentCount?: number;
  createdAt: string;
}

interface LinkExistingRagVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName?: string;
  onSuccess?: () => void;
}

export function LinkExistingRagVaultModal({
  isOpen,
  onClose,
  agentId,
  agentName = 'Voice Agent',
  onSuccess
}: LinkExistingRagVaultModalProps) {
  const [vaults, setVaults] = useState<RagVault[]>([]);
  const [selectedVaultIds, setSelectedVaultIds] = useState<string[]>([]);
  const [initialVaultIds, setInitialVaultIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && agentId) {
      loadData();
    }
  }, [isOpen, agentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allVaultsRes, agentVaultsRes] = await Promise.all([
        api.get('/api/v1/workspace-tools/vaults').catch(() => ({ data: { vaults: [] } })),
        api.get(`/api/v1/voiceforce/agents/${agentId}/vaults`).catch(() => ({ data: { vaultIds: [] } }))
      ]);

      const all = allVaultsRes.data?.vaults || [];
      const linked = agentVaultsRes.data?.vaultIds || (agentVaultsRes.data?.vaults?.map((v: any) => v.id)) || [];

      setVaults(all);
      setSelectedVaultIds(linked);
      setInitialVaultIds(linked);
    } catch (err) {
      console.warn('Failed to load vaults for agent linking', err);
      toast.error('Failed to load memory vaults');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVault = (id: string) => {
    setSelectedVaultIds(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/api/v1/voiceforce/agents/${agentId}/vaults`, {
        vaultIds: selectedVaultIds
      });

      toast.success(`Successfully updated RAG Memory Vaults for ${agentName}!`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update linked vaults');
    } finally {
      setSaving(false);
    }
  };

  const filteredVaults = vaults.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.purpose?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-950/20 via-indigo-950/10 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  RAG Scoped Vault Association
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-gray-900 dark:text-white">
                Add Your RAG & Custom Memory Vaults
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select custom created 50MB Memory Vaults to authorize for &quot;{agentName}&quot; during live phone calls.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Create Vault Quick Action */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Need a new domain knowledge vault?</span>
            <a
              href="/documents?drawer=vaults"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-[11px] border border-purple-200 dark:border-purple-800/60 transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-purple-500" />
              <span>+ Create Vault in Documents</span>
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter memory vaults by name, category, or purpose..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Vaults Selection List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="py-16 text-center text-xs text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-500 mb-2" />
              Loading available memory vaults...
            </div>
          ) : filteredVaults.length === 0 ? (
            <div className="py-14 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <FolderArchive className="w-9 h-9 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">No RAG Memory Vaults found</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-500 max-w-xs mx-auto mt-1 mb-4">
                Create dedicated 50MB vaults in 180 Documents with your PDF manuals or technical specs.
              </p>
              <a
                href="/documents?drawer=vaults"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Open RAG Vaults Management</span>
              </a>
            </div>
          ) : (
            filteredVaults.map(vault => {
              const isSelected = selectedVaultIds.includes(vault.id);
              return (
                <div
                  key={vault.id}
                  onClick={() => handleToggleVault(vault.id)}
                  className={clsx(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3",
                    isSelected
                      ? "bg-purple-50/70 dark:bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/10"
                      : "bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/90"
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={clsx(
                      "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                      isSelected
                        ? "bg-purple-600 border-purple-600 text-white"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                    )}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{vault.name}</h4>
                        <span className={clsx(
                          "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border",
                          vault.mode === 'business'
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        )}>
                          {vault.mode === 'business' ? 'Business Vault' : 'General Vault'}
                        </span>
                        {vault.category && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-mono">
                            #{vault.category}
                          </span>
                        )}
                      </div>

                      {vault.purpose && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                          {vault.purpose}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                        <span>{vault.totalChunks || 0} vectorized chunks</span>
                        <span>•</span>
                        <span>{formatBytes(vault.totalSizeBytes || 0)}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">Ready (100%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className={clsx(
                      "text-[10px] font-bold uppercase px-2 py-1 rounded-md",
                      isSelected 
                        ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300" 
                        : "text-gray-400 dark:text-gray-500"
                    )}>
                      {isSelected ? 'Active Link' : 'Unlinked'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer info and actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{selectedVaultIds.length} vault(s) selected for this agent</span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
              <span>Save & Link to Agent</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alias export for side drawer semantics
export const LinkExistingRagVaultDrawer = LinkExistingRagVaultModal;

