'use client';

import React, { useState, useEffect } from 'react';
import { 
    CheckCircle2, Send, Clock, Copy, ExternalLink, ShieldCheck, 
    AlertCircle, MessageSquare, Plus, Check
} from 'lucide-react';
import { SocialProject } from '@/lib/services/social-project.service';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ApprovalsTabProps {
    project: SocialProject;
    onGenerateReviewSessionClick: () => void;
}

export const ApprovalsTab: React.FC<ApprovalsTabProps> = ({ project, onGenerateReviewSessionClick }) => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    const loadSessions = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/api/social-media/reviews/sessions', {
                params: { projectId: project.id }
            }).catch(() => ({ data: { sessions: [] } }));
            setSessions(data.sessions || []);
        } catch (err) {
            console.error('Failed to load review sessions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, [project.id]);

    const handleCopyLink = (token: string) => {
        const fullUrl = `${window.location.origin}/review/${token}`;
        navigator.clipboard.writeText(fullUrl);
        setCopiedToken(token);
        toast.success('Client review link copied to clipboard!');
        setTimeout(() => setCopiedToken(null), 3000);
    };

    return (
        <div className="space-y-6">
            {/* Header / Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Client Approval Sessions
                    </h3>
                    <p className="text-xs text-slate-500">
                        Generate secure, tokenized review portals for clients to approve calendar batches.
                    </p>
                </div>

                <button
                    onClick={onGenerateReviewSessionClick}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Review Session</span>
                </button>
            </div>

            {/* Sessions List */}
            {sessions.length === 0 ? (
                <div className="text-center py-16 p-6 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
                    <ShieldCheck className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Review Sessions Created</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                        Send content batches to your client for 1-click batch approval or timestamped feedback.
                    </p>
                    <button
                        onClick={onGenerateReviewSessionClick}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
                    >
                        Generate Review Link
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                        >
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                                        session.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                        session.status === 'revisions_requested' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                                    }`}>
                                        {session.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        Expires {new Date(session.expiresAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {session.name}
                                </h4>
                                <p className="text-xs text-slate-500">
                                    Review window: {new Date(session.startDate).toLocaleDateString()} – {new Date(session.endDate).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleCopyLink(session.token)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition"
                                >
                                    {copiedToken === session.token ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedToken === session.token ? 'Copied Link' : 'Copy Review Link'}</span>
                                </button>

                                <a
                                    href={`/review/${session.token}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl hover:bg-indigo-100 transition"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
