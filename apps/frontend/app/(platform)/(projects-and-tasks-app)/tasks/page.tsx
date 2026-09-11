'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { 
    CheckSquare, Plus, LayoutGrid, List, User, Check, Trash2, 
    ArrowRightLeft, MoreHorizontal, ChevronDown, CheckCheck, Square, 
    Filter, Search, X, SlidersHorizontal, RotateCcw, Calendar, Layers, 
    FolderKanban, Users, ShieldAlert, Sparkles, Clock
} from 'lucide-react';
import { SkeletonListItem, SkeletonKanbanColumn, BulkActionBar, ConfirmModal } from "@workspace/ui";
import clsx from 'clsx';
import TaskDetailModal from '@/app/(platform)/(projects-and-tasks-app)/_components/TaskDetailModal';
import CreateTaskModal from '@/app/(platform)/(projects-and-tasks-app)/_components/CreateTaskModal';
import LogWorkModal from '@/app/(platform)/(projects-and-tasks-app)/_components/LogWorkModal';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { format, subDays } from 'date-fns';
import CustomSelect from '@/components/ui/CustomSelect';
import TaskMonthAnalytics from '@/app/(platform)/(projects-and-tasks-app)/_components/TaskMonthAnalytics';

function getInitials(name?: string) {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

const COLUMNS = [
    { id: 'todo', label: 'To Do', color: 'border-gray-300', bg: 'bg-gray-50', badge: 'badge-gray' },
    { id: 'in_progress', label: 'In Progress', color: 'border-blue-400', bg: 'bg-blue-50', badge: 'badge-blue' },
    { id: 'in_review', label: 'In Review', color: 'border-orange-400', bg: 'bg-orange-50', badge: 'badge-orange' },
    { id: 'done', label: 'Done', color: 'border-green-400', bg: 'bg-green-50', badge: 'badge-green' },
    { id: 'backlog', label: 'Backlog', color: 'border-purple-400', bg: 'bg-purple-50', badge: 'badge-purple' },
    { id: 'custom', label: 'Custom', color: 'border-indigo-400', bg: 'bg-indigo-50', badge: 'badge-indigo' },
];

const PRIORITY_COLORS: Record<string, string> = {
    low: 'badge-gray', medium: 'badge-blue', high: 'badge-orange', critical: 'badge-red',
};
const PRIORITY_DOT: Record<string, string> = {
    low: 'bg-gray-400', medium: 'bg-blue-500', high: 'bg-orange-500', critical: 'bg-red-500',
};

export default function TasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    
    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [quickPreset, setQuickPreset] = useState<'all' | 'my_tasks' | 'in_review' | 'high_priority'>('all');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [filterModule, setFilterModule] = useState('');
    const [filterClient, setFilterClient] = useState('');
    const [filterDateRange, setFilterDateRange] = useState('7d');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const [projects, setProjects] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);

    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [logWorkTask, setLogWorkTask] = useState<any | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const { user } = useAuth();

    // Multi-selection & Mass Deletion State
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkMoving, setIsBulkMoving] = useState(false);
    const [isMoveStatusMenuOpen, setIsMoveStatusMenuOpen] = useState(false);
    const moveStatusMenuRef = useRef<HTMLDivElement>(null);

    // Close stage mover dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (moveStatusMenuRef.current && !moveStatusMenuRef.current.contains(e.target as Node)) {
                setIsMoveStatusMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        api.get('/api/projects', { params: { limit: 100 } }).then(({ data }) => setProjects(data.projects || []));
        api.get('/api/clients', { params: { limit: 100 } }).then(({ data }) => setClients(data.clients || []));
    }, []);

    useEffect(() => {
        if (!filterProject) {
            setModules([]);
            setFilterModule('');
            return;
        }
        api.get(`/api/modules/project/${filterProject}`).then(({ data }) => {
            setModules(data.modules || []);
            setFilterModule('');
        });
    }, [filterProject]);

    // Fast In-Memory SWR Cache for 0ms Instant Navigation (Slack/Notion Gold Standard)
    const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

    const loadTasks = useCallback(() => {
        let startDate = '';
        let endDate = '';
        const now = new Date();

        if (filterDateRange === '7d') {
            startDate = subDays(now, 7).toISOString();
            endDate = now.toISOString();
        } else if (filterDateRange === '14d') {
            startDate = subDays(now, 14).toISOString();
            endDate = now.toISOString();
        } else if (filterDateRange === '21d') {
            startDate = subDays(now, 21).toISOString();
            endDate = now.toISOString();
        } else if (filterDateRange === '30d') {
            startDate = subDays(now, 30).toISOString();
            endDate = now.toISOString();
        } else if (filterDateRange === '90d') {
            startDate = subDays(now, 90).toISOString();
            endDate = now.toISOString();
        } else if (filterDateRange === '180d') {
            startDate = subDays(now, 180).toISOString();
            endDate = now.toISOString();
        } else if (filterDateRange === '365d') {
            startDate = subDays(now, 365).toISOString();
            endDate = now.toISOString();
        } else if (filterDateRange === 'custom') {
            if (customStartDate) {
                const s = new Date(customStartDate);
                s.setHours(0, 0, 0, 0);
                startDate = s.toISOString();
            }
            if (customEndDate) {
                const e = new Date(customEndDate);
                e.setHours(23, 59, 59, 999);
                endDate = e.toISOString();
            }
        }

        const cacheKey = `tasks:${filterStatus}:${filterPriority}:${filterProject}:${filterModule}:${filterClient}:${filterDateRange}:${customStartDate}:${customEndDate}`;
        const cached = swrCacheRef.current.get(cacheKey);

        if (cached) {
            // Instant 0ms Paint
            setTasks(cached.data || []);
            setLoading(false);
        } else {
            setLoading(true);
        }

        api.get('/api/tasks', { 
            params: { 
                status: filterStatus, 
                priority: filterPriority,
                projectId: filterProject,
                moduleId: filterModule,
                clientId: filterClient,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                limit: 500
            } 
        })
            .then(({ data }) => {
                const fetchedTasks = data.tasks || [];
                setTasks(fetchedTasks);
                swrCacheRef.current.set(cacheKey, {
                    data: fetchedTasks,
                    timestamp: Date.now()
                });
            })
            .catch(() => {
                if (!cached) toast.error('Failed to load tasks');
            })
            .finally(() => setLoading(false));
    }, [filterStatus, filterPriority, filterProject, filterModule, filterClient, filterDateRange, customStartDate, customEndDate]);

    useEffect(() => { loadTasks(); }, [loadTasks]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const taskId = params?.get('taskId');
            if (taskId) {
                setSelectedTask(taskId);
            }
        }
    }, []);

    const handleUpdated = (updated: any) =>
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));

    const handleDeleted = (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
        setSelectedTaskIds(prev => prev.filter(taskId => taskId !== id));
        toast.success('Task deleted');
    };

    // Filter computation
    const handleResetFilters = () => {
        setSearchQuery('');
        setQuickPreset('all');
        setFilterStatus('');
        setFilterPriority('');
        setFilterProject('');
        setFilterModule('');
        setFilterClient('');
        setFilterDateRange('7d');
        setCustomStartDate('');
        setCustomEndDate('');
    };

    const hasActiveFilters = Boolean(
        searchQuery.trim() ||
        quickPreset !== 'all' ||
        filterStatus ||
        filterPriority ||
        filterProject ||
        filterModule ||
        filterClient ||
        filterDateRange !== '7d' ||
        customStartDate ||
        customEndDate
    );

    const activeFilterCount = [
        Boolean(searchQuery.trim()),
        quickPreset !== 'all',
        Boolean(filterStatus),
        Boolean(filterPriority),
        Boolean(filterProject),
        Boolean(filterModule),
        Boolean(filterClient),
        Boolean(filterDateRange !== '7d' || customStartDate || customEndDate),
    ].filter(Boolean).length;

    const displayedTasks = useMemo(() => {
        return tasks.filter(task => {
            // Live Search query (Title, Description, Project, Assignee, Creator)
            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const titleMatch = String(task.title || '').toLowerCase().includes(query);
                const descMatch = String(task.description || '').toLowerCase().includes(query);
                const projectMatch = String(task.projectId?.name || '').toLowerCase().includes(query);
                const assigneeMatch = String(task.assignee?.name || '').toLowerCase().includes(query);
                const creatorMatch = String(task.creator?.name || '').toLowerCase().includes(query);
                if (!titleMatch && !descMatch && !projectMatch && !assigneeMatch && !creatorMatch) {
                    return false;
                }
            }

            // Quick Preset filter
            if (quickPreset === 'my_tasks' && user?.id) {
                if (task.assigneeId !== user.id && task.assignee?.id !== user.id) return false;
            } else if (quickPreset === 'in_review') {
                if (task.status !== 'in_review') return false;
            } else if (quickPreset === 'high_priority') {
                if (task.priority !== 'high' && task.priority !== 'critical') return false;
            }

            return true;
        });
    }, [tasks, searchQuery, quickPreset, user?.id]);

    // Selection Handlers
    const handleToggleSelectTask = (id: string) => {
        setSelectedTaskIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAllTasks = () => {
        setSelectedTaskIds(displayedTasks.map(t => t.id));
    };

    const handleDeselectAllTasks = () => {
        setSelectedTaskIds([]);
    };

    const handleSelectAmount = (amount: number) => {
        const targetAmount = Math.min(amount, displayedTasks.length);
        const selectedSlice = displayedTasks.slice(0, targetAmount).map(t => t.id);
        setSelectedTaskIds(selectedSlice);
        toast.success(`Selected first ${selectedSlice.length} tasks`);
    };

    const handleToggleColumnSelection = (columnId: string) => {
        const colTaskIds = displayedTasks.filter(t => t.status === columnId).map(t => t.id);
        if (colTaskIds.length === 0) return;

        const allInColSelected = colTaskIds.every(id => selectedTaskIds.includes(id));
        if (allInColSelected) {
            setSelectedTaskIds(prev => prev.filter(id => !colTaskIds.includes(id)));
        } else {
            setSelectedTaskIds(prev => Array.from(new Set([...prev, ...colTaskIds])));
            const colObj = COLUMNS.find(c => c.id === columnId);
            toast.success(`Selected all ${colTaskIds.length} tasks in ${colObj?.label || columnId}`);
        }
    };

    // Bulk Delete Action
    const handleBulkDeleteSelected = async () => {
        if (selectedTaskIds.length === 0) return;
        setIsBulkDeleting(true);
        try {
            await api.post('/api/tasks/bulk-delete', { ids: selectedTaskIds });
            toast.success(`Successfully deleted ${selectedTaskIds.length} tasks`);
            setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
            swrCacheRef.current.clear();
            setSelectedTaskIds([]);
        } catch (error: any) {
            // Fallback to individual deletes if batch endpoint is unavailable
            try {
                await Promise.all(selectedTaskIds.map(id => api.delete(`/api/tasks/${id}`)));
                toast.success(`Deleted ${selectedTaskIds.length} tasks`);
                setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
                swrCacheRef.current.clear();
                setSelectedTaskIds([]);
            } catch (fallbackError: any) {
                toast.error(error.response?.data?.error || 'Failed to delete selected tasks');
            }
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // Bulk Move Status Action
    const handleBulkMoveStatus = async (newStatus: string) => {
        if (selectedTaskIds.length === 0) return;
        setIsBulkMoving(true);
        setIsMoveStatusMenuOpen(false);
        try {
            await api.post('/api/tasks/bulk-status', { ids: selectedTaskIds, status: newStatus });
            const colObj = COLUMNS.find(c => c.id === newStatus);
            toast.success(`Moved ${selectedTaskIds.length} tasks to ${colObj?.label || newStatus}`);
            setTasks(prev => prev.map(t => selectedTaskIds.includes(t.id) ? { ...t, status: newStatus } : t));
            swrCacheRef.current.clear();
            setSelectedTaskIds([]);
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to move selected tasks');
            loadTasks();
        } finally {
            setIsBulkMoving(false);
        }
    };

    // Kanban drag-and-drop
    const handleDrop = async (columnId: string) => {
        if (!draggedId) return;

        const task = tasks.find(t => t.id === draggedId);
        if (!task || task.status === columnId) { setDraggedId(null); return; }

        if (task.status === 'in_review') {
            toast.error('Tasks in review are locked until approved or rejected via work logs.');
            setDraggedId(null);
            return;
        }

        if (columnId === 'in_review' || columnId === 'done') {
            setLogWorkTask(task);
            setDraggedId(null);
            return;
        }

        setTasks(prev => prev.map(t => t.id === draggedId ? { ...t, status: columnId } : t));
        setDraggedId(null);
        try {
            await api.put(`/api/tasks/${draggedId}`, { status: columnId });
            swrCacheRef.current.clear();
        } catch {
            toast.error('Failed to update task status');
            loadTasks();
        }
    };

    return (
        <div className="pb-24">
            {showCreate && (
                <CreateTaskModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={(task) => { setTasks(prev => [task, ...prev]); setShowCreate(false); }}
                />
            )}

            <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="page-title text-xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
                    <p className="page-subtitle text-xs text-gray-500 dark:text-gray-400">
                        {displayedTasks.length} tasks {selectedTaskIds.length > 0 && `• ${selectedTaskIds.length} selected`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1 border border-gray-200/60 dark:border-slate-700">
                        <button 
                            onClick={() => setView('kanban')} 
                            className={clsx(
                                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer', 
                                view === 'kanban' 
                                    ? 'bg-white dark:bg-slate-900 shadow-xs text-gray-900 dark:text-gray-100 font-bold' 
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" /> Kanban
                        </button>
                        <button 
                            onClick={() => setView('list')} 
                            className={clsx(
                                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer', 
                                view === 'list' 
                                    ? 'bg-white dark:bg-slate-900 shadow-xs text-gray-900 dark:text-gray-100 font-bold' 
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                            )}
                        >
                            <List className="w-4 h-4" /> List
                        </button>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'))) && (
                        <button onClick={() => setShowCreate(true)} className="btn-primary cursor-pointer">
                            <Plus className="w-4 h-4" />New Task
                        </button>
                    )}
                </div>
            </div>

            {/* ✨ MONTH TASK ACTIVITY BAR GRAPH (UPPER SECTION) ✨ */}
            <TaskMonthAnalytics />

            {/* ── ✨ INDUSTRY-STANDARD FILTER & SEARCH COMMAND HUB ✨ ── */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-slate-800 p-3 shadow-2xs space-y-2.5 mb-5 relative z-30">
                {/* Upper Command Row: Live Search + Quick Presets + Active Filter Status / Reset */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search tasks by title, project, assignee..."
                            className="w-full bg-gray-50/80 dark:bg-slate-800/80 border border-gray-200/90 dark:border-slate-700/90 rounded-xl pl-8 pr-8 py-1.5 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all h-9"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-slate-700 cursor-pointer"
                                title="Clear search"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Quick Presets & Active Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center bg-gray-100/90 dark:bg-slate-800/90 p-0.5 rounded-xl border border-gray-200/60 dark:border-slate-700/60 text-xs">
                            <button
                                type="button"
                                onClick={() => setQuickPreset('all')}
                                className={clsx(
                                    "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                                    quickPreset === 'all'
                                        ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-2xs font-semibold"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                )}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickPreset('my_tasks')}
                                className={clsx(
                                    "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1",
                                    quickPreset === 'my_tasks'
                                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                )}
                            >
                                <User className="w-3 h-3" /> My Tasks
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickPreset('in_review')}
                                className={clsx(
                                    "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1",
                                    quickPreset === 'in_review'
                                        ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-semibold"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                )}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> In Review
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickPreset('high_priority')}
                                className={clsx(
                                    "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1",
                                    quickPreset === 'high_priority'
                                        ? "bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-2xs font-semibold"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                )}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> High Priority
                            </button>
                        </div>

                        {/* Active count badge & Reset All */}
                        {hasActiveFilters && (
                            <div className="flex items-center gap-1.5 pl-1">
                                <span className="text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-lg border border-indigo-200/80 dark:border-indigo-800/80 flex items-center gap-1">
                                    <SlidersHorizontal className="w-3 h-3" /> {activeFilterCount} active
                                </span>
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Reset all filters to default"
                                >
                                    <RotateCcw className="w-3 h-3" /> Reset
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lower Row: Compact Horizontal Dropdown Pills */}
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100 dark:border-slate-800/80">
                    {/* Status Dropdown */}
                    <div className="w-[130px] shrink-0">
                        <CustomSelect 
                            value={filterStatus} 
                            onChange={e => setFilterStatus(e.target.value)} 
                            size="sm"
                            activeHighlight
                            clearable
                            placeholder="All Statuses"
                        >
                            <option value="">All Statuses</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="in_review">In Review</option>
                            <option value="done">Done</option>
                            <option value="backlog">Backlog</option>
                        </CustomSelect>
                    </div>

                    {/* Priority Dropdown */}
                    <div className="w-[130px] shrink-0">
                        <CustomSelect 
                            value={filterPriority} 
                            onChange={e => setFilterPriority(e.target.value)} 
                            size="sm"
                            activeHighlight
                            clearable
                            placeholder="All Priorities"
                        >
                            <option value="">All Priorities</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </CustomSelect>
                    </div>

                    {/* Project Dropdown */}
                    <div className="w-[145px] shrink-0">
                        <CustomSelect 
                            value={filterProject} 
                            onChange={e => setFilterProject(e.target.value)} 
                            size="sm"
                            activeHighlight
                            clearable
                            placeholder="All Projects"
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </CustomSelect>
                    </div>

                    {/* Module Dropdown */}
                    <div className="w-[145px] shrink-0">
                        <CustomSelect 
                            value={filterModule} 
                            onChange={e => setFilterModule(e.target.value)} 
                            size="sm"
                            activeHighlight
                            clearable
                            disabled={!filterProject || modules.length === 0}
                            placeholder={filterProject ? (modules.length > 0 ? "All Modules" : "No Modules") : "All Modules"}
                        >
                            <option value="">All Modules</option>
                            {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </CustomSelect>
                    </div>

                    {/* Client Dropdown */}
                    <div className="w-[145px] shrink-0">
                        <CustomSelect 
                            value={filterClient} 
                            onChange={e => setFilterClient(e.target.value)} 
                            size="sm"
                            activeHighlight
                            clearable
                            placeholder="All Clients"
                        >
                            <option value="">All Clients</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </CustomSelect>
                    </div>

                    {/* Date Range Dropdown */}
                    <div className="w-[175px] shrink-0">
                        <CustomSelect 
                            value={filterDateRange} 
                            onChange={e => setFilterDateRange(e.target.value)} 
                            size="sm"
                            activeHighlight
                            placeholder="Date Range"
                        >
                            <option value="7d">Last 7 Days (Default)</option>
                            <option value="14d">Last 2 Weeks</option>
                            <option value="21d">Last 3 Weeks</option>
                            <option value="30d">Last 4 Weeks (1 Month)</option>
                            <option value="90d">Last 3 Months</option>
                            <option value="180d">Last 6 Months</option>
                            <option value="365d">Last 1 Year</option>
                            <option value="all">All Time</option>
                            <option value="custom">Custom Range...</option>
                        </CustomSelect>
                    </div>

                    {/* Custom Date Range Inline Inputs */}
                    {filterDateRange === 'custom' && (
                        <div className="flex items-center gap-1.5 bg-indigo-50/60 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800 shrink-0 animate-in fade-in duration-150">
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">From:</span>
                            <input 
                                type="date" 
                                value={customStartDate}
                                onChange={e => setCustomStartDate(e.target.value)}
                                className="input text-xs py-1 px-1.5 h-7 w-[115px] bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"
                                title="Start Date"
                            />
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">To:</span>
                            <input 
                                type="date" 
                                value={customEndDate}
                                onChange={e => setCustomEndDate(e.target.value)}
                                className="input text-xs py-1 px-1.5 h-7 w-[115px] bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"
                                title="End Date"
                            />
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                view === 'kanban' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <SkeletonKanbanColumn key={i} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonListItem key={i} />
                        ))}
                    </div>
                )
            ) : view === 'kanban' ? (
                /* ✨ KANBAN VIEW WITH MASS SELECTION ✨ */
                <div className="flex gap-4 overflow-x-auto pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] items-stretch">
                    {COLUMNS.map(col => {
                        const colTasks = displayedTasks.filter(t => t.status === col.id);
                        let displayLabel = col.label;
                        if (col.id === 'custom' && colTasks.length > 0 && colTasks[0]?.projectId?.customTaskStatusName) {
                            displayLabel = colTasks[0].projectId.customTaskStatusName;
                        }

                        const allInColSelected = colTasks.length > 0 && colTasks.every(t => selectedTaskIds.includes(t.id));
                        const someInColSelected = colTasks.some(t => selectedTaskIds.includes(t.id));

                        return (
                            <div
                                key={col.id}
                                className={clsx('rounded-2xl border-t-4 p-3 min-w-[280px] w-[280px] min-h-[440px] flex-shrink-0 flex flex-col', col.bg, col.color)}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => handleDrop(col.id)}
                            >
                                <div className="flex items-center justify-between mb-3 shrink-0">
                                    <div className="flex items-center gap-2">
                                        {/* Column-level Select All Checkbox */}
                                        {colTasks.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleColumnSelection(col.id);
                                                }}
                                                title={allInColSelected ? "Deselect column" : `Select all ${colTasks.length} in ${displayLabel}`}
                                                className="p-1 -ml-1 text-gray-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                                            >
                                                <span className={clsx(
                                                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                    allInColSelected ? "bg-indigo-600 border-indigo-600 text-white" : someInColSelected ? "bg-indigo-100 border-indigo-400 text-indigo-700" : "border-gray-300 bg-white dark:bg-slate-800"
                                                )}>
                                                    {allInColSelected ? (
                                                        <Check className="w-3 h-3 stroke-[3]" />
                                                    ) : someInColSelected ? (
                                                        <span className="w-2 h-0.5 bg-indigo-600 rounded-full" />
                                                    ) : null}
                                                </span>
                                            </button>
                                        )}
                                        <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{displayLabel}</span>
                                        <span className={clsx('badge text-xs', col.badge)}>{colTasks.length}</span>
                                    </div>
                                </div>

                                <div className="space-y-2.5 flex-1">
                                    {colTasks.map(task => {
                                        const isSelected = selectedTaskIds.includes(task.id);
                                        return (
                                            <div
                                                key={task.id}
                                                draggable={task.status !== 'in_review'}
                                                onDragStart={() => task.status !== 'in_review' && setDraggedId(task.id)}
                                                onDragEnd={() => setDraggedId(null)}
                                                onClick={() => setSelectedTask(task.id)}
                                                title={task.status === 'in_review' ? 'Task is in review (status locked until reviewed)' : undefined}
                                                className={clsx(
                                                    'bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-2xs border transition-all select-none relative group cursor-pointer',
                                                    isSelected
                                                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs'
                                                        : 'border-gray-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:shadow-md',
                                                    draggedId === task.id && 'opacity-40 scale-95',
                                                    task.status === 'in_review' && 'border-amber-200/80 dark:border-amber-900/40'
                                                )}
                                            >
                                                {/* Header Row: Checkbox + Priority Dot + Title */}
                                                <div className="flex items-start gap-2.5 mb-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleSelectTask(task.id);
                                                        }}
                                                        className={clsx(
                                                            "mt-0.5 p-0.5 -ml-0.5 -mt-0.5 rounded cursor-pointer transition-opacity",
                                                            isSelected ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                                                        )}
                                                        title={isSelected ? "Deselect task" : "Select task"}
                                                    >
                                                        <span className={clsx(
                                                            "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                            isSelected 
                                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-xs" 
                                                                : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-500"
                                                        )}>
                                                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                        </span>
                                                    </button>

                                                    <div className="flex-1 min-w-0 flex items-start gap-1.5">
                                                        <span className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', PRIORITY_DOT[task.priority] || 'bg-gray-300')} />
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                            {task.title}
                                                        </p>
                                                    </div>
                                                </div>

                                                {task.projectId?.name && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
                                                        {task.projectId.name}
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-slate-800 text-[10px]">
                                                    {task.dueDate ? (
                                                        <span className="text-gray-400 dark:text-gray-500 font-medium">
                                                            {format(new Date(task.dueDate), 'MMM d')}
                                                        </span>
                                                    ) : <span />}
                                                    
                                                    <div className="flex items-center gap-1.5">
                                                        {/* Creator / Assigner */}
                                                        {task.creator && (
                                                            <div 
                                                                className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-100 dark:border-purple-900/50"
                                                                title={`Assigned by: ${task.creator.name}`}
                                                            >
                                                                <div className="w-3.5 h-3.5 rounded-full overflow-hidden bg-purple-200 dark:bg-purple-900 flex items-center justify-center text-[7px] font-bold text-purple-800 dark:text-purple-200 shrink-0">
                                                                    {task.creator.photoUrl ? (
                                                                        <img src={task.creator.photoUrl} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        task.creator.name?.[0]?.toUpperCase() || 'A'
                                                                    )}
                                                                </div>
                                                                <span className="font-semibold text-[9px] max-w-[60px] truncate">{task.creator.name?.split(' ')[0]}</span>
                                                            </div>
                                                        )}

                                                        {/* Arrow connector */}
                                                        {task.creator && task.assignee && (
                                                            <span className="text-gray-300 dark:text-gray-600 text-[9px]">→</span>
                                                        )}

                                                        {/* Assignee / Working by */}
                                                        {task.assignee ? (
                                                            <div 
                                                                className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50"
                                                                title={`Working by: ${task.assignee.name}`}
                                                            >
                                                                <div className="w-3.5 h-3.5 rounded-full overflow-hidden bg-indigo-200 dark:bg-indigo-900 flex items-center justify-center text-[7px] font-bold text-indigo-800 dark:text-indigo-200 shrink-0">
                                                                    {task.assignee.profilePicture || task.assignee.photoUrl ? (
                                                                        <img src={task.assignee.profilePicture || task.assignee.photoUrl} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        task.assignee.name?.[0]?.toUpperCase() || 'U'
                                                                    )}
                                                                </div>
                                                                <span className="font-semibold text-[9px] max-w-[60px] truncate">{task.assignee.name?.split(' ')[0]}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 dark:text-gray-500 italic text-[9px]">Unassigned</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {colTasks.length === 0 && (
                                        <div className="text-center py-12 text-gray-300 dark:text-gray-600 text-xs select-none border-2 border-dashed border-gray-200/70 dark:border-slate-800 rounded-2xl">
                                            Drop tasks here
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── LIST VIEW WITH MULTI-SELECTION ── */
                <div className="space-y-2">
                    {displayedTasks.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 text-xs text-gray-600 dark:text-gray-300 font-semibold shadow-2xs">
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={selectedTaskIds.length === displayedTasks.length ? handleDeselectAllTasks : handleSelectAllTasks}
                                    className="p-0.5 cursor-pointer"
                                    title={selectedTaskIds.length === displayedTasks.length ? "Deselect all" : "Select all"}
                                >
                                    <span className={clsx(
                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                        selectedTaskIds.length === displayedTasks.length 
                                            ? "bg-indigo-600 border-indigo-600 text-white" 
                                            : selectedTaskIds.length > 0 
                                                ? "bg-indigo-100 border-indigo-400 text-indigo-700" 
                                                : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                    )}>
                                        {selectedTaskIds.length === displayedTasks.length ? (
                                            <Check className="w-3 h-3 stroke-[3]" />
                                        ) : selectedTaskIds.length > 0 ? (
                                            <span className="w-2 h-0.5 bg-indigo-600 rounded-full" />
                                        ) : null}
                                    </span>
                                </button>
                                <span>Select All ({displayedTasks.length} tasks)</span>
                            </div>
                            {selectedTaskIds.length > 0 && (
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                    {selectedTaskIds.length} of {displayedTasks.length} selected
                                </span>
                            )}
                        </div>
                    )}

                    {displayedTasks.map((task) => {
                        const isSelected = selectedTaskIds.includes(task.id);
                        return (
                            <div
                                key={task.id}
                                onClick={() => setSelectedTask(task.id)}
                                className={clsx(
                                    "card p-3.5 flex items-center gap-3.5 hover:shadow-md transition-all cursor-pointer group rounded-2xl border bg-white dark:bg-slate-900",
                                    isSelected
                                        ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20"
                                        : "border-gray-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/80"
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleSelectTask(task.id);
                                    }}
                                    className={clsx(
                                        "p-0.5 rounded cursor-pointer transition-opacity shrink-0",
                                        isSelected ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                                    )}
                                    title={isSelected ? "Deselect" : "Select"}
                                >
                                    <span className={clsx(
                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                        isSelected 
                                            ? "bg-indigo-600 border-indigo-600 text-white" 
                                            : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-500"
                                    )}>
                                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                    </span>
                                </button>

                                <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority] || 'bg-gray-300')} />
                                
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {task.title}
                                    </p>
                                    {task.projectId?.name && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{task.projectId.name}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className={clsx('badge text-xs', PRIORITY_COLORS[task.priority] || 'badge-gray')}>{task.priority}</span>
                                    <span className="badge badge-gray text-xs">{task.status?.replace(/_/g, ' ')}</span>
                                    {task.dueDate && <span className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(task.dueDate), 'MMM d')}</span>}
                                    
                                    <div className="flex items-center gap-2">
                                        {task.creator && (
                                            <div className="flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-1 rounded-lg border border-purple-100 dark:border-purple-900/50" title={`Assigned by: ${task.creator.name}`}>
                                                <span className="text-[10px] text-purple-400 font-bold">BY:</span>
                                                <span className="font-semibold max-w-[70px] truncate">{task.creator.name}</span>
                                            </div>
                                        )}
                                        {task.assignee && (
                                            <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/50" title={`Working by: ${task.assignee.name}`}>
                                                <span className="text-[10px] text-indigo-400 font-bold">FOR:</span>
                                                <div className="w-4 h-4 rounded-full bg-indigo-200 dark:bg-indigo-900 overflow-hidden shrink-0">
                                                    {task.assignee.profilePicture || task.assignee.photoUrl ? (
                                                        <img src={task.assignee.profilePicture || task.assignee.photoUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[8px] font-bold flex items-center justify-center w-full h-full">{task.assignee.name?.[0]?.toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <span className="font-semibold max-w-[70px] truncate">{task.assignee.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {displayedTasks.length === 0 && (
                        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
                            <CheckSquare className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No tasks found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Bulk Action Bar */}
            <BulkActionBar
                selectedCount={selectedTaskIds.length}
                totalCount={displayedTasks.length}
                itemLabel="tasks"
                onSelectAll={handleSelectAllTasks}
                onDeselectAll={handleDeselectAllTasks}
                onSelectAmount={handleSelectAmount}
                onDeleteSelected={handleBulkDeleteSelected}
                isDeleting={isBulkDeleting}
                deleteModalTitle={`Delete ${selectedTaskIds.length} tasks`}
                deleteModalMessage={`Are you sure you want to delete ${selectedTaskIds.length} selected tasks? This action cannot be undone.`}
            >
                {/* Move Status Dropdown */}
                <div className="relative" ref={moveStatusMenuRef}>
                    <button
                        type="button"
                        onClick={() => setIsMoveStatusMenuOpen(prev => !prev)}
                        disabled={isBulkMoving}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all border border-gray-200 dark:border-slate-700 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Move Status</span>
                        <ChevronDown className={clsx("w-3 h-3 transition-transform", isMoveStatusMenuOpen && "rotate-180")} />
                    </button>

                    {isMoveStatusMenuOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Move to Status
                            </div>
                            {COLUMNS.map(col => (
                                <button
                                    key={col.id}
                                    type="button"
                                    onClick={() => handleBulkMoveStatus(col.id)}
                                    className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                                >
                                    <span>{col.label}</span>
                                    <span className={clsx('w-2 h-2 rounded-full', col.badge?.replace('badge-', 'bg-') || 'bg-gray-400')} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </BulkActionBar>

            {selectedTask && (
                <TaskDetailModal
                    taskId={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdated={handleUpdated}
                    onDeleted={handleDeleted}
                />
            )}

            {logWorkTask && (
                <LogWorkModal 
                    onClose={() => setLogWorkTask(null)} 
                    onSuccess={() => {
                        setLogWorkTask(null);
                        loadTasks();
                    }}
                    prefilledTaskId={logWorkTask.id}
                    prefilledProjectId={logWorkTask.projectId}
                    prefilledModuleId={logWorkTask.moduleId}
                />
            )}
        </div>
    );
}
