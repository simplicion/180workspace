import GoogleIntegrationsTab from '@/app/dashboard/(settings-app)/_components/GoogleIntegrationsTab';
import Link from 'next/link';
import { ArrowLeft, Globe } from 'lucide-react';

export default function GoogleIntegrationsPage() {
    return (
        <div className="p-6 lg:p-8 w-full space-y-6 pb-16">
            <div className="flex flex-col gap-4">
                <Link 
                    href="/dashboard/settings/system-configs" 
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

            <GoogleIntegrationsTab />
        </div>
    );
}
