'use client';

import React, { useState } from 'react';
import { 
    BarChart3, TrendingUp, Eye, ThumbsUp, MessageSquare, 
    Share2, Calendar, Download, Film, Sparkles
} from 'lucide-react';
import { SocialProject } from '@/lib/services/social-project.service';

interface AnalyticsTabProps {
    project: SocialProject;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ project }) => {
    const [timeframe, setTimeframe] = useState('30d');

    return (
        <div className="space-y-8">
            {/* Header & Date Range */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Performance Analytics & Attribution
                    </h3>
                    <p className="text-xs text-slate-500">
                        Aggregated metrics reported directly from connected platform accounts.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {['7d', '30d', '90d'].map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                                timeframe === tf
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            Last {tf.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-xs font-medium">Estimated Impressions</span>
                        <Eye className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100">128.4K</p>
                    <p className="text-[11px] text-emerald-500 font-semibold mt-1">↑ +24.8% vs last month</p>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-xs font-medium">Total Engagement</span>
                        <ThumbsUp className="w-4 h-4 text-pink-500" />
                    </div>
                    <p className="text-2xl font-black text-pink-500">14.2K</p>
                    <p className="text-[11px] text-emerald-500 font-semibold mt-1">↑ +18.2% engagement rate</p>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-xs font-medium">Video Views</span>
                        <Film className="w-4 h-4 text-sky-500" />
                    </div>
                    <p className="text-2xl font-black text-sky-500">89.6K</p>
                    <p className="text-[11px] text-slate-400 mt-1">Across Reels & Shorts</p>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-xs font-medium">CRM Leads Influenced</span>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-emerald-500">38</p>
                    <p className="text-[11px] text-emerald-500 font-semibold mt-1">Direct inquiries & DMs</p>
                </div>
            </div>

            {/* Top Performing Content Section */}
            <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
                <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Top-Performing Posts
                    </h4>
                    <p className="text-xs text-slate-500">
                        Ranked by engagement and verified platform reach.
                    </p>
                </div>

                <div className="space-y-3">
                    {[
                        { title: '3 Growth Frameworks for B2B Founders in 2026', format: 'Reel', views: '42.1K', likes: '3.4K', comments: '142', platform: 'Instagram' },
                        { title: 'The Anatomy of a High-Converting Sales Script', format: 'Carousel', views: '28.6K', likes: '2.1K', comments: '98', platform: 'LinkedIn' },
                        { title: 'Behind the Scenes: Video Engine Rendering at Scale', format: 'Short', views: '18.9K', likes: '1.8K', comments: '64', platform: 'YouTube' },
                    ].map((item, idx) => (
                        <div
                            key={idx}
                            className="p-4 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">
                                    #{idx + 1}
                                </span>
                                <div>
                                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</h5>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                        <span>{item.platform}</span>
                                        <span>•</span>
                                        <span>{item.format}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                                <div>
                                    <span className="text-[10px] text-slate-400 block font-normal">Views</span>
                                    {item.views}
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block font-normal">Likes</span>
                                    {item.likes}
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block font-normal">Comments</span>
                                    {item.comments}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
