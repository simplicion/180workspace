'use client';


import { ArrowLeft, Database, Shield } from 'lucide-react';
import Link from 'next/link';
import DatabaseTab from '@/app/dashboard/(settings-app)/_components/DatabaseTab';

export default function DatabaseSettingsPage() {
    return (
        <div className="min-h-screen bg-[#fafafa] pb-20">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center gap-4">
                            <Link 
                                href="/dashboard/settings/system-configs" 
                                className="p-2.5 hover:bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-all active:scale-95 group"
                            >
                                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                            </Link>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <Database className="w-4 h-4 text-emerald-600" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/50">Infrastructure</span>
                                </div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Database & Security</h1>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex flex-col items-end mr-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Security Status</span>
                                <span className="text-xs font-bold text-emerald-600">Enterprise Guard Active</span>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                <Shield className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
                <DatabaseTab />
            </div>
        </div>
    );
}

