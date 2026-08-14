'use client';


import { useState } from 'react';
import {
    Search, MapPin, Building2, DollarSign, Clock, Briefcase,
    Filter, Star, ExternalLink, Bookmark, ChevronDown, Sparkles,
    ArrowUpDown, Grid3X3, List, Zap, TrendingUp, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const JOB_TYPES = ['All Types', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
const EXPERIENCE_LEVELS = ['All Levels', 'Entry Level', 'Mid Level', 'Senior', 'Lead', 'Executive'];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function JobDiscoveryPage() {
    const [search, setSearch] = useState('');
    const [location, setLocation] = useState('');
    const [jobType, setJobType] = useState('All Types');
    const [experience, setExperience] = useState('All Levels');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showFilters, setShowFilters] = useState(false);

    return (
        <div>
            {/* Header */}
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <Search className="w-7 h-7 text-blue-600" />
                        Job Discovery
                    </h1>
                    <p className="page-subtitle">AI-powered job matching based on your profile</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        className="btn-secondary p-2"
                        title="Toggle view"
                    >
                        {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="card p-4 mb-5">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Job title, company, or keywords..."
                            className="input pl-9 w-full"
                        />
                    </div>
                    <div className="relative flex-1 max-w-xs">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="City, state, or remote..."
                            className="input pl-9 w-full"
                        />
                    </div>
                    <button className="btn-primary px-6">
                        <Sparkles className="w-4 h-4" />
                        AI Search
                    </button>
                </div>

                {/* Expandable Filters */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 mt-4 border-t border-gray-100">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Job Type</label>
                                    <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="select w-full" title="Job Type">
                                        {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Experience</label>
                                    <select value={experience} onChange={(e) => setExperience(e.target.value)} className="select w-full" title="Experience Level">
                                        {EXPERIENCE_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Salary Min</label>
                                    <input type="number" placeholder="e.g. 50000" className="input w-full" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Posted Within</label>
                                    <select className="select w-full" title="Posted Within">
                                        <option>Any time</option>
                                        <option>Last 24 hours</option>
                                        <option>Last 7 days</option>
                                        <option>Last 30 days</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* AI Match Banner */}
            <div className="card p-5 mb-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border-indigo-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Target className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">AI Job Matching Active</h3>
                        <p className="text-sm text-gray-500">Complete your <a href="/dashboard/job-hunter/profile" className="text-indigo-600 font-medium hover:underline">candidate profile</a> to get personalized job recommendations with match scores.</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                        <div className="text-center px-4 py-2 bg-white/70 rounded-xl border border-indigo-100">
                            <p className="text-lg font-bold text-indigo-600">0</p>
                            <p className="text-[10px] text-gray-400 font-medium uppercase">Matches</p>
                        </div>
                        <div className="text-center px-4 py-2 bg-white/70 rounded-xl border border-indigo-100">
                            <p className="text-lg font-bold text-emerald-600">—%</p>
                            <p className="text-[10px] text-gray-400 font-medium uppercase">Avg Score</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="card p-8"
            >
                <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-5">
                        <Briefcase className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Ready to discover your next opportunity?</h3>
                    <p className="text-sm text-gray-400 max-w-md mb-1">
                        Use the search bar above to find jobs, or complete your profile to let our AI
                        automatically discover and rank the best matches for you.
                    </p>
                    <div className="flex items-center gap-6 mt-6 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>AI-Powered Matching</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>Auto-Apply (Coming Soon)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Smart Job Scoring</span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}

