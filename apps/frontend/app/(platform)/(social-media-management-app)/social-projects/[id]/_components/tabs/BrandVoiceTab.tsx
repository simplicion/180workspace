'use client';

import React, { useState, useEffect } from 'react';
import { 
    Sparkles, Save, Plus, X, ShieldAlert, Check, 
    Layers, MessageSquare, Lightbulb, ArrowRight
} from 'lucide-react';
import { SocialProject } from '@/lib/services/social-project.service';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface BrandVoiceTabProps {
    project: SocialProject;
    onCreatePostFromIdea?: (idea: any) => void;
}

const TONES = [
    'Professional & Insightful',
    'Bold & Provocative',
    'Casual & Authentic',
    'Educational & Authoritative',
    'Witty & Entertaining',
    'Inspirational & Uplifting'
];

export const BrandVoiceTab: React.FC<BrandVoiceTabProps> = ({ project, onCreatePostFromIdea }) => {
    const brand = project.brandVoiceProfile || {};

    const [tone, setTone] = useState(brand.tone || 'Professional & Insightful');
    const [targetAudience, setTargetAudience] = useState(brand.targetAudience || 'General Audience');
    const [pillars, setPillars] = useState<string[]>(brand.contentPillars || ['Frameworks', 'Industry Trends', 'Case Studies']);
    const [newPillar, setNewPillar] = useState('');
    const [forbiddenWords, setForbiddenWords] = useState<string[]>(brand.forbiddenWords || ['cheap', 'guarantee']);
    const [newForbiddenWord, setNewForbiddenWord] = useState('');
    const [standardCtas, setStandardCtas] = useState<string[]>(brand.standardCtas || ['Link in bio to get started']);
    const [newCta, setNewCta] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
    const [generatedIdeas, setGeneratedIdeas] = useState<any[]>([]);

    const handleSaveBrandVoice = async () => {
        setIsSaving(true);
        try {
            await api.post('/api/social-media/brand-voice', {
                projectId: project.id,
                tone,
                targetAudience,
                contentPillars: pillars,
                forbiddenWords,
                standardCtas
            });
            toast.success('Project Brand Voice profile updated!');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to save brand voice');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateIdeas = async () => {
        setIsGeneratingIdeas(true);
        try {
            toast.loading('Generating tailored viral content ideas...', { id: 'ideas' });
            // Call AI endpoint
            const mockIdeas = [
                {
                    headline: 'Why 90% of Agencies Fail at Short-Form Scaling',
                    hook: 'Most founders think editing takes too long. Here is the 180 workflow that cut our production time by 80%.',
                    pillar: pillars[0] || 'Frameworks',
                    format: 'video'
                },
                {
                    headline: 'The 3 Metrics You Must Track on LinkedIn in 2026',
                    hook: 'Stop looking at raw impressions. Here are the 3 indicators that actually convert to high-ticket clients.',
                    pillar: pillars[1] || 'Industry Trends',
                    format: 'carousel'
                },
                {
                    headline: 'Step-by-Step Script Blueprint for High-Retention Reels',
                    hook: 'Steal our exact hook-to-CTA script template used across 50+ client campaigns.',
                    pillar: pillars[2] || 'Case Studies',
                    format: 'video'
                }
            ];
            setGeneratedIdeas(mockIdeas);
            toast.success('Generated 3 viral post concepts!', { id: 'ideas' });
        } catch (err) {
            toast.error('Failed to generate ideas', { id: 'ideas' });
        } finally {
            setIsGeneratingIdeas(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header & Save */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Project Brand Voice & AI Context
                    </h3>
                    <p className="text-xs text-slate-500">
                        Configure project-isolated brand parameters. AI generation is strictly constrained by this profile.
                    </p>
                </div>

                <button
                    onClick={handleSaveBrandVoice}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
                >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
                </button>
            </div>

            {/* AI Ideation Generator Section */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/30 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900/40 border border-indigo-200/60 dark:border-indigo-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                            <Sparkles className="w-4 h-4" />
                            <span>AI Content Ideation</span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            Generate Concepts from Brand Profile
                        </h4>
                    </div>

                    <button
                        onClick={handleGenerateIdeas}
                        disabled={isGeneratingIdeas}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isGeneratingIdeas ? 'Generating...' : 'Generate New Concepts'}</span>
                    </button>
                </div>

                {generatedIdeas.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                        {generatedIdeas.map((idea, idx) => (
                            <div
                                key={idx}
                                className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-900/60 flex flex-col justify-between space-y-3 shadow-sm"
                            >
                                <div className="space-y-2">
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-md">
                                        {idea.pillar}
                                    </span>
                                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{idea.headline}</h5>
                                    <p className="text-[11px] text-slate-500 line-clamp-3">"{idea.hook}"</p>
                                </div>

                                <button
                                    onClick={() => onCreatePostFromIdea && onCreatePostFromIdea(idea)}
                                    className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline pt-2 border-t border-slate-100 dark:border-slate-800"
                                >
                                    <span>Create Post from Idea</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Brand Voice Form Grid */}
            <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
                {/* Tone Select */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                        Tone of Voice
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {TONES.map(t => (
                            <button
                                type="button"
                                key={t}
                                onClick={() => setTone(t)}
                                className={`p-3 text-xs font-semibold rounded-xl border text-left transition ${
                                    tone === t
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {t}
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
                        value={targetAudience}
                        onChange={e => setTargetAudience(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                    />
                </div>

                {/* Pillars */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Content Pillars
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {pillars.map((p, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-900"
                            >
                                {p}
                                <button type="button" onClick={() => setPillars(pillars.filter((_, i) => i !== idx))}>
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Add pillar..."
                            value={newPillar}
                            onChange={e => setNewPillar(e.target.value)}
                            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                        />
                        <button
                            type="button"
                            onClick={() => { if (newPillar.trim()) { setPillars([...pillars, newPillar.trim()]); setNewPillar(''); } }}
                            className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Forbidden Words */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Forbidden Vocabulary (Negative Words)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {forbiddenWords.map((w, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-900"
                            >
                                {w}
                                <button type="button" onClick={() => setForbiddenWords(forbiddenWords.filter((_, i) => i !== idx))}>
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="e.g. cheap, guarantee..."
                            value={newForbiddenWord}
                            onChange={e => setNewForbiddenWord(e.target.value)}
                            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                        />
                        <button
                            type="button"
                            onClick={() => { if (newForbiddenWord.trim()) { setForbiddenWords([...forbiddenWords, newForbiddenWord.trim()]); setNewForbiddenWord(''); } }}
                            className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl"
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
