'use client';

import { useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { format } from 'date-fns';
import { 
    Receipt, 
    ArrowUpRight, 
    ArrowDownRight, 
    Building2, 
    CreditCard, 
    CheckCircle2, 
    Trash2, 
    Copy, 
    Share2, 
    Calendar,
    Landmark,
    FileText,
    Tag,
    User,
    ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getCategoryById } from './categories';
import { useSettings } from '@/lib/settings-context';
import { ConfirmModal } from '@workspace/ui';

interface TransactionDetailsDrawerProps {
    transaction: any | null;
    open: boolean;
    onClose: () => void;
    onDeleted?: () => void;
}

function safeString(val: any, fallback = ''): string {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') return val.name || val.companyName || val.title || fallback;
    return String(val);
}

export function TransactionDetailsDrawer({ transaction, open, onClose, onDeleted }: TransactionDetailsDrawerProps) {
    const { company } = useSettings();
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    if (!transaction) return null;

    const isCredit = ['credit', 'income', 'sales', 'inbound'].includes(transaction.type?.toLowerCase());
    const categoryInfo = getCategoryById(transaction.metadata?.category || transaction.category);
    const currency = transaction.currency || company?.currency || 'INR';

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard!`);
    };

    async function handleDelete() {
        setDeleting(true);
        try {
            await api.delete(`/api/transactions/${transaction.id || transaction._id || transaction.rawId}`);
            toast.success('Transaction voided and deleted.');
            setShowDeleteModal(false);
            if (onDeleted) onDeleted();
            onClose();
        } catch (err) {
            toast.error('Failed to delete transaction');
        } finally {
            setDeleting(false);
        }
    }

    const partyDisplay = safeString(
        transaction.entityCompany || 
        transaction.entityName || 
        transaction.counterparty || 
        transaction.client?.name || 
        transaction.user?.name || 
        transaction.metadata?.party || 
        transaction.provider, 
        'Commercial Partner'
    );

    return (
        <>
            <Drawer
                open={open}
                onClose={onClose}
                title="Transaction Receipt & Ledger Entry"
                description={`Audit record for #${(transaction.id || transaction._id || 'TXN').slice(-8).toUpperCase()}`}
                icon={<Receipt className="w-5 h-5 text-indigo-600" />}
                maxWidth="max-w-lg"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(true)}
                            disabled={deleting}
                            className="flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-xs"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deleting ? 'Voiding...' : 'Void Transaction'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary text-sm py-2 px-4"
                        >
                            Done
                        </button>
                    </div>
                }
            >
            <div className="px-6 py-5 space-y-6">
                
                {/* Hero Amount Banner */}
                <div className={clsx(
                    "p-5 rounded-2xl border flex flex-col items-center justify-center text-center relative overflow-hidden",
                    isCredit ? "bg-gradient-to-b from-emerald-50/70 to-emerald-100/30 border-emerald-200" : "bg-gradient-to-b from-rose-50/70 to-rose-100/30 border-rose-200"
                )}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={clsx(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
                            isCredit ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                        )}>
                            {isCredit ? <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> : <ArrowUpRight className="w-3.5 h-3.5 mr-1" />}
                            {isCredit ? 'Money In (Credit)' : 'Money Out (Debit)'}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                            {transaction.status || 'Completed'}
                        </span>
                    </div>

                    <div className={clsx(
                        "text-3xl font-extrabold tracking-tight mt-1",
                        isCredit ? "text-emerald-700" : "text-gray-900"
                    )}>
                        {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                        Settled on {format(new Date(transaction.createdAt || Date.now()), 'MMMM dd, yyyy • hh:mm a')}
                    </p>
                </div>

                {/* Primary Metadata Cards */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Transaction Classification</h4>
                    
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center border", categoryInfo.bgColor, categoryInfo.borderColor, categoryInfo.color)}>
                                    <Tag className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-gray-900">{categoryInfo.name}</div>
                                    <div className="text-xs text-gray-500">{categoryInfo.description}</div>
                                </div>
                            </div>
                            {categoryInfo.isTaxDeductible && (
                                <span className="inline-flex items-center text-[11px] font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                    <ShieldCheck className="w-3 h-3 mr-1" /> Tax Deductible
                                </span>
                            )}
                        </div>

                        <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-600">
                            <span className="text-gray-400">Description:</span>
                            <span className="font-medium text-gray-800 text-right">{safeString(transaction.metadata?.description || transaction.description, 'Manual General Ledger Entry')}</span>
                        </div>
                    </div>
                </div>

                {/* Party & Payment Rail Details */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Settlement & Counterparty</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" /> Counterparty
                            </span>
                            <span className="text-sm font-semibold text-gray-900 truncate mt-1">
                                {partyDisplay}
                            </span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Landmark className="w-3.5 h-3.5" /> Payment Method
                            </span>
                            <span className="text-sm font-semibold text-gray-900 capitalize truncate mt-1">
                                {safeString(transaction.metadata?.paymentMethod ? transaction.metadata.paymentMethod.replace(/_/g, ' ') : (transaction.provider === 'manual' ? 'Bank Wire / NEFT' : transaction.provider), 'Payment Rail')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Double Entry Accounting Ledger Breakdown */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">General Ledger Double-Entry</h4>
                    
                    <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                                <tr>
                                    <th className="py-2 px-3">Account</th>
                                    <th className="py-2 px-3 text-right">Debit (DR)</th>
                                    <th className="py-2 px-3 text-right">Credit (CR)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono">
                                <tr>
                                    <td className="py-2 px-3 text-gray-800">
                                        {isCredit ? '1010 - Operating Bank Account' : `5010 - ${categoryInfo.name}`}
                                    </td>
                                    <td className="py-2 px-3 text-right text-gray-900 font-medium">
                                        {isCredit ? formatCurrency(transaction.amount) : '—'}
                                    </td>
                                    <td className="py-2 px-3 text-right text-gray-400">
                                        {isCredit ? '—' : '—'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-3 text-gray-800">
                                        {isCredit ? `4010 - ${categoryInfo.name}` : '1010 - Operating Bank Account'}
                                    </td>
                                    <td className="py-2 px-3 text-right text-gray-400">
                                        {isCredit ? '—' : '—'}
                                    </td>
                                    <td className="py-2 px-3 text-right text-gray-900 font-medium">
                                        {formatCurrency(transaction.amount)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* System Identifiers */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <span>Transaction ID: <code className="text-gray-600">{transaction.id || transaction._id}</code></span>
                    <button
                        onClick={() => copyToClipboard(transaction.id || transaction._id, 'Transaction ID')}
                        className="hover:text-gray-700 flex items-center gap-1"
                    >
                        <Copy className="w-3 h-3" /> Copy
                    </button>
                </div>

            </div>
        </Drawer>

        <ConfirmModal
            isOpen={showDeleteModal}
            title="Void & Delete Transaction Entry"
            message="Are you sure you want to void and delete this transaction record from the company master ledger? This action cannot be undone."
            confirmText="Void & Delete"
            cancelText="Cancel"
            isDestructive={true}
            variant="danger"
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteModal(false)}
        />
    </>
    );
}
