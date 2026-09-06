"use client";

import { useState, useEffect } from 'react';
import { 
  PhoneForwarded, Plus, Trash2, ArrowUpDown, Clock, 
  ShieldAlert, Bot, Smartphone, Check, Sparkles, Sliders,
  Mail, Headphones
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { UniversalSlideDrawer } from './UniversalSlideDrawer';

export interface ForwardingDestinationInput {
  type: 'phone' | 'agent';
  targetId?: string;
  e164?: string;
  name?: string;
  priority: number;
  timeoutSec?: number;
}

interface ForwardingRuleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ruleToEdit?: any | null;
  phoneNumbers: any[];
  agents: any[];
  queues?: any[];
}

export function ForwardingRuleDrawer({
  isOpen,
  onClose,
  onSuccess,
  ruleToEdit,
  phoneNumbers,
  agents,
  queues = []
}: ForwardingRuleDrawerProps) {
  const [name, setName] = useState('Main Inbound Cascade');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [strategy, setStrategy] = useState<'sequential' | 'simultaneous' | 'round_robin' | 'queue_first'>('sequential');
  const [ringTimeoutSec, setRingTimeoutSec] = useState(20);
  const [destinations, setDestinations] = useState<ForwardingDestinationInput[]>([
    { type: 'agent', targetId: '', name: 'Primary AI Employee', priority: 1, timeoutSec: 20 },
    { type: 'phone', e164: '', name: 'Sales Representative', priority: 2, timeoutSec: 25 }
  ]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [businessHours, setBusinessHours] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({
    mon: { enabled: true, start: '09:00', end: '18:00' },
    tue: { enabled: true, start: '09:00', end: '18:00' },
    wed: { enabled: true, start: '09:00', end: '18:00' },
    thu: { enabled: true, start: '09:00', end: '18:00' },
    fri: { enabled: true, start: '09:00', end: '18:00' },
    sat: { enabled: false, start: '10:00', end: '16:00' },
    sun: { enabled: false, start: '10:00', end: '16:00' }
  });
  const [fallbackType, setFallbackType] = useState('ai_agent');
  const [fallbackAgentId, setFallbackAgentId] = useState('');
  const [fallbackVoicemailEmail, setFallbackVoicemailEmail] = useState('');
  const [fallbackQueueId, setFallbackQueueId] = useState('');
  const [maxHops, setMaxHops] = useState(4);
  const [whisperAnnouncement, setWhisperAnnouncement] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ruleToEdit) {
      setName(ruleToEdit.name || '');
      setPhoneNumberId(ruleToEdit.phoneNumberId || '');
      setStrategy(ruleToEdit.strategy || 'sequential');
      setRingTimeoutSec(ruleToEdit.ringTimeoutSec || 20);
      setDestinations(Array.isArray(ruleToEdit.destinations) ? ruleToEdit.destinations : []);
      setScheduleEnabled(Boolean(ruleToEdit.scheduleEnabled));
      setTimezone(ruleToEdit.timezone || 'Asia/Kolkata');
      if (ruleToEdit.businessHours && typeof ruleToEdit.businessHours === 'object') {
        setBusinessHours(ruleToEdit.businessHours);
      }
      setFallbackType(ruleToEdit.fallbackType || 'ai_agent');
      setFallbackAgentId(ruleToEdit.fallbackAgentId || '');
      setFallbackVoicemailEmail(ruleToEdit.fallbackVoicemailEmail || '');
      setFallbackQueueId(ruleToEdit.fallbackQueueId || (queues.length > 0 ? queues[0].id : ''));
      setMaxHops(ruleToEdit.maxHops || 4);
      setWhisperAnnouncement(ruleToEdit.whisperAnnouncement || '');
    } else {
      setName('Main Inbound Cascade');
      if (phoneNumbers.length > 0) setPhoneNumberId(phoneNumbers[0].id);
      if (agents.length > 0) {
        setDestinations([
          { type: 'agent', targetId: agents[0].id, name: agents[0].name, priority: 1, timeoutSec: 20 },
          { type: 'phone', e164: '', name: 'Human Sales Rep', priority: 2, timeoutSec: 25 }
        ]);
        setFallbackAgentId(agents[0].id);
      }
      setFallbackVoicemailEmail('');
      setFallbackQueueId(queues.length > 0 ? queues[0].id : '');
      setMaxHops(4);
    }
  }, [ruleToEdit, phoneNumbers, agents, queues, isOpen]);

  const handleAddDestination = () => {
    const nextPriority = destinations.length + 1;
    setDestinations([
      ...destinations,
      {
        type: 'phone',
        e164: '',
        name: `Destination #${nextPriority}`,
        priority: nextPriority,
        timeoutSec: 20
      }
    ]);
  };

  const handleRemoveDestination = (index: number) => {
    const updated = destinations.filter((_, idx) => idx !== index).map((d, i) => ({
      ...d,
      priority: i + 1
    }));
    setDestinations(updated);
  };

  const handleUpdateDestination = (index: number, updates: Partial<ForwardingDestinationInput>) => {
    const updated = [...destinations];
    updated[index] = { ...updated[index], ...updates };
    setDestinations(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phoneNumberId) {
      toast.error('Rule name and inbound phone number are required');
      return;
    }

    if (destinations.length === 0) {
      toast.error('Add at least one forwarding destination');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name,
        phoneNumberId,
        strategy,
        ringTimeoutSec: Number(ringTimeoutSec),
        destinations,
        scheduleEnabled,
        timezone,
        businessHours: scheduleEnabled ? businessHours : null,
        fallbackType,
        fallbackAgentId: fallbackType === 'ai_agent' ? fallbackAgentId : null,
        fallbackVoicemailEmail: fallbackType === 'voicemail' ? (fallbackVoicemailEmail.trim() || null) : null,
        fallbackQueueId: fallbackType === 'queue' ? (fallbackQueueId || null) : null,
        maxHops: Number(maxHops) || 4,
        whisperAnnouncement: whisperAnnouncement.trim() || null
      };

      if (ruleToEdit?.id) {
        await api.put(`/api/v1/voiceforce/forwarding/${ruleToEdit.id}`, payload);
        toast.success('Forwarding rule updated successfully!');
      } else {
        await api.post('/api/v1/voiceforce/forwarding', payload);
        toast.success('Forwarding rule created and live!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save forwarding rule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UniversalSlideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={ruleToEdit ? "Edit Call Forwarding Rule" : "Create Call Forwarding Rule"}
      subtitle="Configure cascading waterfalls, simultaneous blasts, or round-robin call routing."
      icon={PhoneForwarded}
      iconColorClass="text-indigo-600 dark:text-indigo-400"
      iconBgClass="bg-indigo-50 dark:bg-indigo-950/60"
      maxWidthClass="max-w-2xl"
      onSubmit={handleSubmit}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {submitting ? 'Saving Rule...' : ruleToEdit ? 'Update Rule' : 'Activate Forwarding Rule'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Basic Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Rule Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Agency Sales Cascade"
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Inbound Advertised Number
            </label>
            <select
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              required
            >
              <option value="">Select Inbound Number</option>
              {phoneNumbers.map((num) => (
                <option key={num.id} value={num.id}>
                  {num.e164Number} ({num.friendlyName || 'Active Line'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ring Strategy Selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Ringing & Distribution Strategy
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { id: 'sequential', title: '🌊 Waterfall / Cascading', desc: 'Rings Line 1; if busy or no answer, forwards to Line 2, then Line 3.' },
              { id: 'simultaneous', title: '📢 Simultaneous Blast', desc: 'Rings all numbers at the same time. First person to answer wins the call.' },
              { id: 'round_robin', title: '🔄 Round-Robin Share', desc: 'Cycles incoming calls evenly across sales reps to balance workload.' },
              { id: 'queue_first', title: '⏳ Queue & Hold Room', desc: 'Holds callers in FIFO order with soothing music until an agent is free.' }
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStrategy(st.id as any)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  strategy === st.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'bg-gray-50/70 dark:bg-gray-800/60 border-gray-200 dark:border-gray-750 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750'
                }`}
              >
                <div className="text-xs font-bold">{st.title}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{st.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Forwarding Destinations Builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Forwarding Destinations ({destinations.length})
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Calls will cascade in order of priority (Hop 1 ➔ Hop 2 ➔ Hop 3).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddDestination}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Target
            </button>
          </div>

          <div className="space-y-2.5">
            {destinations.map((dest, idx) => (
              <div 
                key={idx}
                className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <select
                    value={dest.type}
                    onChange={(e) => handleUpdateDestination(idx, { type: e.target.value as any })}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white cursor-pointer"
                  >
                    <option value="phone">📱 Mobile / PSTN</option>
                    <option value="agent">🤖 AI Employee</option>
                  </select>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dest.type === 'agent' ? (
                    <select
                      value={dest.targetId || ''}
                      onChange={(e) => {
                        const ag = agents.find(a => a.id === e.target.value);
                        handleUpdateDestination(idx, { targetId: e.target.value, name: ag ? ag.name : 'AI Agent' });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                    >
                      <option value="">Select AI Employee</option>
                      {agents.map(ag => (
                        <option key={ag.id} value={ag.id}>{ag.name} ({ag.role})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="E.164 (e.g. +919876543210)"
                      value={dest.e164 || ''}
                      onChange={(e) => handleUpdateDestination(idx, { e164: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                    />
                  )}

                  <input
                    type="text"
                    placeholder="Label (e.g. Rajesh Sales)"
                    value={dest.name || ''}
                    onChange={(e) => handleUpdateDestination(idx, { name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>Ring</span>
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={dest.timeoutSec || ringTimeoutSec}
                      onChange={(e) => handleUpdateDestination(idx, { timeoutSec: Number(e.target.value) })}
                      className="w-12 px-1.5 py-1 text-center rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                    />
                    <span>s</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveDestination(idx)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove destination"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Telecom Circular Loop Prevention & Max Hops Guard */}
        <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  Telecom Loop Prevention (Max Hops)
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Caps sequential cascade hops to prevent circular forwarding loops between lines.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 font-mono">
              {maxHops} Hops Limit
            </span>
          </div>

          <div className="pt-1 flex items-center gap-3">
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={maxHops}
              onChange={(e) => setMaxHops(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300 w-12 text-right">
              {maxHops} hops
            </span>
          </div>
        </div>

        {/* Business Hours & Scheduling Matrix */}
        <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  Operating Hours & Schedule Enforcement
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Direct after-hours callers immediately to voicemail without ringing staff.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {scheduleEnabled && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">Timezone</span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="UTC">UTC Universal</option>
                </select>
              </div>

              {/* Day-by-Day Schedule Grid */}
              <div className="space-y-1.5 pt-1">
                {[
                  { key: 'mon', label: 'Monday' },
                  { key: 'tue', label: 'Tuesday' },
                  { key: 'wed', label: 'Wednesday' },
                  { key: 'thu', label: 'Thursday' },
                  { key: 'fri', label: 'Friday' },
                  { key: 'sat', label: 'Saturday' },
                  { key: 'sun', label: 'Sunday' }
                ].map((d) => {
                  const dayCfg = businessHours[d.key] || { enabled: false, start: '09:00', end: '18:00' };
                  return (
                    <div key={d.key} className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/60 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer w-28">
                        <input
                          type="checkbox"
                          checked={dayCfg.enabled}
                          onChange={(e) => {
                            setBusinessHours({
                              ...businessHours,
                              [d.key]: { ...dayCfg, enabled: e.target.checked }
                            });
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={`font-medium ${dayCfg.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                          {d.label}
                        </span>
                      </label>

                      {dayCfg.enabled ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={dayCfg.start}
                            onChange={(e) => {
                              setBusinessHours({
                                ...businessHours,
                                [d.key]: { ...dayCfg, start: e.target.value }
                              });
                            }}
                            className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                          />
                          <span className="text-gray-400">to</span>
                          <input
                            type="time"
                            value={dayCfg.end}
                            onChange={(e) => {
                              setBusinessHours({
                                ...businessHours,
                                [d.key]: { ...dayCfg, end: e.target.value }
                              });
                            }}
                            className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Closed (Routes to Fallback)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Fallback Action when All Destinations Busy */}
        <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white">
            Fallback Action (When all destinations are busy or unreachable)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Action Type
              </label>
              <select
                value={fallbackType}
                onChange={(e) => setFallbackType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="ai_agent">🤖 Deflect to Fallback AI Employee</option>
                <option value="queue">⏳ Put in Active Hold Queue</option>
                <option value="voicemail">📼 Record Smart AI Voicemail</option>
                <option value="hangup">❌ Disconnect Call</option>
              </select>
            </div>

            {fallbackType === 'ai_agent' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Fallback AI Employee</span>
                </label>
                <select
                  value={fallbackAgentId}
                  onChange={(e) => setFallbackAgentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="">Select AI Employee</option>
                  {agents.map(ag => (
                    <option key={ag.id} value={ag.id}>{ag.name} ({ag.role})</option>
                  ))}
                </select>
              </div>
            )}

            {fallbackType === 'voicemail' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Voicemail Notification Email</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. notifications@company.com"
                  value={fallbackVoicemailEmail}
                  onChange={(e) => setFallbackVoicemailEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                />
                <p className="text-[10px] text-gray-500 mt-1">Audio recordings and AI transcriptions will be dispatched here.</p>
              </div>
            )}

            {fallbackType === 'queue' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-amber-500" />
                  <span>Active Hold Room Queue</span>
                </label>
                <select
                  value={fallbackQueueId}
                  onChange={(e) => setFallbackQueueId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="">Select Hold Queue</option>
                  {queues.map(q => (
                    <option key={q.id} value={q.id}>{q.name} (Max {q.maxQueueSize} callers)</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Whisper Announcement (Optional) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Whisper Call Screening (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Incoming business call from advertising campaign."
            value={whisperAnnouncement}
            onChange={(e) => setWhisperAnnouncement(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            This brief audio is spoken only to your sales rep before bridging the customer, preventing personal voicemails from picking up.
          </p>
        </div>
      </div>
    </UniversalSlideDrawer>
  );
}
