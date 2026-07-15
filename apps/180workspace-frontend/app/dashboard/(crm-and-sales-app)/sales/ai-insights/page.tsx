'use client';


import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Sparkles, FileText, CheckCircle2, MessageSquare, Target, Users } from 'lucide-react';
import clsx from 'clsx';

export default function MeetingAnalyticsPage() {
    const { token } = useAuth();
    const [transcript, setTranscript] = useState('');
    const [title, setTitle] = useState('Quarterly Sync');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState<any>(null);

    const handleAnalyze = async () => {
        if (!transcript.trim()) {
            setError('Please paste a meeting transcript.');
            return;
        }

        setError('');
        setLoading(true);
        setData(null);

        try {
            const res = await api.post('/api/meeting/ai/process', {
                roomId: 'adhoc-' + Date.now(),
                title,
                transcript,
                participants: ['Sales Rep', 'Client']
            });
            setData(res.data.data);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || err.response?.data?.message || 'Failed to analyze meeting');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 flex flex-col sm:flex-row gap-6">
            {/* Left Side: Input */}
            <div className="w-full sm:w-1/2 flex flex-col space-y-4">
                <div className="border-b pb-4">
                    <h1 className="text-2xl font-bold font-heading text-gray-900 flex items-center">
                        <Sparkles className="w-6 h-6 mr-3 text-indigo-600" />
                        Meeting Analytics & AI Insights
                    </h1>
                    <p className="text-gray-500 mt-1">Paste meeting transcripts to extract keywords, summarize discussions, and auto-generate tasks directly into your pipeline.</p>
                </div>

                <div className="card p-5 flex flex-col flex-1">
                    <label className="text-sm font-semibold text-gray-700 mb-1">Meeting Title</label>
                    <input
                        type="text"
                        className="input mb-4"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />

                    <label className="text-sm font-semibold text-gray-700 mb-2">Transcript Content</label>
                    <textarea
                        className="input flex-1 min-h-[300px] resize-none text-sm p-4 text-gray-600 mb-4 font-mono"
                        placeholder="Speaker 1: Let's discuss the Q3 roadmap...&#10;Speaker 2: I'll take care of updating the CRM integrations by next week."
                        value={transcript}
                        onChange={e => setTranscript(e.target.value)}
                    />

                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">{transcript.length} characters</span>
                        <button
                            onClick={handleAnalyze}
                            disabled={loading || transcript.length === 0}
                            className="btn-primary flex items-center gap-2"
                        >
                            {loading ? (
                                <Sparkles className="w-4 h-4 animate-pulse" />
                            ) : (
                                <MessageSquare className="w-4 h-4" />
                            )}
                            {loading ? 'Processing...' : 'Generate Insights'}
                        </button>
                    </div>
                    {error && <p className="text-sm text-red-600 font-medium mt-3">{error}</p>}
                </div>
            </div>

            {/* Right Side: Output */}
            <div className="w-full sm:w-1/2 flex flex-col space-y-4">
                <div className="border-b pb-4 mt-6 sm:mt-0 opacity-0 hidden sm:block">
                    <h1 className="text-2xl font-bold font-heading text-transparent">Placeholder</h1>
                    <p className="text-transparent mt-1">Placeholder</p>
                </div>

                <div className={clsx("card p-6 flex flex-col flex-1", !data && !loading && "bg-gray-50/50 justify-center items-center border-dashed border-2")}>
                    {!data && !loading && (
                        <div className="text-center text-gray-400">
                            <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50 text-indigo-300" />
                            <h3 className="text-lg font-medium text-gray-600 mb-1">Ready for Analysis</h3>
                            <p className="text-sm max-w-sm">Results including extracted keywords and auto-generated action items will appear here.</p>
                        </div>
                    )}

                    {loading && (
                        <div className="space-y-6 animate-pulse">
                            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                            <div className="h-20 bg-gray-100 rounded"></div>
                            <div className="h-32 bg-gray-100 rounded"></div>
                        </div>
                    )}

                    {data && !loading && (
                        <div className="space-y-6">
                            <div className="border-b border-gray-100 pb-4">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 mb-2 inline-block">AI Synced</span>
                                <h2 className="text-xl font-bold text-gray-900 leading-tight">Meeting Summary</h2>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <h4 className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                                    <Target className="w-3.5 h-3.5" /> Agenda
                                </h4>
                                <p className="text-sm text-gray-800 font-medium">{data.summary?.agenda}</p>
                            </div>

                            {data.summary?.keywords && data.summary.keywords.length > 0 && (
                                <div>
                                    <h4 className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5" /> Extracted Keywords
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {data.summary.keywords.map((kw: string, i: number) => (
                                            <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-semibold">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-3">Highlights</h4>
                                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                                        {(data.summary?.highlights || []).map((h: string, i: number) => <li key={i}>{h}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-3">Decisions</h4>
                                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                                        {(data.summary?.decisions || []).map((d: string, i: number) => <li key={i}>{d}</li>)}
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-xl mt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs uppercase font-bold tracking-wider text-blue-800 flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4 text-blue-600" /> Auto-Created Tasks
                                    </h4>
                                    <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                                        {data.actionItems?.length || 0} Added
                                    </span>
                                </div>

                                {(data.actionItems && data.actionItems.length > 0) ? (
                                    <ul className="space-y-3">
                                        {data.actionItems.map((task: any, i: number) => (
                                            <li key={i} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-semibold text-sm text-gray-900">{task.title}</span>
                                                    <span className={clsx(
                                                        "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                                        task.priority === 'high' || task.priority === 'critical' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                                                    )}>
                                                        {task.priority || 'medium'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">{task.description}</p>
                                                {task.keywords && task.keywords.length > 0 && (
                                                    <div className="flex gap-1 flex-wrap">
                                                        {task.keywords.map((kw: string, kidx: number) => (
                                                            <span key={kidx} className="text-[9px] bg-gray-50 text-gray-500 border border-gray-200 px-1 py-0.5 rounded">#{kw}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No action items detected.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
