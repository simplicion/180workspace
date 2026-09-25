'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '@workspace/ui';
import api from '@/lib/api';
import { socialProjectService } from '@/lib/services/social-project.service';
import {
    BrandIdentitySection,
    BrandPreviewCard,
    CompletenessNotice,
    Field,
    PlatformPicker,
    VisualIdentitySection,
    VoiceSection,
    brandCardClass,
} from '../_components/brand/BrandSections';
import {
    BRAND_TYPE_OPTIONS,
    CAPTION_PRESET_OPTIONS,
    PLATFORM_OPTIONS,
    draftErrors,
    draftToPatch,
    emptyBrandDraft,
    missingRequired,
    type BrandDraft,
} from '../_components/brand/brand-draft';

const STEPS = ['Basics & client', 'Brand identity', 'Visual identity', 'Voice', 'Platforms & accounts', 'Review'];

const SERVICES = [
    { id: 'content_calendar', name: 'Content calendar' },
    { id: 'short_form_video', name: 'Short-form video' },
    { id: 'static_posts', name: 'Posts & carousels' },
    { id: 'publishing', name: 'Publishing' },
    { id: 'inbox', name: 'Inbox' },
    { id: 'analytics', name: 'Analytics' },
];

const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo'];

interface Basics {
    name: string;
    clientMode: 'existing' | 'new' | 'none';
    clientId: string;
    clientName: string;
    clientEmail: string;
    description: string;
    startDate: string;
    endDate: string;
    socialServices: string[];
    connectedAccountIds: string[];
    approvalRequired: boolean;
    defaultTimezone: string;
}

const selectClass = 'h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100';
const inputClass = 'h-11 dark:border-zinc-800 dark:bg-zinc-950';

export default function CreateSocialProjectWizardPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [prereqError, setPrereqError] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [draft, setDraft] = useState<BrandDraft>(emptyBrandDraft);
    const [basics, setBasics] = useState<Basics>(() => {
        const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
        return {
            name: '', clientMode: 'existing', clientId: '', clientName: '', clientEmail: '', description: '',
            startDate: new Date().toISOString().split('T')[0], endDate: '',
            socialServices: ['content_calendar', 'short_form_video', 'publishing', 'analytics'],
            connectedAccountIds: [], approvalRequired: true, defaultTimezone: TIMEZONES.includes(tz) ? tz : 'UTC',
        };
    });

    const update = (patch: Partial<BrandDraft>) => setDraft((d) => ({ ...d, ...patch }));
    const setB = (patch: Partial<Basics>) => setBasics((b) => ({ ...b, ...patch }));
    const errors = useMemo(() => draftErrors(draft), [draft]);
    const missing = useMemo(() => missingRequired(draft), [draft]);

    const loadPrereqs = async () => {
        setPrereqError(false);
        const [c, a] = await Promise.allSettled([api.get('/api/clients'), api.get('/api/social-media/accounts')]);
        if (c.status === 'fulfilled') setClients(c.value.data?.clients || []);
        if (a.status === 'fulfilled') setAccounts(a.value.data?.accounts || []);
        if (c.status === 'rejected' || a.status === 'rejected') setPrereqError(true);
    };
    useEffect(() => { loadPrereqs(); }, []);

    const stepError = (): string | null => {
        if (step === 0 && !basics.name.trim()) return 'Give the project a name.';
        if (step === 0 && basics.clientMode === 'new' && !basics.clientName.trim()) return 'Enter the new client’s name, or choose “No client”.';
        if (step === 2 && Object.keys(errors).some((k) => k.startsWith('colors.'))) return 'Fix the colour values (use #RRGGBB).';
        if (step === 1 && (errors.tagline || errors.positioning)) return errors.tagline || errors.positioning || null;
        return null;
    };

    const next = () => {
        const e = stepError();
        if (e) { toast.error(e); return; }
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
    };

    const create = async () => {
        if (!basics.name.trim()) { setStep(0); toast.error('Give the project a name.'); return; }
        if (Object.keys(errors).length) { toast.error('Some brand fields need fixing before you can create the project.'); return; }
        setSubmitting(true);
        setSubmitError(null);
        try {
            const { logoUrl: _logo, ...brandConsciousness } = draftToPatch(draft);
            const project = await socialProjectService.createProject({
                name: basics.name.trim(),
                clientId: basics.clientMode === 'existing' && basics.clientId ? basics.clientId : undefined,
                clientName: basics.clientMode === 'new' ? basics.clientName.trim() : undefined,
                clientEmail: basics.clientMode === 'new' && basics.clientEmail.trim() ? basics.clientEmail.trim() : undefined,
                description: basics.description.trim(),
                startDate: basics.startDate || undefined,
                endDate: basics.endDate || undefined,
                socialServices: basics.socialServices,
                brandConsciousness,
                connectedAccountIds: basics.connectedAccountIds,
                settings: { approvalRequired: basics.approvalRequired, defaultTimezone: basics.defaultTimezone, storageRetentionDays: 30 },
            });
            if (logoFile) {
                try {
                    await socialProjectService.uploadBrandLogo(project.id, logoFile);
                } catch (err: any) {
                    toast.error(`Project created, but the logo did not upload: ${err.response?.data?.message || err.message}. Add it again in the Brand tab.`);
                    router.push(`/social-projects/${project.id}?tab=brand`);
                    return;
                }
            }
            toast.success('Project created');
            router.push(`/social-projects/${project.id}`);
        } catch (err: any) {
            const data = err.response?.data;
            setSubmitError(data?.message || data?.error || err.message || 'The project could not be created.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 dark:bg-black md:p-10">
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <div className="flex items-center justify-between">
                    <Link href="/social-projects" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-gray-600 transition-all duration-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-zinc-100">
                        <ArrowLeft className="h-4 w-4" /> Back to projects
                    </Link>
                    <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Step {step + 1} of {STEPS.length}</span>
                </div>

                <nav aria-label="Wizard steps">
                    <ol className="grid grid-cols-6 gap-2">
                        {STEPS.map((title, i) => (
                            <li key={title}>
                                <button
                                    type="button"
                                    onClick={() => (i < step ? setStep(i) : undefined)}
                                    aria-current={i === step ? 'step' : undefined}
                                    className="w-full space-y-1.5 text-left"
                                    disabled={i > step}
                                >
                                    <div className={`h-1.5 rounded-full transition-all duration-300 ${i < step ? 'bg-emerald-500' : i === step ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-zinc-800'}`} />
                                    <span className={`hidden truncate text-xs md:block ${i === step ? 'font-bold text-gray-900 dark:text-zinc-100' : 'text-gray-500 dark:text-zinc-500'}`}>{title}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </nav>

                <section className={brandCardClass}>
                    <header className="mb-6">
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">{STEPS[step]}</h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {[
                                'Name the project and choose who it is for.',
                                'Who the brand is. Every AI agent reads this before writing anything.',
                                'Colours, logo and font used for captions, carousels and graphics.',
                                'How the brand sounds, and what it never says.',
                                'Where the brand publishes and which connected accounts belong to it.',
                                'Check everything. You can change any of it later in the project’s Brand tab.',
                            ][step]}
                        </p>
                    </header>

                    {step === 0 && (
                        <div className="space-y-6">
                            <Field label="Project name" htmlFor="p-name">
                                <Input id="p-name" value={basics.name} maxLength={120} placeholder="e.g. Acme Coffee social" onChange={(e) => setB({ name: e.target.value })} className={inputClass} />
                            </Field>
                            <Field label="Client">
                                <div role="radiogroup" className="flex flex-wrap gap-2">
                                    {([['existing', 'Existing client'], ['new', 'New client'], ['none', 'No client']] as const).map(([v, l]) => (
                                        <Button key={v} type="button" role="radio" aria-checked={basics.clientMode === v} variant={basics.clientMode === v ? 'default' : 'outline'} className="h-11" onClick={() => setB({ clientMode: v })}>{l}</Button>
                                    ))}
                                </div>
                                {basics.clientMode === 'existing' && (
                                    <select aria-label="Existing client" value={basics.clientId} onChange={(e) => setB({ clientId: e.target.value })} className={`${selectClass} mt-2`}>
                                        <option value="">{clients.length ? 'Choose a client' : 'No clients yet'}</option>
                                        {clients.map((c) => <option key={c.id || c._id} value={c.id || c._id}>{c.name}{c.companyName ? ` (${c.companyName})` : ''}</option>)}
                                    </select>
                                )}
                                {basics.clientMode === 'new' && (
                                    <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <Input aria-label="Client name" placeholder="Client name" value={basics.clientName} onChange={(e) => setB({ clientName: e.target.value })} className={inputClass} />
                                        <Input aria-label="Client email" type="email" placeholder="Client email (optional)" value={basics.clientEmail} onChange={(e) => setB({ clientEmail: e.target.value })} className={inputClass} />
                                    </div>
                                )}
                            </Field>
                            <Field label="Project notes" hint="Goals and deliverables for the team. The brand description comes in the next step." htmlFor="p-desc">
                                <textarea id="p-desc" rows={3} value={basics.description} onChange={(e) => setB({ description: e.target.value })} className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" />
                            </Field>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Start date" htmlFor="p-start"><Input id="p-start" type="date" value={basics.startDate} onChange={(e) => setB({ startDate: e.target.value })} className={inputClass} /></Field>
                                <Field label="End date (optional)" htmlFor="p-end"><Input id="p-end" type="date" value={basics.endDate} onChange={(e) => setB({ endDate: e.target.value })} className={inputClass} /></Field>
                            </div>
                            <Field label="Services in this project">
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                                    {SERVICES.map((s) => {
                                        const on = basics.socialServices.includes(s.id);
                                        return (
                                            <Button key={s.id} type="button" aria-pressed={on} variant={on ? 'default' : 'outline'} className="h-11 justify-between" onClick={() => setB({ socialServices: on ? basics.socialServices.filter((x) => x !== s.id) : [...basics.socialServices, s.id] })}>
                                                {s.name} {on && <Check className="h-4 w-4" aria-hidden />}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </Field>
                        </div>
                    )}

                    {step === 1 && <BrandIdentitySection draft={draft} update={update} errors={errors} />}

                    {step === 2 && (
                        <VisualIdentitySection
                            draft={draft}
                            update={update}
                            errors={errors}
                            logo={{ pendingFile: logoFile, onFile: setLogoFile, onRemove: () => { setLogoFile(null); update({ logoUrl: '' }); } }}
                        />
                    )}

                    {step === 3 && <VoiceSection draft={draft} update={update} />}

                    {step === 4 && (
                        <div className="space-y-8">
                            <PlatformPicker draft={draft} update={update} />
                            <Field label="Connected accounts" hint="Accounts already connected in this workspace. You can connect more later from the project’s Publishing tab.">
                                {prereqError && (
                                    <div role="alert" aria-live="polite" className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                                        Could not load accounts or clients.
                                        <Button type="button" variant="outline" className="h-11" onClick={loadPrereqs}>Try again</Button>
                                        <span>or continue and link accounts later.</span>
                                    </div>
                                )}
                                {accounts.length === 0 && !prereqError ? (
                                    <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-zinc-700">
                                        <Share2 className="mx-auto mb-2 h-8 w-8 text-gray-400" aria-hidden />
                                        <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">No connected accounts yet</p>
                                        <p className="mx-auto mt-1 max-w-sm text-xs text-gray-600 dark:text-gray-400">Create the project now and connect Instagram, TikTok, YouTube, LinkedIn, Facebook or X from its Publishing tab.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                        {accounts.map((acc) => {
                                            const on = basics.connectedAccountIds.includes(acc.id);
                                            return (
                                                <button
                                                    key={acc.id}
                                                    type="button"
                                                    aria-pressed={on}
                                                    onClick={() => setB({ connectedAccountIds: on ? basics.connectedAccountIds.filter((x) => x !== acc.id) : [...basics.connectedAccountIds, acc.id] })}
                                                    className={`flex min-h-[56px] items-center justify-between rounded-2xl border p-3 text-left transition-all duration-300 ${on ? 'border-gray-900 bg-gray-50 dark:border-white dark:bg-zinc-800' : 'border-gray-200 hover:bg-gray-100 dark:border-zinc-800 dark:hover:bg-zinc-800'}`}
                                                >
                                                    <span>
                                                        <span className="block text-sm font-semibold text-gray-900 dark:text-zinc-100">{acc.accountName}</span>
                                                        <span className="block text-xs text-gray-500 dark:text-zinc-400">@{acc.username} · {acc.platform}</span>
                                                    </span>
                                                    {on && <Check className="h-4 w-4" aria-hidden />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </Field>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                            <div className="space-y-6">
                                <CompletenessNotice missing={missing} />
                                <ReviewList
                                    onEdit={setStep}
                                    rows={[
                                        [0, 'Project', basics.name || '—'],
                                        [0, 'Client', basics.clientMode === 'new' ? basics.clientName || '—' : basics.clientMode === 'existing' ? clients.find((c) => (c.id || c._id) === basics.clientId)?.name || '—' : 'None'],
                                        [1, 'Brand', [draft.brandName, BRAND_TYPE_OPTIONS.find((o) => o.id === draft.brandType)?.label].filter(Boolean).join(' · ') || '—'],
                                        [1, 'Positioning', draft.positioning || '—'],
                                        [1, 'Tagline', draft.tagline || '—'],
                                        [2, 'Font', draft.font || '—'],
                                        [2, 'Caption style', CAPTION_PRESET_OPTIONS.find((o) => o.id === draft.captionStylePreset)?.label || '—'],
                                        [2, 'Logo', logoFile ? logoFile.name : '—'],
                                        [3, 'Tone', draft.tone || '—'],
                                        [3, 'Audience', draft.audience || '—'],
                                        [3, 'Restricted words', draft.forbiddenWords.join(', ') || '—'],
                                        [3, 'CTAs', draft.ctas.join(' · ') || '—'],
                                        [3, 'Hashtags', draft.hashtags.join(' ') || '—'],
                                        [4, 'Platforms', draft.targetPlatforms.map((p) => PLATFORM_OPTIONS.find((o) => o.id === p)?.label).join(', ') || '—'],
                                        [4, 'Accounts', basics.connectedAccountIds.length ? `${basics.connectedAccountIds.length} linked` : '—'],
                                    ]}
                                />
                                <div className="space-y-4 rounded-2xl border border-gray-200 p-4 dark:border-zinc-800">
                                    <label className="flex min-h-[44px] items-center justify-between gap-4 text-sm">
                                        <span>
                                            <span className="block font-semibold text-gray-900 dark:text-zinc-100">Require approval before publishing</span>
                                            <span className="block text-xs text-gray-600 dark:text-gray-400">Posts go to the client review link first.</span>
                                        </span>
                                        <input type="checkbox" checked={basics.approvalRequired} onChange={(e) => setB({ approvalRequired: e.target.checked })} className="h-5 w-5 accent-gray-900 dark:accent-white" />
                                    </label>
                                    <Field label="Publishing timezone" htmlFor="p-tz">
                                        <select id="p-tz" value={basics.defaultTimezone} onChange={(e) => setB({ defaultTimezone: e.target.value })} className={selectClass}>
                                            {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </Field>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Brand preview</p>
                                <LogoAwarePreview draft={draft} file={logoFile} />
                            </div>
                        </div>
                    )}

                    {submitError && (
                        <div role="alert" aria-live="assertive" className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                            <span className="flex-1">{submitError}</span>
                            <Button type="button" variant="outline" className="h-11" onClick={create}>Try again</Button>
                            <Button type="button" variant="ghost" className="h-11" onClick={() => setStep(1)}>Review brand fields</Button>
                        </div>
                    )}
                </section>

                <div className="flex items-center justify-between">
                    {step > 0 ? <Button type="button" variant="outline" size="lg" onClick={() => setStep(step - 1)}>Back</Button> : <span />}
                    {step < STEPS.length - 1 ? (
                        <div className="flex items-center gap-2">
                            {step >= 1 && step <= 4 && <Button type="button" variant="ghost" size="lg" onClick={() => setStep(step + 1)}>Skip for now</Button>}
                            <Button type="button" size="lg" onClick={next}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                        </div>
                    ) : (
                        <Button type="button" size="lg" onClick={create} disabled={submitting}>{submitting ? 'Creating…' : 'Create project'}</Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ReviewList({ rows, onEdit }: { rows: [number, string, string][]; onEdit: (step: number) => void }) {
    return (
        <dl className="divide-y divide-gray-100 rounded-2xl border border-gray-200 dark:divide-zinc-800 dark:border-zinc-800">
            {rows.map(([s, label, value]) => (
                <div key={label} className="flex items-start gap-3 p-3">
                    <dt className="w-32 shrink-0 text-xs font-semibold text-gray-500 dark:text-zinc-400">{label}</dt>
                    <dd className={`flex-1 break-words text-sm ${value === '—' ? 'text-gray-400 dark:text-zinc-600' : 'text-gray-900 dark:text-zinc-100'}`}>{value}</dd>
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => onEdit(s)}>Edit</Button>
                </div>
            ))}
        </dl>
    );
}

function LogoAwarePreview({ draft, file }: { draft: BrandDraft; file: File | null }) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!file) { setUrl(null); return; }
        const u = URL.createObjectURL(file);
        setUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [file]);
    return <BrandPreviewCard draft={draft} logoPreview={url} />;
}
