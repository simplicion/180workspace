'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { 
    Clock, Plus, Trash2, Calendar, RefreshCw, 
    CheckCircle2, Layers, AlertCircle, ToggleLeft, ToggleRight 
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const DAYS_OF_WEEK = [
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' },
    { id: 0, name: 'Sunday', short: 'Sun' }
];

const CATEGORY_PRESETS = [
    'Case Study & Breakdown',
    'Educational Reel / Short',
    'Hot Take & Industry Contrarian',
    'Carousel Tutorial',
    'Founder Behind-the-Scenes',
    'Community Q&A / Discussion'
];

export function EvergreenQueueManager({ projectId }: { projectId?: string }) {
    const [slots, setSlots] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Form state for new slot
    const [selectedDay, setSelectedDay] = useState(1);
    const [timeSlotUtc, setTimeSlotUtc] = useState('14:30');
    const [category, setCategory] = useState(CATEGORY_PRESETS[0]);

    useEffect(() => {
        loadSlots();
    }, [projectId]);

    const loadSlots = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/api/social-media/evergreen', {
                params: { projectId: projectId || undefined }
            });
            if (data.success) {
                setSlots(data.slots || []);
            }
        } catch (err: any) {
            toast.error('Failed to load evergreen queue schedule');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/api/social-media/evergreen', {
                projectId: projectId || undefined,
                dayOfWeek: selectedDay,
                timeSlotUtc,
                category
            });
            if (data.success) {
                toast.success('Evergreen time-slot scheduled');
                setIsAdding(false);
                loadSlots();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create time slot');
        }
    };

    const handleDeleteSlot = async (id: string) => {
        if (!confirm('Remove this evergreen time slot?')) return;
        try {
            await api.delete(`/api/social-media/evergreen/${id}`);
            toast.success('Slot removed');
            setSlots(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            toast.error('Failed to delete slot');
        }
    };

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header / Info Panel */}
            <div className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                Evergreen Queue & Recurring Time-Slots
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                Content queued without a fixed date will automatically dispatch into these high-engagement weekly slots.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all min-h-[44px]"
                    >
                        <Plus className="w-4 h-4" />
                        {isAdding ? 'Close Drawer' : 'Add Time-Slot'}
                    </button>
                </div>

                {/* Add Slot Form Drawer */}
                {isAdding && (
                    <form onSubmit={handleCreateSlot} className="mt-6 pt-6 border-t border-gray-200/60 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                                Day of Week
                            </label>
                            <select
                                value={selectedDay}
                                onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500"
                            >
                                {DAYS_OF_WEEK.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                                Time Slot (UTC)
                            </label>
                            <input
                                type="time"
                                value={timeSlotUtc}
                                onChange={(e) => setTimeSlotUtc(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                                Content Pillar / Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500"
                            >
                                {CATEGORY_PRESETS.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all min-h-[44px]"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Save Slot
                        </button>
                    </form>
                )}
            </div>

            {/* Weekly Calendar Schedule Grid */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {DAYS_OF_WEEK.map((day) => {
                    const daySlots = slots.filter(s => s.dayOfWeek === day.id);
                    return (
                        <div
                            key={day.id}
                            className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-4 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] flex flex-col justify-between min-h-[220px]"
                        >
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-gray-200/60 dark:border-gray-800/80 mb-3">
                                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{day.name}</span>
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                        {daySlots.length}
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {daySlots.length === 0 ? (
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 italic text-center py-6">
                                            No slots
                                        </p>
                                    ) : (
                                        daySlots.map((s) => (
                                            <div
                                                key={s.id}
                                                className="p-2.5 bg-white/80 dark:bg-slate-900/80 border border-gray-200/80 dark:border-gray-800 rounded-xl space-y-1.5 shadow-sm group hover:border-indigo-400 dark:hover:border-indigo-600 transition-all"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {s.timeSlotUtc} UTC
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteSlot(s.id)}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-opacity p-0.5"
                                                        title="Delete slot"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">
                                                    {s.category}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedDay(day.id);
                                    setIsAdding(true);
                                }}
                                className="w-full py-2 mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors flex items-center justify-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Slot
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
