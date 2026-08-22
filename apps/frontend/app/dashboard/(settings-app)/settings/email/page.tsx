'use client';


import { Mail, ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import EmailTab from '@/app/dashboard/(settings-app)/_components/EmailTab';
import PremiumFeatureLock from '@/components/shared/PremiumFeatureLock';

export default function EmailSettingsPage() {
    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/settings/system-configs"
                        title="Back to System Config"
                        className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Email Automation</h1>
                        <p className="text-gray-500 mt-1">Configure SMTP settings for system-wide notifications, transaction alerts, and automated reporting.</p>
                    </div>
                </div>
            </div>

            {/* Email Tab Component */}
            <PremiumFeatureLock>
                <EmailTab />
            </PremiumFeatureLock>
        </div>
    );
}

