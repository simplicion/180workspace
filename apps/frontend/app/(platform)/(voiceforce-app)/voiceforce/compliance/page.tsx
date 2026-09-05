"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, ArrowLeft, Plus, Trash2, PhoneOff, Clock, 
  AlertTriangle, CheckCircle2, RefreshCw, FileText
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader } from '@workspace/ui';

export default function VoiceCompliancePage() {
  const [dncList, setDncList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('Customer opt-out request');
  const [isAdding, setIsAdding] = useState(false);

  const fetchDnc = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/voiceforce/dnc');
      setDncList(res.data?.data || []);
    } catch (err: any) {
      toast.error('Failed to load DNC registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDnc();
  }, []);

  const handleAddDnc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    try {
      setIsAdding(true);
      const res = await api.post('/api/v1/voiceforce/dnc', {
        phoneNumber: newPhone.trim(),
        reason: newReason.trim()
      });

      if (res.data?.success) {
        toast.success(`Added ${newPhone} to Do-Not-Call list`);
        setNewPhone('');
        fetchDnc();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add number');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDnc = async (id: string, phone: string) => {
    if (!confirm(`Are you sure you want to remove ${phone} from the Do-Not-Call list?`)) return;

    try {
      await api.delete(`/api/v1/voiceforce/dnc/${id}`);
      toast.success(`Removed ${phone} from DNC list`);
      fetchDnc();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove number');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/voiceforce" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white tracking-tight">Telephony Compliance & DNC</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Global TRAI and US TCPA compliance rules, Do-Not-Call (DNC) suppression, and spoken recording disclosures.
          </p>
        </div>

        <button
          onClick={fetchDnc}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors self-start sm:self-auto cursor-pointer"
          title="Refresh DNC List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Compliance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Calling Hours Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-indigo-900/20 border border-indigo-500/20 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Calling Hours Enforcement</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase ml-auto">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All outbound calls are strictly gated between <span className="font-semibold text-white">09:00 and 20:00 (8 PM)</span> in the recipient’s local time zone (TRAI India & US TCPA compliant). Calls dispatched outside permissible windows are automatically prevented.
          </p>
        </div>

        {/* AI & Recording Disclosure */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-purple-900/20 border border-purple-500/20 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Mandatory Spoken Disclosures</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase ml-auto">
              Enforced
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Outbound agents automatically prepend mandatory spoken disclosures:
            <span className="block mt-1 italic text-purple-200">
              “This is an AI voice assistant from 180workspace. This call is recorded for quality and compliance.”
            </span>
          </p>
        </div>
      </div>

      {/* Do-Not-Call (DNC) Registry */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PhoneOff className="w-5 h-5 text-rose-400" />
              <span>Do-Not-Call (DNC) Suppression List</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Phone numbers listed here will be blocked instantly from receiving any manual or campaign calls.
            </p>
          </div>

          {/* Add to DNC Form */}
          <form onSubmit={handleAddDnc} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="+91 98765 43210"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500 w-40"
            />
            <input
              type="text"
              placeholder="Opt-out reason..."
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500 w-44"
            />
            <button
              type="submit"
              disabled={isAdding}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to DNC</span>
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <LogoLoader className="w-6 h-6 animate-spin text-rose-500" />
          </div>
        ) : dncList.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white/5 border border-white/10 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-70" />
            <h3 className="text-sm font-semibold text-white">Zero Numbers Blocked</h3>
            <p className="text-xs text-slate-400 mt-1">
              Your Do-Not-Call list is currently empty. Use the form above to add customer opt-outs.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400 font-semibold border-b border-white/10">
                <tr>
                  <th className="p-3 pl-4">Phone Number</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Date Added</th>
                  <th className="p-3 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {dncList.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 pl-4 font-mono font-semibold text-white">
                      {item.phoneNumber}
                    </td>
                    <td className="p-3 text-slate-300">
                      {item.reason || 'Customer request'}
                    </td>
                    <td className="p-3 text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right pr-4">
                      <button
                        onClick={() => handleRemoveDnc(item.id, item.phoneNumber)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove from DNC"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
