'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, UniversalSkeleton } from '@workspace/ui';
import api from '@/lib/api';
import { socialProjectService, type BrandConsciousness, type SocialProject } from '@/lib/services/social-project.service';
import {
    BrandIdentitySection,
    CompletenessNotice,
    PlatformPicker,
    VisualIdentitySection,
    VoiceSection,
    brandCardClass,
} from '../../../_components/brand/BrandSections';
import { draftErrors, draftFromBrand, draftToPatch, type BrandDraft } from '../../../_components/brand/brand-draft';

interface BrandVoiceTabProps {
    project: SocialProject;
    onCreatePostFromIdea?: (idea: { headline: string; hook: string; caption?: string; platform?: string; pillar?: string }) => void;
}

interface Idea { title: string; hook: string; caption: string; platform: string; pillar: string }

const SECTIONS = [
    { id: 'identity', label: 'Identity' },
    { id: 'visual', label: 'Visual' },
    { id: 'voice', label: 'Voice' },
    { id: 'platforms', label: 'Platforms' },
] as const;

/** Editable brand consciousness for an existing project (same components as the create wizard). */
export const BrandVoiceTab: React.FC<BrandVoiceTabProps> = ({ project, onCreatePostFromIdea }) => {
    const [brand, setBrand] = useState<BrandConsciousness | null>(null);
    const [draft, setDraft] = useState<BrandDraft | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [section, setSection] = useState<(typeof SECTIONS)[number]['id']>('identity');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [ideasLoading, setIdeasLoading] = useState(false);
    const [ideasError, setIdeasError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            const b = await socialProjectService.getBrandConsciousness(project.id);
            setBrand(b);
            setDraft(draftFromBrand(b));
        } catch (err: any) {
            setLoadError(err.response?.data?.message || err.response?.data?.error || 'The brand profile could not be loaded.');
        }
    }, [project.id]);

    useEffect(() => { load(); }, [load]);

    const errors = useMemo(() => (draft ? draftErrors(draft) : {}), [draft]);
    const dirty = useMemo(() => !!(brand && draft && JSON.stringify(draftToPatch(draft)) !== JSON.stringify(draftToPatch(draftFromBrand(brand)))), [brand, draft]);

    const update = (patch: Partial<BrandDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

    const save = async () => {
        if (!draft) return;
        if (Object.keys(errors).length) { toast.error('Fix the highlighted fields first.'); return; }
        setSaving(true);
        setSaveError(null);
        try {
            const { logoUrl: _logo, ...patch } = draftToPatch(draft);
            const b = await socialProjectService.updateBrandConsciousness(project.id, patch);
            setBrand(b);
            setDraft(draftFromBrand(b));
            toast.success('Brand saved');
        } catch (err: any) {
            setSaveError(err.response?.data?.message || err.response?.data?.error || 'The brand could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    const uploadLogo = async (file: File) => {
        setUploading(true);
        try {
            const { brand: b } = await socialProjectService.uploadBrandLogo(project.id, file);
            setBrand(b);
            setDraft((d) => (d ? { ...d, logoUrl: b.logoUrl ?? '' } : draftFromBrand(b)));
            toast.success('Logo updated');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'The logo could not be uploaded.');
        } finally {
            setUploading(false);
        }
    };

    const removeLogo = async () => {
        try {
            const b = await socialProjectService.updateBrandConsciousness(project.id, { logoUrl: null });
            setBrand(b);
            setDraft((d) => (d ? { ...d, logoUrl: '' } : d));
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'The logo could not be removed.');
        }
    };

    const generateIdeas = async () => {
        setIdeasLoading(true);
        setIdeasError(null);
        try {
            const { data } = await api.post(`/api/social-media/brand-voice/${project.id}/ideas`, { count: 3 });
            setIdeas(data.ideas || []);
        } catch (err: any) {
            setIdeasError(err.response?.data?.message || 'Ideas could not be generated.');
        } finally {
            setIdeasLoading(false);
        }
    };

    if (loadError) {
        return (
            <div role="alert" aria-live="assertive" className={`${brandCardClass} space-y-3`}>
                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{loadError}</p>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={load}>Try again</Button>
                    <Button type="button" variant="outline" onClick={() => window.location.assign(`/social-projects/${project.id}`)}>Back to overview</Button>
                </div>
            </div>
        );
    }

    if (!brand || !draft) return <UniversalSkeleton type="form" />;

    return (
        <div className="space-y-6">
            <div className={`${brandCardClass} flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
                <div>
                    <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-zinc-100">Brand</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Every AI agent in this project reads this profile. Only what you enter here is used.</p>
                </div>
                <Button type="button" onClick={save} disabled={saving || !dirty} className="h-11">{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</Button>
            </div>

            <CompletenessNotice missing={brand.completeness.missingRequired} percent={brand.completeness.percent} />

            {saveError && (
                <div role="alert" aria-live="assertive" className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    <span className="flex-1">{saveError}</span>
                    <Button type="button" variant="outline" className="h-11" onClick={save}>Try again</Button>
                    <Button type="button" variant="ghost" className="h-11" onClick={() => { setDraft(draftFromBrand(brand)); setSaveError(null); }}>Discard changes</Button>
                </div>
            )}

            <div role="tablist" aria-label="Brand sections" className="flex gap-2 overflow-x-auto">
                {SECTIONS.map((s) => (
                    <Button key={s.id} type="button" role="tab" aria-selected={section === s.id} variant={section === s.id ? 'default' : 'outline'} className="h-11" onClick={() => setSection(s.id)}>
                        {s.label}
                    </Button>
                ))}
            </div>

            <section className={brandCardClass}>
                {section === 'identity' && <BrandIdentitySection draft={draft} update={update} errors={errors} />}
                {section === 'visual' && (
                    <VisualIdentitySection draft={draft} update={update} errors={errors} logo={{ pendingFile: null, onFile: uploadLogo, onRemove: removeLogo, uploading }} />
                )}
                {section === 'voice' && <VoiceSection draft={draft} update={update} />}
                {section === 'platforms' && <PlatformPicker draft={draft} update={update} />}
            </section>

            <section className={`${brandCardClass} space-y-4`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-zinc-100"><Sparkles className="h-4 w-4" aria-hidden /> Content ideas</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Generated from the saved brand by your workspace’s AI provider.</p>
                    </div>
                    <Button type="button" variant="outline" className="h-11" onClick={generateIdeas} disabled={ideasLoading || dirty} title={dirty ? 'Save your changes first' : undefined}>
                        {ideasLoading ? 'Generating…' : 'Generate ideas'}
                    </Button>
                </div>
                {ideasError && (
                    <div role="alert" aria-live="polite" className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        <span className="flex-1">{ideasError}</span>
                        <Button type="button" variant="outline" className="h-11" onClick={generateIdeas}>Try again</Button>
                    </div>
                )}
                {ideasLoading && <UniversalSkeleton type="projects" />}
                {!ideasLoading && ideas.length > 0 && (
                    <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {ideas.map((idea, i) => (
                            <li key={i} className="flex flex-col justify-between gap-3 rounded-2xl border border-gray-200 p-4 dark:border-zinc-800">
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 dark:text-zinc-400">{[idea.pillar, idea.platform].filter(Boolean).join(' · ')}</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">{idea.title}</p>
                                    <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-400">{idea.hook}</p>
                                </div>
                                {onCreatePostFromIdea && (
                                    <Button type="button" variant="link" className="h-11 justify-start p-0" onClick={() => onCreatePostFromIdea({ headline: idea.title, hook: idea.hook, caption: idea.caption, platform: idea.platform, pillar: idea.pillar })}>
                                        Create post from idea <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};
