'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import {
    Calendar,
    Users,
    CheckSquare,
    FolderKanban,
    Target,
    Receipt,
    FileText,
    ChevronRight,
    ChevronLeft,
    Briefcase,
    Clock,
    Video,
    Plus,
    ExternalLink,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Layers,
    ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { SkeletonFocusCard } from '@workspace/ui';

interface OperationsOverviewProps {
    stats: any;
    getStatValue: (key: string) => string | number;
    getSubText?: (key: string) => string;
    isLocked?: boolean;
}

interface CalendarEvent {
    id: string;
    title: string;
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    type?: string;
    platform?: string;
    meetingLink?: string;
    roomId?: string;
    location?: string;
    allDay?: boolean;
    color?: string;
    attendees?: Array<{ id: string; name?: string; email?: string; photoUrl?: string }>;
    clients?: Array<{ id: string; name?: string }>;
}

interface Goal {
    id: string;
    title: string;
    progress?: number;
    status?: string;
    targetDate?: string;
}

interface TaskItem {
    id: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    projectId?: { id?: string; name?: string; status?: string } | string;
    assignee?: { id?: string; name?: string; photoUrl?: string };
}

interface LeaveRequest {
    _id?: string;
    id?: string;
    employeeId?: { name?: string; _id?: string; id?: string } | string;
    employee?: { name?: string; id?: string };
    type?: string;
    days?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
}

interface ExpenseRecord {
    id?: string;
    _id?: string;
    title?: string;
    amount?: number;
    status?: string;
    employee?: { name?: string };
}

type FocusItemType = 'all' | 'meetings' | 'tasks' | 'milestones' | 'events';

interface UnifiedFocusItem {
    id: string;
    category: 'meeting' | 'task' | 'milestone' | 'event';
    title: string;
    subText?: string;
    metaBadge?: { text: string; color: string; icon?: any };
    secondaryBadge?: { text: string; color: string };
    dateLabel?: string;
    timeLabel?: string;
    progress?: number;
    taskMark?: string;
    priority?: string;
    platform?: string;
    meetingLink?: string;
    roomId?: string;
    assignee?: { name?: string; photoUrl?: string };
    attendees?: Array<{ id: string; name?: string; photoUrl?: string }>;
    href: string;
    isExternalLink?: boolean;
}

export default function OperationsOverview({ stats, getStatValue, getSubText, isLocked }: OperationsOverviewProps) {
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
    const [pendingExpenses, setPendingExpenses] = useState<ExpenseRecord[]>([]);
    const [todayOnLeave, setTodayOnLeave] = useState<LeaveRequest[]>([]);
    const [activeFilter, setActiveFilter] = useState<FocusItemType>('all');
    const [loadingFocus, setLoadingFocus] = useState<boolean>(true);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isLocked) return;
        setLoadingFocus(true);

        // 1. Fetch live calendar events
        const calendarPromise = api.get('/api/calendar')
            .then(({ data }) => {
                const rawEvents: CalendarEvent[] = data.events || [];
                // Sort by startDate
                const sorted = [...rawEvents].sort((a, b) => {
                    const dateA = new Date(a.startDate || a.startTime || 0).getTime();
                    const dateB = new Date(b.startDate || b.startTime || 0).getTime();
                    return dateA - dateB;
                });
                setCalendarEvents(sorted);
            })
            .catch(() => setCalendarEvents([]));

        // 2. Fetch live tasks
        const tasksPromise = api.get('/api/tasks?limit=40')
            .then(({ data }) => {
                const rawTasks: TaskItem[] = data.tasks || [];
                // Prioritize incomplete/pending tasks
                const pending = rawTasks.filter(t => t.status !== 'done' && t.status !== 'completed');
                setTasks(pending.length > 0 ? pending : rawTasks.slice(0, 10));
            })
            .catch(() => setTasks([]));

        // 3. Fetch goals / milestones
        const goalsPromise = api.get('/api/goals')
            .then(({ data }) => setGoals(data.goals || []))
            .catch(() => setGoals([]));

        // 4. Fetch pending leave requests
        const leavesPendingPromise = api.get('/api/leaves?status=pending')
            .then(({ data }) => setPendingLeaves(data.leaves || []))
            .catch(() => setPendingLeaves([]));

        // 5. Fetch approved leaves for today's capacity
        const leavesApprovedPromise = api.get('/api/leaves?status=approved')
            .then(({ data }) => {
                const today = new Date().toISOString().slice(0, 10);
                const onLeave = (data.leaves || []).filter((l: LeaveRequest) => {
                    const start = l.startDate?.slice(0, 10);
                    const end = l.endDate?.slice(0, 10);
                    return start && end && start <= today && end >= today;
                });
                setTodayOnLeave(onLeave);
            })
            .catch(() => setTodayOnLeave([]));

        // 6. Fetch pending expenses
        const expensesPromise = api.get('/api/expenses?status=pending')
            .then(({ data }) => setPendingExpenses(data.expenses || []))
            .catch(() => setPendingExpenses([]));

        Promise.allSettled([
            calendarPromise,
            tasksPromise,
            goalsPromise,
            leavesPendingPromise,
            leavesApprovedPromise,
            expensesPromise
        ]).finally(() => {
            setLoadingFocus(false);
        });
    }, [isLocked]);

    // Format relative date / time labels
    const formatDateTime = (dateStr?: string, timeStr?: string) => {
        if (!dateStr) return { date: '', time: timeStr || '' };
        try {
            const dateObj = new Date(dateStr);
            const today = new Date();
            const isTodayDate =
                dateObj.getDate() === today.getDate() &&
                dateObj.getMonth() === today.getMonth() &&
                dateObj.getFullYear() === today.getFullYear();

            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const isTomorrow =
                dateObj.getDate() === tomorrow.getDate() &&
                dateObj.getMonth() === tomorrow.getMonth() &&
                dateObj.getFullYear() === tomorrow.getFullYear();

            let dateLabel = isTodayDate
                ? 'Today'
                : isTomorrow
                ? 'Tomorrow'
                : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            let timeLabel = timeStr || '';
            if (!timeLabel && dateStr.includes('T')) {
                timeLabel = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            return { date: dateLabel, time: timeLabel };
        } catch {
            return { date: dateStr, time: timeStr || '' };
        }
    };

    // Platform formatter
    const getPlatformDisplay = (platform?: string) => {
        switch (platform) {
            case 'google_meet': return 'Google Meet';
            case 'zoom': return 'Zoom';
            case 'teams': return 'MS Teams';
            case 'platform_meeting': return 'Live Room';
            case 'in_person': return 'In-Person';
            default: return platform || 'Online';
        }
    };

    // Build unified list of interactive focus items
    const focusItems = useMemo<UnifiedFocusItem[]>(() => {
        const items: UnifiedFocusItem[] = [];

        // 1. Upcoming Meetings & Events from Calendar
        calendarEvents.forEach((event, idx) => {
            const isMeeting = event.type === 'meeting' || !!event.meetingLink || !!event.roomId || !!event.platform;
            const { date, time } = formatDateTime(event.startDate, event.startTime);
            const platformName = getPlatformDisplay(event.platform);

            if (isMeeting) {
                items.push({
                    id: event.id || `meeting-${idx}`,
                    category: 'meeting',
                    title: event.title || 'Team Meeting',
                    subText: event.location || (event.attendees && event.attendees.length > 0 ? `${event.attendees.length} Attendees` : 'Scheduled Call'),
                    metaBadge: {
                        text: 'Meeting',
                        color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60',
                        icon: Video
                    },
                    secondaryBadge: {
                        text: platformName,
                        color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    },
                    dateLabel: date,
                    timeLabel: time || 'Scheduled',
                    platform: platformName,
                    meetingLink: event.meetingLink || (event.roomId ? `/dashboard/meeting/${event.roomId}` : undefined),
                    roomId: event.roomId,
                    attendees: event.attendees,
                    href: event.meetingLink || (event.roomId ? `/dashboard/meeting/${event.roomId}` : '/calendar'),
                    isExternalLink: !!event.meetingLink && !event.meetingLink.startsWith('/')
                });
            } else {
                const eventTypeName = event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'Event';
                items.push({
                    id: event.id || `event-${idx}`,
                    category: 'event',
                    title: event.title || 'Calendar Event',
                    subText: event.location || 'Company Calendar',
                    metaBadge: {
                        text: eventTypeName,
                        color: event.type === 'deadline'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60'
                            : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60',
                        icon: Calendar
                    },
                    dateLabel: date,
                    timeLabel: time || (event.allDay ? 'All Day' : ''),
                    href: '/calendar'
                });
            }
        });

        // 2. Pending & Due Tasks
        tasks.forEach((task, idx) => {
            const taskMark = `#${task.id ? task.id.replace(/\D/g, '').slice(0, 3) || task.id.slice(0, 4).toUpperCase() : idx + 101}`;
            const { date } = formatDateTime(task.dueDate);
            const projectName = typeof task.projectId === 'object' && task.projectId?.name ? task.projectId.name : 'General Work';
            const priority = (task.priority || 'medium').toLowerCase();

            let priorityColor = 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
            if (priority === 'urgent') {
                priorityColor = 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50';
            } else if (priority === 'high') {
                priorityColor = 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50';
            } else if (priority === 'low') {
                priorityColor = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700';
            }

            items.push({
                id: task.id || `task-${idx}`,
                category: 'task',
                title: task.title || 'Untitled Task',
                subText: projectName,
                taskMark,
                priority,
                metaBadge: {
                    text: `Task ${taskMark}`,
                    color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300/80 dark:border-zinc-700 font-mono',
                    icon: CheckSquare
                },
                secondaryBadge: {
                    text: priority.toUpperCase(),
                    color: priorityColor
                },
                dateLabel: date ? (date === 'Today' ? 'Due Today' : `Due ${date}`) : 'No due date',
                assignee: task.assignee,
                href: '/tasks'
            });
        });

        // 3. Active Goals / Milestones (Live data only, no hardcoded fallbacks)
        if (goals && goals.length > 0) {
            goals.forEach((goal, idx) => {
                items.push({
                    id: goal.id || `goal-${idx}`,
                    category: 'milestone',
                    title: goal.title || 'Active Milestone',
                    subText: goal.targetDate ? `Target: ${new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : (goal.status ? `Status: ${goal.status}` : 'In Progress'),
                    metaBadge: {
                        text: 'Milestone',
                        color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60',
                        icon: Target
                    },
                    secondaryBadge: goal.status ? {
                        text: goal.status.toUpperCase(),
                        color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                    } : undefined,
                    href: '/hrms'
                });
            });
        }

        return items;
    }, [calendarEvents, tasks, goals]);

    // Filter items based on active pill
    const filteredItems = useMemo(() => {
        if (activeFilter === 'all') return focusItems;
        if (activeFilter === 'meetings') return focusItems.filter(i => i.category === 'meeting');
        if (activeFilter === 'tasks') return focusItems.filter(i => i.category === 'task');
        if (activeFilter === 'milestones') return focusItems.filter(i => i.category === 'milestone');
        if (activeFilter === 'events') return focusItems.filter(i => i.category === 'event');
        return focusItems;
    }, [focusItems, activeFilter]);

    // Counts for tab badges
    const counts = useMemo(() => {
        return {
            all: focusItems.length,
            meetings: focusItems.filter(i => i.category === 'meeting').length,
            tasks: focusItems.filter(i => i.category === 'task').length,
            milestones: focusItems.filter(i => i.category === 'milestone').length,
            events: focusItems.filter(i => i.category === 'event').length,
        };
    }, [focusItems]);

    // Scroll handlers
    const handleScroll = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return;
        const scrollAmount = 320;
        scrollContainerRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    const getEmployeeName = (leave: LeaveRequest): string => {
        if (leave.employee?.name) return leave.employee.name;
        if (typeof leave.employeeId === 'object' && leave.employeeId?.name) return leave.employeeId.name;
        return 'Employee';
    };

    const getInitials = (name: string): string => {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="card overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            Operations & Team Approvals
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-medium">Daily focus, capacity velocity & pending authorizations</p>
                    </div>
                </div>

                <Link
                    href="/hrms"
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900"
                >
                    HR Hub <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
                {/* 1. Today's Focus, Live Meetings, Tasks & Milestones Scrollable Deck */}
                <div className="bg-zinc-50/60 dark:bg-zinc-850/40 border border-zinc-200/70 dark:border-zinc-800/70 rounded-2xl p-3.5 sm:p-4">
                    {/* Top Control Bar with Filters & Scroll Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                        <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                                Today&apos;s Focus & Activity Stream
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-full">
                                {counts.all}
                            </span>
                        </div>

                        {/* Filter Tabs & Scroll Controls */}
                        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto max-w-full pb-1 sm:pb-0">
                            <div className="flex items-center gap-1 bg-zinc-200/50 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-bold">
                                <button
                                    onClick={() => setActiveFilter('all')}
                                    className={`px-2 py-0.5 rounded-md transition-all ${
                                        activeFilter === 'all'
                                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                                    }`}
                                >
                                    All ({counts.all})
                                </button>
                                {counts.meetings > 0 && (
                                    <button
                                        onClick={() => setActiveFilter('meetings')}
                                        className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                                            activeFilter === 'meetings'
                                                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Meetings ({counts.meetings})
                                    </button>
                                )}
                                {counts.tasks > 0 && (
                                    <button
                                        onClick={() => setActiveFilter('tasks')}
                                        className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                                            activeFilter === 'tasks'
                                                ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
                                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Tasks ({counts.tasks})
                                    </button>
                                )}
                                {counts.milestones > 0 && (
                                    <button
                                        onClick={() => setActiveFilter('milestones')}
                                        className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                                            activeFilter === 'milestones'
                                                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Milestones ({counts.milestones})
                                    </button>
                                )}
                                {counts.events > 0 && (
                                    <button
                                        onClick={() => setActiveFilter('events')}
                                        className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                                            activeFilter === 'events'
                                                ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs'
                                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Events ({counts.events})
                                    </button>
                                )}
                            </div>

                            {/* Carousel Arrow Buttons */}
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                                <button
                                    onClick={() => handleScroll('left')}
                                    aria-label="Scroll focus left"
                                    className="p-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleScroll('right')}
                                    aria-label="Scroll focus right"
                                    className="p-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Horizontally Scrollable Stream Container */}
                    <div
                        ref={scrollContainerRef}
                        className="flex items-stretch gap-3 overflow-x-auto pb-1.5 pt-0.5 scroll-smooth snap-x snap-mandatory scrollbar-none"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {loadingFocus ? (
                            [1, 2, 3].map((i) => (
                                <SkeletonFocusCard key={i} />
                            ))
                        ) : filteredItems.length > 0 ? (
                            filteredItems.map((item) => {
                                const MetaIcon = item.metaBadge?.icon;
                                const cardClassName = "w-[280px] sm:w-[310px] shrink-0 p-3.5 rounded-xl border bg-white dark:bg-zinc-900/90 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:shadow-md transition-all duration-200 flex flex-col justify-between group snap-start relative overflow-hidden cursor-pointer";

                                const cardInnerContent = (
                                    <>
                                        {/* Card Top Accent Bar based on Category */}
                                        <div
                                            className={`absolute top-0 left-0 right-0 h-1 ${
                                                item.category === 'meeting'
                                                    ? 'bg-gradient-to-r from-indigo-500 to-sky-400'
                                                    : item.category === 'task'
                                                    ? item.priority === 'urgent'
                                                        ? 'bg-gradient-to-r from-rose-500 to-orange-400'
                                                        : 'bg-gradient-to-r from-amber-500 to-orange-400'
                                                    : item.category === 'milestone'
                                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                                    : 'bg-gradient-to-r from-teal-500 to-emerald-400'
                                            }`}
                                        />

                                        <div>
                                            {/* Badges Row */}
                                            <div className="flex items-center justify-between gap-1.5 mb-2 mt-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    {item.metaBadge && (
                                                        <span
                                                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${item.metaBadge.color}`}
                                                        >
                                                            {MetaIcon && <MetaIcon className="w-2.5 h-2.5" />}
                                                            {item.metaBadge.text}
                                                        </span>
                                                    )}
                                                    {item.secondaryBadge && (
                                                        <span
                                                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${item.secondaryBadge.color}`}
                                                        >
                                                            {item.secondaryBadge.text}
                                                        </span>
                                                    )}
                                                </div>

                                                {item.dateLabel && (
                                                    <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                                                        {item.dateLabel}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Item Title & Subtitle */}
                                            <h4
                                                className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                                                title={item.title}
                                            >
                                                {item.title}
                                            </h4>

                                            {item.subText && (
                                                <p className="text-[10px] text-zinc-400 mt-1 truncate font-medium">
                                                    {item.subText}
                                                </p>
                                            )}
                                        </div>

                                        {/* Card Footer with Meta Details & Click Navigation Chevron */}
                                        <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                                            {/* Left details (Time / Attendees / Assignee) */}
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {item.timeLabel && (
                                                    <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 truncate">
                                                        <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                                                        {item.timeLabel}
                                                    </span>
                                                )}

                                                {item.assignee?.name && (
                                                    <span className="text-[10px] font-medium text-zinc-400 truncate">
                                                        • {item.assignee.name}
                                                    </span>
                                                )}

                                                {item.attendees && item.attendees.length > 0 && (
                                                    <div className="flex -space-x-1 shrink-0 ml-1">
                                                        {item.attendees.slice(0, 3).map((att, i) => (
                                                            <div
                                                                key={att.id || i}
                                                                className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900 border border-white dark:border-zinc-900 text-[7px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-center"
                                                                title={att.name || 'Attendee'}
                                                            >
                                                                {att.name ? att.name.charAt(0).toUpperCase() : 'U'}
                                                            </div>
                                                        ))}
                                                        {item.attendees.length > 3 && (
                                                            <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-white dark:border-zinc-900 text-[7px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
                                                                +{item.attendees.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Navigation Indicator */}
                                            <div className="text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0">
                                                {item.isExternalLink ? (
                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                ) : (
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                )}
                                            </div>
                                        </div>
                                    </>
                                );

                                return item.isExternalLink ? (
                                    <a
                                        key={item.id}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cardClassName}
                                    >
                                        {cardInnerContent}
                                    </a>
                                ) : (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className={cardClassName}
                                    >
                                        {cardInnerContent}
                                    </Link>
                                );
                            })
                        ) : (
                            /* Empty State with Quick Actions */
                            <div className="w-full py-5 px-4 bg-white dark:bg-zinc-900/70 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-900 dark:text-white">Schedule is clear & focused</p>
                                        <p className="text-[11px] text-zinc-400">No pending items found for this filter. Create a meeting or task to stay on track.</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <Link
                                        href="/calendar"
                                        className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Schedule Meeting
                                    </Link>
                                    <Link
                                        href="/tasks"
                                        className="text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> New Task
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Operations & Team Key Metrics Grid (6 Metrics) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* Active Clients */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Active Clients</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{getStatValue('clients')}</p>
                            <p className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">Total</p>
                        </div>
                        <Users className="w-6 h-6 text-emerald-200/60 dark:text-emerald-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* Total Projects */}
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/70 dark:border-blue-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Total Projects</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{getStatValue('projects')}</p>
                            <p className="text-[10px] font-semibold text-blue-600/80 dark:text-blue-400/80">Active</p>
                        </div>
                        <FolderKanban className="w-6 h-6 text-blue-200/60 dark:text-blue-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* Pending Tasks */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/70 dark:border-indigo-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">Pending Tasks</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{getStatValue('tasks')}</p>
                            <p className="text-[10px] font-semibold text-indigo-600/80 dark:text-indigo-400/80">/ {getStatValue('tasks_total')}</p>
                        </div>
                        <CheckSquare className="w-6 h-6 text-indigo-200/60 dark:text-indigo-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* Attendance Today */}
                    <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100/70 dark:border-teal-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider mb-1">Attendance Today</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{getStatValue('attendance')}</p>
                            <p className="text-[10px] font-semibold text-teal-600/80 dark:text-teal-400/80">/ {getStatValue('employees')}</p>
                        </div>
                        <Users className="w-6 h-6 text-teal-200/60 dark:text-teal-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* Pending Salaries */}
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/70 dark:border-amber-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mb-1">Pending Salaries</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{getStatValue('salary_pending') || 0}</p>
                            <p className="text-[10px] font-semibold text-amber-600/80 dark:text-amber-400/80">to process</p>
                        </div>
                        <Briefcase className="w-6 h-6 text-amber-200/60 dark:text-amber-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>

                    {/* Pending Expenses */}
                    <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/70 dark:border-rose-900/40 rounded-xl p-3 relative overflow-hidden group">
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider mb-1">Pending Expenses</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{pendingExpenses.length || getStatValue('expenses_pending') || 0}</p>
                            <p className="text-[10px] font-semibold text-rose-600/80 dark:text-rose-400/80">to approve</p>
                        </div>
                        <Receipt className="w-6 h-6 text-rose-200/60 dark:text-rose-900/40 absolute -bottom-1 -right-1 group-hover:scale-110 transition-transform" />
                    </div>
                </div>

                {/* 3. Team Approvals & On-Leave Status */}
                <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-850/40 overflow-hidden divide-y divide-zinc-200/60 dark:divide-zinc-800">
                    {/* On Leave Today Banner */}
                    <div className="px-3.5 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                {todayOnLeave.length > 0 
                                    ? `${todayOnLeave.length} team member${todayOnLeave.length > 1 ? 's' : ''} on leave today` 
                                    : 'No one on leave today'}
                            </p>
                        </div>

                        {todayOnLeave.length > 0 ? (
                            <div className="flex -space-x-1.5">
                                {todayOnLeave.slice(0, 3).map((leave, i) => {
                                    const name = getEmployeeName(leave);
                                    return (
                                        <div 
                                            key={leave.id || leave._id || i} 
                                            className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 border border-white dark:border-zinc-800 flex items-center justify-center text-[8px] font-bold text-indigo-600 dark:text-indigo-300"
                                            title={name}
                                        >
                                            {getInitials(name)}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                                Full Capacity
                            </span>
                        )}
                    </div>

                    {/* Pending Leaves & Expenses Approval Links */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/60 dark:divide-zinc-800">
                        {/* Leave Approvals */}
                        <Link
                            href="/hrms"
                            className="p-3 flex items-center justify-between hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors group"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    pendingLeaves.length > 0 
                                        ? 'bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400' 
                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    <FileText className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                        {pendingLeaves.length > 0 ? `${pendingLeaves.length} Leave Requests` : 'No Pending Leaves'}
                                    </p>
                                    <p className={`text-[10px] font-medium ${
                                        pendingLeaves.length > 0 ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-zinc-400'
                                    }`}>
                                        {pendingLeaves.length > 0 ? 'Action Required' : 'All caught up'}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
                        </Link>

                        {/* Expense Approvals */}
                        <Link
                            href="/finance/expenses"
                            className="p-3 flex items-center justify-between hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors group"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    pendingExpenses.length > 0 
                                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400' 
                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    <Receipt className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                        {pendingExpenses.length > 0 ? `${pendingExpenses.length} Expenses To Approve` : 'No Pending Expenses'}
                                    </p>
                                    <p className={`text-[10px] font-medium ${
                                        pendingExpenses.length > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-zinc-400'
                                    }`}>
                                        {pendingExpenses.length > 0 ? 'Action Required' : 'All caught up'}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

