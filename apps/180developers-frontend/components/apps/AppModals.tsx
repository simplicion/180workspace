'use client';

import React from 'react';
import {
  RotateCw,
  Copy,
  Check,
  AlertCircle,
  CreditCard,
  Landmark,
  Receipt,
  Shield,
} from 'lucide-react';
import { Button, PlatformModal, LogoLoader } from '@workspace/ui';
import { DeveloperAppDetail } from './types';

export interface AppModalsProps {
  app: DeveloperAppDetail;
  // Rotate modal
  showRotateModal: boolean;
  setShowRotateModal: (val: boolean) => void;
  isRotating: boolean;
  handleRotateSecret: () => void;
  newSecretRevealed: string | null;
  setNewSecretRevealed: (val: string | null) => void;
  secretCopied: boolean;
  setSecretCopied: (val: boolean) => void;
  hasAcknowledgedSecret: boolean;
  setHasAcknowledgedSecret: (val: boolean) => void;
  copyToClipboard: (text: string, key: string) => void;

  // Delete modal
  showDeleteModal: boolean;
  setShowDeleteModal: (val: boolean) => void;
  deleteConfirmText: string;
  setDeleteConfirmText: (val: string) => void;
  handleDeleteApp: () => void;
  isDeleting: boolean;

  // Payout request modal
  showPayoutModal: boolean;
  setShowPayoutModal: (val: boolean) => void;
  payoutBalance: number;
  payoutAmount: string;
  setPayoutAmount: (val: string) => void;
  payoutMethod: 'UPI' | 'BANK_TRANSFER';
  setPayoutMethod: (val: 'UPI' | 'BANK_TRANSFER') => void;
  upiId: string;
  setUpiId: (val: string) => void;
  bankAccNumber: string;
  setBankAccNumber: (val: string) => void;
  bankIfsc: string;
  setBankIfsc: (val: string) => void;
  bankHolder: string;
  setBankHolder: (val: string) => void;
  handleRequestPayout: (e: React.FormEvent) => void;
  isRequestingPayout: boolean;

  // Bank setup modal
  showBankModal: boolean;
  setShowBankModal: (val: boolean) => void;
  handleSaveBankDetails: (e: React.FormEvent) => void;
  savingBank: boolean;

  // Transaction receipt modal
  selectedTx: any;
  setSelectedTx: (tx: any) => void;
  copiedKey: string | null;

  // Admin payout review modal
  showAdminPayoutModal: boolean;
  setShowAdminPayoutModal: (val: boolean) => void;
  adminPayouts: any[];
  loadingAdminPayouts: boolean;
  updatingPayoutId: string | null;
  payoutTxRef: string;
  setPayoutTxRef: (val: string) => void;
  payoutAdminNote: string;
  setPayoutAdminNote: (val: string) => void;
  handleUpdateAdminPayoutStatus: (id: string, status: 'PAID' | 'REJECTED') => void;
}

export function AppModals({
  app,
  showRotateModal,
  setShowRotateModal,
  isRotating,
  handleRotateSecret,
  newSecretRevealed,
  setNewSecretRevealed,
  secretCopied,
  setSecretCopied,
  hasAcknowledgedSecret,
  setHasAcknowledgedSecret,
  copyToClipboard,

  showDeleteModal,
  setShowDeleteModal,
  deleteConfirmText,
  setDeleteConfirmText,
  handleDeleteApp,
  isDeleting,

  showPayoutModal,
  setShowPayoutModal,
  payoutBalance,
  payoutAmount,
  setPayoutAmount,
  payoutMethod,
  setPayoutMethod,
  upiId,
  setUpiId,
  bankAccNumber,
  setBankAccNumber,
  bankIfsc,
  setBankIfsc,
  bankHolder,
  setBankHolder,
  handleRequestPayout,
  isRequestingPayout,

  showBankModal,
  setShowBankModal,
  handleSaveBankDetails,
  savingBank,

  selectedTx,
  setSelectedTx,
  copiedKey,

  showAdminPayoutModal,
  setShowAdminPayoutModal,
  adminPayouts,
  loadingAdminPayouts,
  updatingPayoutId,
  payoutTxRef,
  setPayoutTxRef,
  payoutAdminNote,
  setPayoutAdminNote,
  handleUpdateAdminPayoutStatus,
}: AppModalsProps) {
  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: SECRET ROTATION
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showRotateModal}
        onClose={() => setShowRotateModal(false)}
        title="Rotate Client Secret"
        icon={RotateCw}
        iconBgClass="bg-amber-500/10"
        iconColorClass="text-amber-600 dark:text-amber-400"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4 text-zinc-900 dark:text-white">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Rotating your Client Secret will immediately issue a new secret. To prevent downtime, previous secrets have a 24-hour grace window.
          </p>

          {newSecretRevealed ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-emerald-600 dark:text-emerald-400 break-all select-all">
                {newSecretRevealed}
              </div>
              <Button
                onClick={() => {
                  copyToClipboard(newSecretRevealed, 'newSecret');
                  setSecretCopied(true);
                }}
                className="w-full py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                {secretCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{secretCopied ? 'Copied to Clipboard!' : 'Copy New Secret'}</span>
              </Button>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ack-rot"
                  checked={hasAcknowledgedSecret}
                  onChange={(e) => setHasAcknowledgedSecret(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <label htmlFor="ack-rot" className="text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer">
                  I have copied and safely stored this new secret.
                </label>
              </div>
              <Button
                disabled={!hasAcknowledgedSecret}
                onClick={() => {
                  setShowRotateModal(false);
                  setNewSecretRevealed(null);
                }}
                className="w-full py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowRotateModal(false)}
                className="px-4 py-2 min-h-[44px] text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRotateSecret}
                disabled={isRotating}
                className="px-4 py-2 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg cursor-pointer flex items-center gap-2"
              >
                {isRotating ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : <RotateCw className="w-4 h-4" />}
                <span>Confirm Rotation</span>
              </Button>
            </div>
          )}
        </div>
      </PlatformModal>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: DELETE APPLICATION
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Deletion"
        icon={AlertCircle}
        iconBgClass="bg-red-500/10"
        iconColorClass="text-red-600 dark:text-red-400"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4 text-zinc-900 dark:text-white">
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            To delete this application permanently, type its exact name <strong className="text-zinc-950 dark:text-white">{app.name}</strong> below:
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-red-500 transition-colors"
            placeholder="Type app name to confirm"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 min-h-[44px] text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
            >
              Cancel
            </Button>
            <button
              onClick={handleDeleteApp}
              disabled={deleteConfirmText !== app.name || isDeleting}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer transition-colors flex items-center gap-2"
            >
              {isDeleting ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : null}
              <span>Delete Forever</span>
            </button>
          </div>
        </div>
      </PlatformModal>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: PAYOUT REQUEST
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        title="Request Revenue Payout"
        icon={CreditCard}
        iconBgClass="bg-purple-500/10"
        iconColorClass="text-purple-600 dark:text-purple-400"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleRequestPayout} className="space-y-4 text-zinc-900 dark:text-white">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Available to withdraw: <strong className="text-emerald-500">₹{payoutBalance.toFixed(2)}</strong>
          </p>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
              Withdrawal Amount (INR)
            </label>
            <input
              type="number"
              min="100"
              max={payoutBalance}
              placeholder="Enter amount (min ₹100)"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
              Payout Method
            </label>
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
            >
              <option value="UPI">UPI ID (Instant Transfer)</option>
              <option value="BANK_TRANSFER">Bank Account (NEFT/IMPS)</option>
            </select>
          </div>

          {payoutMethod === 'UPI' ? (
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                UPI ID
              </label>
              <input
                type="text"
                placeholder="username@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  placeholder="Full Name as per Bank"
                  value={bankHolder}
                  onChange={(e) => setBankHolder(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  Account Number
                </label>
                <input
                  type="text"
                  placeholder="Bank Account Number"
                  value={bankAccNumber}
                  onChange={(e) => setBankAccNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="HDFC0001234"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setShowPayoutModal(false)}
              className="px-4 py-2 min-h-[44px] text-xs text-zinc-600 dark:text-zinc-300"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isRequestingPayout}
              className="px-5 py-2 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition-colors shadow-md flex items-center gap-2"
            >
              {isRequestingPayout ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : null}
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </PlatformModal>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: BANK SETTLEMENT SETUP
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        title="Settlement Bank Information"
        icon={Landmark}
        iconBgClass="bg-purple-500/10"
        iconColorClass="text-purple-600 dark:text-purple-400"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveBankDetails} className="space-y-4 text-zinc-900 dark:text-white">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Configure your registered bank account or UPI ID to receive automatic & manual revenue withdrawals.
          </p>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
              Account Holder Full Name *
            </label>
            <input
              type="text"
              placeholder="Full Name as per Bank"
              value={bankHolder}
              onChange={(e) => setBankHolder(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                Bank Account Number
              </label>
              <input
                type="text"
                placeholder="000123456789"
                value={bankAccNumber}
                onChange={(e) => setBankAccNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="HDFC0001234"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white uppercase focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
              UPI ID (Optional for Instant Payouts)
            </label>
            <input
              type="text"
              placeholder="developer@okhdfcbank"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setShowBankModal(false)}
              className="px-4 py-2 min-h-[44px] text-xs text-zinc-600 dark:text-zinc-300"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={savingBank}
              className="px-5 py-2 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition-colors shadow-md flex items-center gap-2"
            >
              {savingBank ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : null}
              <span>Save Settlement Account</span>
            </button>
          </div>
        </form>
      </PlatformModal>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: TRANSACTION RECEIPT & AUDIT
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        title="Transaction Receipt & Audit"
        icon={Receipt}
        iconBgClass="bg-emerald-500/10"
        iconColorClass="text-emerald-600 dark:text-emerald-400"
        maxWidthClass="max-w-lg"
      >
        {selectedTx && (
          <div className="space-y-4 text-zinc-900 dark:text-white">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/5">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Session Title</span>
                  <div className="font-bold text-sm text-zinc-950 dark:text-white">{selectedTx.title || '180 Pay Checkout'}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Amount</span>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{selectedTx.amount?.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block">Status</span>
                  <span
                    className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold ${
                      selectedTx.status === 'CAPTURED'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : selectedTx.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {selectedTx.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block">Timestamp</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {new Date(selectedTx.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-1 text-xs">
                <span className="text-[10px] text-zinc-400 block">Transaction Session ID</span>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                  <span className="truncate flex-1">{selectedTx.id}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedTx.id, 'receipt_id')}
                    className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                  >
                    {copiedKey === 'receipt_id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {selectedTx.customer && (
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 space-y-1 text-xs">
                  <span className="text-[10px] text-zinc-400 font-semibold block">Customer Details</span>
                  <div className="font-medium text-zinc-900 dark:text-white">{selectedTx.customer.name}</div>
                  <div className="text-[11px] font-mono text-zinc-500">{selectedTx.customer.email}</div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 min-h-[44px] text-xs text-zinc-600 dark:text-zinc-300"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </PlatformModal>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRALIZED MODAL: ADMIN SETTLEMENT REVIEW CONSOLE
          ───────────────────────────────────────────────────────────────────────────── */}
      <PlatformModal
        isOpen={showAdminPayoutModal}
        onClose={() => setShowAdminPayoutModal(false)}
        title="Admin Settlement & Payout Management"
        icon={Shield}
        iconBgClass="bg-purple-500/10"
        iconColorClass="text-purple-600 dark:text-purple-400"
        maxWidthClass="max-w-2xl"
      >
        <div className="space-y-4 text-zinc-900 dark:text-white">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Review incoming developer payout requests, verify bank/UPI details, and update settlement status.
          </p>

          {/* Admin Note & Tx Ref Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                Settlement Reference / UTR
              </label>
              <input
                type="text"
                placeholder="e.g. UTR1234567890"
                value={payoutTxRef}
                onChange={(e) => setPayoutTxRef(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                Admin Audit Note
              </label>
              <input
                type="text"
                placeholder="Optional audit notes"
                value={payoutAdminNote}
                onChange={(e) => setPayoutAdminNote(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {loadingAdminPayouts ? (
            <div className="py-8 text-center text-xs text-zinc-400">Loading settlement requests...</div>
          ) : adminPayouts.length > 0 ? (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                <thead className="border-b border-zinc-200 dark:border-white/10 text-zinc-400 text-[11px] uppercase sticky top-0 bg-white dark:bg-zinc-950">
                  <tr>
                    <th className="pb-2">Developer / App</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Method</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                  {adminPayouts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5">
                        <div className="font-semibold text-zinc-950 dark:text-white">{p.app?.name || 'App'}</div>
                        <div className="text-[10px] text-zinc-400">{p.developer?.email || 'Developer'}</div>
                      </td>
                      <td className="py-2.5 font-bold font-mono text-zinc-950 dark:text-white">
                        ₹{p.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 font-mono text-[11px]">
                        {p.payoutMethod === 'UPI' ? `UPI: ${p.upiId}` : `A/C: ${p.bankAccNumber}`}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right space-x-1">
                        {p.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              disabled={updatingPayoutId === p.id}
                              onClick={() => handleUpdateAdminPayoutStatus(p.id, 'PAID')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={updatingPayoutId === p.id}
                              onClick={() => handleUpdateAdminPayoutStatus(p.id, 'REJECTED')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 italic py-4 text-center">No pending settlement requests found.</p>
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowAdminPayoutModal(false)}
              className="px-4 py-2 min-h-[44px] text-xs text-zinc-600 dark:text-zinc-300"
            >
              Close
            </Button>
          </div>
        </div>
      </PlatformModal>
    </>
  );
}

export default AppModals;
