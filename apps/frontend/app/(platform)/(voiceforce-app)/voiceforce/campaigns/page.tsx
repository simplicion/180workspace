"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Megaphone, ArrowLeft, Plus, Play, Pause, Square, Clock, 
  Users, CheckCircle2, AlertCircle, X, Sliders
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader } from '@workspace/ui';

export default function VoiceforceCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: 'Lunch Order Re-engagement Batch',
    voiceAgentId: '',
    phoneNumbersText: '+919876543210\n+919812345678',
    maxConcurrent: 5,
    callsPerSecond: 1.0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campRes, agentsRes] = await Promise.all([
        api.get('/api/v1/voiceforce/campaigns').catch(() => ({ data: { data: [] } })),
        api.get('/api/v1/voiceforce/agents').catch(() => ({ data: { data: [] } }))
      ]);
      setCampaigns(campRes.data?.data || []);
      setAgents(agentsRes.data?.data || []);
      if (agentsRes.data?.data?.length > 0 && !form.voiceAgentId) {
        setForm(prev => ({ ...prev, voiceAgentId: agentsRes.data.data[0].id }));
      }
    } catch (err: any) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.voiceAgentId || !form.phoneNumbersText.trim()) {
      toast.error('All fields are required');
      return;
    }

    const phones = form.phoneNumbersText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 5);

    if (phones.length === 0) {
      toast.error('Please enter at least one valid phone number');
      return;
    }

    try {
      setCreating(true);
      const contactList = phones.map(p => ({ phone: p, name: 'Target Contact' }));

      // 1. Create the campaign record
      const createRes = await api.post('/api/v1/voiceforce/campaigns', {
        name: form.name,
        voiceAgentId: form.voiceAgentId,
        contactList,
        maxConcurrent: Number(form.maxConcurrent) || 5,
        callsPerSecond: Number(form.callsPerSecond) || 1.0,
        retryCount: 2
      });

      const campaignId = createRes.data?.data?.id;
      if (campaignId) {
        // 2. Launch campaign dispatching to BullMQ worker queue with CPS rate limit
        await api.post(`/api/v1/voiceforce/campaigns/${campaignId}/launch`);
        toast.success(`Dispatched batch of ${phones.length} calls into BullMQ queue!`);
      }

      setIsCreateOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Error creating campaign');
    } finally {
      setCreating(false);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await api.post(`/api/v1/voiceforce/campaigns/${id}/pause`);
      toast.success('Campaign paused');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to pause campaign');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.post(`/api/v1/voiceforce/campaigns/${id}/resume`);
      toast.success('Campaign resumed');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resume campaign');
    }
  };

  const handleStop = async (id: string) => {
    try {
      await api.post(`/api/v1/voiceforce/campaigns/${id}/stop`);
      toast.success('Campaign stopped');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to stop campaign');
    }
  };

  const handleDirectLaunch = async (id: string) => {
    try {
      await api.post(`/api/v1/voiceforce/campaigns/${id}/launch`);
      toast.success('Campaign launched into BullMQ queue');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to launch campaign');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/voiceforce" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white tracking-tight">Call Campaigns</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Automate high-volume outbound calling with strict Calls-Per-Second (CPS) rate limits.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Outbound Campaign</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/10">
          <Megaphone className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-white">No Active Campaigns</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Launch multi-call re-engagement, appointment setting, or lead qualification batches.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((camp) => (
            <div key={camp.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">{camp.name}</h3>
                    <p className="text-xs text-slate-400">Agent: {camp.voiceAgent?.name || 'Voice Agent'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase ${
                    camp.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    camp.status === 'paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    camp.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>
                    {camp.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Total Recipients</span>
                    <span className="text-white font-medium">{camp.totalRecipients || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span className="text-emerald-400 font-medium">{camp.completedCalls || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pacing</span>
                    <span className="text-slate-200">{camp.callsPerSecond} calls/sec</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                {camp.status === 'draft' && (
                  <button
                    onClick={() => handleDirectLaunch(camp.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" /> Launch
                  </button>
                )}
                {camp.status === 'running' && (
                  <button
                    onClick={() => handlePause(camp.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                )}
                {camp.status === 'paused' && (
                  <button
                    onClick={() => handleResume(camp.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" /> Resume
                  </button>
                )}
                {['running', 'paused'].includes(camp.status) && (
                  <button
                    onClick={() => handleStop(camp.id)}
                    className="py-1.5 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" /> Stop
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Megaphone className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Create Outbound Campaign</h3>
                <p className="text-xs text-slate-400">Automate calling across a list of target phone numbers.</p>
              </div>
            </div>

            <form onSubmit={handleLaunchCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned AI Employee</label>
                <select
                  value={form.voiceAgentId}
                  onChange={(e) => setForm({ ...form, voiceAgentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>{ag.name} ({ag.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Recipient Phone Numbers (One per line, E.164 format)
                </label>
                <textarea
                  rows={4}
                  value={form.phoneNumbersText}
                  onChange={(e) => setForm({ ...form, phoneNumbersText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Max Concurrent Calls</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={form.maxConcurrent}
                    onChange={(e) => setForm({ ...form, maxConcurrent: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Dial Rate (Calls/Sec)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    value={form.callsPerSecond}
                    onChange={(e) => setForm({ ...form, callsPerSecond: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {creating ? 'Launching Batch...' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
