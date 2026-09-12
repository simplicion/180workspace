'use client';

import React, { useState } from 'react';
import { 
    X, 
    TrendingDown, 
    Building2, 
    CreditCard, 
    DollarSign, 
    FileText, 
    Send, 
    Sparkles,
    ShieldCheck,
    Layers
} from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface InsertPayoutDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const PAYOUT_CATEGORIES = [
    'Payroll & Compensation',
    'Cloud & Hosting',
    'Software & SaaS',
    'Marketing & Ads',
    'Office & Rent',
    'Contractor & Freelancer',
    'Equipment & Hardware',
    'Legal & Professional',
    'Tax & Statutory'
];

const PAYMENT_RAILS = [
    { id: 'RazorpayX Direct Payout', name: 'RazorpayX Instant (IMPS/NEFT)' },
    { id: 'Bank Transfer NEFT/RTGS', name: 'Bank Transfer (NEFT/RTGS)' },
    { id: 'UPI Corporate Rail', name: 'UPI Corporate Rail' },
    { id: 'Stripe Payout', name: 'Stripe Direct Rail' }
];

export default function InsertPayoutDrawer({
    isOpen,
    onClose,
    onSuccess
}: InsertPayoutDrawerProps) {
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        counterparty: '',
        amount: '',
        category: 'Cloud & Hosting',
        paymentMethod: 'RazorpayX Direct Payout',
        description: '',
        referenceId: ''
    });

    if (!isOpen) return null;

    const parsedAmount = Number(formData.amount) || 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.counterparty.trim()) {
            toast.error('Please enter the beneficiary or vendor name');
            return;
        }

        if (parsedAmount <= 0) {
            toast.error('Please enter a valid payout amount');
            return;
        }

        setSubmitting(true);
        const loadingToast = toast.loading('Executing payout disbursement...');

        try {
            const { data } = await api.post('/api/finance/payouts', {
                amount: parsedAmount,
                counterparty: formData.counterparty.trim(),
                category: formData.category,
                paymentMethod: formData.paymentMethod,
                description: formData.description.trim() || `Payout to ${formData.counterparty.trim()}`,
                referenceId: formData.referenceId.trim() || `REF-${Date.now().toString().slice(-6)}`
            });

            toast.dismiss(loadingToast);
            toast.success(data.message || 'Payout recorded successfully!');
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                counterparty: '',
                amount: '',
                category: 'Cloud & Hosting',
                paymentMethod: 'RazorpayX Direct Payout',
                description: '',
                referenceId: ''
            });
        } catch (err: any) {
            toast.dismiss(loadingToast);
            toast.error(err?.response?.data?.message || 'Failed to record payout');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={onClose}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300 animate-in slide-in-from-right">
                    
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-rose-50/50 via-white to-white dark:from-rose-950/20 dark:via-gray-900 dark:to-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                                <TrendingDown className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Record / Insert Payout
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Execute disbursement & automatically reconcile double-entry ledger
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form Body */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                        
                        {/* Amount Field */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                Disbursement Amount (INR) <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    required
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-lg font-bold text-gray-900 dark:text-white focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-50 dark:focus:ring-rose-950 transition-all"
                                />
                            </div>
                        </div>

                        {/* Beneficiary Field */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                Beneficiary / Vendor Name <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. AWS Cloud Services, Apex Contractors"
                                    value={formData.counterparty}
                                    onChange={(e) => setFormData({ ...formData, counterparty: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-50 dark:focus:ring-rose-950 transition-all"
                                />
                            </div>
                        </div>

                        {/* Category & Payment Method Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                    Expense Category
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-50 dark:focus:ring-rose-950 transition-all"
                                >
                                    {PAYOUT_CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                    Payment Rail
                                </label>
                                <select
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-50 dark:focus:ring-rose-950 transition-all"
                                >
                                    {PAYMENT_RAILS.map((rail) => (
                                        <option key={rail.id} value={rail.id}>{rail.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Memo & Reference Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                    Description / Memo
                                </label>
                                <input
                                    type="text"
                                    placeholder="Monthly cloud hosting invoice"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-50 dark:focus:ring-rose-950 transition-all"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                    Reference / Invoice #
                                </label>
                                <input
                                    type="text"
                                    placeholder="INV-2026-9918"
                                    value={formData.referenceId}
                                    onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-50 dark:focus:ring-rose-950 transition-all"
                                />
                            </div>
                        </div>

                        {/* Double-Entry Preview */}
                        {parsedAmount > 0 && (
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                                    Automated Double-Entry Preview
                                </span>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between font-mono">
                                        <span className="text-gray-600 dark:text-gray-300">DR: 5010 - {formData.category}</span>
                                        <span className="font-bold text-gray-900 dark:text-white">₹{parsedAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between font-mono">
                                        <span className="text-gray-600 dark:text-gray-300">CR: 1010 - Operating Bank Account</span>
                                        <span className="font-bold text-gray-900 dark:text-white">₹{parsedAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Footer Actions */}
                    <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="btn-primary text-xs flex items-center gap-1.5 py-2.5 px-5 shadow-sm"
                        >
                            <Send className="w-3.5 h-3.5" />
                            {submitting ? 'Executing Payout...' : 'Execute Payout'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
