"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, ArrowLeft, Plus, Trash2, PhoneOff, Clock, 
  AlertTriangle, CheckCircle2, RefreshCw, FileText
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  ConfirmModal, 
  UniversalSkeleton 
} from '@workspace/ui';

export default function VoiceCompliancePage() {
  const [dncList, setDncList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('Customer opt-out request');
  const [isAdding, setIsAdding] = useState(false);

  // Deletion modal
  const [dncToDelete, setDncToDelete] = useState<{ id: string; phone: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleConfirmRemove = async () => {
    if (!dncToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/api/v1/voiceforce/dnc/${dncToDelete.id}`);
      toast.success(`Removed ${dncToDelete.phone} from DNC list`);
      setDncToDelete(null);
      fetchDnc();
    } catch (err: any) {
      toast.error('Failed to remove number');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link 
              href="/voiceforce" 
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Back to Voiceforce Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Telephony Compliance & DNC</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pl-9">
            Global TRAI and US TCPA compliance rules, Do-Not-Call (DNC) suppression, and spoken recording disclosures.
          </p>
        </div>

        <button
          onClick={fetchDnc}
          className="p-2.5 rounded-xl bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-800 shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
          title="Refresh DNC List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Compliance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calling Hours Enforcement */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Calling Hours Enforcement</h2>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 uppercase ml-auto">
              Active
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            All outbound calls are strictly gated between <span className="font-bold text-gray-900 dark:text-white">09:00 and 20:00 (8 PM)</span> in the recipient’s local time zone (TRAI India & US TCPA compliant). Calls dispatched outside permissible windows are automatically prevented.
          </p>
        </div>

        {/* AI & Recording Disclosure */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Mandatory Spoken Disclosures</h2>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 uppercase ml-auto">
              Enforced
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Outbound agents automatically prepend mandatory spoken disclosures:
            <span className="block mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 italic text-gray-700 dark:text-gray-300">
              “This is an AI voice assistant from 180workspace. This call is recorded for quality and compliance.”
            </span>
          </p>
        </div>
      </div>

      {/* Do-Not-Call (DNC) Registry */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PhoneOff className="w-5 h-5 text-rose-500" />
              <span>Do-Not-Call (DNC) Suppression List</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 w-44 shadow-sm"
            />
            <input
              type="text"
              placeholder="Opt-out reason..."
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 w-48 shadow-sm"
            />
            <button
              type="submit"
              disabled={isAdding}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Adding...' : 'Add to DNC'}</span>
            </button>
          </form>
        </div>

        {loading ? (
          <div className="p-4">
            <UniversalSkeleton type="table" />
          </div>
        ) : dncList.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Zero Numbers Blocked</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Your Do-Not-Call list is currently empty. Use the quick form above to register customer opt-outs.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200/80 dark:border-gray-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-5">Phone Number</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Date Added</th>
                  <th className="p-3.5 text-right pr-5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {dncList.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-bold text-gray-900 dark:text-white">
                      {item.phoneNumber}
                    </td>
                    <td className="p-3.5 text-gray-600 dark:text-gray-300 font-medium">
                      {item.reason || 'Customer request'}
                    </td>
                    <td className="p-3.5 text-gray-500 dark:text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right pr-5">
                      <button
                        onClick={() => setDncToDelete({ id: item.id, phone: item.phoneNumber })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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

      {/* Remove Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(dncToDelete)}
        onClose={() => setDncToDelete(null)}
        onConfirm={handleConfirmRemove}
        title="Remove Number from DNC Registry"
        message={`Are you sure you want to remove ${dncToDelete?.phone} from the Do-Not-Call suppression list? This number will once again be eligible to receive calls.`}
        confirmText={deleting ? "Removing..." : "Remove from DNC"}
        cancelText="Cancel"
        isDestructive={false}
      />
    </div>
  );
}
