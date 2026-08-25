'use client';

import AiTab from '@/app/dashboard/(settings-app)/_components/AiTab';
import { ChevronLeft, Brain } from 'lucide-react';
import Link from 'next/link';
import { FeatureLock, LogoLoader } from '@workspace/ui';
import { useSubscription } from '@/lib/useSubscription';

export default function AiSettingsPage() {
    const { companyConfig, loading } = useSubscription();
    const enabledApps = Array.isArray(companyConfig?.enabledApps) ? companyConfig.enabledApps : [];
    const hasApp = enabledApps.includes('workspace-tools');

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col gap-4">
                <Link
                    href='/settings/system-configs'
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors w-fit group"
                >
                    <div className="p-1.5 rounded-lg bg-white border border-gray-100 group-hover:border-indigo-100 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                    <span>Back to System Configs</span>
                </Link>

                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center border border-purple-100 shadow-sm">
                        <Brain className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI & Machine Learning</h1>
                        <p className="text-sm text-gray-500">Configure global AI models and automation settings</p>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                {loading ? (
                    <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 p-8 flex items-center justify-center min-h-[400px]">
                        <LogoLoader className="w-8 h-8 animate-spin" />
                    </div>
                ) : hasApp ? (
                    <AiTab />
                ) : (
                    <FeatureLock requiredApp="Workspace Tools" />
                )}
            </div>
        </div>
    );
}
