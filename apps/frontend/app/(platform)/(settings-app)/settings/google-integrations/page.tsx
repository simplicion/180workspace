'use client';

import GoogleIntegrationsTab from '@/app/dashboard/(settings-app)/_components/GoogleIntegrationsTab';
import Link from 'next/link';
import { ArrowLeft, Globe } from 'lucide-react';
import { FeatureLock, LogoLoader } from '@workspace/ui';
import { useSubscription } from '@/lib/useSubscription';

export default function GoogleIntegrationsPage() {
    const { companyConfig, loading } = useSubscription();
    const enabledApps = Array.isArray(companyConfig?.enabledApps) ? companyConfig.enabledApps : [];
    const hasApp = enabledApps.includes('workspace-tools');

    return (
        <div className="p-6 lg:p-8 w-full space-y-6 pb-16">
            <div className="flex flex-col gap-4">
                <Link 
                    href='/settings/system-configs' 
                    className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to System Configs
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Globe className="w-6 h-6 text-indigo-600" />
                        Google Integrations
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium text-sm">Manage your connected Google Workspace apps and synced data.</p>
                </div>
            </div>

            <div className="mt-8">
                {loading ? (
                    <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 p-8 flex items-center justify-center min-h-[400px]">
                        <LogoLoader className="w-8 h-8 animate-spin" />
                    </div>
                ) : hasApp ? (
                    <GoogleIntegrationsTab />
                ) : (
                    <FeatureLock requiredApp="Workspace Tools" />
                )}
            </div>
        </div>
    );
}
