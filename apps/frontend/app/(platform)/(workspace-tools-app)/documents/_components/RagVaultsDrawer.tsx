"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, FileText, Sparkles, Trash2, Search, X, 
  RefreshCw, Plus, CheckCircle2, AlertCircle, Layers, 
  Users, Play, ShieldCheck, Tag, ExternalLink, HardDrive, 
  Cpu, Zap, Terminal, Bot, ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Drawer } from '@/components/ui/Drawer';
import { CreateRagVaultModal } from './CreateRagVaultModal';

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

interface CategoryItem {
  id: string;
  name: string;
  color?: string;
}

interface VoiceAgent {
  id: string;
  name: string;
  role?: string;
}

export function RagVaultsDrawer({
  isOpen,
  onClose,
  onOpenCreate,
  onVaultCreated
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreate?: () => void;
  onVaultCreated?: () => void;
}) {
  const [vaults, setVaults] = useState<VaultRecord[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMode, setSelectedMode] = useState<'ALL' | 'general' | 'business_driven'>('ALL');

  // Selected Vault for Live Test Bench
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);

  // Live Query Benchmark Bench
  const [testQuery, setTestQuery] = useState('');
  const [querying, setQuerying] = useState(false);
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [queryLatencyMs, setQueryLatencyMs] = useState<number | null>(null);

  // In-Drawer Create Vault Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Agent Linking Dialog State
  const [linkingVault, setLinkingVault] = useState<VaultRecord | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [vaultsRes, catsRes, agentsRes] = await Promise.allSettled([
        api.get('/api/v1/workspace-tools/vaults'),
        api.get('/api/v1/workspace-tools/vaults/meta/categories'),
        api.get('/api/v1/voiceforce/agents')
      ]);

      if (vaultsRes.status === 'fulfilled' && vaultsRes.value.data?.vaults) {
        const loadedVaults: VaultRecord[] = vaultsRes.value.data.vaults;
        setVaults(loadedVaults);
        if (loadedVaults.length > 0 && !selectedVaultId) {
          setSelectedVaultId(loadedVaults[0].id);
        }
      }
      if (catsRes.status === 'fulfilled' && catsRes.value.data?.categories) {
        setCategories(catsRes.value.data.categories);
      }
      if (agentsRes.status === 'fulfilled' && agentsRes.value.data?.data) {
        setAgents(agentsRes.value.data.data);
      }
    } catch {
      toast.error('Failed to load RAG vaults data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVault = async (vault: VaultRecord) => {
    if (!confirm(`Are you sure you want to delete vault "${vault.name}"? All associated 1536d vector chunks will be purged.`)) {
      return;
    }
    try {
      await api.delete(`/api/v1/workspace-tools/vaults/${vault.id}`);
      toast.success(`Vault "${vault.name}" deleted`);
      setVaults(prev => prev.filter(v => v.id !== vault.id));
      if (selectedVaultId === vault.id) {
        setSelectedVaultId(null);
        setQueryResults(null);
      }
      onVaultCreated?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete vault');
    }
  };

  const handleTestSearch = async () => {
    if (!testQuery.trim() || !selectedVaultId) return;
    setQuerying(true);
    const start = performance.now();
    try {
      const res = await api.post(`/api/v1/workspace-tools/vaults/${selectedVaultId}/query`, {
        query: testQuery.trim(),
        topK: 4
      });
      const end = performance.now();
      setQueryLatencyMs(Math.round(end - start));
      setQueryResults(res.data?.results || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Search benchmark failed');
    } finally {
      setQuerying(false);
    }
  };

  const handleLinkAgent = async () => {
    if (!linkingVault || !selectedAgentId) return;
    setIsLinking(true);
    try {
      const curRes = await api.get(`/api/v1/voiceforce/agents/${selectedAgentId}/vaults`);
      const existingIds = (curRes.data?.linkedVaults || []).map((v: any) => v.id);
      const updatedIds = Array.from(new Set([...existingIds, linkingVault.id]));

      await api.put(`/api/v1/voiceforce/agents/${selectedAgentId}/vaults`, {
        vaultIds: updatedIds
      });
      toast.success(`Vault linked to voice agent!`);
      setLinkingVault(null);
      setSelectedAgentId('');
      fetchInitialData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to link vault to agent');
    } finally {
      setIsLinking(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Filtered Vaults
  const filteredVaults = useMemo(() => {
    return vaults.filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.purposeDescription && v.purposeDescription.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === 'ALL' || (v.category || '').toLowerCase() === selectedCategory.toLowerCase();
      const matchesMode = selectedMode === 'ALL' || v.mode === selectedMode;
      return matchesSearch && matchesCat && matchesMode;
    });
  }, [vaults, searchQuery, selectedCategory, selectedMode]);

  // Aggregate Metrics
  const totalChunks = useMemo(() => vaults.reduce((acc, v) => acc + (v.totalChunks || 0), 0), [vaults]);
  const totalDocs = useMemo(() => vaults.reduce((acc, v) => acc + (v.totalDocuments || 0), 0), [vaults]);
  const totalBytes = useMemo(() => vaults.reduce((acc, v) => acc + (v.totalSizeBytes || 0), 0), [vaults]);

  const activeVault = vaults.find(v => v.id === selectedVaultId) || (vaults.length > 0 ? vaults[0] : null);

  return (
    <>
      {/* Create RAG Vault Modal */}
      <CreateRagVaultModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onVaultCreated={() => {
          setIsCreateModalOpen(false);
          fetchInitialData();
          onVaultCreated?.();
        }}
      />

      {/* Link Agent Sub-Modal */}
      {linkingVault && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Link to AI Voice Employee</h3>
                  <p className="text-[11px] text-gray-400">Attach &quot;{linkingVault.name}&quot; memory</p>
                </div>
              </div>
              <button
                onClick={() => setLinkingVault(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Choose Voiceforce Agent:
              </label>
              {agents.length === 0 ? (
                <p className="text-xs text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  No Voiceforce AI employees found. Create an agent in Voiceforce Radar first.
                </p>
              ) : (
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select an AI Agent...</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} {agent.role ? `(${agent.role})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLinkingVault(null)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedAgentId || isLinking}
                onClick={handleLinkAgent}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isLinking ? 'Linking...' : 'Confirm Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Framer-Motion Right-Docked Drawer */}
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        position="right"
        size="w-full max-w-3xl lg:max-w-4xl"
        noPadding={true}
        title={
          <div className="flex items-center gap-2">
            <span>RAG Vaults Management</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              50MB Scoped Memory
            </span>
          </div>
        }
        description="Manage custom collections, inspect 1536d vector chunks, test semantic retrieval & link to AI agents."
        icon={<div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"><Database className="w-5 h-5" /></div>}
      >
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
          
          {/* Top Quick Actions Toolbar */}
          <div className="px-6 py-3.5 bg-gray-50/80 dark:bg-gray-850/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Autonomous 50MB Scoped Vector Stores
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchInitialData()}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 transition-colors cursor-pointer shadow-2xs"
                title="Refresh Vaults"
              >
                <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin text-indigo-500")} />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenCreate) {
                    onOpenCreate();
                  } else {
                    setIsCreateModalOpen(true);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create RAG Vault</span>
              </button>
            </div>
          </div>

          {/* Scrollable Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Metrics Row (4 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                  <span>Active Vaults</span>
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{vaults.length}</p>
                <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Multi-tenant isolated
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                  <span>Vector Chunks</span>
                  <Cpu className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{totalChunks.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400">1536d Cosine indexed</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                  <span>Documents</span>
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{totalDocs.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400">Multimodal ingested</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-gray-500 text-[11px] font-medium">
                  <span>Memory Size</span>
                  <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatBytes(totalBytes)}</p>
                <p className="text-[10px] text-indigo-400 font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3" /> 50MB Scoped Limit
                </p>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search vaults by name, scope, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Mode Toggles */}
                <div className="flex items-center gap-1 bg-gray-200/70 dark:bg-gray-900 p-1 rounded-xl self-start sm:self-auto">
                  <button
                    onClick={() => setSelectedMode('ALL')}
                    className={clsx(
                      "px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer",
                      selectedMode === 'ALL' 
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs font-semibold" 
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    All Modes
                  </button>
                  <button
                    onClick={() => setSelectedMode('business_driven')}
                    className={clsx(
                      "px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer",
                      selectedMode === 'business_driven' 
                        ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold" 
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    Business Driven
                  </button>
                  <button
                    onClick={() => setSelectedMode('general')}
                    className={clsx(
                      "px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer",
                      selectedMode === 'general' 
                        ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-xs font-semibold" 
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    General RAG
                  </button>
                </div>
              </div>

              {/* Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <span className="text-gray-400 font-medium text-[11px] flex items-center gap-1 shrink-0 mr-1">
                  <Tag className="w-3 h-3" /> Categories:
                </span>
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition-colors cursor-pointer",
                    selectedCategory === 'ALL'
                      ? "bg-indigo-600 text-white shadow-xs font-bold"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60"
                  )}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer",
                      selectedCategory.toLowerCase() === cat.name.toLowerCase()
                        ? "bg-slate-900 text-white shadow-xs font-bold"
                        : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60"
                    )}
                  >
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: cat.color || '#6366f1' }}
                    />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Vaults Content List */}
            {loading ? (
              <div className="py-20 text-center text-xs text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                Loading RAG memory vaults...
              </div>
            ) : filteredVaults.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-8 space-y-3">
                <Database className="w-10 h-10 text-gray-400 mx-auto" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">No RAG Memory Vaults found</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Create dedicated 50MB memory vaults to organize company knowledge, pricing, and SOPs for your voice employees and Orbit AI.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md cursor-pointer hover:bg-indigo-500"
                >
                  <Plus className="w-4 h-4" /> Create Your First Vault
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Vault Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredVaults.map(v => {
                    const isSelected = selectedVaultId === v.id;
                    const isBiz = v.mode === 'business_driven';

                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVaultId(v.id)}
                        className={clsx(
                          "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left relative group",
                          isSelected
                            ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/40"
                            : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700/60 hover:border-indigo-300 dark:hover:border-gray-600"
                        )}
                      >
                        <div>
                          {/* Header Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={clsx(
                                "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1",
                                isBiz 
                                  ? "bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20"
                                  : "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20"
                              )}>
                                {isBiz ? <Sparkles className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
                                {isBiz ? 'Business-Driven' : 'General Vault'}
                              </span>

                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {v.category || 'General'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVault(v);
                              }}
                              className="p-1 text-gray-300 hover:text-rose-500 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Purge vault"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Title & Purpose */}
                          <h4 className="text-xs font-black text-gray-900 dark:text-white mt-2.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {v.name}
                          </h4>

                          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 min-h-[30px]">
                            {v.purposeDescription || 'Specialized domain memory for AI Voice Employees.'}
                          </p>

                          {/* Stats Row */}
                          <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-gray-200/60 dark:border-gray-700/40 text-center">
                            <div className="bg-white/80 dark:bg-gray-900/60 rounded-lg p-1.5 border border-gray-100 dark:border-gray-800">
                              <p className="text-[9px] text-gray-400 font-medium">Docs</p>
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{v.totalDocuments}</p>
                            </div>
                            <div className="bg-white/80 dark:bg-gray-900/60 rounded-lg p-1.5 border border-gray-100 dark:border-gray-800">
                              <p className="text-[9px] text-gray-400 font-medium">Chunks</p>
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{v.totalChunks}</p>
                            </div>
                            <div className="bg-white/80 dark:bg-gray-900/60 rounded-lg p-1.5 border border-gray-100 dark:border-gray-800">
                              <p className="text-[9px] text-gray-400 font-medium">Size</p>
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{formatBytes(v.totalSizeBytes)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-gray-700/40 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVaultId(v.id);
                                setQueryResults(null);
                              }}
                              className={clsx(
                                "px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer",
                                isSelected 
                                  ? "bg-indigo-600 text-white shadow-xs" 
                                  : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                              )}
                            >
                              <Play className="w-2.5 h-2.5" />
                              {isSelected ? 'Benchmark Active' : 'Test Bench'}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLinkingVault(v);
                                setSelectedAgentId('');
                              }}
                              className="px-2 py-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/60 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                              title="Link to Voiceforce Agent"
                            >
                              <Bot className="w-3 h-3 text-indigo-500" />
                              <span>Link Agent</span>
                            </button>
                          </div>

                          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                            <Users className="w-3 h-3 text-purple-400" />
                            {v.linkedAgentsCount || 0} agents
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Vault Inspection & Test Bench */}
                {activeVault && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900 to-indigo-950/60 border border-gray-800 shadow-xl space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                          Live Vector Test Bench: &quot;{activeVault.name}&quot;
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Test how AI agents extract exact facts from this vault in &lt; 30ms.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {queryLatencyMs !== null && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                            ⚡ {queryLatencyMs}ms Latency
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {activeVault.totalChunks} Chunks Indexed
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. What are our refund terms, service plans, or pricing tiers?"
                        value={testQuery}
                        onChange={(e) => setTestQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
                        className="flex-1 px-3 py-2 rounded-xl bg-gray-800/90 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleTestSearch}
                        disabled={querying || !testQuery.trim()}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {querying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        <span>Test Query</span>
                      </button>
                    </div>

                    {/* Benchmark Results Display */}
                    {queryResults && (
                      <div className="space-y-2 pt-2 border-t border-gray-800">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Top Semantic Matches ({queryResults.length}):
                        </span>
                        {queryResults.length === 0 ? (
                          <p className="text-xs text-amber-400 p-3 rounded-xl bg-amber-950/30 border border-amber-500/20">
                            No matching passages found for &quot;{testQuery}&quot; in &quot;{activeVault.name}&quot;.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {queryResults.map((r, i) => (
                              <div key={i} className="p-3 rounded-xl bg-gray-800/90 border border-gray-700 text-xs space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-bold text-indigo-300 flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {r.documentTitle || 'Indexed Document'}
                                  </span>
                                  <span className="text-emerald-400 font-mono font-bold bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
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
      </Drawer>
    </>
  );
}
