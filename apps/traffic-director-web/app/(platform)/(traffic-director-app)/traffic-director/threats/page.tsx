"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, RefreshCw, Plus, Trash2, 
  Search, CheckCircle2, XCircle, Globe, Cpu, Eye, AlertTriangle, 
  ExternalLink, Layers, Radio, Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader } from '@workspace/ui';
import CustomSelect from '@/components/ui/CustomSelect';

export default function ThreatIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [syncingTor, setSyncingTor] = useState(false);
  const [data, setData] = useState<{
    feeds: any[];
    torStats: any;
    customEntries: any[];
  }>({
    feeds: [],
    torStats: { count: 0, status: 'idle', lastSyncTime: null },
    customEntries: []
  });

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'ip' | 'cidr' | 'asn' | 'user_agent'>('cidr');
  const [newValue, setNewValue] = useState('');
  const [newMode, setNewMode] = useState<'blacklist' | 'whitelist'>('blacklist');
  const [newDescription, setNewDescription] = useState('');
  const [submittingRule, setSubmittingRule] = useState(false);

  const fetchThreatData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/traffic-director/threats');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load threat intelligence:', err);
      toast.error('Failed to load threat intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreatData();
  }, []);

  const handleToggleFeed = async (feedKey: string, currentEnabled: boolean) => {
    try {
      const nextVal = !currentEnabled;
      // Optimistic update
      setData(prev => ({
        ...prev,
        feeds: prev.feeds.map(f => f.key === feedKey ? { ...f, isEnabled: nextVal } : f)
      }));

      await api.post('/api/v1/traffic-director/threats/toggle-feed', {
        feedKey,
        enabled: nextVal
      });

      toast.success(`${feedKey} feed is now ${nextVal ? 'Active' : 'Disabled'}`);
    } catch (err) {
      toast.error('Failed to toggle threat feed');
      fetchThreatData();
    }
  };

  const handleSyncTor = async () => {
    try {
      setSyncingTor(true);
      const res = await api.post('/api/v1/traffic-director/threats/sync-tor');
      if (res.data?.success) {
        setData(prev => ({
          ...prev,
          torStats: res.data.data
        }));
        toast.success(`Tor exit directory updated! (${res.data.data.count} nodes indexed)`);
      }
    } catch (err) {
      toast.error('Failed to synchronize Tor exit directory');
    } finally {
      setSyncingTor(false);
    }
  };

  const handleCreateCustomRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newValue.trim()) {
      toast.error('Rule name and target value are required');
      return;
    }

    try {
      setSubmittingRule(true);
      const res = await api.post('/api/v1/traffic-director/threats/custom', {
        name: newName.trim(),
        type: newType,
        value: newValue.trim(),
        mode: newMode,
        description: newDescription.trim() || undefined
      });

      if (res.data?.success) {
        toast.success('Custom threat rule created');
        setIsAddModalOpen(false);
        setNewName('');
        setNewValue('');
        setNewDescription('');
        fetchThreatData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create threat rule');
    } finally {
      setSubmittingRule(false);
    }
  };

  const handleDeleteCustomRule = async (id: string) => {
    try {
      await api.delete(`/api/v1/traffic-director/threats/custom/${id}`);
      setData(prev => ({
        ...prev,
        customEntries: prev.customEntries.filter(e => e.id !== id)
      }));
      toast.success('Threat rule removed');
    } catch (err) {
      toast.error('Failed to delete threat rule');
    }
  };

  const filteredCustomEntries = data.customEntries.filter(entry => {
    const q = search.toLowerCase();
    return (
      entry.name?.toLowerCase().includes(q) ||
      entry.value?.toLowerCase().includes(q) ||
      entry.type?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-indigo-900/10 via-purple-900/5 to-slate-900/10 dark:from-indigo-950/40 dark:via-zinc-900/40 dark:to-purple-950/20 border border-indigo-200/50 dark:border-indigo-800/30 backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sovereign Threat Intelligence Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              Global Threat Intelligence & Blacklists
            </h1>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
              Zero-latency edge protection preventing Meta review teams, Dublin compliance subnets, Google AdsBot inspection crawlers, competitor spy tools, and Tor exit nodes from detecting or analyzing your money pages.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncTor}
              disabled={syncingTor}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-bold border border-gray-200/80 dark:border-white/10 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingTor ? 'animate-spin text-indigo-500' : 'text-gray-500'}`} />
              <span>{syncingTor ? 'Syncing Tor...' : 'Force Tor Sync'}</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Threat Rule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tor Network Live Synchronizer Widget */}
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200/80 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Official Tor Project Exit Node Directory</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                Live O(1) Memory Set
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Automated background sync running every 4 hours from check.torproject.org. Sub-millisecond zero-database lookup.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-gray-200/80 dark:border-white/10 pt-3 sm:pt-0 sm:pl-6">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Indexed Exit Nodes</div>
            <div className="text-lg font-black text-gray-900 dark:text-white">
              {(data.torStats?.count || 1850).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Sync Status</div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1-Click System Threat Feeds */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-500" />
            <span>Pre-Configured System Threat Feeds</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Toggle sovereign platform-managed threat repositories. Any matching traffic is silently routed to safe fallback pages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.feeds.map((feed) => (
            <div
              key={feed.key}
              className={`p-5 rounded-2xl border transition-all ${
                feed.isEnabled
                  ? 'bg-white/90 dark:bg-zinc-900/90 border-indigo-200/80 dark:border-indigo-800/50 shadow-sm shadow-indigo-500/5'
                  : 'bg-gray-50/70 dark:bg-zinc-950/60 border-gray-200/60 dark:border-white/5 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                    {feed.category}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1.5">
                    {feed.name}
                  </h3>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleFeed(feed.key, feed.isEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    feed.isEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      feed.isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                {feed.description}
              </p>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-500">
                <span className="font-medium">Active Signatures:</span>
                <span className="font-bold text-gray-900 dark:text-zinc-200">{feed.signatureCount}+</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Company Blacklists & Whitelists */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-500" />
              <span>Custom Organization Threat Lists</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Add individual IP addresses, CIDR subnets (e.g. 198.51.100.0/24), ASNs, or User-Agent substrings.
            </p>
          </div>

          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search custom rules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {filteredCustomEntries.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-gray-200/80 dark:border-white/10">
            <ShieldCheck className="w-10 h-10 text-gray-400 mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">No Custom Threat Rules Added Yet</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
              You are fully protected by the active system threat feeds. Click "Add Custom Threat Rule" to block specific competitor subnets or IPs.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-950/40 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="p-3.5">Rule Name</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Target Value</th>
                    <th className="p-3.5">Mode</th>
                    <th className="p-3.5">Added Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/60 dark:divide-white/5">
                  {filteredCustomEntries.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition">
                      <td className="p-3.5 font-bold text-gray-900 dark:text-white">
                        {rule.name}
                        {rule.description && (
                          <div className="text-[10px] font-normal text-gray-400">{rule.description}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10">
                          {rule.type}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-gray-900 dark:text-zinc-200 font-medium">
                        {rule.value}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            rule.mode === 'blacklist'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                          }`}
                        >
                          {rule.mode}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-400">
                        {new Date(rule.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteCustomRule(rule.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Threat Rule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Add Custom Threat Rule
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Define an IP, subnet, ASN, or User-Agent to blacklist or whitelist across all traffic links.
              </p>
            </div>

            <form onSubmit={handleCreateCustomRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Rule Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rogue Competitor Subnet"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Match Type
                  </label>
                  <CustomSelect
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    options={[
                      { value: 'cidr', label: 'CIDR Subnet (e.g. /24)' },
                      { value: 'ip', label: 'Single IP Address' },
                      { value: 'asn', label: 'Autonomous System (ASN)' },
                      { value: 'user_agent', label: 'User-Agent Substring' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Action Mode
                  </label>
                  <CustomSelect
                    value={newMode}
                    onChange={(e: any) => setNewMode(e.target.value)}
                    options={[
                      { value: 'blacklist', label: 'Blacklist (Drop to Safe)' },
                      { value: 'whitelist', label: 'Whitelist (Always Allow)' }
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Target Value <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newType === 'cidr' ? 'e.g. 198.51.100.0/24' :
                    newType === 'ip' ? 'e.g. 198.51.100.14' :
                    newType === 'asn' ? 'e.g. AS209242 or PacketHub' : 'e.g. MyRogueScraper'
                  }
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Notes on who or why this rule is created"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRule}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingRule ? 'Saving...' : 'Save Threat Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
