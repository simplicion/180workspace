'use client';

import React from 'react';
import { 
    X, 
    Banknote, 
    Building2, 
    CheckCircle2, 
    Clock, 
    CreditCard, 
    DollarSign, 
    FileText, 
    ShieldCheck, 
    User, 
    Send, 
    AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

interface SalaryDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    salary: any | null;
    currencySymbol: string;
    onInitiatePayout: (id: string) => void;
    onMarkPaid: (id: string) => void;
}

export default function SalaryDetailDrawer({
    isOpen,
    onClose,
    salary,
    currencySymbol,
    onInitiatePayout,
    onMarkPaid
}: SalaryDetailDrawerProps) {
    if (!isOpen || !salary) return null;

    const isPaid = salary.status === 'paid';
    const isApproved = salary.status === 'approved' || salary.status === 'hr_approved';
    const bankVerified = salary.employee?.bankDetails?.verificationStatus === 'verified' || !!salary.employee?.bankAccount;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={onClose}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300 animate-in slide-in-from-right">
                    
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-purple-50/50 via-white to-white dark:from-purple-950/20 dark:via-gray-900 dark:to-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                <Banknote className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Payroll Disbursement Breakdown
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Salary structure & payout audit record
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

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {/* Net Salary Hero */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-indigo-50/40 dark:from-gray-800/80 dark:via-gray-800 dark:to-gray-800/50 border border-purple-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                    Net Payable Disbursement
                                </span>
                                <span className={clsx(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    isPaid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                                    isApproved ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300" : "bg-amber-100 text-amber-800"
                                )}>
                                    {salary.status}
                                </span>
                            </div>

                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                                    {currencySymbol}{(salary.netSalary || salary.amount || 0).toLocaleString()}
                                </span>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">INR</span>
                            </div>

                            <div className="mt-3 pt-3 border-t border-purple-100 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Month: <strong className="text-gray-900 dark:text-white">{salary.month || 'Current'}</strong></span>
                                <span>Disbursement Rail: <strong className="text-purple-600 dark:text-purple-400">RazorpayX IMPS</strong></span>
                            </div>
                        </div>

                        {/* Employee Details */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                                Employee & Beneficiary Profile
                            </h4>
                            <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                            {salary.employee?.name?.[0] || 'E'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">{salary.employee?.name || 'Staff Member'}</p>
                                            <p className="text-[11px] text-gray-400">ID: {salary.employee?.employeeId || 'EMP-180'}</p>
                                        </div>
                                    </div>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                        bankVerified ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700"
                                    )}>
                                        {bankVerified ? 'Bank Verified' : 'Unverified Bank'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Salary Structure Breakdown */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                                Itemized Salary Composition
                            </h4>
                            <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">Base Salary (Basic + HRA)</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {currencySymbol}{(salary.baseSalary || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Performance Bonus & Allowances</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        +{currencySymbol}{(salary.bonuses || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-rose-500 font-medium">Statutory Tax & PF Deductions (Fee)</span>
                                    <span className="font-bold text-rose-500">
                                        -{currencySymbol}{(salary.deductions || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs font-bold">
                                    <span className="text-gray-900 dark:text-white uppercase">Net Disbursable Amount</span>
                                    <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                                        {currencySymbol}{(salary.netSalary || salary.amount || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Double Entry */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                                General Ledger Double-Entry
                            </h4>
                            <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 font-bold uppercase text-[10px]">
                                            <th className="pb-2">Account</th>
                                            <th className="pb-2 text-right">Debit (DR)</th>
                                            <th className="pb-2 text-right">Credit (CR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40 font-mono">
                                        <tr>
                                            <td className="py-2.5 text-gray-900 dark:text-white font-sans">5030 - Payroll & Staff Expense</td>
                                            <td className="py-2.5 text-right font-bold text-gray-900 dark:text-white">{currencySymbol}{(salary.netSalary || salary.amount || 0).toLocaleString()}</td>
                                            <td className="py-2.5 text-right text-gray-300">—</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2.5 text-gray-900 dark:text-white font-sans">1010 - Operating Bank Account</td>
                                            <td className="py-2.5 text-right text-gray-300">—</td>
                                            <td className="py-2.5 text-right font-bold text-gray-900 dark:text-white">{currencySymbol}{(salary.netSalary || salary.amount || 0).toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 flex items-center justify-between">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                            Close
                        </button>
                        {!isPaid && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        onMarkPaid(salary.id);
                                        onClose();
                                    }}
                                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Mark Paid
                                </button>
                                <button
                                    onClick={() => {
                                        onInitiatePayout(salary.id);
                                        onClose();
                                    }}
                                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    Initiate Automated Payout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
