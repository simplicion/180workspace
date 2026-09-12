'use client';

import React, { useState } from 'react';
import { 
    X, 
    AlertCircle, 
    FileText, 
    UserCheck, 
    Send, 
    CheckCircle2, 
    Clock, 
    Building2, 
    ExternalLink, 
    ShieldAlert,
    Check
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface PendingItemsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    stats: any;
    onRefresh: () => void;
}

export default function PendingItemsDrawer({
    isOpen,
    onClose,
    stats,
    onRefresh
}: PendingItemsDrawerProps) {
    const [activeTab, setActiveTab] = useState<'invoices' | 'banks'>('invoices');
    const [processingId, setProcessingId] = useState<string | null>(null);

    if (!isOpen) return null;

    const pendingData = stats?.breakdown?.pending || {
        pendingInvoices: [],
        unverifiedUsers: []
    };

    const pendingInvoices = pendingData.pendingInvoices || [];
    const unverifiedUsers = pendingData.unverifiedUsers || [];

    const handleSendReminder = async () => {
        setProcessingId('all_reminders');
        try {
            const { data } = await api.post('/api/finance/trigger-reminders');
            toast.success(data.message || 'Payment reminders sent to pending clients');
            onRefresh();
        } catch {
            toast.error('Failed to trigger reminders');
        } finally {
            setProcessingId(null);
        }
    };

    const handleVerifyUserBank = async (userId: string) => {
        setProcessingId(userId);
        try {
            const { data } = await api.post('/api/finance/verify-bank', { userId });
            toast.success(data.message || 'Bank account verified successfully');
            onRefresh();
        } catch {
            toast.error('Failed to verify bank account');
        } finally {
            setProcessingId(null);
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
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-white to-white dark:from-amber-950/20 dark:via-gray-900 dark:to-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Action Required
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                        Pending Items
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Outstanding receivables and pending banking authorizations
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

                    {/* Navigation Tabs */}
                    <div className="px-6 pt-4 border-b border-gray-100 dark:border-gray-800 flex gap-6">
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={clsx(
                                "pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5",
                                activeTab === 'invoices'
                                    ? "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400"
                                    : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            )}
                        >
                            <FileText className="w-3.5 h-3.5" /> Pending Invoices ({pendingInvoices.length || stats?.pendingInvoices || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('banks')}
                            className={clsx(
                                "pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5",
                                activeTab === 'banks'
                                    ? "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400"
                                    : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            )}
                        >
                            <UserCheck className="w-3.5 h-3.5" /> Unverified Banks ({unverifiedUsers.length || stats?.unverifiedBanks || 0})
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {activeTab === 'invoices' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                                        Accounts Receivable Invoices
                                    </h3>
                                    {pendingInvoices.length > 0 && (
                                        <button
                                            onClick={handleSendReminder}
                                            disabled={processingId === 'all_reminders'}
                                            className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1"
                                        >
                                            <Send className="w-3 h-3" /> Remind All Overdue
                                        </button>
                                    )}
                                </div>

                                {pendingInvoices.length === 0 ? (
                                    <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-gray-900 dark:text-white">All invoices settled!</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">No pending accounts receivable collection items.</p>
                                    </div>
                                ) : (
                                    pendingInvoices.map((inv: any, idx: number) => (
                                        <div 
                                            key={idx}
                                            className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-2 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                    #{inv.invoiceNumber}
                                                </span>
                                                <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                                                    ₹{inv.amount.toLocaleString('en-IN')}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-gray-400">
                                                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300 font-medium">
                                                    <Building2 className="w-3 h-3 text-gray-400" />
                                                    {inv.clientName}
                                                </span>
                                                {inv.dueDate && (
                                                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                                        <Clock className="w-3 h-3" /> Due {format(new Date(inv.dueDate), 'MMM dd')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'banks' && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                                    Team Members Awaiting Bank Verification
                                </h3>

                                {unverifiedUsers.length === 0 ? (
                                    <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-gray-900 dark:text-white">All bank accounts verified!</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">All active employees have verified payment routing.</p>
                                    </div>
                                ) : (
                                    unverifiedUsers.map((u: any) => (
                                        <div 
                                            key={u.id}
                                            className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center justify-between gap-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center uppercase">
                                                    {u.name?.[0] || 'U'}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white">{u.name}</p>
                                                    <p className="text-[11px] text-gray-400">{u.email || u.position || 'Team Member'}</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleVerifyUserBank(u.id)}
                                                disabled={processingId === u.id}
                                                className="btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                            >
                                                <Check className="w-3 h-3" />
                                                {processingId === u.id ? 'Verifying...' : 'Verify Bank'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 flex justify-end">
                        <button
                            onClick={onClose}
                            className="btn-primary text-xs py-2 px-5"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
