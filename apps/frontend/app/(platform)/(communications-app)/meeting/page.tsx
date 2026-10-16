'use client';

import { LogoLoader, ConfirmModal } from "@workspace/ui";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, Plus, Users, Calendar, ExternalLink, Clock, Copy, FileText, Trash, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Meeting {
    id?: string;
    _id: string;
    roomId: string;
    title?: string;
    meetingLink?: string | null;
    platform?: string;
    agenda?: string;
    createdBy?: { name: string; email?: string };
    participants?: { name?: string; userId?: string }[];
    startedAt?: string;
    endedAt?: string;
    status?: string;
}

// ─── Meeting Portal ───────────────────────────────────────────────────────────
export default function MeetingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [title, setTitle] = useState('');
    const [agenda, setAgenda] = useState('');
    const [customLink, setCustomLink] = useState('');
    const [showNewForm, setShowNewForm] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [joinInput, setJoinInput] = useState('');

    useEffect(() => {
        loadMeetings();
    }, []);

    function loadMeetings() {
        api.get('/api/meeting')
            .then(({ data }) => setMeetings(data.meetings || data || []))
            .catch(() => setMeetings([]))
            .finally(() => setLoading(false));
    }

    async function handleStartMeeting(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        try {
            const { data } = await api.post('/api/meeting', {
                title: title || 'Quick Meeting',
                agenda: agenda || '',
                meetingLink: customLink || undefined,
                platform: 'google_meet'
            });
            const created = data.meeting || data;
            const roomId = created.roomId;
            const meetLink = created.meetingLink;
            if (!roomId) throw new Error('No room ID returned');

            toast.success('Google Meet room created!');
            if (meetLink) {
                window.open(meetLink, '_blank', 'noopener,noreferrer');
            }
            router.push(`/meeting/${roomId}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to create meeting');
            setCreating(false);
        }
    }

    async function handleInstantMeeting() {
        setCreating(true);
        try {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const { data } = await api.post('/api/meeting', {
                title: `Instant Google Meet (${timeStr})`,
                platform: 'google_meet'
            });
            const created = data.meeting || data;
            const roomId = created.roomId;
            const meetLink = created.meetingLink;
            if (!roomId) throw new Error('No room ID returned');

            toast.success('Instant Google Meet launched!');
            if (meetLink) {
                window.open(meetLink, '_blank', 'noopener,noreferrer');
            }
            router.push(`/meeting/${roomId}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to launch instant meeting');
            setCreating(false);
        }
    }

    function handleQuickJoin(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = joinInput.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('https://meet.google.com/') || trimmed.startsWith('meet.google.com/')) {
            const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
            window.open(fullUrl, '_blank', 'noopener,noreferrer');
            return;
        }

        router.push(`/meeting/${trimmed}`);
    }

    function copyLink(meet: Meeting) {
        const linkToCopy = meet.meetingLink || `${window.location.origin}/meeting/${meet.roomId}`;
        navigator.clipboard.writeText(linkToCopy);
        toast.success(meet.meetingLink ? 'Google Meet link copied!' : 'Meeting Hub link copied!');
    }

    function handleDeleteClick(roomId: string) {
        setMeetingToDelete(roomId);
        setDeleteModalOpen(true);
    }

    async function confirmDelete() {
        if (!meetingToDelete) return;
        setDeleting(true);
        try {
            await api.delete(`/api/meeting/${meetingToDelete}`);
            setMeetings(meetings.filter(m => m.roomId !== meetingToDelete));
            toast.success('Meeting deleted successfully');
            setDeleteModalOpen(false);
            setMeetingToDelete(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to delete meeting');
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-zinc-800">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40">
                            <Video className="w-5 h-5" />
                        </span>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Meetings</h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                        Start Google Meet sessions instantly, coordinate live agendas, and record AI-powered meeting intelligence.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleInstantMeeting}
                        disabled={creating}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-all cursor-pointer"
                    >
                        {creating ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                        Instant Google Meet
                    </button>
                    <button
                        onClick={() => setShowNewForm(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" /> Schedule / Custom
                    </button>
                </div>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Instant Google Meet Launcher */}
                <div
                    onClick={handleInstantMeeting}
                    className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 dark:border-emerald-500/30 cursor-pointer hover:shadow-lg hover:border-emerald-500/40 transition-all group relative overflow-hidden"
                >
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                            <Video className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            1-Click
                        </span>
                    </div>
                    <h3 className="mt-4 font-bold text-gray-900 dark:text-zinc-100 text-base">Instant Google Meet</h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                        Generates a unique Google Meet space and launches both the call and 180workspace notes hub.
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                        <span>Launch Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                </div>

                {/* 2. Join by Google Meet Link or Room ID */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <ExternalLink className="w-4 h-4 text-indigo-500" />
                            <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-sm">Join by URL or Code</h3>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
                            Paste a Google Meet link or 180workspace Room ID to enter immediately.
                        </p>
                    </div>
                    <form onSubmit={handleQuickJoin} className="flex gap-2">
                        <input
                            type="text"
                            value={joinInput}
                            onChange={e => setJoinInput(e.target.value)}
                            placeholder="meet.google.com/xxx-yyyy or room ID"
                            className="input flex-1 text-xs py-2 dark:bg-zinc-950 dark:border-zinc-700"
                        />
                        <button type="submit" className="btn-primary text-xs px-3 whitespace-nowrap">
                            Join
                        </button>
                    </form>
                </div>

                {/* 3. Schedule with Calendar */}
                <div
                    onClick={() => router.push('/calendar')}
                    className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 shadow-sm cursor-pointer hover:shadow-lg hover:border-indigo-500/30 transition-all group flex flex-col justify-between"
                >
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-sm">Calendar Scheduling</h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                            Invite team members & clients with automated email invitations and synchronized reminders.
                        </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                        <span>Open Calendar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>

            {/* New Meeting Modal */}
            {showNewForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50">
                            <div className="flex items-center gap-2.5">
                                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40">
                                    <Video className="w-5 h-5" />
                                </span>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Create Google Meet Room</h2>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400">Sets up a Google Meet space with synchronized 180workspace notes & AI tasks.</p>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleStartMeeting} className="p-6 space-y-4">
                            <div>
                                <label className="label">Meeting Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="input dark:bg-zinc-950 dark:border-zinc-700"
                                    placeholder="e.g. Q4 Strategy Review, Client Discovery Call"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Meeting Agenda (optional)</label>
                                <textarea
                                    value={agenda}
                                    onChange={e => setAgenda(e.target.value)}
                                    rows={3}
                                    className="input dark:bg-zinc-950 dark:border-zinc-700 resize-none"
                                    placeholder="Key objectives, talking points, or discussion topics..."
                                />
                            </div>
                            <div>
                                <label className="label flex items-center justify-between">
                                    <span>Google Meet Link</span>
                                    <span className="text-[11px] text-gray-400 font-normal">Leave blank to auto-generate</span>
                                </label>
                                <input
                                    type="text"
                                    value={customLink}
                                    onChange={e => setCustomLink(e.target.value)}
                                    className="input dark:bg-zinc-950 dark:border-zinc-700"
                                    placeholder="https://meet.google.com/xxx-yyyy-zzz (Auto-generated if blank)"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setShowNewForm(false)}
                                    className="btn-secondary"
                                    disabled={creating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                                >
                                    {creating ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                                    {creating ? 'Creating...' : 'Create & Launch Meet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Recent Meetings Table */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        Meeting History & Workspaces
                    </h2>
                    <span className="text-xs text-gray-400 font-mono">
                        {meetings.length} record{meetings.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <LogoLoader className="w-8 h-8 animate-spin text-emerald-500" />
                    </div>
                ) : meetings.length === 0 ? (
                    <div className="card p-12 text-center border-dashed dark:border-zinc-800">
                        <Video className="w-12 h-12 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-zinc-400 font-medium">No meetings yet</p>
                        <p className="text-gray-400 dark:text-zinc-500 text-xs mt-1">Start an instant Google Meet to begin capturing notes and AI action items.</p>
                        <button onClick={handleInstantMeeting} className="btn-primary mt-4 mx-auto bg-emerald-600 hover:bg-emerald-700">
                            <Video className="w-4 h-4" /> Start Instant Google Meet
                        </button>
                    </div>
                ) : (
                    <div className="card overflow-hidden dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Title & Meeting Space</th>
                                        <th>Platform</th>
                                        <th>Host</th>
                                        <th>Date & Time</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {meetings.map((m) => {
                                        const meetLink = m.meetingLink;
                                        return (
                                            <tr key={m._id || m.id || m.roomId} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                                                <td>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900 dark:text-zinc-100 text-sm">
                                                            {m.title || 'Untitled Meeting'}
                                                        </span>
                                                        <span className="text-xs text-gray-400 dark:text-zinc-500 font-mono mt-0.5">
                                                            {m.roomId}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30">
                                                        <Video className="w-3 h-3 text-emerald-500" />
                                                        Google Meet
                                                    </span>
                                                </td>
                                                <td className="text-sm text-gray-600 dark:text-zinc-400 whitespace-nowrap">
                                                    {m.createdBy?.name || user?.name || 'Workspace Host'}
                                                </td>
                                                <td className="text-xs text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                        {m.startedAt ? new Date(m.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap">
                                                    <span className={clsx(
                                                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
                                                        m.status === 'active' || !m.endedAt
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                            : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400'
                                                    )}>
                                                        {m.status === 'active' || !m.endedAt ? 'Active' : 'Completed'}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        {meetLink && (
                                                            <a
                                                                href={meetLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold transition-colors"
                                                                title="Join on Google Meet"
                                                            >
                                                                <Video className="w-3.5 h-3.5" />
                                                                <span>Join Meet</span>
                                                            </a>
                                                        )}
                                                        <Link
                                                            href={`/meeting/${m.roomId}`}
                                                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold transition-colors"
                                                            title="Open Workspace Notes & AI Tasks"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                            <span>Hub</span>
                                                        </Link>
                                                        <button
                                                            onClick={() => copyLink(m)}
                                                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
                                                            title="Copy Link"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(m.roomId)}
                                                            className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                                                            title="Delete Meeting"
                                                        >
                                                            <Trash className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                title="Delete Meeting Record"
                message="Are you sure you want to delete this meeting? All associated notes and logs for this room will be removed."
                confirmText="Delete"
                variant="danger"
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setMeetingToDelete(null);
                }}
            />
        </div>
    );
}
