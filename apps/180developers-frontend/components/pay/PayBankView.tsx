'use client';

import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Save,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useProject } from '@/context/ProjectContext';

export function PayBankView() {
  const { projectId, bankDetails } = useProject();

  const [accountHolderName, setAccountHolderName] = useState(bankDetails?.accountHolderName || '');
  const [accountNumber, setAccountNumber] = useState(bankDetails?.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(bankDetails?.ifscCode || '');
  const [upiId, setUpiId] = useState(bankDetails?.upiId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bankDetails) {
      setAccountHolderName(bankDetails.accountHolderName || '');
      setAccountNumber(bankDetails.accountNumber || '');
      setIfscCode(bankDetails.ifscCode || '');
      setUpiId(bankDetails.upiId || '');
    }
  }, [bankDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const apiBase = isLocal ? 'http://localhost:4003' : 'https://services.180workspace.com';

      const res = await fetch(`${apiBase}/api/v1/identity/developer/apps/${projectId}/bank-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim(),
          upiId: upiId.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'Failed to update settlement bank details');
      }

      toast.success('Settlement bank details verified and updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error saving bank details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Landmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Merchant Settlement Bank & UPI Configuration</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Target financial destination for automated batch settlements and on-demand payouts.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Bank Details</span>
          </button>
        </div>

        {/* 2-Way Security Note */}
        <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-xs space-y-1">
          <p className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-500" />
            <span>Penny-Drop Bank Verification</span>
          </p>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Bank account changes undergo automated NPCI IMPS penny-drop verification to ensure the beneficiary name matches your registered identity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Account Holder Legal Name
            </label>
            <input
              type="text"
              required
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="e.g. Acme Tech Private Limited"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Bank Account Number
            </label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 50100412345678"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              IFSC Code
            </label>
            <input
              type="text"
              required
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              placeholder="e.g. HDFC0001234"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Primary Settlement UPI ID (Optional)
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. acme@okaxis"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>
    </form>
  );
}

export default PayBankView;
