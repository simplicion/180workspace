'use client';

import { LogoLoader, FeatureLock } from "@workspace/ui";
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Sparkles, BrainCircuit, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CeoOverview() {
    const { user, isLoading: authLoading } = useAuth();
    const [insights, setInsights] = useState<string>('');
    const [isConfigured, setIsConfigured] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [insightsLoading, setInsightsLoading] = useState(true);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        api.get('/api/ai/insights')
            .then(({ data }) => {
                if (data?.error) {
                    setErrorMessage(data.error);
                    setIsConfigured(false);
                    setInsights('');
                    return;
                }
                if (data?.isConfigured === false) {
                    setIsConfigured(false);
                    setInsights('');
                    return;
                }
                const summary = data?.summary || data?.insight || data?.insights || '';
                const text = typeof summary === 'string' ? summary : '';
                
                if (text.toLowerCase().includes('failed to generate') || text.toLowerCase().includes('check your api key')) {
                    setErrorMessage(text);
                    setIsConfigured(false);
                    setInsights('');
                } else {
                    setInsights(text);
                    setIsConfigured(Boolean(text));
                    setErrorMessage(null);
                }
            })
            .catch((err) => {
                if (err.response?.status === 403) {
                    setIsLocked(true);
                } else {
                    setIsConfigured(false);
                    setInsights('');
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
                actionHref='/settings/platform-billing'
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
                            <LogoLoader className="w-4 h-4 animate-spin" /> Analyzing real-time workspace metrics...
                        </div>
                    ) : errorMessage ? (
                        <div className="bg-amber-50/80 rounded-lg p-3 border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Invalid API Key or AI Connection Error.</span>
                            </div>
                            <Link href='/settings/system-configs' className="text-amber-800 underline font-bold hover:text-amber-950 whitespace-nowrap text-[12px]">
                                Update API Key in Settings &rarr;
                            </Link>
                        </div>
                    ) : !isConfigured || !insights ? (
                        <div className="bg-white/60 rounded-lg p-3 border border-indigo-100/50">
                            <span className="text-indigo-800/80">
                                AI Insights are currently unavailable.{' '}
                                <Link href='/settings/system-configs' className="text-indigo-600 underline font-bold hover:text-indigo-800 transition-colors">
                                    Configure your AI provider in Settings &rarr;
                                </Link>
                            </span>
                        </div>
                    ) : (
                        <div className="text-gray-800 leading-relaxed whitespace-pre-line">
                            {insights}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
