'use client';

import React from 'react';
import Link from 'next/link';
import { 
    FolderKanban, Share2, Plus, Users, Film, CheckCircle2, 
    Send, Settings, Sparkles, ChevronRight, Instagram, Linkedin, 
    Youtube, Calendar, MessageSquare, BarChart3, Image as ImageIcon,
    Sliders, CheckSquare, Layers, Lock, Zap
} from 'lucide-react';
import { SocialProject } from '@/lib/services/social-project.service';

interface ProjectHeaderProps {
    project: SocialProject;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onCreateContentClick: () => void;
    onSendForApprovalClick: () => void;
}

export const PROJECT_TABS = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'content', name: 'Content & Scripts', icon: Layers },
    { id: 'media', name: 'Media Library', icon: ImageIcon },
    { id: 'tasks', name: 'Editing Tasks', icon: CheckSquare },
    { id: 'approvals', name: 'Approvals', icon: CheckCircle2 },
    { id: 'publishing', name: 'Publishing', icon: Send },
    { id: 'inbox', name: 'Social Inbox', icon: MessageSquare },
    { id: 'engagement', name: '180 Engagement', icon: Zap },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'brand', name: 'Brand & AI', icon: Sparkles },
    { id: 'settings', name: 'Settings', icon: Sliders }
];

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
    project,
    activeTab,
    onTabChange,
    onCreateContentClick,
    onSendForApprovalClick
}) => {
    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 pt-6 px-6 md:px-10">
            {/* Top Breadcrumb & Metadata */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
                        <Link href="/social-projects" className="hover:text-indigo-600 transition">Social Projects</Link>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {project.client?.name || 'Internal'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-900 dark:text-slate-100 font-bold truncate">{project.name}</span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                            {project.name}
                        </h1>
                        <span className="px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full capitalize">
                            {project.status.replace('_', ' ')}
                        </span>
                    </div>

                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 max-w-2xl">
                        {project.description || 'Project-based social media planning, footage intake, 180 Media Studio editing, and publishing.'}
                    </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={onSendForApprovalClick}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                    >
                        <Send className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Send for Client Approval</span>
                    </button>

                    <button
                        onClick={onCreateContentClick}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Content</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation Bar */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800/80 -mx-6 md:-mx-10 px-6 md:px-10">
                {PROJECT_TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-all duration-150 ${
                                isActive
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
