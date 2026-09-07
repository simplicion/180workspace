"use client";

import { useState, useEffect } from 'react';
import { 
  Database, Check, Sparkles, FolderArchive, Layers, RefreshCw, 
  Search, ShieldCheck, Tag, FileText, CheckCircle2, ChevronRight, X
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="max-w-2xl w-full bg-gray-900 border border-gray-800 text-white rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-gray-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                <Database className="w-3 h-3" />
                RAG Scoped Vault Association
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Link Dedicated RAG Vaults to &quot;{agentName}&quot;
            </h3>
            <p className="text-xs text-gray-400">
              Select the specific 5GB Memory Vaults this voice employee is authorized to query during live phone calls.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter memory vaults by name, category, or purpose..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800/80 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Vaults Selection List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
              Loading available memory vaults...
            </div>
          ) : filteredVaults.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-800 rounded-2xl">
              <FolderArchive className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-400">No RAG Memory Vaults found</p>
              <p className="text-[11px] text-gray-600 max-w-xs mx-auto mt-1">
                Create dedicated vaults in the 180 Documents app to link them to this voice employee.
              </p>
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
                      ? "bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-900/20"
                      : "bg-gray-800/40 border-gray-800 hover:border-gray-700 hover:bg-gray-800/80"
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={clsx(
                      "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                      isSelected
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "border-gray-600 bg-gray-900"
                    )}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white truncate">{vault.name}</h4>
                        <span className={clsx(
                          "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border",
                          vault.mode === 'business'
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        )}>
                          {vault.mode === 'business' ? 'Business Vault' : 'General Vault'}
                        </span>
                        {vault.category && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-gray-800 text-gray-300 font-mono">
                            #{vault.category}
                          </span>
                        )}
                      </div>

                      {vault.purpose && (
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-1">
                          {vault.purpose}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 font-mono">
                        <span>{vault.totalChunks || 0} vectorized chunks</span>
                        <span>•</span>
                        <span>{formatBytes(vault.totalSizeBytes || 0)}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold uppercase">Ready (100%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className={clsx(
                      "text-[10px] font-black uppercase px-2 py-1 rounded-md",
                      isSelected ? "bg-indigo-500/20 text-indigo-300" : "text-gray-500"
                    )}>
                      {isSelected ? 'Active Link' : 'Unlinked'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info and actions */}
        <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{selectedVaultIds.length} vault(s) selected for this agent</span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Save Linked Vaults</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
