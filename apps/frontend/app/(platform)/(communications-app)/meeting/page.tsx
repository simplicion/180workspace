'use client';


import { LogoLoader, ConfirmModal } from "@workspace/ui";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, Plus, Users, Calendar, ExternalLink, Clock, Copy, FileText, Trash } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Meeting { id?: string;
    _id: string;
    roomId: string;
    title?: string;
    createdBy?: { name: string };
    participants?: { name: string }[];
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
    const [showNewForm, setShowNewForm] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        api.get('/api/meeting')
            .then(({ data }) => setMeetings(data.meetings || data || []))
            .catch(() => setMeetings([]))
            .finally(() => setLoading(false));
    }, []);

    async function handleStartMeeting(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        try {
            const { data } = await api.post('/api/meeting', { title: title || 'Quick Meeting' });
            const roomId = data.meeting?.roomId || data.roomId;
            if (!roomId) throw new Error('No room ID returned');
            toast.success('Meeting room created!');
            router.push('/meeting/${roomId}');
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to create meeting');
            setCreating(false);
        }
    }

    function copyLink(roomId: string) {
        navigator.clipboard.writeText(`${window.location.origin}/dashboard/meeting/${roomId}`);
        toast.success('Meeting link copied!');
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
        <div>
            {/* Page Header */}
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Meetings</h1>
                    <p className="page-subtitle">Start, join, and manage video meetings</p>
                </div>
                <button
                    onClick={() => setShowNewForm(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New Meeting
                </button>
            </div>

            {/* New Meeting Form */}
            {showNewForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Video className="w-5 h-5 text-indigo-500" /> Start a Meeting
                            </h2>
                        </div>
                        <form onSubmit={handleStartMeeting} className="px-6 py-5 space-y-4">
                            <div>
                                <label className="label">Meeting Title (optional)</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="input"
                                    placeholder="e.g. Weekly Sync, Project Review..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-1">
                                <button type="button" onClick={() => setShowNewForm(false)} className="btn-secondary" disabled={creating}>Cancel</button>
                                <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
                                    {creating ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                                    {creating ? 'Creating...' : 'Start Now'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Join by Room ID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="card p-5 col-span-1 md:col-span-2">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-indigo-500" /> Join by Room ID
                    </h3>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const roomId = (e.currentTarget.elements.namedItem('roomId') as HTMLInputElement).value.trim();
                            if (roomId) router.push('/meeting/${roomId}');
                        }}
                        className="flex gap-2"
                    >
                        <input name="roomId" type="text" className="input flex-1" placeholder="Enter room ID..." />
                        <button type="submit" className="btn-primary whitespace-nowrap">Join</button>
                    </form>
                </div>

                <div
                    className="card p-5 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100/80 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setShowNewForm(true)}
                >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
                        <Video className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-semibold text-indigo-700 text-sm">Instant Meeting</p>
                    <p className="text-xs text-indigo-400">Start with one click</p>
                </div>
            </div>

            {/* Recent Meetings */}
            <div>
                <h2 className="text-base font-bold text-gray-800 mb-4">Recent Meetings</h2>
                {loading ? (
                    <div className="flex items-center justify-center py-16"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>
                ) : meetings.length === 0 ? (
                    <div className="card p-12 text-center">
                        <Video className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium">No meetings yet</p>
                        <p className="text-gray-300 text-sm mt-1">Start a new meeting to get going</p>
                        <button onClick={() => setShowNewForm(true)} className="btn-primary mt-4 mx-auto">
                            <Plus className="w-4 h-4" /> New Meeting
                        </button>
                    </div>
                ) : (
                    <div className="card">
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Title / Room</th>
                                        <th>Host</th>
                                        <th>Participants</th>
                                        <th>Started</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {meetings.map((m) => (
                                        <tr key={m.id}>
                                            <td className="w-full sm:w-auto">
                                                <p className="font-medium text-gray-900 text-sm">{m.title || 'Untitled Meeting'}</p>
                                                <p className="text-xs text-gray-400 font-mono">{m.roomId}</p>
                                            </td>
                                            <td className="text-sm text-gray-600 whitespace-nowrap">{m.createdBy?.name || user?.name}</td>
                                            <td className="text-sm text-gray-500 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {m.participants?.length || 0}
                                                </div>
                                            </td>
                                            <td className="text-xs text-gray-500 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {m.startedAt ? new Date(m.startedAt).toLocaleString() : '—'}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap">
                                                <span className={clsx('badge', m.status === 'active' || !m.endedAt ? 'badge-green' : 'badge-gray')}>
                                                    {m.status === 'active' || !m.endedAt ? 'Active' : 'Ended'}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <Link
                                                        href={'/meeting/${m.roomId}'}
                                                        className="text-xs text-indigo-600 hover:underline font-medium flex items-center gap-1"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" /> Join
                                                    </Link>
                                                    <Link
                                                        href={'/meeting/${m.roomId}/details'}
                                                        className="text-xs text-slate-600 hover:text-indigo-600 hover:underline font-medium flex items-center gap-1"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" /> Details
                                                    </Link>
                                                    <button onClick={() => copyLink(m.roomId)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                                                        <Copy className="w-3.5 h-3.5" /> Copy
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(m.roomId)} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                                                        <Trash className="w-3.5 h-3.5" /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                title="Delete Meeting"
                message="Are you sure you want to delete this meeting? This cannot be undone."
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
