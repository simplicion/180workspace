'use client';

import React, { useState, useEffect } from 'react';
import { 
    Zap, Send, Heart, Target, Plus, Search, CheckCircle2, 
    AlertCircle, Sparkles, Bot, ArrowRight, Trash2, Edit3, 
    ToggleLeft, ToggleRight, ExternalLink, RefreshCw, Layers, 
    MessageSquare, ShieldCheck, Tag, Info, Check, Play
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
    socialEngagementService, 
    EngagementRule, 
    EngagementStats, 
    CreateEngagementRuleDTO 
} from '@/lib/services/social-engagement.service';
import { SocialProject } from '@/lib/services/social-project.service';
import { UniversalSkeleton, Button } from '@workspace/ui';

interface EngagementTabProps {
    project: SocialProject;
}

export const EngagementTab: React.FC<EngagementTabProps> = ({ project }) => {
    const [rules, setRules] = useState<EngagementRule[]>([]);
    const [stats, setStats] = useState<EngagementStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Test match state
    const [testInputText, setTestInputText] = useState('Hey love this video, send me the BLUEPRINT!');
    const [testKeywords, setTestKeywords] = useState('BLUEPRINT, GUIDE, LINK');
    const [testMatchResult, setTestMatchResult] = useState<any>(null);
    const [testingMatch, setTestingMatch] = useState(false);

    // Form state for rule creation
    const [formState, setFormState] = useState<CreateEngagementRuleDTO>({
        name: 'Viral Reel Lead Magnet',
        projectId: project.id,
        triggerType: 'comment_keyword',
        triggerKeywords: ['BLUEPRINT', 'WORKFLOW'],
        matchMode: 'contains',
        actionAutoLike: true,
        actionPublicReplies: [
            'Sent straight to your DM, {handle}! 🚀',
            'Check your DMs @{handle}, just sent the link! 🙌',
            'All yours {handle}! Sent to your inbox ✨'
        ],
        actionSendDm: true,
        actionDmTemplate: 'Hey {name}! Here is your VIP access link: {link} 🚀 What is your current monthly goal?',
        actionDmDeliverableUrl: 'https://180workspace.com/blueprint',
        actionEnableAiAgent: true,
        aiAgentGoal: 'qualify_lead'
    });
    const [keywordsInput, setKeywordsInput] = useState('BLUEPRINT, WORKFLOW');
    const [publicRepliesInput, setPublicRepliesInput] = useState(
        'Sent straight to your DM, {handle}! 🚀\nCheck your DMs @{handle}, just sent the link! 🙌\nAll yours {handle}! Sent to your inbox ✨'
    );
    const [submittingRule, setSubmittingRule] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const [fetchedRules, fetchedStats] = await Promise.all([
                socialEngagementService.getRules({ projectId: project.id }),
                socialEngagementService.getStats(project.id)
            ]);
            setRules(fetchedRules);
            setStats(fetchedStats);
        } catch (err: any) {
            console.error('Error loading engagement rules:', err);
            toast.error('Failed to load engagement rules');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [project.id]);

    const handleToggleRule = async (ruleId: string) => {
        try {
            setTogglingId(ruleId);
            const updated = await socialEngagementService.toggleRule(ruleId);
            setRules(prev => prev.map(r => r.id === ruleId ? updated : r));
            toast.success(`Rule is now ${updated.status}`);
            // Refresh stats
            socialEngagementService.getStats(project.id).then(setStats).catch(() => null);
        } catch (err: any) {
            toast.error('Failed to toggle rule');
        } finally {
            setTogglingId(null);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm('Are you sure you want to delete this engagement rule?')) return;
        try {
            setDeletingId(ruleId);
            await socialEngagementService.deleteRule(ruleId);
            setRules(prev => prev.filter(r => r.id !== ruleId));
            toast.success('Engagement rule deleted');
            socialEngagementService.getStats(project.id).then(setStats).catch(() => null);
        } catch (err: any) {
            toast.error('Failed to delete rule');
        } finally {
            setDeletingId(null);
        }
    };

    const handleCreateRuleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmittingRule(true);
            const splitKeywords = keywordsInput
                .split(',')
                .map(k => k.trim())
                .filter(Boolean);

            const splitReplies = publicRepliesInput
                .split('\n')
                .map(r => r.trim())
                .filter(Boolean);

            const payload: CreateEngagementRuleDTO = {
                ...formState,
                projectId: project.id,
                triggerKeywords: splitKeywords,
                actionPublicReplies: splitReplies
            };

            const created = await socialEngagementService.createRule(payload);
            setRules(prev => [created, ...prev]);
            toast.success('Engagement automation created successfully!');
            setIsCreateModalOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create engagement rule');
        } finally {
            setSubmittingRule(false);
        }
    };

    const handleRunTestMatch = async () => {
        try {
            setTestingMatch(true);
            const kws = testKeywords.split(',').map(k => k.trim()).filter(Boolean);
            const res = await socialEngagementService.testMatch({
                text: testInputText,
                keywords: kws,
                matchMode: 'contains'
            });
            setTestMatchResult(res);
        } catch (err: any) {
            toast.error('Test match request failed');
        } finally {
            setTestingMatch(false);
        }
    };

    const applyPreset = (presetKey: 'blueprint' | 'support' | 'discount') => {
        if (presetKey === 'blueprint') {
            setFormState(prev => ({
                ...prev,
                name: 'Viral Reel Blueprint Lead Magnet',
                triggerKeywords: ['BLUEPRINT', 'WORKFLOW'],
                actionAutoLike: true,
                actionDmTemplate: 'Hey {name}! Here is your free blueprint link: {link} 🚀 What is your target monthly revenue?',
                actionDmDeliverableUrl: 'https://180workspace.com/blueprint',
                actionEnableAiAgent: true,
                aiAgentGoal: 'qualify_lead'
            }));
            setKeywordsInput('BLUEPRINT, WORKFLOW');
        } else if (presetKey === 'support') {
            setFormState(prev => ({
                ...prev,
                name: 'Inbound FAQ & Customer Support Bot',
                triggerKeywords: ['HELP', 'SUPPORT', 'QUESTION'],
                actionAutoLike: true,
                actionDmTemplate: 'Hey {name}! I am the 180 AI Assistant. How can we help you solve your problem today?',
                actionDmDeliverableUrl: '',
                actionEnableAiAgent: true,
                aiAgentGoal: 'answer_support'
            }));
            setKeywordsInput('HELP, SUPPORT, QUESTION');
        } else if (presetKey === 'discount') {
            setFormState(prev => ({
                ...prev,
                name: 'Flash Sale VIP Discount Distributor',
                triggerKeywords: ['DISCOUNT', 'DEAL', 'VIP'],
                actionAutoLike: true,
                actionDmTemplate: 'Awesome {name}! Here is your exclusive 20% off code: {link} 🎉 Valid for the next 24 hours!',
                actionDmDeliverableUrl: 'https://180workspace.com/vip-offer',
                actionEnableAiAgent: false,
                aiAgentGoal: 'qualify_lead'
            }));
            setKeywordsInput('DISCOUNT, DEAL, VIP');
        }
    };

    const filteredRules = rules.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.triggerKeywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const conversionRate = stats && stats.totalTriggered > 0 
        ? ((stats.totalLeadsConverted / stats.totalTriggered) * 100).toFixed(1)
        : '0.0';

    if (loading) {
        return (
            <div className="space-y-6">
                <UniversalSkeleton type="metrics" />
                <UniversalSkeleton type="table" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Header & Action Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Zap className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                            180 Engagement & Growth Automations
                        </h2>
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400 mt-1">
                        Turn comments and DMs into qualified leads automatically with comment-to-DM funnels and autonomous AI agents.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsTestModalOpen(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl transition shadow-sm"
                    >
                        <Play className="w-3.5 h-3.5 text-amber-500" />
                        <span>Test Matcher</span>
                    </button>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl transition shadow-lg shadow-amber-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Automation</span>
                    </button>
                </div>
            </div>

            {/* Telemetry Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Total Triggered</span>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                            <Zap className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                            {stats?.totalTriggered.toLocaleString() || 0}
                        </span>
                        <span className="text-xs font-semibold text-emerald-500">Live Triggers</span>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">DMs Delivered</span>
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                            <Send className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                            {stats?.totalDmsSent.toLocaleString() || 0}
                        </span>
                        <span className="text-xs font-semibold text-indigo-500">Single-DM Safe</span>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Comments Auto-Liked</span>
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                            <Heart className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                            {stats?.totalLiked.toLocaleString() || 0}
                        </span>
                        <span className="text-xs font-semibold text-rose-500">Reach Boost</span>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">CRM Leads Captured</span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <Target className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                            {stats?.totalLeadsConverted.toLocaleString() || 0}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                            {conversionRate}% Conv
                        </span>
                    </div>
                </div>
            </div>

            {/* Search & Filtering Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search rules or trigger keywords..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 dark:text-zinc-100 placeholder-slate-400"
                    />
                </div>

                <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                    Showing <span className="font-bold text-slate-900 dark:text-zinc-100">{filteredRules.length}</span> active automations
                </div>
            </div>

            {/* Rules List / Grid */}
            {filteredRules.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white/60 dark:bg-zinc-900/40 border border-dashed border-slate-200 dark:border-zinc-800">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
                        <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                        {searchQuery ? 'No matching automation rules' : 'No engagement rules created yet'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                        Create an automation to instantly reply to comments, send private DMs with resource links, and qualify leads with AI.
                    </p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create First Automation</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredRules.map((rule) => {
                        const isActive = rule.status === 'active';
                        return (
                            <div 
                                key={rule.id}
                                className={`p-6 rounded-2xl backdrop-blur-md border transition-all duration-200 ${
                                    isActive 
                                        ? 'bg-white/80 dark:bg-zinc-900/80 border-slate-200 dark:border-zinc-800 shadow-sm hover:border-amber-500/40' 
                                        : 'bg-slate-50/50 dark:bg-zinc-950/40 border-slate-200/50 dark:border-zinc-900 opacity-75'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                                                {rule.name}
                                            </h3>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                                isActive 
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                            }`}>
                                                {rule.status.toUpperCase()}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-1">
                                            Trigger: <span className="font-semibold text-slate-700 dark:text-zinc-300">{rule.triggerType.replace('_', ' ')}</span>
                                        </p>
                                    </div>

                                    {/* Action Toggle Switch */}
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            disabled={togglingId === rule.id}
                                            onClick={() => handleToggleRule(rule.id)}
                                            className={`p-1.5 rounded-lg transition ${
                                                isActive 
                                                    ? 'text-emerald-500 hover:bg-emerald-500/10' 
                                                    : 'text-zinc-400 hover:bg-zinc-500/10'
                                            }`}
                                            title={isActive ? 'Pause automation' : 'Activate automation'}
                                        >
                                            {isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                        </button>

                                        <button
                                            disabled={deletingId === rule.id}
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                                            title="Delete rule"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Trigger Keywords Badges */}
                                <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-medium text-slate-400">Keywords:</span>
                                    {rule.triggerKeywords.length > 0 ? (
                                        rule.triggerKeywords.map((kw, i) => (
                                            <span 
                                                key={i}
                                                className="px-2 py-0.5 text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md"
                                            >
                                                {kw}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[11px] italic text-slate-400">All comments (Catch-all)</span>
                                    )}
                                </div>

                                {/* Enabled Actions Pills */}
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    {rule.actionAutoLike && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-rose-500/10 text-rose-500 rounded-md">
                                            <Heart className="w-3 h-3" /> Auto-Like
                                        </span>
                                    )}

                                    {rule.actionPublicReplies.length > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-500 rounded-md">
                                            <MessageSquare className="w-3 h-3" /> {rule.actionPublicReplies.length} Public Replies
                                        </span>
                                    )}

                                    {rule.actionSendDm && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 rounded-md">
                                            <Send className="w-3 h-3" /> Private DM
                                        </span>
                                    )}

                                    {rule.actionEnableAiAgent && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-500 rounded-md">
                                            <Bot className="w-3 h-3" /> AI Follow-Up ({rule.aiAgentGoal.replace('_', ' ')})
                                        </span>
                                    )}
                                </div>

                                {/* Deliverable Preview */}
                                {rule.actionDmDeliverableUrl && (
                                    <div className="mt-3 p-2.5 rounded-xl bg-slate-100/70 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                                        <span className="text-slate-500 dark:text-zinc-400 truncate max-w-xs">
                                            {rule.actionDmDeliverableUrl}
                                        </span>
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    </div>
                                )}

                                {/* Counters Footer */}
                                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                                    <div className="flex items-center gap-4">
                                        <span><strong className="text-slate-900 dark:text-zinc-100">{rule.totalTriggered}</strong> triggers</span>
                                        <span><strong className="text-slate-900 dark:text-zinc-100">{rule.totalDmsSent}</strong> DMs</span>
                                        <span><strong className="text-emerald-500">{rule.totalLeadsConverted}</strong> leads</span>
                                    </div>

                                    <span className="text-[10px] text-slate-400">
                                        {new Date(rule.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Rule Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 md:p-8 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                                    Create 180 Engagement Automation
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                    Configure autonomous trigger keywords, rotating replies, and AI lead qualification.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-xl"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Quick Presets */}
                        <div>
                            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Quick Template Presets:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => applyPreset('blueprint')}
                                    className="p-3 text-left rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-amber-500 text-xs transition"
                                >
                                    <div className="font-bold text-slate-900 dark:text-zinc-100">Blueprint Giveaway</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Auto-DM link + Lead capture</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => applyPreset('support')}
                                    className="p-3 text-left rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-purple-500 text-xs transition"
                                >
                                    <div className="font-bold text-slate-900 dark:text-zinc-100">Support / FAQ Bot</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Brand Voice conversational AI</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => applyPreset('discount')}
                                    className="p-3 text-left rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500 text-xs transition"
                                >
                                    <div className="font-bold text-slate-900 dark:text-zinc-100">Flash Sale VIP Code</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">24h voucher link delivery</div>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleCreateRuleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                    Automation Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formState.name}
                                    onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                        Trigger Keywords (comma separated)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="BLUEPRINT, WORKFLOW, LINK"
                                        value={keywordsInput}
                                        onChange={(e) => setKeywordsInput(e.target.value)}
                                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 font-mono"
                                    />
                                    <span className="text-[10px] text-slate-400 mt-0.5 block">Alphanumeric word-boundary checked</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                        Match Mode
                                    </label>
                                    <select
                                        value={formState.matchMode}
                                        onChange={(e) => setFormState(prev => ({ ...prev, matchMode: e.target.value as any }))}
                                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
                                    >
                                        <option value="contains">Contains Keyword (Recommended)</option>
                                        <option value="exact">Exact Match Only</option>
                                        <option value="regex">Regular Expression (Regex)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Public Comment Replies Rotation */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                    Rotating Public Comment Replies (One per line)
                                </label>
                                <textarea
                                    rows={3}
                                    value={publicRepliesInput}
                                    onChange={(e) => setPublicRepliesInput(e.target.value)}
                                    placeholder="Sent to your DM, {handle}! 🚀&#10;Check your DMs @{handle}! 🙌"
                                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 font-sans"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">Random rotation prevents platform spam detection</span>
                            </div>

                            {/* Private DM Template */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                    Private Comment-to-DM Message
                                </label>
                                <textarea
                                    rows={3}
                                    value={formState.actionDmTemplate}
                                    onChange={(e) => setFormState(prev => ({ ...prev, actionDmTemplate: e.target.value }))}
                                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
                                />
                                <div className="mt-1 flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400">Supported Tags:</span>
                                    <span className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-zinc-700 rounded font-mono text-slate-700 dark:text-zinc-300">{'{name}'}</span>
                                    <span className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-zinc-700 rounded font-mono text-slate-700 dark:text-zinc-300">{'{handle}'}</span>
                                    <span className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-zinc-700 rounded font-mono text-slate-700 dark:text-zinc-300">{'{link}'}</span>
                                </div>
                            </div>

                            {/* Deliverable URL */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                    Deliverable Resource URL
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://180workspace.com/blueprint"
                                    value={formState.actionDmDeliverableUrl || ''}
                                    onChange={(e) => setFormState(prev => ({ ...prev, actionDmDeliverableUrl: e.target.value }))}
                                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
                                />
                            </div>

                            {/* Autonomous AI Agent Controls */}
                            <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Bot className="w-4 h-4 text-purple-500" />
                                        <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                                            Autonomous AI Follow-Up Agent
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={formState.actionEnableAiAgent}
                                        onChange={(e) => setFormState(prev => ({ ...prev, actionEnableAiAgent: e.target.checked }))}
                                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                                    />
                                </div>

                                {formState.actionEnableAiAgent && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
                                            Agent Goal & Conversion Strategy
                                        </label>
                                        <select
                                            value={formState.aiAgentGoal}
                                            onChange={(e) => setFormState(prev => ({ ...prev, aiAgentGoal: e.target.value }))}
                                            className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-purple-500/30 text-slate-900 dark:text-zinc-100"
                                        >
                                            <option value="qualify_lead">Qualify Prospect & Capture Contact Info (Email/Phone)</option>
                                            <option value="answer_support">Answer Inquiries with Brand Voice DNA</option>
                                            <option value="book_demo">Drive Calendar Bookings & Walkthrough Calls</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Submit Buttons */}
                            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={submittingRule}
                                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                                >
                                    {submittingRule ? 'Creating...' : 'Deploy Automation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Test Matcher Modal */}
            {isTestModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 md:p-8 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Play className="w-4 h-4 text-amber-500" />
                                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                                    Dry-Run Keyword Match Tester
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsTestModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-xl"
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                Simulated Comment Text
                            </label>
                            <textarea
                                rows={2}
                                value={testInputText}
                                onChange={(e) => setTestInputText(e.target.value)}
                                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                Test Trigger Keywords
                            </label>
                            <input
                                type="text"
                                value={testKeywords}
                                onChange={(e) => setTestKeywords(e.target.value)}
                                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 font-mono"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleRunTestMatch}
                            disabled={testingMatch}
                            className="w-full py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition"
                        >
                            {testingMatch ? 'Evaluating...' : 'Evaluate Match'}
                        </button>

                        {testMatchResult && (
                            <div className={`p-4 rounded-xl border text-xs ${
                                testMatchResult.matched 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                            }`}>
                                <div className="flex items-center gap-2 font-bold">
                                    {testMatchResult.matched ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    <span>{testMatchResult.matched ? 'MATCH CONFIRMED! Auto-DM will dispatch.' : 'NO MATCH FOUND. User comment ignored.'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
