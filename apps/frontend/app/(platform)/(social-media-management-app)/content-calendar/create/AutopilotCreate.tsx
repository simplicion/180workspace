'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Sparkles, CalendarDays, Plus, X, CheckCircle2 } from 'lucide-react';
import { UniversalSkeleton } from '@workspace/ui';
import { socialProjectService } from '@/lib/services/social-project.service';
import {
    socialAutopilotService,
    apiError,
    ApiErrorInfo,
    AutopilotJob,
    AutopilotPlatform,
    AUTOPILOT_PLATFORMS,
} from '@/lib/services/social-autopilot.service';
import { ErrorPanel, EmptyPanel } from '../../_components/shared/StatePanels';

const PLATFORM_LABEL: Record<AutopilotPlatform, string> = {
    instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', linkedin: 'LinkedIn', x: 'X',
};

const STAGE_LABEL: Record<string, string> = {
    queued: 'Queued',
    research: 'Researching trends',
    strategy: 'Building the strategy',
    hooks_scripts: 'Writing hooks and scripts',
    copy: 'Writing captions per platform',
    critic: 'Reviewing against your brand',
    saving: 'Saving the calendar',
    done: 'Done',
};

const POLL_MS = 2500;

/**
 * Autopilot calendar flow: pick a project, 7/14/30 days, start date, platforms and goals, then poll the job and
 * open the calendar when it completes. `onRouteMissing` is called when the backend has no autopilot route (404
 * without a typed code), so the page can fall back to the legacy wizard.
 */
export default function AutopilotCreate({ initialProjectId, onRouteMissing }: { initialProjectId?: string; onRouteMissing: () => void }) {
    const router = useRouter();
    const [projects, setProjects] = useState<{ id: string; name: string; socialAccounts?: any[] }[] | null>(null);
    const [projectsError, setProjectsError] = useState<ApiErrorInfo | null>(null);
    const [projectId, setProjectId] = useState(initialProjectId || '');
    const [days, setDays] = useState<7 | 14 | 30>(7);
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [platforms, setPlatforms] = useState<AutopilotPlatform[]>([]);
    const [goals, setGoals] = useState<string[]>([]);
    const [goalInput, setGoalInput] = useState('');

    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState<ApiErrorInfo | null>(null);
    const [job, setJob] = useState<AutopilotJob | null>(null);
    const [jobRef, setJobRef] = useState<{ projectId: string; jobId: string } | null>(null);
    const [pollError, setPollError] = useState<ApiErrorInfo | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadProjects = useCallback(async () => {
        setProjectsError(null);
        setProjects(null);
        try {
            const data = await socialProjectService.getProjects({ limit: 100 });
            const list = data.projects || [];
            setProjects(list);
            if (!initialProjectId && list.length === 1) setProjectId(list[0].id);
        } catch (err) {
            setProjectsError(apiError(err, 'Could not load your social projects.'));
        }
    }, [initialProjectId]);

    useEffect(() => { loadProjects(); }, [loadProjects]);

    const poll = useCallback(async (ref: { projectId: string; jobId: string }) => {
        try {
            const j = await socialAutopilotService.getAutopilotJob(ref.projectId, ref.jobId);
            setJob(j);
            setPollError(null);
            if (j.status === 'completed') {
                router.push(`/content-calendar/${j.calendarId}`);
                return;
            }
            if (j.status === 'failed') return;
        } catch (err) {
            setPollError(apiError(err, 'Lost contact with the job.'));
            return;
        }
        timer.current = setTimeout(() => poll(ref), POLL_MS);
    }, [router]);

    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

    const beginPolling = (ref: { projectId: string; jobId: string }) => {
        if (timer.current) clearTimeout(timer.current);
        setJobRef(ref);
        poll(ref);
    };

    const addGoal = () => {
        const g = goalInput.trim().slice(0, 200);
        if (!g || goals.length >= 5) return;
        setGoals((prev) => [...prev, g]);
        setGoalInput('');
    };

    const start = async () => {
        if (!projectId) return;
        setStarting(true);
        setStartError(null);
        setJob(null);
        try {
            const pendingGoal = goalInput.trim();
            const allGoals = pendingGoal && goals.length < 5 ? [...goals, pendingGoal.slice(0, 200)] : goals;
            const res = await socialAutopilotService.startAutopilot(projectId, {
                days,
                startDate,
                ...(platforms.length ? { platforms } : {}),
                goals: allGoals,
            });
            beginPolling({ projectId, jobId: res.jobId });
        } catch (err) {
            const info = apiError(err, 'Could not start the autopilot.');
            if (info.status === 404 && info.code !== 'NOT_FOUND') {
                onRouteMissing();
                return;
            }
            if (info.code === 'CONFLICT' && info.details?.jobId) {
                // A job is already running for this project: follow it instead of starting a second one.
                beginPolling({ projectId, jobId: String(info.details.jobId) });
                return;
            }
            setStartError(info);
        } finally {
            setStarting(false);
        }
    };

    // ---------------------------------------------------------------- progress view
    if (jobRef) {
        const failed = job?.status === 'failed';
        const pct = Math.max(0, Math.min(100, Math.round(job?.progress ?? 0)));
        return (
            <div className="max-w-2xl mx-auto pb-12 space-y-6">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-indigo-600" /> Autopilot is building your calendar
                </h1>
                <div className="card p-6 md:p-8 space-y-5 dark:bg-zinc-900 dark:border-zinc-800">
                    {!job && !pollError ? (
                        <UniversalSkeleton type="form" fields={2} />
                    ) : failed ? (
                        <ErrorPanel
                            title="The calendar could not be generated"
                            message={job?.error?.message || 'The job failed.'}
                            code={job?.error?.code}
                            onRetry={() => { setJobRef(null); start(); }}
                            retryLabel="Start again"
                            secondary={job?.error?.code === 'AI_NOT_CONFIGURED'
                                ? { label: 'Open AI settings', href: '/settings/ai' }
                                : { label: 'Change settings', onClick: () => { setJobRef(null); setJob(null); } }}
                        />
                    ) : (
                        <>
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-semibold text-gray-900 dark:text-zinc-100">{STAGE_LABEL[job?.stage || 'queued'] || job?.stage}</span>
                                <span className="text-gray-500 dark:text-zinc-400 tabular-nums">{pct}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                                <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            {job?.detail && <p className="text-xs text-gray-500 dark:text-zinc-400">{job.detail}</p>}
                            <ol className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                                {(['research', 'strategy', 'hooks_scripts', 'copy', 'critic', 'saving'] as const).map((s) => {
                                    const order = ['queued', 'research', 'strategy', 'hooks_scripts', 'copy', 'critic', 'saving', 'done'];
                                    const done = order.indexOf(job?.stage || 'queued') > order.indexOf(s);
                                    const active = job?.stage === s;
                                    return (
                                        <li key={s} className={clsx('flex items-center gap-1.5 px-2 py-1.5 rounded-lg border',
                                            done ? 'border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-400'
                                                : active ? 'border-indigo-300 text-indigo-700 dark:border-indigo-500/40 dark:text-indigo-300'
                                                    : 'border-gray-200 text-gray-400 dark:border-zinc-800 dark:text-zinc-500')}>
                                            {done ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current" />}
                                            {STAGE_LABEL[s]}
                                        </li>
                                    );
                                })}
                            </ol>
                            {pollError && (
                                <ErrorPanel
                                    compact
                                    title="Lost contact with the job"
                                    message={`${pollError.message} The job keeps running on the server.`}
                                    code={pollError.code}
                                    onRetry={() => poll(jobRef)}
                                    retryLabel="Check again"
                                    secondary={{ label: 'Go to calendars', href: '/content-calendar' }}
                                />
                            )}
                            <p className="text-xs text-gray-500 dark:text-zinc-400">
                                You can leave this page; the calendar appears in your calendars list when it is ready.
                            </p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------- setup form
    return (
        <div className="max-w-3xl mx-auto pb-12 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-indigo-600" /> Autopilot content calendar
                </h1>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
                    Research, strategy, hooks, scripts and captions written from your project&apos;s brand profile.
                </p>
            </div>

            <div className="card p-4 md:p-8 space-y-6 dark:bg-zinc-900 dark:border-zinc-800">
                {/* Project */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Project</label>
                    {projectsError ? (
                        <ErrorPanel
                            compact
                            title="Could not load projects"
                            message={projectsError.message}
                            code={projectsError.code}
                            onRetry={loadProjects}
                            secondary={{ label: 'Open social projects', href: '/social-projects' }}
                        />
                    ) : projects === null ? (
                        <UniversalSkeleton type="form" fields={1} />
                    ) : projects.length === 0 ? (
                        <EmptyPanel
                            icon={<CalendarDays className="w-8 h-8" />}
                            title="No social projects yet"
                            message="Autopilot writes for a project's brand. Create a project first."
                            action={{ label: 'Create a project', onClick: () => router.push('/social-projects/new') }}
                        />
                    ) : (
                        <select
                            className="input min-h-[44px] dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            aria-label="Project"
                        >
                            <option value="">Select a project</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    )}
                </div>

                {/* Days + start */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <span className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Length</span>
                        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Calendar length">
                            {([7, 14, 30] as const).map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    role="radio"
                                    aria-checked={days === d}
                                    onClick={() => setDays(d)}
                                    className={clsx('min-h-[44px] rounded-xl border text-sm font-semibold transition-all duration-300',
                                        days === d ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-zinc-800 dark:text-zinc-300')}
                                >
                                    {d} days
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1" htmlFor="ap-start">Start date</label>
                        <input
                            id="ap-start"
                            type="date"
                            className="input min-h-[44px] dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-1">Dates are in the project&apos;s timezone.</p>
                    </div>
                </div>

                {/* Platforms */}
                <div>
                    <span className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Platforms</span>
                    <div className="flex flex-wrap gap-2">
                        {AUTOPILOT_PLATFORMS.map((p) => {
                            const on = platforms.includes(p);
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => setPlatforms((prev) => (on ? prev.filter((x) => x !== p) : [...prev, p]))}
                                    className={clsx('min-h-[44px] px-4 rounded-xl border text-sm font-medium transition-all duration-300',
                                        on ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-zinc-800 dark:text-zinc-300')}
                                >
                                    {PLATFORM_LABEL[p]}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-1">
                        {platforms.length ? `${platforms.length} selected.` : "None selected: the project's target platforms and connected accounts are used."}
                    </p>
                </div>

                {/* Goals */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1" htmlFor="ap-goal">Goals (up to 5, optional)</label>
                    <div className="flex gap-2">
                        <input
                            id="ap-goal"
                            className="input min-h-[44px] flex-1 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100"
                            value={goalInput}
                            maxLength={200}
                            disabled={goals.length >= 5}
                            onChange={(e) => setGoalInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGoal(); } }}
                            placeholder="e.g. Book 10 discovery calls from Instagram"
                        />
                        <button type="button" onClick={addGoal} disabled={!goalInput.trim() || goals.length >= 5}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 disabled:opacity-40" aria-label="Add goal">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    {goals.length > 0 && (
                        <ul className="flex flex-wrap gap-2 mt-2">
                            {goals.map((g, i) => (
                                <li key={i} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs text-gray-700 dark:text-zinc-200">
                                    {g}
                                    <button type="button" onClick={() => setGoals((prev) => prev.filter((_, j) => j !== i))} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700" aria-label={`Remove goal ${g}`}>
                                        <X className="w-3 h-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {startError && (
                    <ErrorPanel
                        title="Could not start the autopilot"
                        message={startError.message}
                        code={startError.code}
                        onRetry={start}
                        secondary={startError.code === 'AI_NOT_CONFIGURED'
                            ? { label: 'Open AI settings', href: '/settings/ai' }
                            : projectId ? { label: 'Review brand profile', href: `/social-projects/${projectId}?tab=brand` } : undefined}
                    />
                )}
            </div>

            <div className="flex justify-between gap-3">
                <button type="button" className="btn min-h-[44px] px-6" onClick={() => router.push('/content-calendar')}>Cancel</button>
                <button
                    type="button"
                    className="btn-primary min-h-[44px] px-8 inline-flex items-center"
                    onClick={start}
                    disabled={!projectId || !startDate || starting}
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {starting ? 'Starting…' : `Generate ${days}-day calendar`}
                </button>
            </div>
        </div>
    );
}
