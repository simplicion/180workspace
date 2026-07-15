'use client';


import { Mail, ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import EmailTab from '@/app/dashboard/(settings-app)/_components/EmailTab';

export default function EmailSettingsPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Breadcrumbs & Header */}
            <div className="space-y-4">
                <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                    <Link href="/dashboard/settings/system-configs" className="hover:text-indigo-600 transition-colors">Settings</Link>
                    <ChevronRight className="w-3 h-3" />
                    <Link href="/dashboard/settings/system-configs" className="hover:text-indigo-600 transition-colors">System Configs</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-gray-900">Email Automation</span>
                </nav>
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold tracking-tight mb-2">
                            <Mail className="w-5 h-5" />
                            <span className="uppercase text-[10px] tracking-widest">System Service</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight italic">Email Automation</h1>
                        <p className="text-sm text-gray-500 font-medium max-w-2xl leading-relaxed">
                            Configure SMTP settings for system-wide notifications, transaction alerts, and automated reporting.
                        </p>
                    </div>
                </div>
            </div>

            {/* Email Tab Component */}
            <EmailTab />
        </div>
    );
}

