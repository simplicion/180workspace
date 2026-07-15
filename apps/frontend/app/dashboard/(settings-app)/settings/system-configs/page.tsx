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
        href: '/dashboard/settings/company-legals',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
    },
    {
        name: 'Finance',
        icon: Database,
        desc: 'Configure banks, currencies, payment methods and payouts.',
        href: '/dashboard/settings/finance',
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
    },
    {
        name: 'Billing',
        icon: CreditCard,
        desc: 'Manage subscription plans, invoices, taxes and usage limits.',
        href: '/dashboard/billing',
        iconBg: 'bg-purple-50',
        iconColor: 'text-purple-600',
    },
    {
        name: 'User Management',
        icon: Users,
        desc: 'Invite users, manage teams, permissions and roles.',
        href: '/dashboard/settings/user-management',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
    },
    {
        name: 'Roles & Access',
        icon: Shield,
        desc: 'Define roles, access levels and permission control.',
        href: '/dashboard/settings/roles-access',
        iconBg: 'bg-rose-50',
        iconColor: 'text-rose-600',
    },
];

// ─── Global Config Tiles ───
const GLOBAL_TILES = [
    {
        id: 'ai',
        name: 'AI & Intelligence',
        icon: Sparkles,
        desc: 'Enable AI tools like analytics, insights, and chat.',
        href: '/dashboard/settings/ai',
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        check: (s: any) => s?.lastAiTestStatus === 'success',
        rawCheck: (s: any) => !!(s?.openaiKey || s?.geminiKey || s?.claudeKey),
        status: (s: any) => s?.lastAiTestStatus,
    },
    {
        id: 'storage',
        name: 'Cloud Storage',
        icon: Cloud,
        desc: 'Store and manage files, media and backups securely.',
        href: '/dashboard/settings/storage',
        iconBg: 'bg-sky-50',
        iconColor: 'text-sky-600',
        check: (s: any) => s?.lastStorageTestStatus === 'success',
        rawCheck: (s: any) => !!(s?.cloudinaryCloudName || s?.googleDriveServiceAccount),
        status: (s: any) => s?.lastStorageTestStatus,
    },
    {
        id: 'email',
        name: 'Email System',
        icon: Mail,
        desc: 'Configure SMTP, email templates and verification settings.',
        href: '/dashboard/settings/email',
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-600',
        check: (s: any) => s?.lastEmailTestStatus === 'success',
        rawCheck: (s: any) => !!(s?.smtpHost && s?.emailFrom),
        status: (s: any) => s?.lastEmailTestStatus,
    },
    {
        id: 'webhooks',
        name: 'Webhooks',
        icon: Globe,
        desc: 'Manage webhook endpoints and automation triggers.',
        href: '/dashboard/settings/webhooks',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-600',
        check: (s: any) => !!s?.webhookUrl,
        rawCheck: (s: any) => !!s?.webhookUrl,
        status: (s: any) => s?.webhookUrl ? 'success' : 'none',
    },
    {
        id: 'crm',
        name: 'CRM Algorithms',
        icon: Activity,
        desc: 'Configure lead scoring, automation rules and predictions.',
        href: '/dashboard/settings/crm',
        iconBg: 'bg-teal-50',
        iconColor: 'text-teal-600',
        check: (s: any) => !!s?.salesConfig,
        rawCheck: (s: any) => !!s?.salesConfig,
        status: (s: any) => s?.salesConfig ? 'success' : 'none',
    },
];

// ─── Bottom Trust Bar Items ───
const TRUST_ITEMS = [
    { icon: ShieldCheck, title: 'Secure & Reliable', desc: 'Enterprise-grade security and data protection.' },
    { icon: Zap, title: 'High Performance', desc: 'Optimized infrastructure for speed and scale.' },
    { icon: Clock, title: '99.9% Uptime', desc: 'Built for reliability and always-on access.' },
    { icon: Headphones, title: '24/7 Support', desc: 'Our team is here to help you anytime, anywhere.' },
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
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                            Admin
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                        Centralized hub for platform-wide preferences and technical infrastructure.
                    </p>
                </div>
                <Link
                    href="/dashboard/settings/system-configs"
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
                >
                    <HeartPulse className="w-4 h-4 text-emerald-500" />
                    System Health
                </Link>
            </div>

            {/* ─── Section: System Configs ─── */}
            <section className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-gray-400">System Configs</h2>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
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
                </motion.div>
            </section>

            {/* ─── Section: Global Configs ─── */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.15em] text-gray-400">Global Configs</h2>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
                            Shared infrastructure used across multiple applications.
                        </p>
                    </div>
                </div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
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

            {/* ─── Trust Footer ─── */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                {TRUST_ITEMS.map((item) => (
                    <div key={item.title} className="flex items-start gap-3 p-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                            <item.icon className="w-4.5 h-4.5 text-gray-400" />
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-gray-800">{item.title}</p>
                            <p className="text-[10px] text-gray-400 leading-relaxed mt-0.5">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
}
