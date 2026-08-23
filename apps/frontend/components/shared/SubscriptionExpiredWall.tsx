'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldOff, Zap, AlertTriangle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/lib/useSubscription';
import { useSettings } from '@/lib/settings-context';
import { formatDistanceToNow, parseISO } from 'date-fns';
import api from '@/lib/api';

export default function SubscriptionExpiredWall() {
    const { user } = useAuth();
    const { dataDeletionDate, status } = useSubscription();
    const { platform, settings } = useSettings();

    const isAdmin = ['admin', 'manager'].includes(user?.role || '') || user?.roles?.includes('admin') || user?.roles?.includes('manager');

    const effectiveSupportEmail = settings?.supportEmail || platform?.supportEmail || '';

    // Support contact logic moved to useSettings

    // Calculate days remaining for deletion
    let deletionCountdown = '30 days';
    if (dataDeletionDate) {
        try {
            deletionCountdown = formatDistanceToNow(parseISO(dataDeletionDate), { addSuffix: false });
        } catch (e) {
            console.error('Date parsing error:', e);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                    <ShieldOff className="w-10 h-10 text-red-400" />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-white mb-3">
                        {isAdmin ? 'Subscription Expired' : 'Access Restricted'}
                    </h1>
                    <p className="text-slate-400 leading-relaxed px-4">
                        {isAdmin
                            ? "Your company's subscription has ended. Please upgrade to the Professional or Enterprise plan to access full features of the platform."
                            : "Your company's subscription has expired. Please contact your administrator to reactivate the account and regain access."
                        }
                    </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left space-y-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Data Retention Warning</p>
                            <p className="text-sm text-slate-300">
                                Permanent data deletion scheduled in <span className="text-amber-400 font-bold">{deletionCountdown}</span> if a plan is not activated.
                            </p>
                        </div>
                    </div>
                </div>

                {isAdmin ? (
                    <Link href="/dashboard/settings/platform-billing"
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-indigo-500/20">
                        <Zap className="w-4 h-4" />
                        Upgrade My Plan
                    </Link>
                ) : (
                    <div className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-800 text-slate-400 font-medium rounded-xl border border-slate-700 cursor-not-allowed text-sm">
                        <MessageSquare className="w-4 h-4" />
                        Contact Company Authority
                    </div>
                )}

                {effectiveSupportEmail ? (
                    <p className="text-xs text-slate-500">
                        Questions? Contact <a href={`mailto:${effectiveSupportEmail}`} className="text-indigo-400 hover:underline">{effectiveSupportEmail}</a>
                    </p>
                ) : (
                    <p className="text-xs text-slate-500">
                        Questions? Contact {platform?.platformName || 'the platform'} administrator for support.
                    </p>
                )}
            </div>
        </div>
    );
}

