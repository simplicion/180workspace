'use client';

import React from 'react';
import { ArrowLeft, ExternalLink, Settings, Plus, FileText, ShieldCheck, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

export default function WalletPage() {
    const router = useRouter();

    const transactions = [
        {
            id: 1,
            title: 'Payment to CodeCraft Labs',
            subtitle: 'Project #ORD-1001',
            date: '02 May 2025',
            amount: '- ₹12,499.00',
            isPositive: false,
            icon: FileText,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600'
        },
        {
            id: 2,
            title: 'Escrow Added',
            subtitle: 'Project #ORD-1001',
            date: '01 May 2025',
            amount: '+ ₹17,500.00',
            isPositive: true,
            icon: ShieldCheck,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600'
        },
        {
            id: 3,
            title: 'Payment to Pixel Studio',
            subtitle: 'Project #ORD-1003',
            date: '05 Apr 2025',
            amount: '- ₹15,999.00',
            isPositive: false,
            icon: FileText,
            iconBg: 'bg-pink-50',
            iconColor: 'text-pink-600'
        },
        {
            id: 4,
            title: 'Refund from Brandify Co.',
            subtitle: 'Order #ORD-1004',
            date: '10 Mar 2025',
            amount: '+ ₹9,999.00',
            isPositive: true,
            icon: RefreshCcw,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600'
        }
    ];

    return (
        <div className="max-w-2xl mx-auto min-h-screen bg-white">
            {/* Header */}
            <header className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-900" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">Wallet</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <ExternalLink className="w-5 h-5 text-gray-600" />
                    </button>
                    <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <Settings className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </header>

            <main className="px-6 space-y-8">
                {/* Balance Card */}
                <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 flex flex-col gap-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-blue-100 font-medium mb-1">Available Balance</p>
                                <h2 className="text-3xl font-bold">₹12,450.00</h2>
                            </div>
                            <button className="bg-white text-blue-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-sm">
                                <Plus className="w-4 h-4" />
                                Add Funds
                            </button>
                        </div>

                        <div className="flex items-center pt-6 border-t border-blue-500/50">
                            <div className="flex-1">
                                <p className="text-sm text-blue-100 mb-1">In Escrow</p>
                                <p className="font-semibold">₹45,600.00</p>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-blue-100 mb-1">Total Spent</p>
                                <p className="font-semibold">₹1,25,300.00</p>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
                </div>

                {/* Recent Transactions */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900">Recent Transactions</h3>
                        <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">View all</button>
                    </div>

                    <div className="space-y-4">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", tx.iconBg)}>
                                        <tx.icon className={clsx("w-5 h-5", tx.iconColor)} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm md:text-base">{tx.title}</p>
                                        <p className="text-xs md:text-sm text-gray-500 font-medium">{tx.subtitle}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <p className={clsx("font-bold text-sm md:text-base", tx.isPositive ? "text-emerald-600" : "text-gray-900")}>
                                        {tx.amount}
                                    </p>
                                    <p className="text-xs md:text-sm text-gray-400 font-medium mt-0.5">{tx.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
