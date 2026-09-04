'use client';


import { useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { CheckSquare, Plus, LayoutGrid, List, User } from 'lucide-react';
import { SkeletonListItem, SkeletonKanbanColumn } from "@workspace/ui";
import clsx from 'clsx';
import TaskDetailModal from '@/app/(platform)/(projects-and-tasks-app)/_components/TaskDetailModal';
import CreateTaskModal from '@/app/(platform)/(projects-and-tasks-app)/_components/CreateTaskModal';
import LogWorkModal from '@/app/(platform)/(projects-and-tasks-app)/_components/LogWorkModal';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';
import CustomSelect from '@/components/ui/CustomSelect';

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
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [filterModule, setFilterModule] = useState('');
    const [filterClient, setFilterClient] = useState('');
    const [filterDate, setFilterDate] = useState('');

    const [projects, setProjects] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);

    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [logWorkTask, setLogWorkTask] = useState<any | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const { user } = useAuth();

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
        const cacheKey = `tasks:${filterStatus}:${filterPriority}:${filterProject}:${filterModule}:${filterClient}:${filterDate}`;
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
                date: filterDate
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
    }, [filterStatus, filterPriority, filterProject, filterModule, filterClient, filterDate]);

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
        toast.success('Task deleted');
    };

    // Kanban drag-and-drop
    const handleDrop = async (columnId: string) => {
        if (!draggedId) return;

        const task = tasks.find(t => t.id === draggedId);
        if (!task || task.status === columnId) { setDraggedId(null); return; }

        if (columnId === 'in_review' || columnId === 'done') {
            setLogWorkTask(task);
            setDraggedId(null);
            return;
        }

        setTasks(prev => prev.map(t => t.id === draggedId ? { ...t, status: columnId } : t));
        setDraggedId(null);
        try {
            await api.put(`/api/tasks/${draggedId}`, { status: columnId });
        } catch {
            toast.error('Failed to update task status');
            loadTasks();
        }
    };

    return (
        <div>
            {showCreate && (
                <CreateTaskModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={(task) => { setTasks(prev => [task, ...prev]); setShowCreate(false); }}
                />
            )}

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Tasks</h1>
                    <p className="page-subtitle">{tasks.length} tasks</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        <button onClick={() => setView('kanban')} className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5', view === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
                            <LayoutGrid className="w-4 h-4" /> Kanban
                        </button>
                        <button onClick={() => setView('list')} className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5', view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
                            <List className="w-4 h-4" /> List
                        </button>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'))) && (
                        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" />New Task</button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-5 flex-nowrap overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <CustomSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select min-w-[140px] w-auto">
                    <option value="">All Statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                </CustomSelect>
                <CustomSelect value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="select min-w-[140px] w-auto">
                    <option value="">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </CustomSelect>
                <CustomSelect value={filterProject} onChange={e => setFilterProject(e.target.value)} className="select min-w-[160px] w-auto">
                    <option value="">All Projects</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </CustomSelect>
                <CustomSelect value={filterModule} onChange={e => setFilterModule(e.target.value)} className="select min-w-[160px] w-auto" disabled={!filterProject || modules.length === 0}>
                    <option value="">All Modules</option>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </CustomSelect>
                <CustomSelect value={filterClient} onChange={e => setFilterClient(e.target.value)} className="select min-w-[160px] w-auto">
                    <option value="">All Clients</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </CustomSelect>
                <input 
                    type="date" 
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="input min-w-[150px] w-auto"
                />
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
                /* ✨ KANBAN VIEW ✨ */
                <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {COLUMNS.map(col => {
                        const colTasks = tasks.filter(t => t.status === col.id);
                        let displayLabel = col.label;
                        if (col.id === 'custom' && colTasks.length > 0 && colTasks[0]?.projectId?.customTaskStatusName) {
                            displayLabel = colTasks[0].projectId.customTaskStatusName;
                        }
                        return (
                            <div
                                key={col.id}
                                className={clsx('rounded-2xl border-t-4 p-3 min-w-[280px] w-[280px] min-h-[420px] flex-shrink-0', col.bg, col.color)}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => handleDrop(col.id)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-gray-700">{displayLabel}</span>
                                        <span className={clsx('badge text-xs', col.badge)}>{colTasks.length}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {colTasks.map(task => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={() => setDraggedId(task.id)}
                                            onDragEnd={() => setDraggedId(null)}
                                            onClick={() => setSelectedTask(task.id)}
                                            className={clsx(
                                                'bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all select-none',
                                                draggedId === task.id && 'opacity-40 scale-95',
                                            )}
                                        >
                                            <div className="flex items-start gap-2 mb-2">
                                                <span className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', PRIORITY_DOT[task.priority] || 'bg-gray-300')} />
                                                <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
                                            </div>
                                            {task.projectId?.name && (
                                                <p className="text-xs text-gray-400 mb-2 ml-4">{task.projectId.name}</p>
                                            )}
                                            <div className="flex items-center justify-between ml-4 mt-2 pt-2 border-t border-gray-50 text-[10px]">
                                                {task.dueDate ? (
                                                    <span className="text-gray-400 font-medium">{format(new Date(task.dueDate), 'MMM d')}</span>
                                                ) : <span />}
                                                
                                                <div className="flex items-center gap-1.5">
                                                    {/* Creator / Assigner */}
                                                    {task.creator && (
                                                        <div 
                                                            className="flex items-center gap-1 bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full border border-purple-100"
                                                            title={`Assigned by: ${task.creator.name}`}
                                                        >
                                                            <div className="w-3.5 h-3.5 rounded-full overflow-hidden bg-purple-200 flex items-center justify-center text-[7px] font-bold text-purple-800 shrink-0">
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
                                                        <span className="text-gray-300 text-[9px]">→</span>
                                                    )}

                                                    {/* Assignee / Working by */}
                                                    {task.assignee ? (
                                                        <div 
                                                            className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full border border-indigo-100"
                                                            title={`Working by: ${task.assignee.name}`}
                                                        >
                                                            <div className="w-3.5 h-3.5 rounded-full overflow-hidden bg-indigo-200 flex items-center justify-center text-[7px] font-bold text-indigo-800 shrink-0">
                                                                {task.assignee.profilePicture || task.assignee.photoUrl ? (
                                                                    <img src={task.assignee.profilePicture || task.assignee.photoUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    task.assignee.name?.[0]?.toUpperCase() || 'U'
                                                                )}
                                                            </div>
                                                            <span className="font-semibold text-[9px] max-w-[60px] truncate">{task.assignee.name?.split(' ')[0]}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic text-[9px]">Unassigned</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {colTasks.length === 0 && (
                                        <div className="text-center py-8 text-gray-300 text-sm">Drop tasks here</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── LIST VIEW ── */
                <div className="space-y-2">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            onClick={() => setSelectedTask(task.id)}
                            className="card p-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group"
                        >
                            <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority] || 'bg-gray-300')} />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">{task.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{task.projectId?.name}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={clsx('badge', PRIORITY_COLORS[task.priority] || 'badge-gray')}>{task.priority}</span>
                                <span className="badge badge-gray">{task.status?.replace(/_/g, ' ')}</span>
                                {task.dueDate && <span className="text-xs text-gray-400">{format(new Date(task.dueDate), 'MMM d')}</span>}
                                
                                <div className="flex items-center gap-2">
                                    {task.creator && (
                                        <div className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100" title={`Assigned by: ${task.creator.name}`}>
                                            <span className="text-[10px] text-purple-400 font-bold">BY:</span>
                                            <span className="font-semibold max-w-[70px] truncate">{task.creator.name}</span>
                                        </div>
                                    )}
                                    {task.assignee && (
                                        <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100" title={`Working by: ${task.assignee.name}`}>
                                            <span className="text-[10px] text-indigo-400 font-bold">FOR:</span>
                                            <div className="w-4 h-4 rounded-full bg-indigo-200 overflow-hidden shrink-0">
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
                    ))}
                    {tasks.length === 0 && (
                        <div className="text-center py-20">
                            <CheckSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No tasks found</p>
                        </div>
                    )}
                </div>
            )}

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


