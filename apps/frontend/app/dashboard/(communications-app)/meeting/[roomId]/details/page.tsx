'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LogoLoader } from '@workspace/ui';
import { ArrowLeft, CheckSquare, FileText, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MeetingDetails() {
    const { roomId } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<any>(null);
    const [meetingLog, setMeetingLog] = useState<any>(null);
    const [transcripts, setTranscripts] = useState<any[]>([]);

    useEffect(() => {
        if (!roomId) return;
        fetchDetails();
    }, [roomId]);

    const fetchDetails = async () => {
        try {
            // Fetch both meeting details and AI summary in parallel
            const [logRes, summaryRes] = await Promise.allSettled([
                api.get(`/api/meeting/room/${roomId}/details`),
                api.get(`/api/meeting/ai/summary/${roomId}`)
            ]);

            if (logRes.status === 'fulfilled') {
                setMeetingLog(logRes.value.data.log);
            }
            if (summaryRes.status === 'fulfilled') {
                setSummary(summaryRes.value.data);
            }

        } catch (err: any) {
            console.error('Failed to fetch meeting details:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
                <LogoLoader className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-400">Loading meeting report...</p>
            </div>
        );
    }

    if (!summary && !meetingLog) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] max-w-md mx-auto text-center space-y-4">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Meeting Not Found</h2>
                <p className="text-slate-400 text-sm">
                    We couldn't find this meeting room.
                </p>
                <button
                    onClick={() => router.push('/dashboard/calendar')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Calendar
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 mb-2 text-sm font-medium">
                        <Sparkles className="w-4 h-4" />
                        Meeting Details {summary ? '& AI Report' : ''}
                    </div>
                    <h1 className="text-3xl font-bold text-white">{meetingLog?.title || summary?.title || 'Meeting Room'}</h1>
                    <p className="text-slate-400 mt-1">
                        Host: {meetingLog?.createdBy?.name || 'Unknown'} • 
                        Created: {meetingLog?.startTime ? new Date(meetingLog.startTime).toLocaleString() : (summary?.date ? new Date(summary.date).toLocaleString() : 'N/A')} • 
                        {meetingLog?.participants?.length || summary?.participants?.length || 0} Participants
                    </p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/calendar')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!summary ? (
                    <div className="col-span-1 md:col-span-2">
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 text-center">
                            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-white mb-2">No AI Summary Available</h3>
                            <p className="text-slate-400">
                                This meeting ended without generating an AI summary. This usually happens if the meeting was too short or no conversation was transcribed.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-6">
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-400" />
                                    Meeting Summary
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Agenda</h4>
                                        <p className="text-slate-200">{summary.summary?.agenda || 'No agenda recorded.'}</p>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Highlights</h4>
                                        <ul className="list-disc list-inside text-slate-200 space-y-1">
                                            {(summary.summary?.highlights || []).map((h: string, i: number) => (
                                                <li key={i}>{h}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Decisions</h4>
                                        <ul className="list-disc list-inside text-slate-200 space-y-1">
                                            {(summary.summary?.decisions || []).map((d: string, i: number) => (
                                                <li key={i}>{d}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                                    Action Items
                                </h3>
                                
                                {(summary.actionItems || []).length === 0 ? (
                                    <p className="text-slate-400 text-sm">No action items were identified in this meeting.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {summary.actionItems.map((item: any, i: number) => (
                                            <div key={i} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h4 className="text-white font-medium">{item.title}</h4>
                                                        <p className="text-slate-400 text-sm mt-1">{item.description}</p>
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                                                        item.priority === 'high' || item.priority === 'critical' ? 'bg-red-500/10 text-red-400' :
                                                        item.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                                                        'bg-emerald-500/10 text-emerald-400'
                                                    }`}>
                                                        {item.priority || 'medium'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
