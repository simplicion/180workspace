'use client';


import { LogoLoader } from "@workspace/ui";
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { Target, Plus, CheckCircle2, Clock, Pencil, ChevronDown, ChevronUp, Check, Search, Filter, BarChart3, Rocket, User as UserIcon, Globe, Users2 } from 'lucide-react';
import clsx from 'clsx';
import CreateGoalModal from '@/app/dashboard/(projects-and-tasks-app)/_components/CreateGoalModal';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-600' },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-600' },
    cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-600' },
    paused: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-600' },
    on_hold: { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-600' },
};

const DIFFICULTY_MAP: Record<string, { label: string; color: string; bg: string }> = {
    easy: { label: 'Standard', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    medium: { label: 'Strategic', color: 'text-blue-600', bg: 'bg-blue-50' },
    hard: { label: 'High Priority', color: 'text-orange-600', bg: 'bg-orange-50' },
    heroic: { label: 'Critical', color: 'text-purple-600', bg: 'bg-purple-50' },
};

interface KeyResult { id?: string; _id: string; text: string; done: boolean; }

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
    return (
        <div className="card p-5">
            <div className="flex items-center gap-4">
                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                </div>
            </div>
        </div>
    );
}

function GoalCard({ goal, onEdit, onProgressUpdate, canEdit }: { goal: any; onEdit: () => void; onProgressUpdate: (id: string, progress: number) => void; canEdit: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const [keyResults, setKeyResults] = useState<KeyResult[]>(
        goal.keyResults?.map((kr: any, i: number) => ({ _id: kr.id || i.toString(), text: kr.text || kr, done: kr.done || false })) || []
    );
    const [newKR, setNewKR] = useState('');
    const statusInfo = STATUS_COLORS[goal.status] || STATUS_COLORS.active;
    const diffInfo = DIFFICULTY_MAP[goal.difficulty || 'medium'];

    async function addKeyResult() {
        if (!newKR.trim()) return;
        const updated = [...keyResults, { _id: Date.now().toString(), text: newKR.trim(), done: false }];
        setKeyResults(updated);
        setNewKR('');
        try {
            const payload = updated.map(kr => ({ text: kr.text, done: kr.done }));
            await api.put(`/api/goals/${goal.id}`, { keyResults: payload });
        } catch { toast.error('Action failed'); }
    }

    async function toggleKR(_id: string) {
        const updated = keyResults.map(kr => kr.id === _id ? { ...kr, done: !kr.done } : kr);
        setKeyResults(updated);
        const pct = updated.length > 0 ? Math.round((updated.filter(k => k.done).length / updated.length) * 100) : goal.progress;
        try {
            const payload = updated.map(kr => ({ text: kr.text, done: kr.done }));
            await api.put(`/api/goals/${goal.id}`, { keyResults: payload, progress: pct });
            onProgressUpdate(goal.id, pct);
        } catch { toast.error('Sync failed'); }
    }

    const doneCount = keyResults.filter(k => k.done).length;

    return (
        <div className="card p-6 border-l-[4px]" style={{ borderLeftColor: goal.color || '#6366f1' } as React.CSSProperties}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4 min-w-0">
                    <div className="relative flex-shrink-0">
                        <img 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(goal.ownerId?.name || 'User')}&background=random&bold=true`} 
                            alt="Owner"
                            className="w-10 h-10 rounded-lg border border-gray-100"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded bg-white shadow-sm flex items-center justify-center border border-gray-100">
                            {goal.type === 'company' ? <Globe className="w-2.5 h-2.5 text-indigo-500" /> : <UserIcon className="w-2.5 h-2.5 text-gray-400" />}
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={clsx("text-[10px] font-bold uppercase px-2 py-0.5 rounded", diffInfo.bg, diffInfo.color)}>
                                {diffInfo.label}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{goal.type}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 truncate pr-4">
                            {goal.title}
                        </h3>
                        {goal.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{goal.description}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={clsx("badge", statusInfo.bg, statusInfo.text, "border-0")}>
                        {goal.status}
                    </span>
                    {canEdit && (
                        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100" aria-label="Edit Goal" title="Edit">
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Overall Progress</p>
                        <div className="flex items-center gap-2">
                             <div className="text-xl font-bold text-gray-900">{goal.progress || 0}%</div>
                             {keyResults.length > 0 && (
                                <div className="text-[10px] font-medium text-gray-500 px-1.5 py-0.5 bg-white rounded border border-gray-200">
                                    {doneCount}/{keyResults.length} Key Results
                                </div>
                             )}
                        </div>
                    </div>
                    {goal.dueDate && (
                        <div className="text-right">
                             <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Due Date</p>
                             <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 justify-end">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(goal.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                             </div>
                        </div>
                    )}
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${goal.progress || 0}%`, backgroundColor: goal.color || '#6366f1' } as React.CSSProperties}
                    />
                </div>
            </div>

            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full h-9 flex items-center justify-center gap-2 text-[10px] font-bold uppercase text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-colors border border-indigo-100"
            >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {expanded ? 'Hide Key Results' : `View ${keyResults.length} Key Results`}
            </button>

            {expanded && (
                <div className="mt-4 space-y-2">
                    {keyResults.map(kr => (
                        <div key={kr.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-gray-100 hover:bg-gray-50/50 transition-all">
                            <button
                                onClick={() => toggleKR(kr.id)}
                                className={clsx(
                                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                                    kr.done ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 bg-white hover:border-indigo-400'
                                )}
                            >
                                {kr.done && <Check className="w-3.5 h-3.5" />}
                            </button>
                            <span className={clsx('text-sm font-medium', kr.done ? 'line-through text-gray-400' : 'text-gray-700')}>{kr.text}</span>
                        </div>
                    ))}
                    {canEdit && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                            <input
                                value={newKR}
                                onChange={e => setNewKR(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addKeyResult()}
                                placeholder="Add key result..."
                                className="input h-9 text-xs px-3 flex-1"
                            />
                            <button onClick={addKeyResult} className="btn-primary h-9 px-4 text-xs font-semibold">Add</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function GoalsPage() {
    const [goals, setGoals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editGoal, setEditGoal] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterOwner, setFilterOwner] = useState('');
    const { user } = useAuth();
    const canManageGoals = user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'));

    function loadGoals() {
        setLoading(true);
        api.get('/api/goals')
            .then(({ data }) => setGoals(data.goals))
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadGoals(); }, []);

    const metrics = useMemo(() => {
        const total = goals.length;
        const active = goals.filter(g => g.status === 'active').length;
        const completed = goals.filter(g => g.status === 'completed').length;
        const avgProgress = total > 0 ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / total) : 0;
        return { total, active, completed, avgProgress };
    }, [goals]);

    const displayed = goals.filter(g => {
        const matchesSearch = g.title?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !filterStatus || g.status === filterStatus;
        const matchesType = !filterType || g.type === filterType;
        const matchesOwner = !filterOwner || (g.ownerId?.id === filterOwner || g.ownerId === filterOwner);
        return matchesSearch && matchesStatus && matchesType && matchesOwner;
    });

    const owners = useMemo(() => {
        const map = new Map();
        goals.forEach(g => {
            if (g.ownerId) {
                const id = g.ownerId.id || g.ownerId;
                if (!map.has(id)) map.set(id, g.ownerId.name || 'Unknown');
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [goals]);

    if (user && !['admin', 'manager', 'hr'].includes(user.role)) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Target className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Access Denied</p>
                    <p className="text-gray-400 text-sm mt-1">You do not have permission to view Milestone Goals.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-10">
            {(showCreate || editGoal) && (
                <CreateGoalModal
                    editGoal={editGoal}
                    onClose={() => { setShowCreate(false); setEditGoal(null); }}
                    onSuccess={() => { setShowCreate(false); setEditGoal(null); loadGoals(); }}
                />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Goals & OKRs</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage and track company, team, and personal objectives.</p>
                </div>
                {canManageGoals && (
                    <button 
                        onClick={() => setShowCreate(true)} 
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Goal</span>
                    </button>
                )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard label="Total Goals" value={metrics.total} icon={Target} color="bg-indigo-600" />
                <MetricCard label="Active" value={metrics.active} icon={Rocket} color="bg-blue-600" />
                <MetricCard label="Completed" value={metrics.completed} icon={CheckCircle2} color="bg-emerald-600" />
                <MetricCard label="Avg. Progress" value={`${metrics.avgProgress}%`} icon={BarChart3} color="bg-amber-600" />
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search goals..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input pl-10 w-full"
                    />
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 pl-3 h-10 bg-white border border-gray-200 rounded-lg overflow-hidden pr-1">
                        <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <select 
                            value={filterStatus} 
                            onChange={e => setFilterStatus(e.target.value)} 
                            className="bg-transparent text-sm font-medium text-gray-600 focus:outline-none cursor-pointer h-full"
                            title="Filter by Status"
                            aria-label="Filter goals by status"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="paused">Paused</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 pl-3 h-10 bg-white border border-gray-200 rounded-lg overflow-hidden pr-1">
                        <Users2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <select 
                            value={filterType} 
                            onChange={e => setFilterType(e.target.value)} 
                            className="bg-transparent text-sm font-medium text-gray-600 focus:outline-none cursor-pointer h-full"
                            title="Filter by Goal Type"
                            aria-label="Filter goals by type"
                        >
                            <option value="">All Types</option>
                            <option value="personal">Personal</option>
                            <option value="team">Team</option>
                            <option value="company">Company</option>
                        </select>
                    </div>

                    {owners.length > 1 && (
                        <div className="flex items-center gap-2 pl-3 h-10 bg-white border border-gray-200 rounded-lg overflow-hidden pr-1">
                            <UserIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <select 
                                value={filterOwner} 
                                onChange={e => setFilterOwner(e.target.value)} 
                                className="bg-transparent text-sm font-medium text-gray-600 focus:outline-none cursor-pointer h-full"
                                title="Filter by Owner"
                                aria-label="Filter goals by owner"
                            >
                                <option value="">All Owners</option>
                                {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <LogoLoader className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {displayed.map((goal) => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            onEdit={() => setEditGoal(goal)}
                            onProgressUpdate={(id, progress) => {
                                setGoals(prev => prev.map(g => g.id === id ? { ...g, progress } : g));
                            }}
                            canEdit={canEditGoal(user, goal)}
                        />
                    ))}
                </div>
            )}

            {!loading && displayed.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">No goals found</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                        {search || filterStatus || filterType || filterOwner
                            ? 'Adjust your filters or try a different search term.' 
                            : 'Set your first goal to begin tracking objectives.'}
                    </p>
                </div>
            )}
        </div>
    );
}

function canEditGoal(user: any, goal: any) {
    if (['admin', 'ceo'].includes(user?.role || '')) return true;
    if (user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'))) {
        const ownerId = goal.ownerId?.id || goal.ownerId;
        return ownerId === user?.id;
    }
    return false;
}

