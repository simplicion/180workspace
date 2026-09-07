'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Sparkles, Plus, Search, Filter, Trash2, 
  ExternalLink, Layers, FileText, CheckCircle2, Clock, 
  AlertCircle, RefreshCw, Bot, ArrowRight, ShieldCheck, 
  Tag, HardDrive, Cpu, Terminal, Play, Zap, X
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Link from 'next/link';
import { LogoLoader } from '@workspace/ui';
import { CreateRagVaultModal } from '../documents/_components/CreateRagVaultModal';

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

export default function RagVaultsPage() {
  const [vaults, setVaults] = useState<VaultRecord[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMode, setSelectedMode] = useState<'ALL' | 'general' | 'business_driven'>('ALL');
  
  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTestVault, setActiveTestVault] = useState<VaultRecord | null>(null);

  // Live Query Benchmark Bench
  const [testQuery, setTestQuery] = useState('');
  const [querying, setQuerying] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [queryLatencyMs, setQueryLatencyMs] = useState<number | null>(null);

  // Link Agent Modal
  const [linkingVault, setLinkingVault] = useState<VaultRecord | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [vaultsRes, catsRes, agentsRes] = await Promise.allSettled([
        api.get('/api/v1/workspace-tools/vaults'),
        api.get('/api/v1/workspace-tools/vaults/meta/categories'),
        api.get('/api/v1/voiceforce/agents')
      ]);

      if (vaultsRes.status === 'fulfilled' && vaultsRes.value.data?.vaults) {
        setVaults(vaultsRes.value.data.vaults);
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
    if (!confirm(`Permanently delete RAG Memory Vault "${vault.name}"? All associated 1536d vector chunks will be purged.`)) {
      return;
    }
    try {
      await api.delete(`/api/v1/workspace-tools/vaults/${vault.id}`);
      toast.success(`Vault "${vault.name}" purged from memory`);
      setVaults(prev => prev.filter(v => v.id !== vault.id));
      if (activeTestVault?.id === vault.id) {
        setActiveTestVault(null);
        setTestResults(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete vault');
    }
  };

  const handleTestSearch = async () => {
    if (!testQuery.trim() || !activeTestVault) return;
    setQuerying(true);
    const start = performance.now();
    try {
      const res = await api.post(`/api/v1/workspace-tools/vaults/${activeTestVault.id}/query`, {
        query: testQuery.trim(),
        topK: 4
      });
      const end = performance.now();
      setQueryLatencyMs(Math.round(end - start));
      setTestResults(res.data?.results || []);
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
      // Fetch current links for the agent
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
      const matchesCat = selectedCategory === 'ALL' || v.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesMode = selectedMode === 'ALL' || v.mode === selectedMode;
      return matchesSearch && matchesCat && matchesMode;
    });
  }, [vaults, searchQuery, selectedCategory, selectedMode]);

  // Totals
  const totalChunks = useMemo(() => vaults.reduce((acc, v) => acc + (v.totalChunks || 0), 0), [vaults]);
  const totalDocs = useMemo(() => vaults.reduce((acc, v) => acc + (v.totalDocuments || 0), 0), [vaults]);
  const totalBytes = useMemo(() => vaults.reduce((acc, v) => acc + (v.totalSizeBytes || 0), 0), [vaults]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-900/40 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Database className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-300">Universal RAG Memory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Universal RAG Memory Vaults</h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Dual-speed cognitive memory vaults indexing business catalogs, technical procedures, and customer knowledge for both Centralized Orbit AI and Voiceforce Phone Employees.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 flex-wrap">
          <button
            onClick={() => fetchInitialData()}
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          <Link
            href="/voiceforce/brain"
            className="px-3.5 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            Voiceforce Brain
          </Link>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create RAG Vault
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Active Memory Vaults</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{vaults.length}</p>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Multi-tenant isolated
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Vector Chunks (1536d)</span>
            <Cpu className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalChunks.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400">FastPath Cosine indexed</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Documents Ingested</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalDocs.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400">Multimodal parsed</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Cognitive Memory Size</span>
            <HardDrive className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatBytes(totalBytes)}</p>
          <p className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
            <Zap className="w-3 h-3" /> Real-time hybrid cached
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vaults by name, scope, or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Mode Toggles */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setSelectedMode('ALL')}
              className={clsx(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                selectedMode === 'ALL' ? "bg-white text-gray-900 shadow-sm font-semibold" : "text-gray-500 hover:text-gray-900"
              )}
            >
              All Modes
            </button>
            <button
              onClick={() => setSelectedMode('business_driven')}
              className={clsx(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                selectedMode === 'business_driven' ? "bg-white text-indigo-600 shadow-sm font-semibold" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Business Driven
            </button>
            <button
              onClick={() => setSelectedMode('general')}
              className={clsx(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                selectedMode === 'general' ? "bg-white text-purple-600 shadow-sm font-semibold" : "text-gray-500 hover:text-gray-900"
              )}
            >
              General RAG
            </button>
          </div>
        </div>

        {/* Dynamic Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-gray-400 font-medium text-[11px] flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3" /> Categories:
          </span>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={clsx(
              "px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors",
              selectedCategory === 'ALL'
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={clsx(
                "px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors flex items-center gap-1.5",
                selectedCategory.toLowerCase() === cat.name.toLowerCase()
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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

      {/* Main Content Area: Vaults Grid & Test Bench */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs text-gray-400">Loading Universal RAG Memory Vaults...</p>
        </div>
      ) : filteredVaults.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">No RAG Vaults Found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              Create your first Business-Driven or General RAG Memory Vault to feed specialized knowledge to your AI agents.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create RAG Vault
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vaults List (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Configured Vaults ({filteredVaults.length})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVaults.map((vault) => {
                const isTested = activeTestVault?.id === vault.id;
                return (
                  <div
                    key={vault.id}
                    className={clsx(
                      "bg-white rounded-2xl border p-5 transition-all shadow-sm flex flex-col justify-between relative group",
                      isTested
                        ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-indigo-100"
                        : "border-gray-200/80 hover:border-indigo-200 hover:shadow-md"
                    )}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={clsx(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
                            vault.mode === 'business_driven'
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : "bg-purple-50 text-purple-700 border border-purple-100"
                          )}>
                            {vault.mode === 'business_driven' ? 'Business Driven' : 'General RAG'}
                          </span>

                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" />
                            {vault.category || 'General'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteVault(vault)}
                          className="text-gray-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                          title="Purge Vault"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Title & Purpose */}
                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {vault.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[32px]">
                        {vault.purposeDescription || 'No specific purpose description provided.'}
                      </p>

                      {/* Storage Metrics */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
                        <div className="bg-gray-50/80 rounded-lg p-2">
                          <p className="text-[10px] text-gray-400 font-medium">Docs</p>
                          <p className="text-xs font-bold text-gray-800">{vault.totalDocuments}</p>
                        </div>
                        <div className="bg-gray-50/80 rounded-lg p-2">
                          <p className="text-[10px] text-gray-400 font-medium">Chunks</p>
                          <p className="text-xs font-bold text-gray-800">{vault.totalChunks}</p>
                        </div>
                        <div className="bg-gray-50/80 rounded-lg p-2">
                          <p className="text-[10px] text-gray-400 font-medium">Size</p>
                          <p className="text-xs font-bold text-gray-800">{formatBytes(vault.totalSizeBytes)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setActiveTestVault(vault);
                          setTestResults(null);
                        }}
                        className={clsx(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
                          isTested
                            ? "bg-indigo-600 text-white"
                            : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        )}
                      >
                        <Play className="w-3 h-3" />
                        {isTested ? 'Active in Benchmark' : 'Test Query'}
                      </button>

                      <button
                        onClick={() => {
                          setLinkingVault(vault);
                          setSelectedAgentId('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 flex items-center gap-1 transition-colors"
                        title="Link to Voiceforce Agent"
                      >
                        <Bot className="w-3.5 h-3.5 text-indigo-500" />
                        Link Agent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Hybrid Vector Query Test Bench (1 Col) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                Live FastPath Test Bench
              </span>
              {queryLatencyMs !== null && (
                <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  ⚡ {queryLatencyMs}ms Latency
                </span>
              )}
            </div>

            <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
              {activeTestVault ? (
                <div>
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-slate-400 text-[11px]">Selected Vault:</span>
                      <span className="font-semibold text-indigo-300 line-clamp-1">{activeTestVault.name}</span>
                    </div>
                    <button
                      onClick={() => setActiveTestVault(null)}
                      className="text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    <label className="text-[11px] font-medium text-slate-400">Ask a Question / Benchmark Query:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. What is the pricing or warranty terms?"
                        value={testQuery}
                        onChange={(e) => setTestQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={handleTestSearch}
                        disabled={querying || !testQuery.trim()}
                        className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        {querying ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        Query
                      </button>
                    </div>
                  </div>

                  {/* Results Display */}
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Hybrid Match Chunks ({testResults ? testResults.length : 0})
                    </span>

                    {testResults === null ? (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        Enter a natural language query above to benchmark vector search and view top matched chunks.
                      </div>
                    ) : testResults.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No high-confidence matches found in this vault for this query.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {testResults.map((chunk, idx) => (
                          <div
                            key={chunk.id || idx}
                            className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-semibold text-indigo-400 font-mono">
                                Score: {(chunk.score || 0.95).toFixed(3)}
                              </span>
                              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[9px]">
                                {chunk.category || activeTestVault.category}
                              </span>
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-4">
                              {chunk.content || chunk.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center mx-auto text-slate-500">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300">No Vault Selected</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
                      Click &quot;Test Query&quot; on any vault card to run live hybrid vector search benchmarks.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Link Vault to Voiceforce Agent Modal */}
      {linkingVault && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Link Vault to Voice Employee</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Vault: <span className="font-semibold text-indigo-600">{linkingVault.name}</span>
                </p>
              </div>
              <button
                onClick={() => setLinkingVault(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Select Voiceforce AI Agent:</label>
              {agents.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  No voice agents found. Please create a voice employee in Voiceforce first.
                </p>
              ) : (
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- Choose Voice Agent --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.role || 'Telephony'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setLinkingVault(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleLinkAgent}
                disabled={isLinking || !selectedAgentId}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                {isLinking ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Confirm Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create RAG Vault Modal */}
      <CreateRagVaultModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onVaultCreated={() => {
          setIsCreateModalOpen(false);
          fetchInitialData();
        }}
      />
    </div>
  );
}
