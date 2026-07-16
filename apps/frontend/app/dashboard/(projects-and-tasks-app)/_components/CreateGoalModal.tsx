'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X, Target, Users, Calendar, TrendingUp, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Props {
    onClose: () => void;
    onSuccess: (goal: any) => void;
    editGoal?: any;
}

const GOAL_TYPES = ['personal', 'team', 'company'];
const STATUSES = ['active', 'paused', 'completed', 'cancelled'];
const DIFFICULTIES = [
    { value: 'easy', label: 'Standard', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { value: 'medium', label: 'Strategic', color: 'text-blue-600', bg: 'bg-blue-50' },
    { value: 'hard', label: 'High Priority', color: 'text-orange-600', bg: 'bg-orange-50' },
    { value: 'heroic', label: 'Critical', color: 'text-purple-600', bg: 'bg-purple-50' },
];
const PRESET_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export default function CreateGoalModal({ onClose, onSuccess, editGoal }: Props) {
    const isEdit = !!editGoal;
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'basics' | 'vision'>('basics');
    
    const [form, setForm] = useState({
        title: editGoal?.title || '',
        description: editGoal?.description || '',
        type: editGoal?.type || 'personal',
        status: editGoal?.status || 'active',
        progress: editGoal?.progress || 0,
        ownerId: editGoal?.ownerId?.id || editGoal?.ownerId || '',
        dueDate: editGoal?.dueDate ? editGoal.dueDate.slice(0, 10) : '',
        difficulty: editGoal?.difficulty || 'medium',
        color: editGoal?.color || '#6366f1',
        motivation: editGoal?.motivation || '',
        celebration: editGoal?.celebration || '',
    });

    useEffect(() => {
        api.get('/api/users', { params: { limit: 100 } }).then(({ data }) => setEmployees(data.users || []));
    }, []);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.title.trim()) return toast.error('Title is required');
        setLoading(true);
        try {
            if (isEdit) {
                const { data } = await api.put(`/api/goals/${editGoal.id}`, form);
                toast.success('Goal updated');
                onSuccess(data.goal);
            } else {
                const { data } = await api.post('/api/goals', form);
                toast.success('Goal created');
                onSuccess(data.goal);
            }
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to save goal');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Target className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Goal' : 'New Goal'}</h2>
                            <p className="text-xs text-gray-500 font-medium">Define and track your organizational objectives.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        type="button" 
                        aria-label="Close modal"
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="flex border-b border-gray-100 px-6" role="tablist" aria-label="Goal details tabs">
                    <button 
                        onClick={() => setActiveTab('basics')}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'basics'}
                        aria-controls="basics-panel"
                        id="basics-tab"
                        className={clsx(
                            "px-4 py-3 text-sm font-semibold transition-all border-b-2", 
                            activeTab === 'basics' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                        )}
                    >
                        General Info
                    </button>
                    <button 
                        onClick={() => setActiveTab('vision')}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'vision'}
                        aria-controls="vision-panel"
                        id="vision-tab"
                        className={clsx(
                            "px-4 py-3 text-sm font-semibold transition-all border-b-2", 
                            activeTab === 'vision' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                        )}
                    >
                        Advanced
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {activeTab === 'basics' ? (
                        <div id="basics-panel" role="tabpanel" aria-labelledby="basics-tab" className="space-y-5">
                            <div>
                                <label htmlFor="goalTitle" className="label text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Goal Title *</label>
                                <input 
                                    id="goalTitle"
                                    value={form.title} 
                                    onChange={set('title')} 
                                    placeholder="Enter objective title..." 
                                    className="input text-sm font-medium h-11" 
                                    required 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="goalOwner" className="label text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Owner</label>
                                    <select id="goalOwner" value={form.ownerId} onChange={set('ownerId')} className="select text-sm font-medium h-11">
                                        <option value="">Select Owner</option>
                                        {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="goalDueDate" className="label text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Due Date</label>
                                    <input id="goalDueDate" value={form.dueDate} onChange={set('dueDate')} type="date" className="input text-sm font-medium h-11" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="goalType" className="label text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Goal Type</label>
                                    <select id="goalType" value={form.type} onChange={set('type')} className="select text-sm font-medium h-11 capitalize">
                                        {GOAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="goalStatus" className="label text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Status</label>
                                    <select id="goalStatus" value={form.status} onChange={set('status')} className="select text-sm font-medium h-11 capitalize">
                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="label text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Theme Color</label>
                                <div className="flex gap-2">
                                    {PRESET_COLORS.map(c => (
                                        <button 
                                            key={c}
                                            type="button"
                                            aria-label={`Select theme color ${c}`}
                                            onClick={() => setForm(f => ({ ...f, color: c }))}
                                            className={clsx(
                                                "w-8 h-8 rounded-full border-2 transition-all", 
                                                form.color === c ? "border-gray-900 scale-110 shadow-sm" : "border-transparent hover:scale-105"
                                            )}
                                            style={{ backgroundColor: c } as React.CSSProperties}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div id="vision-panel" role="tabpanel" aria-labelledby="vision-tab" className="space-y-5">
                            <div>
                                <label htmlFor="goalMotivation" className="label text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Motivation / Notes</label>
                                <textarea 
                                    id="goalMotivation"
                                    value={form.motivation} 
                                    onChange={set('motivation')} 
                                    placeholder="Briefly describe the importance or motivation behind this goal." 
                                    rows={3} 
                                    className="input py-3 text-sm font-medium resize-none h-24" 
                                />
                            </div>

                            <div>
                                <label htmlFor="goalCelebration" className="label text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Milestone / Reward</label>
                                <textarea 
                                    id="goalCelebration"
                                    value={form.celebration} 
                                    onChange={set('celebration')} 
                                    placeholder="Define a milestone or reward for achieving this goal." 
                                    rows={2} 
                                    className="input py-3 text-sm font-medium resize-none h-20" 
                                />
                            </div>

                            <div>
                                <span className="label text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Priority Level</span>
                                <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Goal Priority Level">
                                    {DIFFICULTIES.map(d => (
                                        <button
                                            key={d.value}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, difficulty: d.value }))}
                                            role="radio"
                                            aria-checked={form.difficulty === d.value}
                                            className={clsx(
                                                "flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all",
                                                form.difficulty === d.value 
                                                    ? `${d.bg} border-indigo-200 ${d.color} font-bold shadow-sm` 
                                                    : "border-gray-100 bg-white text-gray-400 hover:bg-gray-50"
                                            )}
                                        >
                                            <span className="text-[11px] uppercase tracking-tighter">{d.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {isEdit && (
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label htmlFor="goalProgress" className="label text-xs font-bold text-gray-500 uppercase tracking-wider">Progress Override</label>
                                        <span className="text-sm font-bold text-gray-900">{form.progress}%</span>
                                    </div>
                                    <input
                                        id="goalProgress"
                                        type="range" min={0} max={100} value={form.progress}
                                        onChange={e => setForm(prev => ({ ...prev, progress: Number(e.target.value) }))}
                                        className="w-full accent-indigo-600 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </form>

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="text-[10px] font-semibold text-gray-400 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                        180workspace Goal Tracking System
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            type="button" 
                            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={loading} 
                            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <>
                                    <Check className="w-4 h-4" aria-hidden="true" />
                                    <span>{isEdit ? 'Save Changes' : 'Create Goal'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
