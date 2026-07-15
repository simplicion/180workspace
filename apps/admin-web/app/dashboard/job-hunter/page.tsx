'use client';


import { useState } from 'react';
import {
    Search, Briefcase, TrendingUp, Clock, CheckCircle2, Send,
    FileText, Target, Zap, ArrowUpRight, CalendarDays, MapPin,
    Building2, DollarSign, Star, Eye, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const STAT_CARDS = [
    { label: 'Total Applications', value: '0', change: '+0 this week', icon: Send, color: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
    { label: 'Active Searches', value: '0', change: 'AI matching', icon: Search, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Interviews', value: '0', change: 'Scheduled', icon: CalendarDays, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Profile Score', value: '—', change: 'Complete profile to start', icon: Target, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', iconColor: 'text-amber-600' },
];

const QUICK_ACTIONS = [
    { label: 'Upload Resume', description: 'Start building your AI profile', icon: FileText, href: '/dashboard/job-hunter/profile', color: 'bg-indigo-600' },
    { label: 'Search Jobs', description: 'Find AI-matched positions', icon: Search, href: '/dashboard/job-hunter/discovery', color: 'bg-blue-600' },
    { label: 'Auto Apply', description: 'Let AI handle applications', icon: Zap, href: '#', color: 'bg-purple-600', comingSoon: true },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function JobHunterDashboard() {
    const [activeTab, setActiveTab] = useState<'overview' | 'recent' | 'saved'>('overview');

    return (
        <div>
            {/* Header */}
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <Briefcase className="w-7 h-7 text-indigo-600" />
                        Job Hunter AI
                    </h1>
                    <p className="page-subtitle">AI-powered job search and automated applications</p>
                </div>
                <a href="/dashboard/job-hunter/discovery" className="btn-primary">
                    <Search className="w-4 h-4" />
                    Find Jobs
                </a>
            </div>

            {/* Stat Cards */}
            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {STAT_CARDS.map((card) => (
                    <motion.div key={card.label} variants={itemVariants} className="card p-5 hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between mb-3">
                            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', card.bg)}>
                                <card.icon className={clsx('w-5 h-5', card.iconColor)} />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{card.label}</p>
                        <p className="text-[10px] text-gray-300 mt-0.5 font-medium">{card.change}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {QUICK_ACTIONS.map((action) => (
                        <a
                            key={action.label}
                            href={action.comingSoon ? '#' : action.href}
                            className={clsx(
                                'card p-5 hover:shadow-lg transition-all group relative overflow-hidden',
                                action.comingSoon && 'opacity-60 cursor-not-allowed'
                            )}
                        >
                            <div className="flex items-start gap-4">
                                <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg', action.color)}>
                                    <action.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{action.label}</h4>
                                        {action.comingSoon && (
                                            <span className="badge badge-purple text-[9px] px-1.5 py-0.5">SOON</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5">{action.description}</p>
                                </div>
                            </div>
                            <div className={clsx('absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -translate-y-1/2 translate-x-1/2', action.color)} />
                        </a>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 border-b border-gray-100 pb-px">
                {(['overview', 'recent', 'saved'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx(
                            'px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all capitalize',
                            activeTab === tab
                                ? 'text-indigo-700 bg-indigo-50 border-b-2 border-indigo-600'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        )}
                    >
                        {tab === 'overview' ? 'Overview' : tab === 'recent' ? 'Recent Activity' : 'Saved Jobs'}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* AI Status Card */}
                    <div className="lg:col-span-2 card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">AI Job Matching</h3>
                                <p className="text-xs text-gray-400">Powered by your candidate profile</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-8 text-center border border-dashed border-gray-200">
                            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">Complete your profile to activate AI matching</p>
                            <p className="text-sm text-gray-400 mt-1">Upload your resume and fill out your preferences to get started</p>
                            <a href="/dashboard/job-hunter/profile" className="btn-primary mt-4 inline-flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Build Profile
                            </a>
                        </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="card p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Clock className="w-10 h-10 text-gray-200 mb-3" />
                            <p className="text-sm text-gray-400 font-medium">No activity yet</p>
                            <p className="text-xs text-gray-300 mt-1">Your application history will appear here</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {activeTab === 'recent' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-8">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Send className="w-12 h-12 text-gray-200 mb-3" />
                        <p className="text-gray-500 font-medium">No applications sent yet</p>
                        <p className="text-sm text-gray-400 mt-1">Start by discovering and applying to jobs</p>
                        <a href="/dashboard/job-hunter/discovery" className="btn-primary mt-4 inline-flex items-center gap-2">
                            <Search className="w-4 h-4" />
                            Discover Jobs
                        </a>
                    </div>
                </motion.div>
            )}

            {activeTab === 'saved' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-8">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Star className="w-12 h-12 text-gray-200 mb-3" />
                        <p className="text-gray-500 font-medium">No saved jobs yet</p>
                        <p className="text-sm text-gray-400 mt-1">Save jobs from the discovery page to review them later</p>
                        <a href="/dashboard/job-hunter/discovery" className="btn-primary mt-4 inline-flex items-center gap-2">
                            <Search className="w-4 h-4" />
                            Browse Jobs
                        </a>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
