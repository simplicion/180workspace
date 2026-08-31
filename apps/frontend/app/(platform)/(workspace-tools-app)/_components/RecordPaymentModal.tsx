'use client';

import { useState } from 'react';
import { X, CheckCircle2, DollarSign, Building2, Calendar, FileText, CreditCard, ShieldCheck } from 'lucide-react';
import { LogoLoader } from "@workspace/ui";
import toast from 'react-hot-toast';
import { useRecordPaymentMutation } from '@/redux/api/knowledgeApi';

interface RecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: any;
    onSuccess?: () => void;
}

const PAYMENT_METHODS = [
    { id: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS/Wire)', icon: Building2 },
    { id: 'UPI', label: 'UPI / Instant Payment', icon: DollarSign },
    { id: 'CARD_STRIPE', label: 'Credit/Debit Card (Stripe)', icon: CreditCard },
    { id: 'CHEQUE', label: 'Bank Cheque', icon: FileText },
    { id: 'CASH', label: 'Cash Receipt', icon: DollarSign },
];

export default function RecordPaymentModal({ isOpen, onClose, document: doc, onSuccess }: RecordPaymentModalProps) {
    const [recordPaymentMutation, { isLoading }] = useRecordPaymentMutation();
    const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [amountReceived, setAmountReceived] = useState<number>(doc?.grandTotal || doc?.subtotal || 0);
    const [notes, setNotes] = useState('');

    if (!isOpen || !doc) return null;

    const docId = doc.id || doc._id;
    const docTitle = doc.title || doc.name || 'Document';
    const currency = doc.currency === 'USD' ? '$' : '₹';

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amountReceived || amountReceived <= 0) {
            return toast.error('Please enter a valid received amount');
        }

        try {
            const res = await recordPaymentMutation({
                id: docId,
                paymentMethod,
                referenceNumber,
                paymentDate,
                amountReceived: Number(amountReceived),
                notes
            }).unwrap();

            toast.success(res.message || 'Payment recorded and posted to ledger!');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.data?.message || 'Failed to record payment');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Record Payment Received</h2>
                            <p className="text-xs text-slate-400">Post transaction to ledger & sync Client CLV</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                    {/* Document summary badge */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{docTitle}</p>
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-400">{doc.clientName || 'Valued Client'}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-slate-400">Invoice Total</span>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                                {currency}{Number(doc?.grandTotal || doc?.subtotal || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Amount Received Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                            Amount Received ({currency})
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency}</span>
                            <input
                                type="number"
                                required
                                min="1"
                                step="any"
                                value={amountReceived}
                                onChange={(e) => setAmountReceived(Number(e.target.value))}
                                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            />
                        </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                            Payment Method
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {PAYMENT_METHODS.map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setPaymentMethod(m.id)}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                                        paymentMethod === m.id
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <m.icon className={`w-4 h-4 ${paymentMethod === m.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    <span className="truncate">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reference / UTR # and Payment Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                Reference / UTR # (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. UTR-98234190"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                Payment Date
                            </label>
                            <input
                                type="date"
                                required
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                            Notes / Remarks (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Received via HDFC corporate account"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                        >
                            {isLoading ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : <CheckCircle2 className="w-4 h-4" />}
                            Confirm & Record in Ledger
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
