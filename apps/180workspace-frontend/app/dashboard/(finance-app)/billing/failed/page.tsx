'use client';

import Link from 'next/link';
import { XCircle, AlertCircle, RefreshCw, LifeBuoy, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PaymentFailedPage() {
    const router = useRouter();

    return (
        <div className="max-w-2xl mx-auto py-16 px-4 text-center">
            <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                <div className="relative w-24 h-24 bg-rose-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-500/40 -rotate-12 animate-in zoom-in duration-500">
                    <XCircle className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                </div>
            </div>

            <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Payment Failed</h1>
            <p className="text-lg text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">
                We couldn&apos;t process your payment. Don&apos;t worry, no funds were deducted from your account.
            </p>

            <div className="bg-white border-2 border-rose-50 rounded-3xl p-8 mb-10 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <AlertCircle className="w-24 h-24 text-rose-500" />
                </div>

                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    Common reasons for failure:
                </h3>
                <ul className="space-y-3">
                    {[
                        'Insufficient funds in your account',
                        'Incorrect card details or CVV',
                        'Bank server temporary downtime',
                        'Transaction limit exceeded',
                        'International payments disabled on your card'
                    ].map((reason, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                            {reason}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-200"
                >
                    <RefreshCw className="w-5 h-5" />
                    Try Again
                </button>
                <Link
                    href="/dashboard/support"
                    className="w-full sm:w-auto px-10 py-4 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group"
                >
                    <LifeBuoy className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Contact Support
                </Link>
            </div>

            <Link href="/dashboard/billing" className="inline-flex items-center gap-2 mt-12 text-sm font-medium text-slate-400 hover:text-indigo-600 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Billing Overview
            </Link>
        </div>
    );
}
