'use client';


import { useState } from 'react';
import {
    UserSquare, FileText, Upload, GraduationCap, Briefcase, Code2,
    MapPin, DollarSign, Globe, Award, Plus, ChevronRight,
    CheckCircle2, AlertCircle, Star, Sparkles, Target, Edit3, Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const PROFILE_SECTIONS = [
    { id: 'resume', label: 'Resume', icon: FileText, description: 'Upload or paste your resume', status: 'pending' },
    { id: 'education', label: 'Education', icon: GraduationCap, description: 'Degrees, certifications, courses', status: 'pending' },
    { id: 'experience', label: 'Experience', icon: Briefcase, description: 'Work history and roles', status: 'pending' },
    { id: 'skills', label: 'Skills', icon: Code2, description: 'Technical and soft skills', status: 'pending' },
    { id: 'preferences', label: 'Preferences', icon: Target, description: 'Desired role, salary, location', status: 'pending' },
    { id: 'projects', label: 'Projects', icon: Star, description: 'Portfolio and key projects', status: 'pending' },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function CandidateProfilePage() {
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const completedCount = 0;
    const totalSections = PROFILE_SECTIONS.length;
    const progressPercent = Math.round((completedCount / totalSections) * 100);

    return (
        <div>
            {/* Header */}
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <UserSquare className="w-7 h-7 text-purple-600" />
                        Candidate Profile
                    </h1>
                    <p className="page-subtitle">Build your AI-powered master profile for job matching</p>
                </div>
                <button className="btn-primary" disabled>
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                </button>
            </div>

            {/* Profile Completion Card */}
            <div className="card p-6 mb-6">
                <div className="flex items-center gap-6">
                    {/* Avatar / Upload */}
                    <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center border-2 border-dashed border-purple-200 cursor-pointer hover:border-purple-400 transition-colors group">
                            <Upload className="w-8 h-8 text-purple-300 group-hover:text-purple-500 transition-colors" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center">
                            <Plus className="w-3 h-3 text-gray-400" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h3 className="font-semibold text-gray-900">Profile Completion</h3>
                                <p className="text-xs text-gray-400">Complete all sections to maximize your AI match score</p>
                            </div>
                            <span className="text-2xl font-bold text-gray-900">{progressPercent}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {completedCount} completed
                            </span>
                            <span className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-amber-500" />
                                {totalSections - completedCount} remaining
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resume Upload Section */}
            <div className="card p-6 mb-6 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-transparent border-indigo-100/50">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Upload Your Resume</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Our AI will automatically extract your education, skills, experience, and projects to build your master profile.
                        </p>
                        <div className="mt-4 border-2 border-dashed border-indigo-200 rounded-2xl p-8 text-center bg-white/60 hover:border-indigo-400 transition-colors cursor-pointer group">
                            <Upload className="w-10 h-10 text-indigo-300 mx-auto mb-3 group-hover:text-indigo-500 transition-colors" />
                            <p className="text-sm font-medium text-gray-600">Drop your resume here or click to browse</p>
                            <p className="text-xs text-gray-400 mt-1">PDF, DOCX, or TXT (max 10MB)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Sections */}
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Profile Sections</h3>
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {PROFILE_SECTIONS.map((section) => (
                    <motion.div
                        key={section.id}
                        variants={itemVariants}
                        onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                        className={clsx(
                            'card p-5 cursor-pointer hover:shadow-md transition-all group',
                            activeSection === section.id && 'ring-2 ring-indigo-200 shadow-md'
                        )}
                    >
                        <div className="flex items-start gap-4">
                            <div className={clsx(
                                'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                                section.status === 'complete' ? 'bg-emerald-50' : 'bg-gray-50 group-hover:bg-indigo-50'
                            )}>
                                {section.status === 'complete' ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <section.icon className={clsx('w-5 h-5', 'text-gray-400 group-hover:text-indigo-500 transition-colors')} />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{section.label}</h4>
                                    <ChevronRight className={clsx(
                                        'w-4 h-4 text-gray-300 transition-transform',
                                        activeSection === section.id && 'rotate-90 text-indigo-500'
                                    )} />
                                </div>
                                <p className="text-sm text-gray-400 mt-0.5">{section.description}</p>
                                {section.status === 'pending' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-2 uppercase tracking-wider">
                                        <AlertCircle className="w-3 h-3" />
                                        Not Started
                                    </span>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Job Preferences */}
            <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Job Preferences</h3>
                <div className="card p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <Briefcase className="w-3.5 h-3.5" />
                                <span>Desired Role</span>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-200 text-center">
                                <p className="text-sm text-gray-400">Not set</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Salary Range</span>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-200 text-center">
                                <p className="text-sm text-gray-400">Not set</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Location</span>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-200 text-center">
                                <p className="text-sm text-gray-400">Not set</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
