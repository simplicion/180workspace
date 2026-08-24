'use client';

import { LogoLoader, FeatureLock } from "@workspace/ui";
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Sparkles, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CeoOverview() {
    const { user, isLoading: authLoading } = useAuth();
    const [insights, setInsights] = useState<string>('');
    const [insightsLoading, setInsightsLoading] = useState(true);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        api.get('/api/ai/insights')
            .then(({ data }) => setInsights(data.insight))
            .catch((err) => {
                if (err.response?.status === 403) {
                    setIsLocked(true);
                } else {
                    setInsights('Failed to load AI Insights.');
                }
            })
            .finally(() => setInsightsLoading(false));
    }, []);

    if (authLoading) return null;

    if (isLocked) {
        return (
            <FeatureLock 
                title="AI Insights Locked"
                description="AI-powered executive summaries require an active premium subscription. Upgrade your workspace to unlock this capability."
                actionText="Upgrade Plan"
                actionHref="/dashboard/settings/platform-billing"
                className="min-h-[250px]"
            />
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="card overflow-hidden bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 border-indigo-100/60 shadow-sm relative"
        >
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <BrainCircuit className="w-32 h-32 text-indigo-900 transform rotate-12" />
            </div>

            <div className="p-5 relative z-10">
                <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 rounded-lg">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                    </div>
                    AI Executive Summary
                </h3>
                
                <div className="text-[13px] text-gray-700 leading-relaxed font-medium">
                    {insightsLoading ? (
                        <div className="flex items-center gap-2 text-indigo-500/80 py-2">
                            <LogoLoader className="w-4 h-4 animate-spin" /> Generating insights based on latest data...
                        </div>
                    ) : insights.toLowerCase().includes('unavailable') || insights.toLowerCase().includes('configure') ? (
                        <div className="bg-white/60 rounded-lg p-3 border border-indigo-100/50">
                            <span className="text-indigo-800/80">
                                AI Insights are currently unavailable.{' '}
                                <Link href="/dashboard/settings/system-configs" className="text-indigo-600 underline font-bold hover:text-indigo-800 transition-colors">
                                    Configure your AI provider in Settings &rarr;
                                </Link>
                            </span>
                        </div>
                    ) : (
                        <div className="prose prose-sm prose-indigo max-w-none line-clamp-4">
                            {insights}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
