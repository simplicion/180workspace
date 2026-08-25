'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Building2, Database, CreditCard, Globe, ChevronRight, Users, Shield,
    Sparkles, Mail, Activity, Cloud, Settings2, ShieldCheck, Zap, Clock,
    Headphones, Plus, HeartPulse
} from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import clsx from 'clsx';

// ─── System Config Tiles ───
const SYSTEM_TILES = [
    {
        name: 'Company & Legals',
        icon: Building2,
        desc: 'Manage company information, legal settings, compliance and documents.',
        href: '/settings/company-legals',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
    },
    {
        name: 'Finance',
        icon: Database,
        desc: 'Configure banks, currencies, payment methods and payouts.',
        href: '/settings/finance',
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
    },
];

// ─── Global Config Tiles ───
const GLOBAL_TILES = [
    {
        id: 'ai',
        name: 'AI & Intelligence',
        icon: Sparkles,
        desc: 'Enable AI tools like analytics, insights, and chat.',
        href: '/settings/ai',
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        check: (s: any) => s?.lastAiTestStatus === 'success',
        rawCheck: (s: any) => !!(s?.openaiKey || s?.geminiKey || s?.claudeKey),
        status: (s: any) => s?.lastAiTestStatus,
    },
    {
        id: 'storage',
        name: 'Cloudinary Storage',
        icon: Cloud,
        desc: 'Store and manage files, media and backups securely.',
        href: '/settings/storage',
        iconBg: 'bg-sky-50',
        iconColor: 'text-sky-600',
        check: (s: any) => s?.lastStorageTestStatus === 'success' && !!(s?.cloudinaryCloudName && s?.cloudinaryApiKey && s?.cloudinaryApiSecret),
        rawCheck: (s: any) => !!(s?.cloudinaryCloudName || s?.cloudinaryApiKey || s?.cloudinaryApiSecret),
        status: (s: any) => (s?.lastStorageTestStatus === 'success' && s?.cloudinaryCloudName && s?.cloudinaryApiKey && s?.cloudinaryApiSecret) ? 'success' : 'none',
    },
    {
        id: 'email',
        name: 'Email System',
        icon: Mail,
        desc: 'Configure SMTP, email templates and verification settings.',
        href: '/settings/email',
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-600',
        check: (s: any) => s?.lastEmailTestStatus === 'success',
        rawCheck: (s: any) => !!(s?.smtpHost && s?.emailFrom),
        status: (s: any) => s?.lastEmailTestStatus,
    },
    {
        id: 'analytics',
        name: 'Plausible Analytics',
        icon: Activity,
        desc: 'Lightweight, privacy-focused analytics.',
        href: '/settings/plausible-analytics',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-600',
        check: (s: any) => !!(s?.plausibleApiKey && s?.plausibleSiteId),
        rawCheck: (s: any) => !!(s?.plausibleApiKey && s?.plausibleSiteId),
        status: (s: any) => (s?.plausibleApiKey && s?.plausibleSiteId) ? 'success' : 'none',
    },
    {
        id: 'google-integrations',
        name: 'Google Integrations',
        icon: Globe,
        desc: 'Connect external services like Google Drive, Docs, and Sheets.',
        href: '/settings/google-integrations',
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        check: (s: any) => !!s?.metadata?.googleDriveTokens,
        rawCheck: (s: any) => !!s?.metadata?.googleDriveTokens,
        status: (s: any) => s?.metadata?.googleDriveTokens ? 'success' : 'none',
    },
];

// ─── Status Badge ───
function StatusBadge({ settings, tile }: { settings: any; tile: typeof GLOBAL_TILES[0] }) {
    const testStatus = tile.status(settings || {});
    const isRawSet = tile.rawCheck(settings || {});

    let label = 'Pending';
    let dotColor = 'bg-gray-300';
    let textColor = 'text-gray-500';

    if (testStatus === 'success') {
        label = 'Connected';
        dotColor = 'bg-emerald-500 animate-pulse';
        textColor = 'text-emerald-600';
    } else if (testStatus === 'failure') {
        label = 'Failed';
        dotColor = 'bg-red-500';
        textColor = 'text-red-600';
    } else if (isRawSet) {
        label = 'Untested';
        dotColor = 'bg-amber-400';
        textColor = 'text-amber-600';
    }

    return (
        <div className={clsx('flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider', textColor)}>
            <div className={clsx('w-1.5 h-1.5 rounded-full', dotColor)} />
            {label}
        </div>
    );
}

// ─── Animation Variants ───
const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

// ─── Page ───
export default function SystemConfigsPage() {
    const { settings } = useSettings();

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-10 pb-16">
            {/* ─── Header ─── */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">System Configs</h1>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                        Centralized hub for platform-wide preferences and technical infrastructure.
                    </p>
                </div>
            </div>

            {/* ─── Section: System Configs ─── */}
            <section className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-gray-400">System Configs</h2>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    {SYSTEM_TILES.map((tile) => (
                        <motion.div key={tile.name} variants={cardVariants}>
                            <Link
                                href={tile.href}
                                className="group block p-5 rounded-2xl border border-gray-100 bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
                            >
                                {/* Icon */}
                                <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center mb-4', tile.iconBg)}>
                                    <tile.icon className={clsx('w-5 h-5', tile.iconColor)} />
                                </div>

                                {/* Title & Description */}
                                <h3 className="text-[15px] font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                                    {tile.name}
                                </h3>
                                <p className="text-[12px] text-gray-500 leading-relaxed mb-4 line-clamp-2">
                                    {tile.desc}
                                </p>

                                {/* Action */}
                                <div className="flex items-center gap-1 text-indigo-600 text-[11px] font-black uppercase tracking-widest group-hover:translate-x-0.5 transition-transform">
                                    Manage <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                            </Link>
                        </motion.div>
                    ))}

                    {GLOBAL_TILES.map((tile) => (
                        <motion.div key={tile.id} variants={cardVariants}>
                            <Link
                                href={tile.href}
                                className="group block p-5 rounded-2xl border border-gray-100 bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
                            >
                                {/* Icon + Status Row */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', tile.iconBg)}>
                                        <tile.icon className={clsx('w-5 h-5', tile.iconColor)} />
                                    </div>
                                    <StatusBadge settings={settings} tile={tile} />
                                </div>

                                {/* Title & Description */}
                                <h3 className="text-[14px] font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                                    {tile.name}
                                </h3>
                                <p className="text-[11px] text-gray-500 leading-relaxed mb-4 line-clamp-2">
                                    {tile.desc}
                                </p>

                                {/* Action */}
                                <div className="flex items-center gap-1 text-indigo-600 text-[11px] font-black uppercase tracking-widest group-hover:translate-x-0.5 transition-transform">
                                    Configure <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                            </Link>
                        </motion.div>
                    ))}

                    {/* Add New Configuration Card */}
                    <motion.div variants={cardVariants}>
                        <div className="group flex flex-col items-start justify-center p-5 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-300 h-full cursor-pointer">
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-3 group-hover:border-indigo-200 transition-colors">
                                <Plus className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                            </div>
                            <h3 className="text-[14px] font-bold text-gray-700 mb-1 group-hover:text-indigo-600 transition-colors">
                                Add New Configuration
                            </h3>
                            <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
                                Need to configure a new system or integration? Let&apos;s set it up.
                            </p>
                            <div className="flex items-center gap-1 text-indigo-600 text-[11px] font-black uppercase tracking-widest group-hover:translate-x-0.5 transition-transform">
                                Add Configuration <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </section>

        </div>
    );
}
