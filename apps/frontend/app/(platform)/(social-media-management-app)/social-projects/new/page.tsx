'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ArrowLeft, ArrowRight, Check, Sparkles, Building2, Layers, 
    Share2, Users, ShieldCheck, Plus, X, Globe, MessageSquare, 
    Film, Image, BarChart3, Palette, HelpCircle
} from 'lucide-react';
import { socialProjectService } from '@/lib/services/social-project.service';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const SERVICES_OPTIONS = [
    { id: 'content_calendar', name: 'Content Strategy & Calendar', icon: Layers, desc: 'AI-assisted content mapping and schedule management' },
    { id: 'short_form_video', name: 'Short-Form Video Production', icon: Film, desc: 'Reels, TikToks, Shorts intake and 180 Media Studio editing' },
    { id: 'static_posts', name: 'Static & Carousel Production', icon: Image, desc: 'Feed image creation, multi-slide carousels, and graphics' },
    { id: 'publishing', name: 'Multi-Platform Publishing', icon: Share2, desc: 'Automated scheduling across Instagram, LinkedIn, TikTok, YouTube' },
    { id: 'inbox', name: 'Community Inbox & AI Replies', icon: MessageSquare, desc: 'Unified comment and direct message response management' },
    { id: 'analytics', name: 'Analytics & Attribution', icon: BarChart3, desc: 'Live reach, engagement reporting, and business outcome tracking' }
];

const TONE_PRESETS = [
    'Professional & Insightful',
    'Bold & Provocative',
    'Casual & Authentic',
    'Educational & Authoritative',
    'Witty & Entertaining',
    'Inspirational & Uplifting'
];

export default function CreateSocialProjectWizardPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Existing clients & accounts for selection
    const [clients, setClients] = useState<any[]>([]);
    const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);

    // Wizard Form State
    const [formData, setFormData] = useState({
        // Step 1
        name: '',
        clientId: '',
        clientName: '',
        clientEmail: '',
        isNewClient: false,
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',

        // Step 2
        socialServices: ['content_calendar', 'short_form_video', 'publishing', 'analytics'],

        // Step 3: Brand Voice
        brandTone: 'Professional & Insightful',
        targetAudience: 'Growth-minded founders, marketers, and decision-makers',
        contentPillars: ['Industry Trends & Insights', 'Actionable Frameworks', 'Customer Success Stories', 'Behind the Scenes'],
        newPillarInput: '',
        forbiddenWords: ['revolutionary', 'disruptive', 'cheap'],
        newForbiddenWord: '',
        standardCtas: ['Link in bio to get started', 'Comment YOUR thoughts below', 'DM us "GROW" for details'],
        newCtaInput: '',

        // Step 4: Social Accounts
        connectedAccountIds: [] as string[],

        // Step 5: Team & Rules
        approvalRequired: true,
        defaultTimezone: 'UTC',
        storageRetentionDays: 30,
        teamMemberIds: [] as string[]
    });

    useEffect(() => {
        // Fetch clients & social accounts for dropdowns
        const fetchPrerequisites = async () => {
            try {
                const [clientsRes, accountsRes, usersRes] = await Promise.all([
                    api.get('/api/clients').catch(() => ({ data: { clients: [] } })),
                    api.get('/api/social-media/accounts').catch(() => ({ data: { accounts: [] } })),
                    api.get('/api/users').catch(() => ({ data: { users: [] } }))
                ]);
                setClients(clientsRes.data?.clients || []);
                setAvailableAccounts(accountsRes.data?.accounts || []);
                setTeamMembers(usersRes.data?.users || []);
            } catch (e) {
                console.error('Failed to load prerequisites', e);
            }
        };
        fetchPrerequisites();
    }, []);

    const toggleService = (serviceId: string) => {
        setFormData(prev => ({
            ...prev,
            socialServices: prev.socialServices.includes(serviceId)
                ? prev.socialServices.filter(s => s !== serviceId)
                : [...prev.socialServices, serviceId]
        }));
    };

    const addPillar = () => {
        if (!formData.newPillarInput.trim()) return;
        setFormData(prev => ({
            ...prev,
            contentPillars: [...prev.contentPillars, prev.newPillarInput.trim()],
            newPillarInput: ''
        }));
    };

    const removePillar = (index: number) => {
        setFormData(prev => ({
            ...prev,
            contentPillars: prev.contentPillars.filter((_, i) => i !== index)
        }));
    };

    const addForbiddenWord = () => {
        if (!formData.newForbiddenWord.trim()) return;
        setFormData(prev => ({
            ...prev,
            forbiddenWords: [...prev.forbiddenWords, prev.newForbiddenWord.trim()],
            newForbiddenWord: ''
        }));
    };

    const removeForbiddenWord = (index: number) => {
        setFormData(prev => ({
            ...prev,
            forbiddenWords: prev.forbiddenWords.filter((_, i) => i !== index)
        }));
    };

    const toggleAccountSelection = (accId: string) => {
        setFormData(prev => ({
            ...prev,
            connectedAccountIds: prev.connectedAccountIds.includes(accId)
                ? prev.connectedAccountIds.filter(id => id !== accId)
                : [...prev.connectedAccountIds, accId]
        }));
    };

    const handleCreateProject = async () => {
        if (!formData.name.trim()) {
            toast.error('Please enter a project name');
            setStep(1);
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                name: formData.name,
                clientId: !formData.isNewClient && formData.clientId ? formData.clientId : undefined,
                clientName: formData.isNewClient ? formData.clientName : undefined,
                clientEmail: formData.isNewClient ? formData.clientEmail : undefined,
                description: formData.description,
                startDate: formData.startDate || undefined,
                endDate: formData.endDate || undefined,
                socialServices: formData.socialServices,
                brandProfile: {
                    tone: formData.brandTone,
                    targetAudience: formData.targetAudience,
                    contentPillars: formData.contentPillars,
                    forbiddenWords: formData.forbiddenWords,
                    standardCtas: formData.standardCtas
                },
                connectedAccountIds: formData.connectedAccountIds,
                teamMemberIds: formData.teamMemberIds,
                settings: {
                    approvalRequired: formData.approvalRequired,
                    defaultTimezone: formData.defaultTimezone,
                    storageRetentionDays: formData.storageRetentionDays
                }
            };

            const project = await socialProjectService.createProject(payload);
            toast.success('Social Media Project created successfully!');
            router.push(`/social-projects/${project.id}`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.message || 'Failed to create project');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen p-6 md:p-10 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col justify-between">
            <div className="max-w-4xl mx-auto w-full space-y-8">
                {/* Top Nav Back */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/social-projects"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Projects</span>
                    </Link>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Step {step} of 5
                    </span>
                </div>

                {/* Progress Indicator */}
                <div className="grid grid-cols-5 gap-2">
                    {[
                        'Basic Info',
                        'Services',
                        'Brand Voice',
                        'Social Accounts',
                        'Team & Rules'
                    ].map((title, idx) => {
                        const stepNum = idx + 1;
                        const isDone = step > stepNum;
                        const isCurrent = step === stepNum;

                        return (
                            <div key={title} className="space-y-1.5">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        isDone
                                            ? 'bg-emerald-500'
                                            : isCurrent
                                            ? 'bg-indigo-600 shadow-md shadow-indigo-600/30'
                                            : 'bg-slate-200 dark:bg-slate-800'
                                    }`}
                                />
                                <p className={`text-[11px] font-medium hidden sm:block truncate ${
                                    isCurrent ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400'
                                }`}>
                                    {title}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Step Card Content */}
                <div className="p-8 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-900/5 min-h-[460px]">
                    {/* STEP 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Project Overview</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Name your social engagement and designate the client relationship.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Project Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Acme Q3 Growth Campaign"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 transition text-slate-900 dark:text-slate-100 font-medium"
                                    />
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            Client Association
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, isNewClient: !formData.isNewClient })}
                                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            {formData.isNewClient ? '← Select Existing Client' : '+ Create New Client'}
                                        </button>
                                    </div>

                                    {formData.isNewClient ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                placeholder="Client Company Name"
                                                value={formData.clientName}
                                                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                                                className="px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                            />
                                            <input
                                                type="email"
                                                placeholder="Client Primary Email"
                                                value={formData.clientEmail}
                                                onChange={e => setFormData({ ...formData, clientEmail: e.target.value })}
                                                className="px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                            />
                                        </div>
                                    ) : (
                                        <select
                                            value={formData.clientId}
                                            onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                                            className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                        >
                                            <option value="">-- Select Existing Client --</option>
                                            {clients.map(c => (
                                                <option key={c.id || c._id} value={c.id || c._id}>
                                                    {c.name} {c.companyName ? `(${c.companyName})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Project Scope & Objective
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Describe the strategic goals, key deliverables, and client KPIs..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 transition text-slate-900 dark:text-slate-100"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                            Target End / Milestone Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Included Services */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Engagement Services</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Select the capabilities enabled for this client project workspace.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {SERVICES_OPTIONS.map(service => {
                                    const Icon = service.icon;
                                    const isSelected = formData.socialServices.includes(service.id);

                                    return (
                                        <div
                                            key={service.id}
                                            onClick={() => toggleService(service.id)}
                                            className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start gap-4 ${
                                                isSelected
                                                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10'
                                                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className={`p-3 rounded-xl ${
                                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                            }`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                        {service.name}
                                                    </h4>
                                                    {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    {service.desc}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Brand Voice & AI Context */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Brand Voice & AI Profile</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Configure this project's isolated brand identity. The AI will strictly honor these guardrails.
                                </p>
                            </div>

                            <div className="space-y-5">
                                {/* Tone Selector */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                                        Brand Voice Tone
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {TONE_PRESETS.map(tone => (
                                            <button
                                                type="button"
                                                key={tone}
                                                onClick={() => setFormData({ ...formData, brandTone: tone })}
                                                className={`p-2.5 text-xs font-semibold rounded-xl border text-left transition ${
                                                    formData.brandTone === tone
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                                                }`}
                                            >
                                                {tone}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Target Audience */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Target Audience
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.targetAudience}
                                        onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                                        className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                    />
                                </div>

                                {/* Content Pillars */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Content Pillars (Themes)
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {formData.contentPillars.map((p, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-900"
                                            >
                                                {p}
                                                <button type="button" onClick={() => removePillar(idx)} className="hover:text-rose-500">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Add content pillar..."
                                            value={formData.newPillarInput}
                                            onChange={e => setFormData({ ...formData, newPillarInput: e.target.value })}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPillar(); } }}
                                            className="flex-1 px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={addPillar}
                                            className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>

                                {/* Forbidden Words */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Forbidden Words / Anti-Vocabulary
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {formData.forbiddenWords.map((w, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-900"
                                            >
                                                {w}
                                                <button type="button" onClick={() => removeForbiddenWord(idx)} className="hover:text-rose-700">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="e.g. cheap, guarantee..."
                                            value={formData.newForbiddenWord}
                                            onChange={e => setFormData({ ...formData, newForbiddenWord: e.target.value })}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addForbiddenWord(); } }}
                                            className="flex-1 px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={addForbiddenWord}
                                            className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Social Accounts */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Social Accounts</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Associate target social accounts for publishing and community management.
                                </p>
                            </div>

                            {availableAccounts.length === 0 ? (
                                <div className="text-center py-10 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
                                    <Share2 className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Connected Social Accounts Yet</h4>
                                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                                        You can continue project creation now and link Instagram, LinkedIn, TikTok, or YouTube accounts later in project settings.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {availableAccounts.map(acc => {
                                        const isSelected = formData.connectedAccountIds.includes(acc.id);
                                        return (
                                            <div
                                                key={acc.id}
                                                onClick={() => toggleAccountSelection(acc.id)}
                                                className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                                                    isSelected
                                                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-sm'
                                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                                                        {acc.platform.slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{acc.accountName}</h4>
                                                        <p className="text-xs text-slate-500">@{acc.username} ({acc.platform})</p>
                                                    </div>
                                                </div>
                                                {isSelected && <Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 5: Team & Workflow Rules */}
                    {step === 5 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Workflow Rules & Team Access</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Set approval requirements, default timezones, and asset retention policies.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Approval Required Toggle */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                            Require Client / Editorial Approval
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Content cannot be scheduled or published until approved via the client review portal.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={formData.approvalRequired}
                                        onChange={e => setFormData({ ...formData, approvalRequired: e.target.checked })}
                                        className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                            Default Publishing Timezone
                                        </label>
                                        <select
                                            value={formData.defaultTimezone}
                                            onChange={e => setFormData({ ...formData, defaultTimezone: e.target.value })}
                                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                        >
                                            <option value="UTC">UTC (Universal)</option>
                                            <option value="America/New_York">Eastern Time (US/Canada)</option>
                                            <option value="America/Los_Angeles">Pacific Time (US/Canada)</option>
                                            <option value="Europe/London">London (GMT/BST)</option>
                                            <option value="Asia/Kolkata">India (IST)</option>
                                            <option value="Asia/Tokyo">Tokyo (JST)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                            Raw Footage Retention (Days)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.storageRetentionDays}
                                            onChange={e => setFormData({ ...formData, storageRetentionDays: parseInt(e.target.value) || 30 })}
                                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Wizard Footer Controls */}
                <div className="flex items-center justify-between pt-4">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 transition"
                        >
                            Previous Step
                        </button>
                    ) : <div />}

                    {step < 5 ? (
                        <button
                            type="button"
                            onClick={() => setStep(step + 1)}
                            className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition active:scale-95"
                        >
                            <span>Next Step</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleCreateProject}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/25 transition active:scale-95 disabled:opacity-50"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>{isSubmitting ? 'Creating Project...' : 'Launch Social Project'}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
