'use client';

import { useState } from 'react';
import {
    Search, MessageCircle, FileText, ChevronRight, ChevronDown,
    Users, BarChart3, ShieldCheck, Zap, Globe, Github,
    Sparkles, Magnet, HelpCircle, ClipboardList,
    Mail, Phone, BookOpen, Star, CheckCircle2,
    TrendingUp, Lock, CreditCard
} from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

/* ─── Data ─────────────────────────────────────────────────────────────────── */

const QUICK_LINKS = [
    {
        href: '/dashboard/ai',
        icon: MessageCircle,
        label: 'Live Chat',
        sub: 'AI-powered assistant',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-500',
        border: 'hover:border-orange-200',
        glow: 'hover:shadow-orange-500/10',
    },
    {
        href: '/dashboard/help-support/release-notes',
        icon: FileText,
        label: 'Release Notes',
        sub: "View what's new",
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-500',
        border: 'hover:border-blue-200',
        glow: 'hover:shadow-blue-500/10',
    },
    {
        href: '/dashboard/help-support/community',
        icon: Globe,
        label: 'Community Forum',
        sub: 'Join other 180workspace users',
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-500',
        border: 'hover:border-emerald-200',
        glow: 'hover:shadow-emerald-500/10',
    },
    {
        href: '/dashboard/help-support/tickets',
        icon: ClipboardList,
        label: 'Track Tickets',
        sub: 'View support requests',
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-500',
        border: 'hover:border-violet-200',
        glow: 'hover:shadow-violet-500/10',
    },
];

const HELP_CATEGORIES = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        description: 'New to 180workspace? Learn the basics and set up your workspace in minutes.',
        icon: Zap,
        bg: 'bg-amber-50',
        text: 'text-amber-600',
        articles: [
            'Creating your first project',
            'Inviting team members',
            'Understanding user roles (RBAC)',
            'Setting up your company profile',
        ],
    },
    {
        id: 'crm-sales',
        title: 'CRM & Sales',
        description: 'Learn how to manage leads, pipelines, and close deals faster.',
        icon: Magnet,
        bg: 'bg-indigo-50',
        text: 'text-indigo-600',
        articles: [
            'Importing leads from CSV',
            'Setting up sales workflows',
            'Managing contracts & e-signatures',
            'Sales forecasting basics',
        ],
    },
    {
        id: 'hr-ops',
        title: 'HR & People',
        description: 'Managing employees, attendance, and recruitment efficiently.',
        icon: Users,
        bg: 'bg-rose-50',
        text: 'text-rose-600',
        articles: [
            'Automating attendance tracking',
            'Running performance reviews',
            'Drafting offer letters',
            'Employee offboarding process',
        ],
    },
    {
        id: 'ai-tools',
        title: 'AI Productivity',
        description: 'Leverage AI for content, meeting notes, and smart summaries.',
        icon: Sparkles,
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        articles: [
            'Generating a Content Calendar',
            'Corporate vs Personal Branding mode',
            'Using the AI Contract Analyzer',
            'AI-powered meeting transcriptions',
            'Customising the Chatbot assistant',
        ],
    },
    {
        id: 'finance',
        title: 'Finance & Invoicing',
        description: 'Handling invoices, expenses, and payroll without a headache.',
        icon: CreditCard,
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
        articles: [
            'Generating automated invoices',
            'Tracking multi-currency expenses',
            'Setting up payroll ledgers',
            'Financial reporting for CEOs',
        ],
    },
    {
        id: 'security',
        title: 'Security & Access',
        description: 'Protecting your data and managing platform permissions.',
        icon: Lock,
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        articles: [
            'Enabling Two-Factor Authentication',
            'Audit logs and activity tracking',
            'Data export and backup',
            'Managing API keys',
        ],
    },
];

const FAQS = [
    {
        q: 'What is 180workspace and how can it help my business?',
        a: '180workspace is an all-in-one ERP designed for modern teams. It combines CRM, HR, Finance, and AI Productivity tools into a single, unified workspace to eliminate data silos and accelerate growth.',
    },
    {
        q: 'How does the AI Content Calendar work?',
        a: 'Our AI analyses your brand voice, industry, and targets to generate a month-long content strategy — including headlines, captions, and visual briefs — tailored for different platforms.',
    },
    {
        q: 'Is my data secure on 180workspace?',
        a: 'Absolutely. We use enterprise-grade encryption for all data at rest and in transit, backed by granular Role-Based Access Control (RBAC) so you control exactly who sees what.',
    },
    {
        q: 'Can I integrate other apps with 180workspace?',
        a: 'Yes! 180workspace supports webhooks and has a public API so you can connect with tools like Slack, Google Workspace, and WhatsApp for seamless automation.',
    },
    {
        q: 'What support options are available?',
        a: 'You get access to our AI live-chat assistant 24/7, a rich documentation library, a community forum, and a priority ticket system — with dedicated support for enterprise plans.',
    },
    {
        q: 'How do I upgrade or change my subscription plan?',
        a: 'Navigate to Settings → Billing in your dashboard to view available plans, compare features, and upgrade or downgrade at any time. Changes apply at the next billing cycle.',
    },
];

const STATS = [
    { label: 'Articles published', value: '200+', icon: BookOpen },
    { label: 'Avg. response time', value: '< 2 hrs', icon: TrendingUp },
    { label: 'Customer rating', value: '4.9 / 5', icon: Star },
    { label: 'Issues resolved', value: '98%', icon: CheckCircle2 },
];

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function SupportCenterPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const filteredCategories = searchQuery
        ? HELP_CATEGORIES.filter(
            (cat) =>
                cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cat.articles.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : HELP_CATEGORIES;

    return (
        <div className="max-w-4xl space-y-6">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
                <p className="text-gray-500 mt-1">Search our documentation, browse guides, or connect with our support team.</p>
            </div>

            {/* Search */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for articles, features, or tutorials..."
                    className="w-full h-12 bg-white border border-gray-200 rounded-xl pl-12 pr-5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all font-medium text-sm"
                />
            </div>

            {/* ── Stats Bar ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {STATS.map(({ label, value, icon: Icon }) => (
                    <div
                        key={label}
                        className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-500/5 transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-gray-900 leading-none">{value}</p>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Quick Links ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {QUICK_LINKS.map(({ href, icon: Icon, label, sub, iconBg, iconColor, border, glow }) => (
                    <Link
                        key={href}
                        href={href}
                        className={clsx(
                            'flex items-center gap-4 p-6 rounded-2xl border border-gray-100 bg-white transition-all group',
                            border,
                            `hover:shadow-xl ${glow}`
                        )}
                    >
                        <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform', iconBg, iconColor)}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 truncate">{label}</h3>
                            <p className="text-sm text-gray-500 truncate">{sub}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 ml-auto shrink-0 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                ))}
            </div>

            {/* ── Categories ────────────────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Explore by Category</h2>
                        <p className="text-gray-500 text-sm font-medium mt-1">Find specific guides for every module</p>
                    </div>
                    <Link
                        href="/dashboard/help-support/docs"
                        className="hidden sm:flex items-center gap-1 text-indigo-600 font-bold text-sm hover:text-indigo-700 transition-colors"
                    >
                        View All Documentation <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                {filteredCategories.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No articles found for &ldquo;{searchQuery}&rdquo;</p>
                        <button onClick={() => setSearchQuery('')} className="mt-3 text-indigo-600 text-sm font-semibold hover:underline">
                            Clear search
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCategories.map((category) => {
                            const Icon = category.icon;
                            return (
                                <div
                                    key={category.id}
                                    className="group bg-white rounded-3xl border border-gray-100 p-7 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex flex-col"
                                >
                                    <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform', category.bg, category.text)}>
                                        <Icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1.5">{category.title}</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-grow">{category.description}</p>

                                    <div className="space-y-2.5 pt-5 border-t border-gray-50">
                                        {category.articles.map((article) => (
                                            <button
                                                key={article}
                                                className="w-full text-left text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2.5 group/item"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover/item:bg-indigo-400 shrink-0 transition-colors" />
                                                <span className="flex-1 leading-snug">{article}</span>
                                                <ChevronRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex sm:hidden mt-6 justify-center">
                    <Link href="/dashboard/help-support/docs" className="flex items-center gap-1 text-indigo-600 font-bold text-sm">
                        View All Documentation <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* ── FAQ Accordion ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Frequently Asked Questions</h2>
                    <p className="text-gray-500 font-medium text-sm">
                        Can&apos;t find what you&apos;re looking for? Most common questions are answered here.
                    </p>
                </div>

                <div className="space-y-3">
                    {FAQS.map((faq, i) => (
                        <div
                            key={i}
                            className={clsx(
                                'bg-white rounded-xl border transition-all overflow-hidden',
                                openFaq === i ? 'border-gray-900 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                            )}
                        >
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                            >
                                <span className="font-bold text-gray-900 text-sm">{faq.q}</span>
                                <span className={clsx(
                                    'w-6 h-6 rounded flex items-center justify-center shrink-0 transition-all',
                                    openFaq === i ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                                )}>
                                    <ChevronDown className={clsx('w-4 h-4 transition-transform', openFaq === i && 'rotate-180')} />
                                </span>
                            </button>
                            {openFaq === i && (
                                <div className="px-5 pb-4">
                                    <div className="h-px bg-gray-100 mb-3" />
                                    <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── CTA ───────────────────────────────────────────────────────── */}
            <div className="bg-gray-900 rounded-2xl p-8 md:p-10 text-center shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-white mb-2">Still need help?</h2>
                    <p className="text-gray-400 mb-6 text-sm">
                        Our technical support team is available around the clock to resolve your blockers. Reach out anytime via email or phone.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href="mailto:support@180workspace.com"
                            className="inline-flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-50 px-6 py-3 rounded-xl font-bold shadow-sm transition-all text-sm"
                        >
                            <Mail className="w-4 h-4" />
                            support@180workspace.com
                        </a>
                        <a
                            href="tel:+18001809000"
                            className="inline-flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-700 px-6 py-3 rounded-xl font-bold transition-all text-sm border border-gray-700"
                        >
                            <Phone className="w-4 h-4" />
                            +1 (800) 180-9000
                        </a>
                    </div>
                </div>
            </div>

        </div>
    );
}
