'use client';


import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Star, Plus, X, ClipboardList, CheckCircle, Clock, Search, TrendingUp, Sparkles, Trophy } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CATEGORIES = ['Job Knowledge', 'Work Quality', 'Teamwork', 'Communication', 'Initiative'];

const STATUS_BADGE: Record<string, string> = {
    draft: 'badge-gray',
    self_eval_pending: 'badge-blue',
    manager_eval_pending: 'badge-orange',
    complete: 'badge-green',
};

function PerformanceDashboard({ data }: { data: any }) {
    if (!data) return null;
    return (
        <div className="space-y-5 p-6 bg-gray-900 rounded-[2rem] border border-white/10 mb-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="w-16 h-16 text-indigo-400 -rotate-12" />
            </div>
            
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Live Intelligence Snapshot</h3>
                    <p className="text-sm font-bold text-white uppercase tracking-widest">Performance Score: {data.overallScore}%</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 relative z-10">
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5 text-center group-hover:border-indigo-500/30 transition-colors">
                    <p className="text-xl font-black text-white tracking-tighter">{data.taskMetrics?.completionRate}%</p>
                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">Velocity</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5 text-center group-hover:border-purple-500/30 transition-colors">
                    <p className="text-xl font-black text-white tracking-tighter">{data.goalMetrics?.averageProgress}%</p>
                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">Ambitions</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5 text-center group-hover:border-emerald-500/30 transition-colors">
                    <p className="text-xl font-black text-white tracking-tighter">{data.attendanceMetrics?.consistency}%</p>
                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">Consistency</p>
                </div>
            </div>

            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 rounded-2xl text-[11px] font-bold leading-relaxed italic relative z-10">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50" />
                <span className="opacity-60 pr-2">Insight:</span> {data.recommendation}
            </div>
        </div>
    );
}

function CreateReviewModal({ onClose, onSuccess, employees }: { onClose: () => void; onSuccess: () => void; employees: any[] }) {
    const [form, setForm] = useState({ employeeId: '', managerId: '', period: '', dueDate: '' });
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [loadingInsights, setLoadingInsights] = useState(false);

    useEffect(() => {
        if (form.employeeId && form.period.length >= 7) {
            setLoadingInsights(true);
            api.get('/api/reviews/performance-insights', { params: { employeeId: form.employeeId, period: form.period } })
                .then(({ data }) => setInsights(data.insights))
                .catch(() => setInsights(null))
                .finally(() => setLoadingInsights(false));
        } else {
            setInsights(null);
        }
    }, [form.employeeId, form.period]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/reviews', form);
            toast.success('Review cycle created with performance snapshot');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to create');
        } finally { setLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50/30 to-white">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Initiate Evaluation</h2>
                        <p className="text-xs text-gray-400 font-medium">Start a data-driven performance cycle</p>
                    </div>
                    <button title="Close Review Modal" onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
                    {/* Insights Section */}
                    {loadingInsights ? (
                        <div className="h-[140px] flex flex-col items-center justify-center bg-indigo-50/30 rounded-2xl border border-dashed border-indigo-200">
                            <LogoLoader className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                            <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-tighter">Analyzing Performance Data...</p>
                        </div>
                    ) : insights ? (
                        <PerformanceDashboard data={insights} />
                    ) : (
                        <div className="h-[140px] flex flex-col items-center justify-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <ClipboardList className="w-6 h-6 text-gray-300 mb-2" />
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter">Select Employee & Period for Insights</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">Employee *</label>
                            <select title="Select Target Employee" required value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} className="select bg-gray-50 border-gray-100 rounded-xl">
                                <option value="">Select Target</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.department})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">Evaluator *</label>
                            <select title="Select Manager/Evaluator" required value={form.managerId} onChange={e => setForm(p => ({ ...p, managerId: e.target.value }))} className="select bg-gray-50 border-gray-100 rounded-xl">
                                <option value="">Select Manager</option>
                                {employees.filter(e => ['admin', 'ceo'].includes(e.role) || (e.permissions && (e.permissions.includes('can_manage_team') || e.permissions.includes('can_manage_hr')))).map(e => (
                                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">Review Period *</label>
                            <input title="Enter Review Period" required value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} className="input bg-gray-50 border-gray-100 rounded-xl" placeholder="e.g. Q1 2025" />
                        </div>
                        <div>
                            <label className="label text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">Submission Due *</label>
                            <input title="Select Due Date" type="date" required value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="input bg-gray-50 border-gray-100 rounded-xl" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? <LogoLoader className="w-5 h-5 animate-spin mx-auto" /> : 'Launch Review Cycle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EvalForm({ review, role, onSuccess }: { review: any; role: string; onSuccess: () => void }) {
    const { user } = useAuth();
    const isSelf = role === 'employee';
    const isManager = role === 'admin' || role === 'ceo' || (user?.permissions && (user.permissions.includes('can_manage_team') || user.permissions.includes('can_manage_hr')));

    // For self
    const [selfRatings, setSelfRatings] = useState<any[]>(CATEGORIES.map(c => ({ category: c, rating: 3, comments: '' })));
    const [selfSummary, setSelfSummary] = useState('');
    // For manager
    const [managerRatings, setManagerRatings] = useState<any[]>(CATEGORIES.map(c => ({ category: c, rating: 3, comments: '' })));
    const [managerSummary, setManagerSummary] = useState('');
    const [overallRating, setOverallRating] = useState(3);
    const [nextGoals, setNextGoals] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (review.selfRatings?.length) setSelfRatings(review.selfRatings);
        if (review.selfSummary) setSelfSummary(review.selfSummary);
        if (review.managerRatings?.length) setManagerRatings(review.managerRatings);
        if (review.managerSummary) setManagerSummary(review.managerSummary);
        if (review.overallRating) setOverallRating(review.overallRating);
        if (review.nextPeriodGoals) setNextGoals(review.nextPeriodGoals);
    }, [review]);

    async function submitSelf(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/api/reviews/${review.id}/self`, { selfRatings, selfSummary });
            toast.success('Self-evaluation submitted!');
            onSuccess();
        } catch { toast.error('Failed to submit'); }
        finally { setLoading(false); }
    }

    async function submitManager(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/api/reviews/${review.id}/manager`, { managerRatings, managerSummary, overallRating, nextPeriodGoals: nextGoals });
            toast.success('Manager evaluation submitted!');
            onSuccess();
        } catch { toast.error('Failed to submit'); }
        finally { setLoading(false); }
    }

    const showSelfForm = isSelf && review.status === 'self_eval_pending';
    const showSelfReadonly = review.status !== 'self_eval_pending' && review.selfRatings?.length > 0;

    const showManagerForm = isManager && review.status === 'manager_eval_pending';
    const showManagerReadonly = review.status === 'complete';

    function RatingStars({ value, onChange, readOnly }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} type="button" disabled={readOnly} onClick={() => onChange?.(star)}
                        title={`Rate ${star} stars`}
                        className={clsx("p-1 focus:outline-none transition-colors", readOnly && "cursor-default")}>
                        <Star className={clsx("w-5 h-5", star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8 mt-6">
            {/* Performance Insights Dashboard (Persisted Snapshot) */}
            {review.performanceSnapshot && (
                <div className="card p-0 overflow-hidden border-2 border-indigo-500/20 shadow-2xl shadow-indigo-500/5">
                    <div className="bg-indigo-900 px-6 py-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Snapshot Metrics</h3>
                            <p className="text-sm font-bold text-white">Performance Data for {review.period}</p>
                        </div>
                        <div className="flex gap-2">
                            <span className="p-2 bg-white/10 rounded-lg text-white font-black text-xs">
                                Overall Score: {review.performanceSnapshot.overallScore || 0}%
                            </span>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/50 backdrop-blur-sm">
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-400 uppercase">Task Efficiency</p>
                            <p className="text-xl font-black text-gray-900">{review.performanceSnapshot.taskMetrics?.completionRate || 0}%</p>
                            <div className="w-full h-1 bg-gray-100 rounded-full">
                                <div className="h-full bg-indigo-500 rounded-full task-efficiency-bar" />
                                <style jsx>{` .task-efficiency-bar { width: ${review.performanceSnapshot.taskMetrics?.completionRate || 0}% } `}</style>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-400 uppercase">Goal Progress</p>
                            <p className="text-xl font-black text-gray-900">{review.performanceSnapshot.goalMetrics?.averageProgress || 0}%</p>
                            <div className="w-full h-1 bg-gray-100 rounded-full">
                                <div className="h-full bg-purple-500 rounded-full goal-progress-bar" />
                                <style jsx>{` .goal-progress-bar { width: ${review.performanceSnapshot.goalMetrics?.averageProgress || 0}% } `}</style>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-400 uppercase">Attendance consistency</p>
                            <p className="text-xl font-black text-gray-900">{review.performanceSnapshot.attendanceMetrics?.consistency || 0}%</p>
                            <div className="w-full h-1 bg-gray-100 rounded-full">
                                <div className="h-full bg-emerald-500 rounded-full consistency-bar" />
                                <style jsx>{` .consistency-bar { width: ${review.performanceSnapshot.attendanceMetrics?.consistency || 0}% } `}</style>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="p-3 bg-indigo-50 rounded-xl text-[10px] text-indigo-700 font-medium leading-tight">
                                Recommendation: {review.performanceSnapshot.recommendation}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Self Eval Section */}
            {(showSelfForm || showSelfReadonly) && (
                <div className="card p-6 border-t-4 border-t-blue-500">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Employee Self-Evaluation</h3>
                    <form onSubmit={submitSelf} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(showSelfForm ? selfRatings : review.selfRatings).map((r: any, i: number) => (
                                <div key={r.category} className="p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-semibold text-gray-800">{r.category}</p>
                                        <RatingStars
                                            value={r.rating}
                                            readOnly={showSelfReadonly}
                                            onChange={(v) => {
                                                const ns = [...selfRatings];
                                                ns[i].rating = v;
                                                setSelfRatings(ns);
                                            }}
                                        />
                                    </div>
                                    <textarea
                                        readOnly={showSelfReadonly}
                                        value={r.comments}
                                        onChange={(e) => {
                                            const ns = [...selfRatings];
                                            ns[i].comments = e.target.value;
                                            setSelfRatings(ns);
                                        }}
                                        className="input text-sm resize-none bg-white" rows={2}
                                        placeholder="Add context or examples..."
                                    />
                                </div>
                            ))}
                        </div>
                        <div>
                            <label className="label">Summary of Achievements & Challenges</label>
                            <textarea
                                readOnly={showSelfReadonly}
                                value={showSelfForm ? selfSummary : review.selfSummary}
                                onChange={e => setSelfSummary(e.target.value)}
                                className="input h-24" placeholder="Summarize your performance this period..."
                            />
                        </div>
                        {showSelfForm && (
                            <div className="flex justify-end">
                                <button type="submit" disabled={loading} className="btn-primary">
                                    {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Submit Self-Evaluation'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            )}

            {/* Manager Eval Section */}
            {(showManagerForm || showManagerReadonly) && (
                <div className="card p-6 border-t-4 border-t-orange-500">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Manager Evaluation</h3>
                    <form onSubmit={submitManager} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(showManagerForm ? managerRatings : review.managerRatings).map((r: any, i: number) => (
                                <div key={r.category} className="p-4 bg-orange-50/50 rounded-xl border border-orange-100/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-semibold text-gray-800">{r.category}</p>
                                        <RatingStars
                                            value={r.rating}
                                            readOnly={showManagerReadonly}
                                            onChange={(v) => {
                                                const ns = [...managerRatings];
                                                ns[i].rating = v;
                                                setManagerRatings(ns);
                                            }}
                                        />
                                    </div>
                                    <textarea
                                        readOnly={showManagerReadonly}
                                        value={r.comments}
                                        onChange={(e) => {
                                            const ns = [...managerRatings];
                                            ns[i].comments = e.target.value;
                                            setManagerRatings(ns);
                                        }}
                                        className="input text-sm resize-none bg-white" rows={2}
                                        placeholder="Manager feedback..."
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">Manager Summary</label>
                                <textarea
                                    readOnly={showManagerReadonly}
                                    value={showManagerForm ? managerSummary : review.managerSummary}
                                    onChange={e => setManagerSummary(e.target.value)}
                                    className="input h-24" placeholder="Overall performance synthesis..."
                                />
                            </div>
                            <div>
                                <label className="label">Goals for Next Period</label>
                                <textarea
                                    readOnly={showManagerReadonly}
                                    value={showManagerForm ? nextGoals : review.nextPeriodGoals}
                                    onChange={e => setNextGoals(e.target.value)}
                                    className="input h-24" placeholder="Objectives for the upcoming cycle..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-900 text-white rounded-xl">
                            <span className="font-bold">Overall Performance Rating</span>
                            <RatingStars
                                value={showManagerForm ? overallRating : review.overallRating}
                                readOnly={showManagerReadonly}
                                onChange={setOverallRating}
                            />
                        </div>

                        {showManagerForm && (
                            <div className="flex justify-end">
                                <button type="submit" disabled={loading} className="btn-primary">
                                    {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Finalize Review'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            )}
        </div>
    );
}

export default function ReviewsPage() {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedReview, setSelectedReview] = useState<any>(null);

    const isHR = ['admin', 'hr'].includes(user?.role || '');

    function loadData() {
        setLoading(true);
        api.get('/api/reviews')
            .then(({ data }) => setReviews(data.reviews || []))
            .catch(() => setReviews([]))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadData();
        if (isHR) {
            api.get('/api/users', { params: { limit: 200 } }).then(({ data }) => setEmployees(data.users || []));
        }
    }, [isHR]);

    return (
        <div>
            {showCreate && <CreateReviewModal onClose={() => setShowCreate(false)} onSuccess={loadData} employees={employees} />}

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Performance Reviews</h1>
                    <p className="page-subtitle">Track and manage employee evaluation cycles</p>
                </div>
                {isHR && (
                    <button onClick={() => setShowCreate(true)} className="btn-primary">
                        <Plus className="w-4 h-4" /> New Review Cycle
                    </button>
                )}
            </div>

            {selectedReview ? (
                <div className="min-h-screen">
                    {/* Header */}
                    <div className="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
                        <div>
                            <button onClick={() => setSelectedReview(null)} className="text-indigo-200 hover:text-white text-sm font-semibold mb-2 flex items-center gap-1">
                                ← Back to List
                            </button>
                            <h2 className="text-2xl font-black">{(selectedReview.employee || selectedReview.employeeId)?.name}&apos;s Review</h2>
                            <p className="text-indigo-200">{selectedReview.period} • Evaluated by {(selectedReview.manager || selectedReview.managerId)?.name}</p>
                        </div>
                        <div className="text-right">
                            <span className={clsx('px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                                selectedReview.status === 'complete' ? 'bg-green-500/20 text-green-300' :
                                    selectedReview.status === 'self_eval_pending' ? 'bg-blue-500/20 text-blue-300' :
                                        'bg-orange-500/20 text-orange-300')}>
                                {selectedReview.status?.replace(/_/g, ' ')}
                            </span>
                            {selectedReview.dueDate && <p className="text-xs text-indigo-300 mt-2">Due: {format(new Date(selectedReview.dueDate), 'MMM d, yyyy')}</p>}
                        </div>
                    </div>

                    <EvalForm review={selectedReview} role={user?.role || 'employee'} onSuccess={() => {
                        loadData();
                        setSelectedReview(null);
                    }} />
                </div>
            ) : (
                <>
                    {/* List View */}
                    {loading ? (
                        <div className="flex justify-center py-20"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-20">
                            <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No active reviews</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {reviews.map(rev => (
                                <div key={rev.id} onClick={() => setSelectedReview(rev)}
                                    className="card p-5 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all group relative overflow-hidden">

                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{(rev.employee || rev.employeeId)?.name}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{(rev.employee || rev.employeeId)?.department}</p>
                                        </div>
                                        <span className={clsx('badge text-[10px] uppercase truncate max-w-[100px]', STATUS_BADGE[rev.status] || 'badge-gray')}>
                                            {rev.status?.replace(/_/g, ' ')}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                                        <div className="flex justify-between border-b border-gray-50 pb-1">
                                            <span className="text-gray-400">Period</span>
                                            <span className="font-semibold text-gray-800">{rev.period}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-50 pb-1">
                                            <span className="text-gray-400">Manager</span>
                                            <span className="font-medium text-gray-800">{(rev.manager || rev.managerId)?.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Due</span>
                                            <span className="font-medium text-gray-800">{rev.dueDate ? format(new Date(rev.dueDate), 'MMM d, yyyy') : '—'}</span>
                                        </div>
                                    </div>

                                    {rev.status === 'complete' && rev.overallRating && (
                                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                                            <span className="text-xs text-gray-400 font-semibold uppercase">Final Rating</span>
                                            <div className="flex text-yellow-500">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} fill={i < rev.overallRating ? 'currentColor' : 'none'} className="w-4 h-4" />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
