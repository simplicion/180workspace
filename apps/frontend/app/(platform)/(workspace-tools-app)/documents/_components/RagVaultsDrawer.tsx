"use client";

import { useState, useEffect } from 'react';
import { 
  Database, FileText, Sparkles, Trash2, Search, X, 
  RefreshCw, Plus, CheckCircle2, AlertCircle, Layers, 
  Package, Users, Play, ShieldCheck, Tag, ExternalLink
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface VaultRecord {
  id: string;
  name: string;
  purposeDescription?: string;
  mode: 'general' | 'business_driven';
  category: string;
  totalDocuments: number;
  totalChunks: number;
  totalSizeBytes: number;
  status: string;
  progressPercent: number;
  linkedAgentsCount: number;
  createdAt: string;
}

export function RagVaultsDrawer({
  isOpen,
  onClose,
  onOpenCreate
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreate: () => void;
}) {
  const [vaults, setVaults] = useState<VaultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);

  // Live Query Test Bench
  const [testQuery, setTestQuery] = useState('');
  const [querying, setQuerying] = useState(false);
  const [queryResults, setQueryResults] = useState<any[] | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVaults();
    }
  }, [isOpen]);

  const fetchVaults = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/workspace-tools/vaults');
      if (res.data?.vaults) {
        setVaults(res.data.vaults);
        if (res.data.vaults.length > 0 && !selectedVaultId) {
          setSelectedVaultId(res.data.vaults[0].id);
        }
      }
    } catch {
      toast.error('Failed to load RAG vaults');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVault = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete vault "${name}"? All associated vector memory will be deleted.`)) return;
    try {
      await api.delete(`/api/v1/workspace-tools/vaults/${id}`);
      toast.success(`Vault "${name}" deleted`);
      setVaults(prev => prev.filter(v => v.id !== id));
      if (selectedVaultId === id) setSelectedVaultId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete vault');
    }
  };

  const handleTestSearch = async () => {
    if (!testQuery.trim() || !selectedVaultId) return;
    setQuerying(true);
    try {
      const res = await api.post(`/api/v1/workspace-tools/vaults/${selectedVaultId}/query`, {
        query: testQuery.trim(),
        topK: 3
      });
      setQueryResults(res.data?.results || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Search failed');
    } finally {
      setQuerying(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  const activeVault = vaults.find(v => v.id === selectedVaultId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  RAG Memory Vaults
                </h3>
                <p className="text-xs text-gray-400">
                  Manage collections, inspect vector chunks, and test hybrid retrieval.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenCreate}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Vault</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {loading ? (
            <div className="py-20 text-center text-xs text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
              Loading RAG vaults...
            </div>
          ) : vaults.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-8 space-y-3">
              <Database className="w-10 h-10 text-gray-400 mx-auto" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">No RAG Memory Vaults created yet</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Create dedicated memory vaults to organize company knowledge, pricing, and SOPs for your voice employees and Orbit AI.
              </p>
              <button
                onClick={onOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Your First Vault
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Vault Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vaults.map(v => {
                  const isSelected = selectedVaultId === v.id;
                  const isBiz = v.mode === 'business_driven';

                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVaultId(v.id)}
                      className={clsx(
                        "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left relative group",
                        isSelected
                          ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/40"
                          : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={clsx(
                            "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1",
                            isBiz 
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          )}>
                            {isBiz ? <Sparkles className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
                            {isBiz ? 'Business-Driven' : 'General Vault'}
                          </span>

                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {v.category || 'General'}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-gray-900 dark:text-white mt-2 truncate">
                          {v.name}
                        </h4>

                        {v.purposeDescription && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                            {v.purposeDescription}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-gray-700/40 text-[10px] text-gray-400 font-medium">
                        <span>{v.totalChunks} chunks • {formatBytes(v.totalSizeBytes)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">● Ready</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVault(v.id, v.name);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                            title="Delete vault"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Vault Inspection & Test Bench */}
              {activeVault && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900 to-indigo-950/40 border border-gray-800 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-indigo-400" />
                        Live Test Query: &quot;{activeVault.name}&quot;
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Test how AI agents extract exact facts from this vault in &lt; 30ms.
                      </p>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                      {activeVault.totalChunks} Chunks Loaded
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. What are our return terms or service pricing?"
                      value={testQuery}
                      onChange={(e) => setTestQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
                      className="flex-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleTestSearch}
                      disabled={querying || !testQuery.trim()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {querying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      <span>Test</span>
                    </button>
                  </div>

                  {/* Results Display */}
                  {queryResults && (
                    <div className="space-y-2 pt-2 border-t border-gray-800">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Matches in this Vault ({queryResults.length}):
                      </span>
                      {queryResults.length === 0 ? (
                        <p className="text-xs text-amber-400 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20">
                          No matching passages found for this query in &quot;{activeVault.name}&quot;.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {queryResults.map((r, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-gray-800/90 border border-gray-700 text-xs space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-indigo-300">{r.documentTitle}</span>
                                <span className="text-emerald-400 font-mono font-bold">
                                  Score: {Math.round((r.score || 0.8) * 100)}%
                                </span>
                              </div>
                              <p className="text-gray-300 text-[11px] leading-relaxed">
                                {r.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
