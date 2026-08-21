'use client';

import { useEffect, useState } from 'react';
import { Calendar, Users, CheckSquare, FolderKanban, Target, Clock } from 'lucide-react';
import api from '@/lib/api';

interface OperationsOverviewProps {
    stats: any;
    getStatValue: (key: string) => string | number;
}

interface CalendarEvent {
    id: string;
    title: string;
    startDate: string;
    platform?: string;
    meetingLink?: string;
}

interface Goal {
    id: string;
    title: string;
    progress?: number;
}

export default function OperationsOverview({ stats, getStatValue }: OperationsOverviewProps) {
    const [upcomingMeeting, setUpcomingMeeting] = useState<CalendarEvent | null>(null);
    const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);

    useEffect(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        
        // Fetch upcoming meetings
        api.get(`/api/calendar?year=${todayStr.split('-')[0]}&month=${todayStr.split('-')[1]}`)
            .then(({ data }) => {
                const events = data.events || [];
                const now = new Date();
                const upcoming = events.find((e: any) => new Date(e.startDate) >= now && e.type === 'meeting');
                if (upcoming) setUpcomingMeeting(upcoming);
            })
            .catch(() => {});

        // Fetch current goals
        api.get('/api/goals')
            .then(({ data }) => {
                const goals = data.goals || [];
                if (goals.length > 0) {
                    setCurrentGoal(goals[0]);
                }
            })
            .catch(() => {});
    }, []);

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="card p-4">
            <h2 className="text-xs font-bold flex items-center gap-2 text-gray-400 uppercase tracking-wider mb-3">
                <Calendar className="w-3.5 h-3.5" /> Operations
            </h2>
            
            {/* Today's Focus */}
            <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4 mb-4">
                <p className="text-[10px] font-bold text-gray-400 mb-2.5 uppercase tracking-wider">Today&apos;s Focus</p>
                {upcomingMeeting ? (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-sm">{upcomingMeeting.title}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 flex flex-col gap-0.5">
                                <span>{formatTime(upcomingMeeting.startDate)}</span>
                                {upcomingMeeting.platform && <span>{upcomingMeeting.platform}</span>}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 opacity-50">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-500 text-sm">No upcoming meetings</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Your schedule is clear</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Active Clients */}
                <div className="bg-emerald-50/60 border border-emerald-100/60 rounded-xl p-3 relative overflow-hidden group hover:shadow-sm transition-shadow">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Active Clients</p>
                    <div className="flex items-baseline gap-1.5">
                        <p className="text-xl font-black text-gray-900">{getStatValue('clients')}</p>
                        <p className="text-xs font-semibold text-emerald-600/70">Total</p>
                    </div>
                    <Users className="w-7 h-7 text-emerald-100 absolute -bottom-1 -right-1 group-hover:text-emerald-200 transition-colors" />
                </div>
                
                {/* Total Projects */}
                <div className="bg-blue-50/60 border border-blue-100/60 rounded-xl p-3 relative overflow-hidden group hover:shadow-sm transition-shadow">
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Total Projects</p>
                    <div className="flex items-baseline gap-1.5">
                        <p className="text-xl font-black text-gray-900">{getStatValue('projects')}</p>
                        <p className="text-xs font-semibold text-blue-600/70">Active</p>
                    </div>
                    <FolderKanban className="w-7 h-7 text-blue-100 absolute -bottom-1 -right-1 group-hover:text-blue-200 transition-colors" />
                </div>

                {/* Pending Tasks */}
                <div className="bg-indigo-50/60 border border-indigo-100/60 rounded-xl p-3 relative overflow-hidden group hover:shadow-sm transition-shadow">
                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mb-1">Pending Tasks</p>
                    <div className="flex items-baseline gap-1.5">
                        <p className="text-xl font-black text-gray-900">{getStatValue('tasks')}</p>
                        <p className="text-xs font-semibold text-indigo-600/70">/ {getStatValue('tasks_total')}</p>
                    </div>
                    <CheckSquare className="w-7 h-7 text-indigo-100 absolute -bottom-1 -right-1 group-hover:text-indigo-200 transition-colors" />
                </div>

                {/* Pending Salaries */}
                <div className="bg-amber-50/60 border border-amber-100/60 rounded-xl p-3 relative overflow-hidden group hover:shadow-sm transition-shadow">
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1">Pending Salaries</p>
                    <div className="flex items-baseline gap-1.5">
                        <p className="text-xl font-black text-gray-900">{getStatValue('salary_pending')}</p>
                    </div>
                    <FolderKanban className="w-7 h-7 text-amber-100 absolute -bottom-1 -right-1 group-hover:text-amber-200 transition-colors" />
                </div>
            </div>

            {/* Goal */}
            {currentGoal && (
                <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2.5">
                        <div className="flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-indigo-500" />
                            <p className="text-xs font-bold text-gray-900 truncate pr-2" title={currentGoal.title}>
                                {currentGoal.title}
                            </p>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 shrink-0">
                            {currentGoal.progress || 0}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200/60 rounded-full h-1.5">
                        <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${currentGoal.progress || 0}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
}
