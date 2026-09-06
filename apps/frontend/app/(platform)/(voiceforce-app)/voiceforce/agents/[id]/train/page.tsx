"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  Sparkles, Bot, ArrowLeft, CheckCircle2, AlertTriangle, ArrowRight,
  Clock, DollarSign, MapPin, Sliders, ShieldCheck, RefreshCw, Wand2,
  FileText, History
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function NaturalLanguageTrainPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<any>(null);
  const [description, setDescription] = useState('');
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [rollingBackVersion, setRollingBackVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVersions = async () => {
    try {
      const res = await api.get(`/api/v1/voiceforce/agents/${agentId}/versions`);
      setVersions(res.data?.versions || []);
    } catch {}
  };

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        setLoading(true);
        const [agentsRes, versionsRes] = await Promise.all([
          api.get('/api/v1/voiceforce/agents'),
          api.get(`/api/v1/voiceforce/agents/${agentId}/versions`).catch(() => ({ data: { versions: [] } }))
        ]);
        const list = agentsRes.data?.data || [];
        const found = list.find((a: any) => a.id === agentId);
        setAgent(found || null);
        setVersions(versionsRes.data?.versions || []);
      } catch {
        toast.error('Failed to load agent');
      } finally {
        setLoading(false);
      }
    };
    if (agentId) fetchAgent();
  }, [agentId]);

  const handleRollback = async (versionNumber: number) => {
    try {
      setRollingBackVersion(versionNumber);
      await api.post(`/api/v1/voiceforce/agents/${agentId}/versions/${versionNumber}/rollback`);
      toast.success(`Successfully restored agent configuration to version v${versionNumber}!`);
      fetchVersions();
      // Reload agent
      const res = await api.get('/api/v1/voiceforce/agents');
      const list = res.data?.data || [];
      const found = list.find((a: any) => a.id === agentId);
      setAgent(found || null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to rollback version');
    } finally {
      setRollingBackVersion(null);
    }
  };

  const handleParse = async () => {
    if (!description.trim()) {
      toast.error('Please type or speak your business description');
      return;
    }

    try {
      setParsing(true);
      setDraft(null);
      setConflicts([]);

      const res = await api.post(`/api/v1/voiceforce/agents/${agentId}/train/natural-language`, {
        description
      });

      if (res.data?.draft) {
        setDraft(res.data.draft);
        setConflicts(res.data.conflicts || []);
        toast.success('Extracted business rules successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to extract rules');
    } finally {
      setParsing(false);
    }
  };

  const handleApply = async () => {
    if (!draft) return;

    try {
      setApplying(true);
      const res = await api.post(`/api/v1/voiceforce/agents/${agentId}/train/apply`, {
        draft
      });

      toast.success(`Training applied! Created snapshot v${res.data.versionNumber}.`);
      router.push('/voiceforce/agents');
    } catch (err: any) {
      toast.error('Failed to apply training draft');
    } finally {
      setApplying(false);
    }
  };

  const fillExample = (type: 'restaurant' | 'clinic') => {
    if (type === 'restaurant') {
      setDescription(
        "We are an authentic Italian pizzeria in Kathmandu open Monday to Sunday from 10:00 AM to 10:00 PM. We deliver within 6 km. Our large pizza is Rs. 1,200 and pasta is Rs. 650. We don't deliver after 9:30 PM. If an order is above Rs. 5,000, transfer to the manager. Maximum discount we can offer is 10%."
      );
    } else {
      setDescription(
        "We are a modern dental clinic open Monday to Friday 9 AM to 6 PM. Standard cleaning is $95 and whitening consultation is $150. Same-day appointments require at least 2 hours advance notice. If a patient is in severe pain, transfer to the on-call dentist immediately."
      );
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/voiceforce/agents" className="text-xs font-semibold text-gray-500 hover:text-indigo-600 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to AI Employees
            </Link>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            Train {agent?.name || 'AI Employee'} in Natural Language
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Explain how your business operates in casual sentences. The AI automatically configures operating hours, catalog pricing, delivery limits, and escalation rules.
          </p>
        </div>
      </div>

      {/* Input Console */}
      <div className="p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Describe Your Business, Offerings & Rules</span>
          </label>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span>Try example:</span>
            <button
              onClick={() => fillExample('restaurant')}
              className="text-indigo-600 hover:underline cursor-pointer font-bold"
            >
              Restaurant
            </button>
            <span>•</span>
            <button
              onClick={() => fillExample('clinic')}
              className="text-indigo-600 hover:underline cursor-pointer font-bold"
            >
              Dental Clinic
            </button>
          </div>
        </div>

        <textarea
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. We are a boutique dental clinic in downtown. Open Mon-Fri 9 AM to 6 PM. Routine cleanings are $120. We require 2 hours notice for bookings. If a customer is in severe pain, transfer immediately to the manager..."
          className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
        />

        <div className="flex justify-end">
          <button
            onClick={handleParse}
            disabled={parsing || !description.trim()}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{parsing ? 'Extracting Business Rules...' : 'Extract & Parse Rules'}</span>
          </button>
        </div>
      </div>

      {/* Extracted Rules Staging Card */}
      {draft && (
        <div className="p-8 rounded-3xl bg-white dark:bg-gray-900 border border-indigo-500/40 shadow-xl space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Extracted Operational Blueprint
                </h3>
                <p className="text-xs text-gray-500">Review structured rules before publishing to live AI employee</p>
              </div>
            </div>
            <button
              onClick={handleApply}
              disabled={applying}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{applying ? 'Deploying...' : 'Approve & Deploy to Live AI'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Conflict Alert if any */}
          {conflicts.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Training Updates to Existing Configuration</span>
              </div>
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs text-amber-800 dark:text-amber-300 ml-6">
                  • {c.explanation}
                </p>
              ))}
            </div>
          )}

          {/* Structured Data Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Hours & Boundaries */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60 space-y-3">
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Operating Schedule & Radius</span>
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Schedule:</strong> {draft.operatingHours?.mon ? `${draft.operatingHours.mon.open} - ${draft.operatingHours.mon.close}` : 'Standard Hours'}
              </p>
              {draft.deliveryRadiusKm && (
                <p className="text-gray-600 dark:text-gray-300">
                  <strong>Delivery Boundary:</strong> Within {draft.deliveryRadiusKm} km
                </p>
              )}
            </div>

            {/* Guardrails */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60 space-y-3">
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Safety Guardrails</span>
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Max Discount Cap:</strong> {draft.guardrails?.maxDiscountPercent}%
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Order Approval Limit:</strong> ${draft.guardrails?.maxOrderValue}
              </p>
            </div>

            {/* Extracted Catalog */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60 space-y-2 md:col-span-2">
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-500" />
                <span>Extracted Offerings & Pricing</span>
              </h4>
              <div className="flex flex-wrap gap-2 pt-1">
                {(draft.catalogItems || []).map((item: any, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 font-medium">
                    {item.name}: <strong>${item.price}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Suggested Spoken Greeting */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 space-y-1.5 md:col-span-2">
              <h4 className="font-bold text-indigo-900 dark:text-indigo-200">
                Suggested Phone Greeting:
              </h4>
              <p className="text-indigo-800 dark:text-indigo-300 italic">
                &ldquo;{draft.suggestedGreeting}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Immutable Version History & 1-Click Rollback */}
      <div className="p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/60 dark:border-purple-800/60">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Version History & 1-Click Rollback
              </h3>
              <p className="text-xs text-gray-500">Immutable configuration snapshots saved on every training approval</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {versions.length} Snapshots
          </span>
        </div>

        {versions.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No previous snapshots recorded. Every approved training session creates an immutable historical version here.
          </p>
        ) : (
          <div className="space-y-2.5">
            {versions.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black">
                      v{v.versionNumber}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {v.changelog || 'Configuration snapshot'}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    Saved on {new Date(v.createdAt).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => handleRollback(v.versionNumber)}
                  disabled={rollingBackVersion === v.versionNumber}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 font-bold text-xs shadow-xs transition-all cursor-pointer flex-shrink-0 disabled:opacity-50"
                >
                  {rollingBackVersion === v.versionNumber ? 'Restoring...' : `Restore v${v.versionNumber}`}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

