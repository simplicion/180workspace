'use client';


import { Cloud, ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import StorageTab from '@/app/dashboard/(settings-app)/_components/StorageTab';

export default function StorageSettingsPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Breadcrumbs & Header */}
            <div className="space-y-4">
                <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                    <Link href="/dashboard/settings/system-configs" className="hover:text-indigo-600 transition-colors">Settings</Link>
                    <ChevronRight className="w-3 h-3" />
                    <Link href="/dashboard/settings/system-configs" className="hover:text-indigo-600 transition-colors">System Configs</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-gray-900">Storage & Drive</span>
                </nav>
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-600 font-bold tracking-tight mb-2">
                            <Cloud className="w-5 h-5" />
                            <span className="uppercase text-[10px] tracking-widest">Platform Infrastructure</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight italic">Storage & Drive</h1>
                        <p className="text-sm text-gray-500 font-medium max-w-2xl leading-relaxed">
                            Configure AWS S3, Google Cloud, or Cloudinary buckets to store documents, assets, and system media securely.
                        </p>
                    </div>
                </div>
            </div>

            {/* Storage Tab Component */}
            <StorageTab />
        </div>
    );
}

