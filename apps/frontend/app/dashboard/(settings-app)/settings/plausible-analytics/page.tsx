'use client';


import PlausibleAnalyticsTab from '@/app/dashboard/(settings-app)/_components/PlausibleAnalyticsTab';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import PremiumFeatureLock from '@/components/shared/PremiumFeatureLock';

export default function PlausibleAnalyticsPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <Link 
                href="/dashboard/settings/system-configs"
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors w-fit"
            >
                <ChevronLeft className="w-4 h-4" />
                Back to System Configs
            </Link>

            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-black text-gray-900">Plausible Analytics</h1>
                <p className="text-gray-500 text-sm font-medium">Manage Plausible Analytics configuration and tracking.</p>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PremiumFeatureLock>
                    <PlausibleAnalyticsTab />
                </PremiumFeatureLock>
            </div>
        </div>
    );
}

