"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Megaphone, Phone, Users, User, UploadCloud, Play, Sparkles, 
  CheckCircle2, ArrowRight, Clock, Sliders, FileText, Check
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { UniversalSlideDrawer } from './UniversalSlideDrawer';
import clsx from 'clsx';

export interface CreateCampaignDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  agents?: Array<{ id: string; name: string; role?: string }>;
  numbers?: Array<{ id: string; e164Number: string; friendlyName?: string; provider?: string }>;
  defaultAgentId?: string;
  defaultPhoneId?: string;
  initialMode?: 'bulk' | 'single';
  onSuccess?: () => void;
}

export function CreateCampaignDrawer({
  isOpen,
  onClose,
  agents: propAgents,
  numbers: propNumbers,
  defaultAgentId,
  defaultPhoneId,
  initialMode = 'bulk',
  onSuccess
}: CreateCampaignDrawerProps) {
  const [mode, setMode] = useState<'bulk' | 'single'>(initialMode);
  const [internalAgents, setInternalAgents] = useState<any[]>([]);
  const [internalNumbers, setInternalNumbers] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const agents = propAgents && propAgents.length > 0 ? propAgents : internalAgents;
  const numbers = propNumbers && propNumbers.length > 0 ? propNumbers : internalNumbers;

  // Form State
  const [campaignName, setCampaignName] = useState('Customer Re-engagement Batch');
  const [voiceAgentId, setVoiceAgentId] = useState(defaultAgentId || '');
  const [phoneNumberId, setPhoneNumberId] = useState(defaultPhoneId || '');
  const [maxConcurrent, setMaxConcurrent] = useState(5);
  const [callsPerSecond, setCallsPerSecond] = useState(1.0);

  // Bulk Mode state
  const [phoneNumbersText, setPhoneNumbersText] = useState('');

  // Single Mode state
  const [singlePhone, setSinglePhone] = useState('');
  const [singleContactName, setSingleContactName] = useState('');
  const [singleNotes, setSingleNotes] = useState('');

  // Auto-fetch if not provided
  useEffect(() => {
    if (isOpen) {
      if (initialMode) {
        setMode(initialMode);
      }
      if (!propAgents || propAgents.length === 0) {
        api.get('/api/v1/voiceforce/agents')
          .then(res => setInternalAgents(res.data?.data || []))
          .catch(() => {});
      }
      if (!propNumbers || propNumbers.length === 0) {
        api.get('/api/v1/voiceforce/numbers')
          .then(res => setInternalNumbers(res.data?.data || []))
          .catch(() => {});
      }
    }
  }, [isOpen, initialMode, propAgents, propNumbers]);

  // Set defaults when agents/numbers load or default props change
  useEffect(() => {
    if (defaultAgentId) {
      setVoiceAgentId(defaultAgentId);
    } else if (agents.length > 0 && !voiceAgentId) {
      setVoiceAgentId(agents[0].id);
    }
  }, [defaultAgentId, agents, voiceAgentId]);

  useEffect(() => {
    if (defaultPhoneId) {
      setPhoneNumberId(defaultPhoneId);
    } else if (numbers.length > 0 && !phoneNumberId) {
      setPhoneNumberId(numbers[0].id);
    }
  }, [defaultPhoneId, numbers, phoneNumberId]);

  // Set default campaign name based on mode and agent
  const selectedAgent = agents.find(a => a.id === voiceAgentId);
  useEffect(() => {
    if (mode === 'single') {
      setCampaignName(singlePhone ? `Direct Call: ${singlePhone}` : `Single Outbound Call - ${selectedAgent?.name || 'AI'}`);
    } else {
      if (!campaignName || campaignName.startsWith('Direct Call') || campaignName.startsWith('Single Outbound Call')) {
        setCampaignName(selectedAgent ? `${selectedAgent.name} - Outbound Sprint` : 'Customer Re-engagement Batch');
      }
    }
  }, [mode, singlePhone, selectedAgent?.name]);

  // Bulk number parser
  const parsedBulkPhones = phoneNumbersText
    .split(/[\n,;]+/)
    .map(p => p.trim())
    .filter(p => p.length > 5);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      const extractedPhones: string[] = [];

      for (const line of lines) {
        const match = line.match(/\+?[0-9]{10,15}/);
        if (match) {
          let phone = match[0];
          if (!phone.startsWith('+') && phone.length === 10) {
            phone = `+91${phone}`;
          }
          if (!extractedPhones.includes(phone)) {
            extractedPhones.push(phone);
          }
        }
      }

      if (extractedPhones.length > 0) {
        setPhoneNumbersText(extractedPhones.join('\n'));
        toast.success(`Extracted ${extractedPhones.length} phone numbers from ${file.name}`);
      } else {
        toast.error('No valid phone numbers found in file.');
      }
    };
    reader.readAsText(file);
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!voiceAgentId) {
      toast.error('Please select an AI employee');
      return;
    }

    if (mode === 'bulk') {
      if (parsedBulkPhones.length === 0) {
        toast.error('Please enter at least one valid recipient phone number');
        return;
      }

      try {
        setCreating(true);
        const contactList = parsedBulkPhones.map(p => {
          let num = p;
          if (!num.startsWith('+') && num.length === 10) {
            num = `+91${num}`;
          }
          return { phone: num, name: 'Target Contact' };
        });

        const createRes = await api.post('/api/v1/voiceforce/campaigns', {
          name: campaignName.trim() || 'Outbound Work Sprint',
          voiceAgentId,
          phoneNumberId: phoneNumberId || null,
          contactList,
          maxConcurrent: Number(maxConcurrent) || 5,
          callsPerSecond: Number(callsPerSecond) || 1.0,
          retryCount: 2
        });

        const campaignId = createRes.data?.data?.id;
        if (campaignId) {
          await api.post(`/api/v1/voiceforce/campaigns/${campaignId}/launch`);
          toast.success(`🚀 Dispatched batch of ${contactList.length} calls into BullMQ queue!`);
        }

        onClose();
        if (onSuccess) onSuccess();
      } catch (err: any) {
        toast.error(err.response?.data?.error || err.message || 'Error launching campaign');
      } finally {
        setCreating(false);
      }
    } else {
      // Single Call Mode
      if (!singlePhone.trim()) {
        toast.error('Please enter the recipient phone number');
        return;
      }

      let phone = singlePhone.trim();
      if (!phone.startsWith('+') && phone.length === 10) {
        phone = `+91${phone}`;
      } else if (!phone.startsWith('+')) {
        phone = `+${phone}`;
      }

      try {
        setCreating(true);
        const contactList = [{
          phone,
          name: singleContactName.trim() || 'Direct Contact',
          customFields: singleNotes.trim() ? { notes: singleNotes.trim() } : undefined
        }];

        const createRes = await api.post('/api/v1/voiceforce/campaigns', {
          name: campaignName.trim() || `Direct Call to ${phone}`,
          voiceAgentId,
          phoneNumberId: phoneNumberId || null,
          contactList,
          maxConcurrent: 1,
          callsPerSecond: 1.0,
          retryCount: 1
        });

        const campaignId = createRes.data?.data?.id;
        if (campaignId) {
          await api.post(`/api/v1/voiceforce/campaigns/${campaignId}/launch`);
          toast.success(`📞 Outbound call dispatched to ${phone} via ${selectedAgent?.name || 'AI'}!`);
        }

        setSinglePhone('');
        setSingleContactName('');
        setSingleNotes('');
        onClose();
        if (onSuccess) onSuccess();
      } catch (err: any) {
        toast.error(err.response?.data?.error || err.message || 'Error dispatching call');
      } finally {
        setCreating(false);
      }
    }
  };

  return (
    <UniversalSlideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Outbound Campaign"
      subtitle="Automate telephone calling across target recipient numbers via BullMQ queue."
      icon={Megaphone}
      iconColorClass="text-indigo-600 dark:text-indigo-400"
      iconBgClass="bg-indigo-50 dark:bg-indigo-950/60"
      maxWidthClass="max-w-xl"
      onSubmit={handleLaunch}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating || (mode === 'bulk' && parsedBulkPhones.length === 0) || (mode === 'single' && !singlePhone.trim())}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {creating ? (
              <span>Dispatching...</span>
            ) : mode === 'bulk' ? (
              <>
                <span>Launch Campaign ({parsedBulkPhones.length} Calls)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Dispatch Outbound Call</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* ─── Mode Selector (Pill Tabs) ────────────────────────────────────── */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Dispatch Mode
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={clsx(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer",
                mode === 'bulk'
                  ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Bulk Campaign (Multi-Number)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('single')}
              className={clsx(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer",
                mode === 'single'
                  ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Single Number Call</span>
            </button>
          </div>
        </div>

        {/* Campaign Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            {mode === 'bulk' ? 'Campaign Name' : 'Call Sprint Title'}
          </label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            required
          />
        </div>

        {/* Assigned Employee & Caller ID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Assigned AI Employee
            </label>
            <select
              value={voiceAgentId}
              onChange={(e) => setVoiceAgentId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              required
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} {ag.role ? `(${ag.role})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Outgoing Caller ID Line
            </label>
            <select
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="">Default Telecom DID (+1 SIP Pool)</option>
              {numbers.map((num) => (
                <option key={num.id} value={num.id}>
                  {num.e164Number} {num.friendlyName ? `(${num.friendlyName})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── Mode 1: Bulk Campaign Inputs ─────────────────────────────────── */}
        {mode === 'bulk' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span>Recipient Phone Numbers (E.164 Format)</span>
                  {parsedBulkPhones.length > 0 && (
                    <span className="px-2 py-0.2 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                      {parsedBulkPhones.length} Detected
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload CSV / Excel</span>
                </button>
              </div>

              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv,.txt,.xlsx" 
                onChange={handleFileUpload} 
                className="hidden" 
              />

              <textarea
                rows={5}
                value={phoneNumbersText}
                onChange={(e) => setPhoneNumbersText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="+919876543210&#10;+919812345678&#10;+14155552671"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Supports bulk copy-paste or CSV column upload. Phone numbers are automatically verified against Do-Not-Call (DNC) compliance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Max Concurrent Calls
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={maxConcurrent}
                  onChange={(e) => setMaxConcurrent(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Dial Rate (Calls/Sec)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={callsPerSecond}
                  onChange={(e) => setCallsPerSecond(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Mode 2: Single Number Call Inputs ────────────────────────────── */}
        {mode === 'single' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Target Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={singlePhone}
                  onChange={(e) => setSinglePhone(e.target.value)}
                  placeholder="e.g. +919876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Recipient Name (Optional)
                </label>
                <input
                  type="text"
                  value={singleContactName}
                  onChange={(e) => setSingleContactName(e.target.value)}
                  placeholder="e.g. John Doe / Prospective Lead"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                Custom Context / Call Objective (Optional)
              </label>
              <textarea
                rows={3}
                value={singleNotes}
                onChange={(e) => setSingleNotes(e.target.value)}
                placeholder="e.g. Inquired about car maintenance estimate; offer 10% discount if customer confirms pickup today."
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
              />
            </div>
          </div>
        )}
      </div>
    </UniversalSlideDrawer>
  );
}
