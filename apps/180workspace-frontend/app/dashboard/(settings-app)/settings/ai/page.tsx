'use client';


import AiTab from '@/app/dashboard/(settings-app)/_components/AiTab';
import { ChevronLeft, Brain } from 'lucide-react';
import Link from 'next/link';

export default function AiSettingsPage() {
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
                <AiTab />
            </div>
        </div>
    );
}

