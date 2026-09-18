'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { 
    Sparkles, Save, ShieldAlert, Hash, MessageSquare, Target, 
    Volume2, CheckCircle2, RefreshCw, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const TONE_PRESETS = [
    { label: 'Authoritative & Analytical', desc: 'Data-driven, precise insights, institutional credibility' },
    { label: 'Casual & High-Energy', desc: 'Enthusiastic, modern slang, punchy short sentences' },
    { label: 'Provocative & Direct', desc: 'Contrarian hooks, bold declarations, pattern interrupts' },
    { label: 'Educational & Step-by-Step', desc: 'Tutorial style, breakdown threads, clear frameworks' },
    { label: 'Story-Driven & Empathetic', desc: 'Founder journey, vulnerability, emotional resonance' }
];

export function BrandVoiceManager({ projectId }: { projectId?: string }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [voiceId, setVoiceId] = useState<string | null>(null);

    const [tone, setTone] = useState('Authoritative & Analytical');
    const [targetAudience, setTargetAudience] = useState('SaaS founders, Agency owners, Growth marketers');
    const [sampleViralPosts, setSampleViralPosts] = useState<string[]>(['']);
    const [forbiddenWords, setForbiddenWords] = useState<string>('cheap, easy money, guru, hustle 24/7');
    const [defaultHashtags, setDefaultHashtags] = useState<string>('#SaaS #BuildInPublic #SocialGrowth #Automation');
    const [standardCtas, setStandardCtas] = useState<string>('Comment "WORKFLOW" to get the template\nBook a 15-min strategy call link in bio');

    useEffect(() => {
        loadBrandVoice();
    }, [projectId]);

    const loadBrandVoice = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/api/social-media/brand-voice', {
                params: { projectId: projectId || undefined }
            });
            if (data.success && data.profile) {
                const p = data.profile;
                setVoiceId(p.id);
                setTone(p.tone || 'Authoritative & Analytical');
                setTargetAudience(p.targetAudience || '');
                setSampleViralPosts(p.sampleViralPosts?.length > 0 ? p.sampleViralPosts : ['']);
                setForbiddenWords((p.forbiddenWords || []).join(', '));
                setDefaultHashtags((p.defaultHashtags || []).join(' '));
                setStandardCtas((p.standardCtas || []).join('\n'));
            }
        } catch (err: any) {
            // No profile yet, using defaults
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const forbiddenArray = forbiddenWords
                .split(',')
                .map(w => w.trim())
                .filter(Boolean);

            const hashtagArray = defaultHashtags
                .split(/[\s,]+/)
                .map(h => h.startsWith('#') ? h : `#${h}`)
                .filter(h => h.length > 1);

            const ctaArray = standardCtas
                .split('\n')
                .map(c => c.trim())
                .filter(Boolean);

            const cleanSamples = sampleViralPosts.filter(s => s.trim().length > 0);

            const payload = {
                projectId: projectId || undefined,
                tone,
                targetAudience,
                sampleViralPosts: cleanSamples,
                forbiddenWords: forbiddenArray,
                defaultHashtags: hashtagArray,
                standardCtas: ctaArray
            };

            const { data } = await api.post('/api/social-media/brand-voice', payload);
            if (data.success) {
                setVoiceId(data.profile.id);
                toast.success('Brand Voice Fingerprint saved! AI generators will now strictly adhere to these parameters.');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to save brand voice profile');
        } finally {
            setSaving(false);
        }
    };

    const addSamplePostSlot = () => {
        if (sampleViralPosts.length < 5) {
            setSampleViralPosts([...sampleViralPosts, '']);
        } else {
            toast.error('Maximum 5 sample viral posts allowed');
        }
    };

    const updateSamplePost = (index: number, val: string) => {
        const next = [...sampleViralPosts];
        next[index] = val;
        setSampleViralPosts(next);
    };

    const removeSamplePost = (index: number) => {
        const next = sampleViralPosts.filter((_, i) => i !== index);
        setSampleViralPosts(next.length > 0 ? next : ['']);
    };

    return (
        <form onSubmit={handleSave} className="space-y-8 max-w-5xl">
            {/* Header info banner */}
            <div className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                Project Brand Voice Fingerprint
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                AI Content Generators & Smart Reply bots inherit this exact DNA for automated tone calibration.
                            </p>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={saving || loading}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all min-h-[44px]"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Voice DNA'}
                    </button>
                </div>
            </div>

            {/* Grid for Tone & Target Audience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tone DNA Presets */}
                <div className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                        <Volume2 className="w-4 h-4" />
                        <span>Core Tone & Personality</span>
                    </div>

                    <div className="space-y-2.5">
                        {TONE_PRESETS.map((preset) => (
                            <label
                                key={preset.label}
                                onClick={() => setTone(preset.label)}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                    tone === preset.label
                                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                                        : 'bg-white/40 dark:bg-slate-900/40 border-gray-200/60 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="tonePreset"
                                    checked={tone === preset.label}
                                    onChange={() => setTone(preset.label)}
                                    className="mt-1 accent-indigo-600 w-4 h-4"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preset.label}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{preset.desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                            Or Custom Tone Description
                        </label>
                        <input
                            type="text"
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/80 dark:bg-slate-900/80 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500 transition-colors"
                            placeholder="e.g. Sarcastic tech founder, deeply empathetic doctor..."
                        />
                    </div>
                </div>

                {/* Target Audience & Persona */}
                <div className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                            <Target className="w-4 h-4" />
                            <span>Target Audience & Buyer Persona</span>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                                Ideal Customer Profile (ICP)
                            </label>
                            <textarea
                                rows={4}
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                className="w-full px-4 py-3 bg-white/80 dark:bg-slate-900/80 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500 transition-colors leading-relaxed"
                                placeholder="Describe demographics, pain points, daily struggles, and aspirations..."
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                                Banned / Forbidden Words & Taboos (Comma separated)
                            </label>
                            <div className="relative">
                                <ShieldAlert className="w-4 h-4 text-rose-500 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    value={forbiddenWords}
                                    onChange={(e) => setForbiddenWords(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-slate-900/80 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-rose-500 transition-colors"
                                    placeholder="e.g. cheap, free, guru, passive income, scam"
                                />
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                The AI guardrail automatically flags or removes these terms before drafting.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>All calendar generations will strictly reject content matching forbidden words.</span>
                    </div>
                </div>
            </div>

            {/* Sample Viral Posts & Hashtags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sample Viral Posts DNA */}
                <div className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                            <MessageSquare className="w-4 h-4" />
                            <span>Sample Viral Posts DNA</span>
                        </div>
                        <button
                            type="button"
                            onClick={addSamplePostSlot}
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                            + Add Sample Post
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Paste 1-3 high-performing posts from this brand to calibrate cadence and hook structure.
                    </p>

                    <div className="space-y-3">
                        {sampleViralPosts.map((sample, idx) => (
                            <div key={idx} className="relative">
                                <textarea
                                    rows={3}
                                    value={sample}
                                    onChange={(e) => updateSamplePost(idx, e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white/80 dark:bg-slate-900/80 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500 transition-colors leading-relaxed"
                                    placeholder={`Sample Post #${idx + 1}...`}
                                />
                                {sampleViralPosts.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeSamplePost(idx)}
                                        className="absolute top-2 right-2 text-[10px] text-gray-400 hover:text-rose-500 font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Default Hashtags & Standard Conversion CTAs */}
                <div className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                        <Hash className="w-4 h-4" />
                        <span>Hashtags & Standard CTAs</span>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                            Default Category Hashtags
                        </label>
                        <textarea
                            rows={2}
                            value={defaultHashtags}
                            onChange={(e) => setDefaultHashtags(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/80 dark:bg-slate-900/80 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500 transition-colors"
                            placeholder="#Brand #Industry #Topic"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                            Standard Conversion CTAs (One per line)
                        </label>
                        <textarea
                            rows={4}
                            value={standardCtas}
                            onChange={(e) => setStandardCtas(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/80 dark:bg-slate-900/80 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500 transition-colors"
                            placeholder="Comment 'INFO' for link&#10;Link in bio to apply"
                        />
                    </div>
                </div>
            </div>
        </form>
    );
}
