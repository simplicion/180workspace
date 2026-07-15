'use client';


import React, { useState, useEffect } from 'react';
import {
    FileText, Plus, Search, Filter, Calendar,
    CreditCard, CheckCircle2, AlertCircle, Clock,
    Download, ArrowUpRight, Loader2, IndianRupee, ShieldAlert
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

interface Bill { id?: string;
    _id: string;
    billNumber: string;
    amount: number;
    currency: string;
    date: string;
    dueDate: string;
    status: 'pending' | 'approved' | 'rejected' | 'paid' | 'overdue';
    vendorId: {
        _id: string;
        name: string;
        email: string;
        bankDetails: {
            verificationStatus: string;
        };
    };
    riskScore?: number;
    riskNotes?: string[];
}

export default function VendorBillsPage() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const fetchBills = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/vendors/bills');
            setBills(res.data);
        } catch (error) {
            toast.error('Failed to load bills');
        } finally {
            setLoading(false);
        }
    };

    const handlePayout = async (billId: string) => {
        if (!confirm('Are you sure you want to initiate this payout?')) return;

        try {
            setIsProcessing(billId);
            const res = await api.post(`/api/vendors/bills/${billId}/payout`);
            toast.success(res.data.message || 'Payout successfully initiated');
            fetchBills();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Payout failed');
        } finally {
            setIsProcessing(null);
        }
    };

    useEffect(() => {
        fetchBills();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Vendor Bills</h1>
                    <p className="text-gray-500">Track and pay supplier invoices</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn-secondary flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Bill
                    </button>
                </div>
            </div>

            {/* Bill Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Bill Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Due Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bills.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No bills found.
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => (
                                    <React.Fragment key={bill.id}>
                                        <tr className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900">{bill.billNumber}</span>
                                                        <span className="text-xs text-gray-400 font-mono">{bill.id}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">{bill.vendorId?.name}</span>
                                                    <span className="text-xs text-gray-400">{bill.vendorId?.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {format(new Date(bill.dueDate), 'MMM dd, yyyy')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 font-bold text-gray-900">
                                                        <IndianRupee className="w-3.5 h-3.5" />
                                                        {bill.amount.toLocaleString('en-IN')}
                                                    </div>
                                                    {bill.riskScore !== undefined && bill.riskScore > 20 && (
                                                        <span className={clsx(
                                                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border w-fit",
                                                            bill.riskScore > 50 ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                        )}>
                                                            <ShieldAlert className="w-2.5 h-2.5" />
                                                            Risk: {bill.riskScore}%
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={clsx(
                                                    "status-badge inline-flex items-center gap-1",
                                                    bill.status === 'paid' ? "status-paid" :
                                                        bill.status === 'pending' ? "status-pending" :
                                                            bill.status === 'approved' ? "status-sent" : "status-failed"
                                                )}>
                                                    {bill.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> :
                                                        bill.status === 'overdue' ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                    {bill.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {bill.status === 'approved' && (
                                                    <button
                                                        onClick={() => handlePayout(bill.id)}
                                                        disabled={isProcessing === bill.id}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                                                    >
                                                        {isProcessing === bill.id ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <CreditCard className="w-3 h-3" />
                                                        )}
                                                        Pay Bill
                                                    </button>
                                                )}
                                                {bill.status === 'paid' && (
                                                    <span className="text-xs text-green-600 font-bold flex items-center justify-end gap-1">
                                                        Processed
                                                        <ArrowUpRight className="w-3 h-3" />
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                        {/* Risk Notes Row */}
                                        {bill.riskScore !== undefined && bill.riskScore > 20 && bill.riskNotes && bill.riskNotes.length > 0 && (
                                            <tr className="border-none">
                                                <td colSpan={6} className="px-6 py-0 pb-3">
                                                    <div className={clsx(
                                                        "p-3 rounded-xl border flex flex-col gap-1.5 ml-11",
                                                        bill.riskScore > 50 ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
                                                    )}>
                                                        <div className="flex items-center gap-2">
                                                            <ShieldAlert className={clsx("w-3.5 h-3.5", bill.riskScore > 50 ? "text-red-600" : "text-amber-600")} />
                                                            <p className={clsx("text-[10px] font-bold uppercase tracking-wider", bill.riskScore > 50 ? "text-red-700" : "text-amber-700")}>
                                                                Fraud Risk Analysis ({bill.riskScore}%)
                                                            </p>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                                            {bill.riskNotes.map((note, idx) => (
                                                                <p key={idx} className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                                                    <span className={clsx("w-1 h-1 rounded-full", bill.riskScore > 50 ? "bg-red-400" : "bg-amber-400")} />
                                                                    {note}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
