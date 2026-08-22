'use client';

import StorageTab from '@/app/dashboard/(settings-app)/_components/StorageTab';
import { ChevronLeft, Cloud } from 'lucide-react';
import Link from 'next/link';
import PremiumFeatureLock from '@/components/shared/PremiumFeatureLock';

export default function StorageSettingsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col gap-4">
                <Link
                    href="/dashboard/settings/system-configs"
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors w-fit group"
                >
                    <div className="p-1.5 rounded-lg bg-white border border-gray-100 group-hover:border-indigo-100 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                    <span>Back to System Configs</span>
                </Link>

                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                        <Cloud className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cloudinary Storage</h1>
                        <p className="text-sm text-gray-500">Configure your Cloudinary bucket to store documents, assets, and system media securely.</p>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <PremiumFeatureLock>
                    <StorageTab />
                </PremiumFeatureLock>
            </div>
        </div>
    );
}

