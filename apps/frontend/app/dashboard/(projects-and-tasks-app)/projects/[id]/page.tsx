'use client';


import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, FolderKanban, Plus, Users, Calendar, Tag, CheckSquare, Paperclip, Edit2, MoreHorizontal, Clock, AlertCircle, CheckCircle2, Play, Eye, MessageSquare, Sparkles, Globe, ExternalLink, Building2, Trash2, Layout, Briefcase, Archive, List } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { format } from 'date-fns';
import FileUploadModal from '@/components/shared/FileUploadModal';
import UserSelectionModal from '@/components/shared/UserSelectionModal';
import CreateTaskModal from '@/app/dashboard/(projects-and-tasks-app)/_components/CreateTaskModal';
import EditProjectModal from '@/app/dashboard/(projects-and-tasks-app)/_components/EditProjectModal';
import TaskDetailModal from '@/app/dashboard/(projects-and-tasks-app)/_components/TaskDetailModal';
import { ConfirmModal , LogoLoader } from "@workspace/ui";
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import { FavoriteButton } from "@workspace/ui";
import CreateModuleModal from '@/app/dashboard/(projects-and-tasks-app)/_components/CreateModuleModal';
import LogWorkModal from '@/app/dashboard/(projects-and-tasks-app)/_components/LogWorkModal';

const STATUS_COLORS: Record<string, string> = {
    planning: 'badge-gray',
    in_progress: 'badge-blue',
    on_hold: 'badge-orange',
    completed: 'badge-green',
    cancelled: 'badge-red',
};

const TASK_STATUS_CONFIG: Record<string, { cls: string; icon: any; label: string }> = {
    todo: { cls: 'border-gray-200 bg-gray-50', icon: Clock, label: 'To Do' },
    in_progress: { cls: 'border-blue-200 bg-blue-50', icon: Play, label: 'In Progress' },
    in_review: { cls: 'border-amber-200 bg-amber-50', icon: Eye, label: 'In Review' },
    done: { cls: 'border-green-200 bg-green-50', icon: CheckCircle2, label: 'Done' },
    backlog: { cls: 'border-purple-200 bg-purple-50', icon: Archive, label: 'Backlog' },
    custom: { cls: 'border-indigo-200 bg-indigo-50', icon: List, label: 'Custom' },
};

const PRIORITY_COLORS: Record<string, string> = {
    low: 'badge-gray', medium: 'badge-blue', high: 'badge-orange', critical: 'badge-red',
};

const ROLE_CONFIG: Record<string, { label: string; cls: string; bg: string; text: string }> = {
    admin: { label: 'Admin', cls: 'bg-red-100 text-red-700 border-red-200', bg: 'bg-red-500', text: 'text-red-600' },
    manager: { label: 'Manager', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200', bg: 'bg-indigo-500', text: 'text-indigo-600' },
    employee: { label: 'Employee', cls: 'bg-blue-100 text-blue-700 border-blue-200', bg: 'bg-blue-500', text: 'text-blue-600' },
    hr: { label: 'HR', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', bg: 'bg-emerald-500', text: 'text-emerald-600' },
    finance: { label: 'Finance', cls: 'bg-amber-100 text-amber-700 border-amber-200', bg: 'bg-amber-500', text: 'text-amber-600' },
    client: { label: 'Client', cls: 'bg-orange-100 text-orange-700 border-orange-200', bg: 'bg-orange-500', text: 'text-orange-600' },
};

export default function ProjectDetailPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { user } = useAuth();
    
    // Core Role Logic
    const isPrivileged = user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'));
    const isModuleOwner = (moduleId?: string) => {
        if (!moduleId) return modules.some(m => m.ownerId?.id === user?.id);
        return modules.find(m => m.id === moduleId)?.ownerId?.id === user?.id;
    };
    
    // Can current user add tasks to this specific module/project?
    const canManageTasks = (moduleId?: string) => isPrivileged || isModuleOwner(moduleId);

    const [project, setProject] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [projectLogs, setProjectLogs] = useState<any[]>([]);
    const [projectExpenses, setProjectExpenses] = useState<any[]>([]);
    const [newNote, setNewNote] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'tasks' | 'work-logs' | 'milestones' | 'files' | 'notes' | 'timelogs' | 'team' | 'clients'>('overview');
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab && ['overview', 'modules', 'tasks', 'work-logs', 'milestones', 'files', 'notes', 'timelogs', 'team', 'clients'].includes(tab)) {
                setActiveTab(tab as any);
            }
            const taskId = params.get('taskId');
            if (taskId) {
                setSelectedTaskId(taskId);
                setActiveTab('tasks');
            }
        }
    }, []);

    const handleTabChange = (tab: typeof activeTab) => {
        setActiveTab(tab);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            window.history.replaceState(null, '', url.toString());
        }
    };

    const [modules, setModules] = useState<any[]>([]);
    const [workLogs, setWorkLogs] = useState<any[]>([]);
    const [showLogWork, setShowLogWork] = useState(false);
    const [showAddModule, setShowAddModule] = useState(false);
    const [selectedModuleFilter, setSelectedModuleFilter] = useState('all');
    const [showUpload, setShowUpload] = useState(false);
    const [showAI, setShowAI] = useState(false);
    const [showAddTask, setShowAddTask] = useState(false);
    const [showEditProject, setShowEditProject] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showClientsModal, setShowClientsModal] = useState(false);
    const [updatingSelection, setUpdatingSelection] = useState(false);
    const [showMilestoneForm, setShowMilestoneForm] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [editingCustomStatus, setEditingCustomStatus] = useState(false);
    const [customStatusValue, setCustomStatusValue] = useState('');
    const [aiInsight, setAiInsight] = useState('');
    const [loadingAI, setLoadingAI] = useState(false);
    const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean, 
        type: 'milestone' | 'note' | 'module', 
        id: string | null, 
        title: string, 
        message: string,
        data?: any
    }>({
        isOpen: false, type: 'milestone', id: null, title: '', message: ''
    });
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editNoteContent, setEditNoteContent] = useState('');
    const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

    useEffect(() => {
        if (id === 'create') {
            router.replace('/dashboard/projects?create=true');
            return;
        }

        Promise.all([
            api.get(`/api/projects/${id}`),
            api.get(`/api/projects/${id}/tasks`).catch(() => ({ data: { tasks: [] } })),
            api.get('/api/files', { params: { relatedId: id, relatedModel: 'Project' } }).catch(() => ({ data: { files: [] } })),
            api.get(`/api/projects/${id}/notes`).catch(() => ({ data: { notes: [] } })),
            api.get(`/api/milestones/project/${id}`).catch(() => ({ data: { milestones: [] } })),
            api.get(`/api/modules/project/${id}`).catch(() => ({ data: { modules: [] } })),
            api.get('/api/invoices', { params: { projectId: id } }).catch(() => ({ data: { invoices: [] } })),
            api.get(`/api/projects/${id}/activity`).catch(() => ({ data: { activities: [], summary: {} } })),
            api.get('/api/work-logs', { params: { projectId: id } }).catch(() => ({ data: { logs: [] } })),
            api.get('/api/expenses', { params: { projectId: id } }).catch(() => ({ data: { expenses: [] } }))
        ])
            .then(([pRes, tRes, fRes, nRes, mRes, modRes, iRes, tlRes, wlRes, eRes]) => {
                const projectData = pRes.data.project;
                setProject(projectData);
                setTasks(tRes.data.tasks || []);
                setFiles(fRes.data.files || []);
                setNotes(nRes.data.notes || []);
                setMilestones(mRes.data.milestones || []);
                setModules(modRes.data.modules || []);
                setInvoices(iRes.data.invoices || []);
                setProjectLogs(tlRes.data.activities || []);
                setWorkLogs(wlRes.data.logs || []);
                setProjectExpenses(eRes.data.expenses || []);
                setLoading(false);

                // Track Visit (Phase 6)
                api.post('/api/user-preferences/recent', {
                    recordId: id,
                    type: 'Project',
                    label: projectData.name,
                    href: `/dashboard/projects/${id}`
                }).then(() => {
                    window.dispatchEvent(new CustomEvent('recentItemsUpdated'));
                }).catch(err => console.error('Recent tracking error:', err));
            })
            .catch((err) => {
                console.error('[ProjectDetail] Failed to load project:', err);
            })
            .finally(() => setLoading(false));
    }, [id]);

    const onFileUploaded = (file: any) => setFiles((prev) => [file, ...prev]);

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        setSubmittingNote(true);
        try {
            const { data } = await api.post(`/api/projects/${id}/notes`, { content: newNote });
            setNotes([data.note, ...notes]);
            setNewNote('');
        } catch (error: any) {
            console.error('Failed to add note', error);
            toast.error(error?.response?.data?.error || 'Failed to add note');
        } finally {
            setSubmittingNote(false);
        }
    };

    const handleUpdateMembers = async (selectedIds: string[]) => {
        setUpdatingSelection(true);
        try {
            const { data } = await api.put(`/api/projects/${id}/members`, { memberIds: selectedIds });
            setProject(data.project);
            toast.success('Members updated');
            setShowMembersModal(false);
        } catch (error) {
            toast.error('Failed to update members');
        } finally {
            setUpdatingSelection(false);
        }
    };

    const handleUpdateClients = async (selectedIds: string[]) => {
        setUpdatingSelection(true);
        try {
            const { data } = await api.put(`/api/projects/${id}/clients`, { clientIds: selectedIds });
            setProject(data.project);
            toast.success('Clients updated');
            setShowClientsModal(false);
        } catch (error) {
            toast.error('Failed to update clients');
        } finally {
            setUpdatingSelection(false);
        }
    };

    const handleUpdateCustomStatus = async () => {
        if (!project || !customStatusValue.trim() || customStatusValue === project.customTaskStatusName) {
            setEditingCustomStatus(false);
            return;
        }
        try {
            const { data } = await api.put(`/api/projects/${id}`, { customTaskStatusName: customStatusValue.trim() });
            setProject(data.project);
            toast.success('Custom status updated');
        } catch (error) {
            toast.error('Failed to update custom status');
            setCustomStatusValue(project.customTaskStatusName || 'Custom');
        } finally {
            setEditingCustomStatus(false);
        }
    };

    const handleGenerateAI = async () => {
        setShowAI(true);
        if (aiInsight) return; // already loaded
        setLoadingAI(true);
        try {
            const { data } = await api.get(`/api/ai/projects/${id}/insights`);
            setAiInsight(data.insight);
        } catch (error) {
            setAiInsight("Failed to generate AI insights.");
        } finally {
            setLoadingAI(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggingTaskId(taskId);
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId') || draggingTaskId;
        if (!taskId) return;

        const taskToMove = tasks.find(t => t.id === taskId);
        if (!taskToMove || taskToMove.status === newStatus) return;

        // Optimistic Update
        const oldTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            await api.put(`/api/tasks/${taskId}`, { status: newStatus });
            toast.success(`Task moved to ${newStatus.replace('_', ' ')}`);
        } catch (error) {
            setTasks(oldTasks);
            toast.error('Failed to update task status');
        } finally {
            setDraggingTaskId(null);
        }
    };

    const handleDeleteMilestone = (mId: string) => {
        setConfirmModal({
            isOpen: true,
            type: 'milestone',
            id: mId,
            title: 'Delete Milestone',
            message: 'Are you sure you want to delete this milestone? This action cannot be undone.'
        });
    };

    const confirmDeleteMilestone = async (mId: string) => {
        try {
            await api.delete(`/api/milestones/${mId}`);
            setMilestones(prev => prev.filter(m => m.id !== mId));
            toast.success('Milestone deleted');
        } catch (error) {
            toast.error('Failed to delete milestone');
        } finally {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    };

    const handleDeleteNoteClick = (noteId: string) => {
        setConfirmModal({
            isOpen: true,
            type: 'note',
            id: noteId,
            title: 'Delete Note',
            message: 'Are you sure you want to delete this note?'
        });
    };

    const confirmDeleteNote = async (noteId: string) => {
        try {
            await api.delete(`/api/projects/${id}/notes/${noteId}`);
            setNotes(prev => prev.filter(n => n.id !== noteId));
            toast.success('Note deleted');
        } catch (error) {
            toast.error('Failed to delete note');
        } finally {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    };

    const handleDeleteModule = (mId: string) => {
        setConfirmModal({
            isOpen: true,
            type: 'module',
            id: mId,
            title: 'Delete Module',
            message: 'Choose how to handle tasks within this module:',
        });
    };

    const confirmDeleteModule = async (mId: string, mode: 'wipe' | 'move') => {
        try {
            await api.delete(`/api/modules/${mId}`, { params: { mode } });
            setModules(prev => prev.filter(m => m.id !== mId));
            
            // If wipe, also remove frontend tasks. If move, they become "General" (moduleId: null)
            if (mode === 'wipe') {
                setTasks(prev => prev.filter(t => t.moduleId !== mId));
            } else {
                setTasks(prev => prev.map(t => t.moduleId === mId ? { ...t, moduleId: null } : t));
            }
            
            toast.success('Module deleted');
        } catch (error) {
            toast.error('Failed to delete module');
        } finally {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    };

    const handleUpdateNote = async (noteId: string) => {
        if (!editNoteContent.trim()) return;
        setSavingNoteId(noteId);
        try {
            const { data } = await api.put(`/api/projects/${id}/notes/${noteId}`, { content: editNoteContent });
            setNotes(prev => prev.map(n => n.id === noteId ? data.note : n));
            setEditingNoteId(null);
            toast.success('Note updated');
        } catch (error) {
            toast.error('Failed to update note');
        } finally {
            setSavingNoteId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="text-center py-32">
                <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Project not found</p>
                <button onClick={() => router.back()} className="btn-secondary mt-4">Go Back</button>
            </div>
        );
    }

    const visibleTasks = tasks.filter(t => {
        const belongsToProject = t.projectId === id || t.projectId?.id === id;
        if (!belongsToProject) return false;

        if (selectedModuleFilter === 'all') return true;
        if (selectedModuleFilter === 'general') return !t.moduleId;
        
        const moduleId = typeof t.moduleId === 'string' ? t.moduleId : t.moduleId?.id;
        return moduleId === selectedModuleFilter;
    });
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const progressCalc = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : project.progress || 0;

    const userId = user?.id || user?.id;
    const filteredVisibleTasks = isPrivileged ? visibleTasks : visibleTasks.filter(t => 
        (t.assigneeId?.id || t.assigneeId) === userId
    );

    const tasksByStatus = ['todo', 'in_progress', 'in_review', 'done', 'backlog', 'custom'].reduce<Record<string, any[]>>((acc, s) => {
        acc[s] = visibleTasks.filter(t => t.status === s);
        return acc;
    }, {});

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
                <Link href="/dashboard/projects" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Projects
                </Link>
                <span>/</span>
                <span className="text-gray-700 font-medium truncate">{project.name}</span>
            </div>

            {/* Header */}
            <div className="card p-6 mb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <FolderKanban className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                                <span className={clsx('badge', STATUS_COLORS[project.status] || 'badge-gray')}>
                                    {project.status?.replace('_', ' ')}
                                </span>
                                <span className={clsx('badge', PRIORITY_COLORS[project.priority] || 'badge-gray')}>
                                    {project.priority}
                                </span>
                            </div>
                            <p className="text-gray-500 text-sm mt-1">{project.description}</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        <button
                            onClick={handleGenerateAI}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" /> AI Insights
                        </button>
                        <button 
                            onClick={() => setShowLogWork(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Clock className="w-4 h-4" /> Log Work
                        </button>
                        {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'))) && (
                            <button 
                                onClick={() => setShowEditProject(true)}
                                className="btn-primary"
                            >
                                <Edit2 className="w-4 h-4" />Edit
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress */}
                <div className="mt-5">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500 font-medium">Overall Progress</span>
                        <span className="font-bold text-gray-900">{progressCalc}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${progressCalc}%` } as React.CSSProperties}
                        />
                    </div>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-5 mt-5 text-sm text-gray-500">
                    {project.startDate && (
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            Start: {format(new Date(project.startDate), 'MMM d, yyyy')}
                        </div>
                    )}
                    {project.deadline && (
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-gray-400" />
                            Deadline: {format(new Date(project.deadline), 'MMM d, yyyy')}
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-gray-400" />
                        {isPrivileged ? (
                            <>{doneTasks}/{tasks.length} tasks done</>
                        ) : (
                            <>{visibleTasks.filter(t => t.status === 'done').length}/{visibleTasks.length} your tasks done</>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        {files.length} file{files.length !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Layout className="w-4 h-4 text-gray-400" />
                        {project.totalModules || modules.length} module{project.totalModules !== 1 && modules.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-max overflow-x-auto">
                {(['overview', 'modules', 'tasks', 'work-logs', 'milestones', 'files', 'notes', 'team', 'clients', 'timelogs'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => handleTabChange(t)}
                        className={clsx(
                            'px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 capitalize whitespace-nowrap',
                            activeTab === t 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        )}
                    >
                        {t === 'timelogs' ? 'Activity Log' : t === 'work-logs' ? 'Work Logs' : t}
                        {t === 'tasks' && <span className="ml-1.5 text-xs text-gray-400">{visibleTasks.length}</span>}
                        {t === 'work-logs' && <span className="ml-1.5 text-xs text-gray-400">{workLogs.length}</span>}
                        {t === 'milestones' && <span className="ml-1.5 text-xs text-gray-400">{milestones.length}</span>}
                        {t === 'files' && <span className="ml-1.5 text-xs text-gray-400">{files.length}</span>}
                        {t === 'notes' && <span className="ml-1.5 text-xs text-gray-400">{notes.length}</span>}
                        {t === 'team' && <span className="ml-1.5 text-xs text-gray-400">{project.members?.length || 0}</span>}
                        {t === 'clients' && <span className="ml-1.5 text-xs text-gray-400">{project.clientIds?.length || 0}</span>}
                        {t === 'timelogs' && <span className="ml-1.5 text-xs text-gray-400">{projectLogs.length}</span>}
                    </button>
                ))}
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Stats */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Financial Summary */}
                        {isPrivileged && (
                            <div className="card p-5">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
                                    <span>Financial Summary</span>
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">Total Budget</p>
                                        <p className="text-xl font-bold text-gray-900">₹{project.budget?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                                        <p className="text-xs text-green-600 mb-1">Total Invoiced</p>
                                        <p className="text-xl font-bold text-green-700">₹{invoices.reduce((s, i) => s + (i.totalAmount || 0), 0).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                        <p className="text-xs text-amber-600 mb-1">Pending Milestones</p>
                                        <p className="text-xl font-bold text-amber-700">₹{milestones.filter(m => !m.completed).reduce((s, m) => s + (m.invoiceAmount || 0), 0).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                                        <p className="text-xs text-red-600 mb-1">Total Expenses</p>
                                        <p className="text-xl font-bold text-red-700">₹{projectExpenses.filter(e => e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Task Breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(TASK_STATUS_CONFIG).map(([status, cfg]) => {
                                const Icon = cfg.icon;
                                const count = tasksByStatus[status]?.length || 0;
                                return (
                                    <div key={status} className={clsx('rounded-xl border p-3 text-center', cfg.cls)}>
                                        <Icon className="w-5 h-5 mx-auto mb-1 opacity-60" />
                                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{cfg.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent tasks & Overdue tasks */}
                    <div className="space-y-4">
                        {visibleTasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length > 0 && (
                            <div className="card p-5 border-rose-100 bg-rose-50/30">
                                <h3 className="font-semibold text-rose-900 mb-3 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-rose-500" />
                                    Overdue Tasks
                                </h3>
                                <div className="space-y-2">
                                    {visibleTasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).slice(0, 5).map((task) => {
                                        return (
                                            <div key={task.id} onClick={() => setSelectedTaskId(task.id)} className="flex items-center gap-3 py-2 border-b border-rose-100 last:border-0 cursor-pointer hover:bg-rose-50/50 rounded-lg px-2 transition-colors">
                                                <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-rose-900 truncate">{task.title}</p>
                                                    <p className="text-xs text-rose-600/70 truncate">Due: {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}</p>
                                                </div>
                                                <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-md">View / Reassign</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {visibleTasks.slice(0, 5).length > 0 && (
                            <div className="card p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-900">Recent Tasks</h3>
                                    <button onClick={() => setActiveTab('tasks')} className="text-xs text-indigo-600 hover:underline">View all</button>
                                </div>
                                <div className="space-y-2">
                                    {visibleTasks.slice(0, 5).map((task) => {
                                        const cfg = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.todo;
                                        const Icon = cfg.icon;
                                        return (
                                            <div key={task.id} onClick={() => setSelectedTaskId(task.id)} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors">
                                                <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                                    <p className="text-sm text-gray-700 truncate">{task.title}</p>
                                                    {task.moduleId && (
                                                        <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-[9px] font-bold text-blue-600 border border-blue-100/50 flex-shrink-0">
                                                            <Layout className="w-2.5 h-2.5" />
                                                            {modules.find(m => m.id === (typeof task.moduleId === 'string' ? task.moduleId : task.moduleId.id))?.name || 'In Module'}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={clsx('badge', PRIORITY_COLORS[task.priority] || 'badge-gray')}>{task.priority}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Sidebar: CRM Link + Members + Tags */}
                    <div className="space-y-4">
                        <div className="card p-5">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-indigo-500" />
                                Project Details
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Project Type</span>
                                    <span className="font-medium text-gray-900 capitalize">{project.projectType || 'Internal'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Visibility</span>
                                    <span className="font-medium text-gray-900 capitalize">{project.visibility || 'Public'}</span>
                                </div>
                            </div>
                        </div>


                        {project.tags?.length > 0 && (
                            <div className="card p-5">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-indigo-500" />
                                    Tags
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {project.tags.map((tag: string) => (
                                        <span key={tag} className="badge badge-blue">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Modules */}
            {activeTab === 'modules' && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-sm text-gray-500">{modules.length} modules active</p>
                        {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'))) && (
                            <button className="btn-primary" onClick={() => setShowAddModule(true)}>
                                <Plus className="w-4 h-4" /> Add Module
                            </button>
                        )}
                    </div>

                    {modules.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                            <FolderKanban className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900">No modules created yet</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mt-2 mb-6">
                                Divide this project into manageable parts (e.g. Frontend, Backend, UI Review) 
                                and assign owners to each.
                            </p>
                            {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'))) && (
                                <button className="btn-primary" onClick={() => setShowAddModule(true)}>
                                    <Plus className="w-4 h-4" /> Create First Module
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {modules.map((mod) => (
                                <div key={mod.id} className="card p-4 flex flex-col group relative overflow-hidden">
                                     {/* Background Decor */}
                                    <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-blue-50/50 rounded-full blur-2xl group-hover:bg-blue-100/50 transition-colors" />

                                    <div className="flex items-start justify-between relative">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm border border-blue-100/50">
                                                {mod.name[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{mod.name}</h3>
                                                <div className="flex flex-col gap-1 mt-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Owner:</span>
                                                        <span className="text-xs font-semibold text-gray-700">{mod.ownerId?.name || 'Unassigned'}</span>
                                                    </div>
                                                    {mod.ownerId?.role && ROLE_CONFIG[mod.ownerId.role] && (
                                                        <span className={clsx('inline-flex items-center w-fit text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest border', ROLE_CONFIG[mod.ownerId.role].cls)}>
                                                            {ROLE_CONFIG[mod.ownerId.role].label}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'))) && (
                                                <button 
                                                    onClick={() => handleDeleteModule(mod.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-500 mt-4 line-clamp-2 min-h-[40px] leading-relaxed">
                                        {mod.description || 'No description provided for this module.'}
                                    </p>

                                    <div className="mt-auto pt-6">
                                        <div className="flex items-center justify-between text-xs mb-2">
                                            <div className="flex items-center gap-2">
                                                <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="font-bold text-gray-900">{mod.taskStats?.completed || 0} / {mod.taskStats?.total || 0}</span>
                                                <span className="text-gray-400">Tasks</span>
                                            </div>
                                            <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                                                {mod.calculatedProgress || 0}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                                style={{ width: `${mod.calculatedProgress || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 space-y-2">
                                        {visibleTasks.filter(t => t.moduleId === mod.id || t.moduleId?.id === mod.id).slice(0, 3).map(task => (
                                            <div key={task.id} onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }} className="flex items-center gap-2 py-1.5 px-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-gray-100">
                                                <CheckSquare className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                <p className="text-xs font-medium text-gray-700 truncate flex-1">{task.title}</p>
                                                <span className={clsx('text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0', STATUS_COLORS[task.status] || 'bg-gray-200 text-gray-600')}>
                                                    {task.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        ))}
                                        {visibleTasks.filter(t => t.moduleId === mod.id || t.moduleId?.id === mod.id).length > 3 && (
                                            <p className="text-[10px] text-center text-gray-400 font-bold mt-1">
                                                + {visibleTasks.filter(t => t.moduleId === mod.id || t.moduleId?.id === mod.id).length - 3} more tasks
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                        {canManageTasks(mod.id) && (
                                            <button
                                                onClick={() => {
                                                    setSelectedModuleFilter(mod.id);
                                                    setShowAddTask(true);
                                                }}
                                                className="flex-1 py-2 text-xs font-bold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-gray-100 hover:border-indigo-100 transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add Task
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSelectedModuleFilter(mod.id);
                                                setActiveTab('tasks');
                                            }}
                                            className="flex-1 py-2 text-xs font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-gray-100 hover:border-blue-100 transition-all flex items-center justify-center gap-1.5"
                                        >
                                            View All <Eye className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Tasks */}
            {activeTab === 'tasks' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <p className="text-sm text-gray-500">{visibleTasks.length} tasks total</p>
                            {modules.length > 0 && (
                                <div className="h-4 w-px bg-gray-200" />
                            )}
                            {modules.length > 0 && (
                                <>
                                    <div className="h-4 w-px bg-gray-200" />
                                    <select 
                                        className="text-xs font-bold text-gray-500 bg-gray-50 border-none rounded-lg focus:ring-0 cursor-pointer hover:bg-gray-100 transition-colors"
                                        value={selectedModuleFilter}
                                        onChange={(e) => setSelectedModuleFilter(e.target.value)}
                                    >
                                        <option value="all">All Modules</option>
                                        <option value="general">General Tasks</option>
                                        {modules.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {canManageTasks(selectedModuleFilter === 'all' || selectedModuleFilter === 'general' ? undefined : selectedModuleFilter) && (
                                <button 
                                    onClick={() => setShowAddTask(true)}
                                    className="btn-primary"
                                >
                                    <Plus className="w-4 h-4" />Add Task
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        {Object.entries(TASK_STATUS_CONFIG).map(([status, cfg]) => {
                            const Icon = cfg.icon;
                            let displayLabel = cfg.label;
                            if (status === 'custom' && project?.customTaskStatusName) {
                                displayLabel = project.customTaskStatusName;
                            }
                            return (
                                <div 
                                    key={status} 
                                    className="card overflow-hidden"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, status)}
                                >
                                    <div className={clsx('px-4 py-3 border-b flex items-center gap-2', cfg.cls)}>
                                        <Icon className="w-4 h-4 opacity-70" />
                                        {status === 'custom' && editingCustomStatus ? (
                                            <input 
                                                autoFocus
                                                type="text" 
                                                className="text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded px-1 w-24 outline-none focus:ring-1 focus:ring-indigo-500"
                                                value={customStatusValue}
                                                onChange={e => setCustomStatusValue(e.target.value)}
                                                onBlur={handleUpdateCustomStatus}
                                                onKeyDown={e => e.key === 'Enter' && handleUpdateCustomStatus()}
                                            />
                                        ) : (
                                            <span className="text-sm font-semibold text-gray-700">{displayLabel}</span>
                                        )}
                                        {status === 'custom' && !editingCustomStatus && (
                                            <button onClick={() => { setCustomStatusValue(displayLabel); setEditingCustomStatus(true); }} className="ml-1 text-gray-400 hover:text-indigo-600 transition-colors">
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                        )}
                                        <span className="ml-auto text-xs text-gray-400 bg-white/60 px-1.5 py-0.5 rounded-full">{tasksByStatus[status]?.length || 0}</span>
                                    </div>
                                    <div className="p-2 space-y-1.5 min-h-[120px]">
                                        {tasksByStatus[status]?.map((task) => (
                                            <div 
                                                key={task.id} 
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task.id)}
                                                onClick={() => setSelectedTaskId(task.id)}
                                                className={clsx(
                                                    "bg-gray-50 hover:bg-indigo-50 rounded-lg px-3 py-2.5 cursor-pointer transition-all group border border-transparent hover:border-indigo-200 shadow-sm hover:shadow",
                                                    draggingTaskId === task.id && "opacity-40 scale-95"
                                                )}
                                            >
                                                <p className="text-sm text-gray-800 font-medium group-hover:text-indigo-700 transition-colors">{task.title}</p>
                                                <div className="flex items-center justify-between mt-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={clsx('badge text-[10px]', PRIORITY_COLORS[task.priority] || 'badge-gray')}>{task.priority}</span>
                                                        {task.moduleId && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-[9px] font-bold text-blue-600 border border-blue-100/50">
                                                                <Layout className="w-2.5 h-2.5" />
                                                                {modules.find(m => m.id === (typeof task.moduleId === 'string' ? task.moduleId : task.moduleId.id))?.name || 'In Module'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {task.assignee && (
                                                        <div className={clsx(
                                                            "w-5 h-5 rounded-full flex items-center justify-center relative shadow-sm ring-1 ring-white",
                                                            task.assignee.role && ROLE_CONFIG[task.assignee.role] ? ROLE_CONFIG[task.assignee.role].bg : "bg-gray-400"
                                                        )}>
                                                            {task.assignee.profilePicture || task.assignee.photoUrl ? (
                                                                <img src={task.assignee.profilePicture || task.assignee.photoUrl} alt={task.assignee.name} className="w-5 h-5 rounded-full object-cover" />
                                                            ) : (
                                                                <span className="text-white text-[9px] font-bold">{task.assignee?.name?.[0]?.toUpperCase()}</span>
                                                            )}
                                                            {/* Tiny Role Dot */}
                                                            <div className={clsx(
                                                                "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white shadow-xs",
                                                                task.assignee.role && ROLE_CONFIG[task.assignee.role] ? ROLE_CONFIG[task.assignee.role].bg : "bg-gray-400"
                                                            )} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {canManageTasks(selectedModuleFilter === 'all' || selectedModuleFilter === 'general' ? undefined : selectedModuleFilter) && (
                                            <button 
                                                onClick={() => setShowAddTask(true)}
                                                className="w-full text-xs text-gray-400 hover:text-indigo-500 py-3 flex items-center justify-center gap-1 transition-colors border-2 border-dashed border-transparent hover:border-indigo-200 rounded-lg"
                                            >
                                                <Plus className="w-3 h-3" /> Add Task
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tab: Files */}
            {activeTab === 'files' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-500">{files.length} file{files.length !== 1 ? 's' : ''} attached</p>
                        {canManageTasks() && (
                            <button className="btn-primary" onClick={() => setShowUpload(true)}>
                                <Plus className="w-4 h-4" />Upload File
                            </button>
                        )}
                    </div>
                    {files.length === 0 ? (
                        <div
                            className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                            onClick={() => setShowUpload(true)}
                        >
                            <Paperclip className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No files yet</p>
                            <p className="text-gray-300 text-sm mt-1">Click to upload project documents</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {files.map((file) => (
                                <FileCard key={file.id} file={file} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Notes */}
            {activeTab === 'notes' && (
                <div className="max-w-3xl">
                    <form onSubmit={handleAddNote} className="mb-8">
                        <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                            Add a Project Note or Update
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <textarea
                                id="note"
                                rows={3}
                                className="input block w-full resize-none"
                                placeholder="Write something..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                disabled={submittingNote}
                            />
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={!newNote.trim() || submittingNote}
                            >
                                {submittingNote ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Post Note'}
                            </button>
                        </div>
                    </form>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium tracking-tight text-gray-900 border-b pb-2">Recent Notes</h3>
                        {notes.length === 0 ? (
                            <p className="text-gray-500 italic py-4">No notes have been added to this project yet.</p>
                        ) : (
                            notes.map((note) => (
                                <div key={note.id} className="bg-white p-4 rounded-xl border shadow-sm group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                {note.createdBy?.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <span className="font-medium text-sm text-gray-900">{note.createdBy?.name}</span>
                                            <span className="text-xs text-gray-500 capitalize px-2 py-0.5 bg-gray-100 rounded-full">{note.createdBy?.role}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-400">{format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                            {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team')) || user?.id === note.createdBy?.id || user?.id === note.createdBy?.id) && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => { setEditingNoteId(note.id); setEditNoteContent(note.content); }}
                                                        className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
                                                        title="Edit Note"
                                                        aria-label="Edit Note"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNoteClick(note.id)}
                                                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                        title="Delete Note"
                                                        aria-label="Delete Note"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {editingNoteId === note.id ? (
                                        <div className="mt-3">
                                            <textarea
                                                className="input block w-full resize-y text-sm mb-2"
                                                rows={3}
                                                value={editNoteContent}
                                                onChange={(e) => setEditNoteContent(e.target.value)}
                                                title="Edit note content"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingNoteId(null)} className="btn-secondary text-xs px-3 py-1.5" disabled={savingNoteId === note.id}>Cancel</button>
                                                <button onClick={() => handleUpdateNote(note.id)} className="btn-primary text-xs px-3 py-1.5" disabled={savingNoteId === note.id}>
                                                    {savingNoteId === note.id ? <LogoLoader className="w-3.5 h-3.5 animate-spin"/> : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.content}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Milestones */}
            {activeTab === 'milestones' && (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-sm text-gray-500">{milestones.length} milestones</p>
                        {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'))) && (
                            <button className="btn-primary" onClick={() => setShowMilestoneForm(true)}>
                                <Plus className="w-4 h-4" /> Add Milestone
                            </button>
                        )}
                    </div>
                    {milestones.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                            <CheckCircle2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No milestones defined</p>
                            <p className="text-gray-300 text-sm mt-1">Break this project down into major phases</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-4xl relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                            {milestones.map((m, idx) => (
                                <div key={m.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    {/* Timeline dot */}
                                    <div className={clsx(
                                        "flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 transition-colors",
                                        m.completed ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                                    )}>
                                        {m.completed ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-bold">{idx + 1}</span>}
                                    </div>

                                    {/* Card */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] card p-5 hover:shadow-md hover:border-indigo-100 transition-all group-odd:ml-auto relative group/card">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className={clsx("font-bold text-lg", m.completed ? "text-gray-400 line-through" : "text-gray-900")}>{m.title}</h4>
                                                <div className="flex items-center gap-2">
                                                    {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'))) && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setSelectedMilestone(m); }}
                                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                title="Edit Milestone"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteMilestone(m.id); }}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete Milestone"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <div className="w-px h-4 bg-gray-100 mx-1" />
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const { data } = await api.patch(`/api/milestones/${m.id}/toggle`);
                                                                setMilestones(prev => prev.map(old => old.id === m.id ? data.milestone : old));
                                                                if (data.milestone.invoiceId) {
                                                                    const { data: iData } = await api.get('/api/invoices', { params: { projectId: id } });
                                                                    setInvoices(iData.invoices);
                                                                    toast.success('Milestone completed and invoice generated!');
                                                                } else {
                                                                    toast.success(m.completed ? 'Milestone marked as pending' : 'Milestone completed!');
                                                                }
                                                            } catch (e) {
                                                                toast.error('Failed to update milestone');
                                                            }
                                                        }}
                                                        className={clsx(
                                                            "px-3 py-1 text-xs rounded-full font-semibold border transition-colors",
                                                            m.completed ? "border-green-200 text-green-600 bg-green-50 hover:bg-green-100" : "border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"
                                                        )}
                                                    >
                                                        {m.completed ? 'Completed' : 'Mark Done'}
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-gray-500 text-sm mb-4">{m.description}</p>
                                            <div className="flex items-center gap-4 text-xs font-semibold">
                                                <span className={clsx("flex items-center gap-1", m.completed ? "text-gray-400" :
                                                    (m.dueDate && new Date(m.dueDate) < new Date() ? "text-red-500" : "text-indigo-600"))}>
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {m.dueDate ? format(new Date(m.dueDate), 'MMM d, yyyy') : 'No due date'}
                                                </span>
                                                {isPrivileged && m.autoInvoice && (
                                                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                        <Sparkles className="w-3 h-3" />
                                                        Auto-Invoice: ₹{m.invoiceAmount?.toLocaleString()}
                                                    </span>
                                                )}
                                                {isPrivileged && m.invoiceId && (
                                                    <Link href="/dashboard/invoices" className="flex items-center gap-1 text-green-600 hover:underline">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Invoiced
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {showUpload && (
                <FileUploadModal
                    relatedId={id}
                    relatedModel="Project"
                    onClose={() => setShowUpload(false)}
                    onSuccess={onFileUploaded}
                />
            )}

            {showAI && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-200" />
                                Project Risk Analysis
                            </h2>
                            <button onClick={() => setShowAI(false)} className="text-white/80 hover:text-white transition-colors text-xl leading-none">
                                ✕
                            </button>
                        </div>
                        <div className="p-6 bg-gray-50 min-h-[200px]">
                            {loadingAI ? (
                                <div className="flex flex-col items-center justify-center py-10">
                                    <LogoLoader className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                                    <p className="text-indigo-900 font-medium">Analyzing project data with Gemini AI...</p>
                                    <p className="text-sm text-gray-500 mt-1">This may take a few seconds.</p>
                                </div>
                            ) : (
                                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm border-l-4 border-indigo-400 pl-4 bg-white p-4 rounded-r-xl shadow-sm">
                                    {aiInsight}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
                            <button onClick={() => setShowAI(false)} className="btn-secondary">
                                Close Analysis
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {(showMilestoneForm || selectedMilestone) && (
                <MilestoneModal
                    projectId={id}
                    milestone={selectedMilestone}
                    onClose={() => {
                        setShowMilestoneForm(false);
                        setSelectedMilestone(null);
                    }}
                    onSuccess={(m: any) => {
                        if (selectedMilestone) {
                            setMilestones(prev => 
                                prev.map(old => old.id === m.id ? m : old)
                                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                            );
                            toast.success('Milestone updated');
                        } else {
                            setMilestones(prev => 
                                [...prev, m].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                            );
                            toast.success('Milestone added');
                        }
                    }}
                />
            )}

            <UserSelectionModal
                isOpen={showMembersModal}
                onClose={() => setShowMembersModal(false)}
                title="Manage Project Members"
                type="employee"
                currentIds={project.memberIds || []}
                onSelect={handleUpdateMembers}
            />

            <UserSelectionModal
                isOpen={showClientsModal}
                onClose={() => setShowClientsModal(false)}
                title="Manage Project Clients"
                type="client"
                currentIds={project.clientIds || []}
                onSelect={handleUpdateClients}
            />

            {/* Tab: Team */}
            {activeTab === 'team' && (
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-500" /> Project Team
                            </h3>
                            <p className="text-sm text-gray-500">Manage members and their roles in this project</p>
                        </div>
                        {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'))) && (
                            <button onClick={() => setShowMembersModal(true)} className="btn-primary flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Add Members
                            </button>
                        )}
                    </div>

                    {!project.members || project.members.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No team members added</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {project.members.map((m: any) => (
                                <div key={m.id || m._id} className="bg-white border rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                        {m.photoUrl
                                            ? <img src={m.photoUrl} className="w-full h-full rounded-full object-cover" alt="" />
                                            : <span className="text-white font-bold">{m.name?.[0]?.toUpperCase()}</span>
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{m.name}</p>
                                        <p className="text-xs text-gray-500 truncate mb-1">{m.email}</p>
                                        {m.role && ROLE_CONFIG[m.role] ? (
                                            <span className={clsx('inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border', ROLE_CONFIG[m.role].cls)}>
                                                {ROLE_CONFIG[m.role].label}
                                            </span>
                                        ) : (
                                            <p className="text-xs text-gray-400 truncate capitalize">{m.role}</p>
                                        )}
                                    </div>
                                    {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'))) && (
                                        <button 
                                            onClick={() => handleUpdateMembers(project.memberIds.filter((id: any) => (id.id || id) !== (m.id || m._id)).map((id: any) => id.id || id))}
                                            className="w-8 h-8 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors"
                                            title="Remove Member"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Clients */}
            {activeTab === 'clients' && (
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-amber-500" /> Project Clients
                            </h3>
                            <p className="text-sm text-gray-500">Manage clients associated with this project</p>
                        </div>
                        {isPrivileged && (
                            <button onClick={() => setShowClientsModal(true)} className="btn-primary flex items-center gap-2 bg-amber-600 hover:bg-amber-700 border-amber-600">
                                <Plus className="w-4 h-4" /> Add Clients
                            </button>
                        )}
                    </div>

                    {!project.clientIds || project.clientIds.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No clients added</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {project.clientIds.map((c: any, idx: number) => (
                                <div key={c.id || c._id || (typeof c === 'string' ? c : idx)} className="bg-white border border-amber-100 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                                        <Building2 className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                                        <p className="text-xs text-gray-500 truncate mb-1">{c.email}</p>
                                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                                            <Briefcase className="w-3 h-3" /> {c.company || 'Individual'}
                                        </p>
                                    </div>
                                    {isPrivileged && (
                                        <button 
                                            onClick={() => handleUpdateClients(project.clientIds.filter((id: any) => (id.id || id) !== (c.id || c._id)).map((id: any) => id.id || id))}
                                            className="w-8 h-8 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors"
                                            title="Remove Client"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'timelogs' && (
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-500" /> Project Activity Log
                            </h3>
                            <p className="text-sm text-gray-500">All actions, updates, and time tracked across this project</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Activities</p>
                            <p className="text-2xl font-black text-indigo-600">
                                {projectLogs.length}
                            </p>
                        </div>
                    </div>

                    {projectLogs.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No activity recorded yet</p>
                            <p className="text-xs text-gray-400 mt-1">Activity logs will appear here as tasks and modules are created and updated</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {projectLogs.map((activity: any, idx: number) => {
                                const actionColorMap: Record<string, string> = {
                                    'CREATE_PROJECT': 'bg-green-100 text-green-700',
                                    'UPDATE_PROJECT': 'bg-blue-100 text-blue-700',
                                    'DELETE_PROJECT': 'bg-red-100 text-red-700',
                                    'CREATE_TASK': 'bg-emerald-100 text-emerald-700',
                                    'UPDATE_TASK': 'bg-sky-100 text-sky-700',
                                    'DELETE_TASK': 'bg-red-100 text-red-700',
                                    'CREATE_MODULE': 'bg-purple-100 text-purple-700',
                                    'UPDATE_MODULE': 'bg-violet-100 text-violet-700',
                                    'DELETE_MODULE': 'bg-red-100 text-red-700',
                                    'CREATE_NOTE': 'bg-amber-100 text-amber-700',
                                    'UPDATE_NOTE': 'bg-amber-100 text-amber-700',
                                    'DELETE_NOTE': 'bg-red-100 text-red-700',
                                    'TIME_LOG': 'bg-indigo-100 text-indigo-700',
                                };
                                const badgeColor = actionColorMap[activity.action] || 'bg-gray-100 text-gray-600';
                                const isTimelog = activity.type === 'timelog';

                                return (
                                    <div key={activity.id} className="flex gap-4 py-3 px-4 rounded-xl hover:bg-gray-50/80 transition-colors group">
                                        {/* Timeline line */}
                                        <div className="flex flex-col items-center">
                                            <div className="w-9 h-9 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-indigo-300 transition-colors">
                                                {activity.user?.photoUrl ? (
                                                    <img src={activity.user.photoUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-bold text-gray-500">{activity.user?.name?.[0]?.toUpperCase() || '?'}</span>
                                                )}
                                            </div>
                                            {idx < projectLogs.length - 1 && (
                                                <div className="w-px flex-1 bg-gray-100 mt-1" />
                                            )}
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 min-w-0 pb-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-sm text-gray-900">{activity.user?.name || 'System'}</span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeColor}`}>
                                                    {activity.actionLabel}
                                                </span>
                                                {activity.resourceName && (
                                                    <span className="text-sm text-gray-600 font-medium truncate max-w-[300px]">
                                                        &quot;{activity.resourceName}&quot;
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Details row */}
                                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                <span className="text-xs text-gray-400">
                                                    {format(new Date(activity.timestamp), 'MMM d, yyyy · h:mm a')}
                                                </span>
                                                {activity.resourceType && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium uppercase">
                                                        {activity.resourceType}
                                                    </span>
                                                )}
                                                {isTimelog && activity.details?.hours && (
                                                    <span className="text-xs font-bold text-indigo-600">
                                                        ⏱ {activity.details.hours}h logged
                                                    </span>
                                                )}
                                                {activity.details?.assignee && (
                                                    <span className="text-xs text-gray-500">
                                                        → Assigned to {activity.details.assignee}
                                                    </span>
                                                )}
                                                {activity.details?.status && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 font-medium">
                                                        Status: {activity.details.status}
                                                    </span>
                                                )}
                                                {activity.details?.priority && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 font-medium">
                                                        Priority: {activity.details.priority}
                                                    </span>
                                                )}
                                                {activity.details?.changes && Array.isArray(activity.details.changes) && (
                                                    <span className="text-xs text-gray-400">
                                                        Changed: {activity.details.changes.join(', ')}
                                                    </span>
                                                )}
                                            </div>

                                            {activity.details?.description && isTimelog && (
                                                <p className="text-xs text-gray-500 mt-1 italic">&quot;{activity.details.description}&quot;</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'work-logs' && (
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-indigo-500" /> Enterprise Work Logs
                            </h3>
                            <p className="text-sm text-gray-500">Official work submissions and progress tracking</p>
                        </div>
                        <button 
                            onClick={() => setShowLogWork(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Log New Work
                        </button>
                    </div>

                    {workLogs.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No official work logs yet</p>
                            <p className="text-xs text-gray-400 mt-1">Submit your work for review and task automation</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {workLogs.map((log: any) => (
                                <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold overflow-hidden shadow-inner font-mono">
                                            {log.userId?.photoUrl ? (
                                                <img src={log.userId.photoUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                log.userId?.name?.[0] || 'U'
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-bold text-gray-900">{log.userId?.name}</p>
                                                <span className={clsx(
                                                    "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                                                    log.status === 'approved' ? "bg-green-100 text-green-700" :
                                                    log.status === 'rejected' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                                                )}>
                                                    {log.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-2 font-medium">
                                                {format(new Date(log.workDate), 'PPP')} · {log.hoursSpent} Hours
                                            </p>
                                            <p className="text-sm text-gray-700 leading-relaxed mb-3">{log.description}</p>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                {log.taskId && (
                                                    <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 text-[11px] text-gray-600 rounded-lg border border-gray-100">
                                                        <CheckSquare className="w-3.5 h-3.5" />
                                                        {log.taskId.title}
                                                    </span>
                                                )}
                                                {log.isWorkCompleted && (
                                                    <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-[11px] text-green-700 rounded-lg border border-green-100 font-bold">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Marked as Done
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end justify-between min-w-[120px]">
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Reviewer</p>
                                            <p className="text-xs font-semibold text-gray-600">{log.reviewerId?.name || 'Assigned Manager'}</p>
                                        </div>
                                        {log.proofLinks?.length > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {log.proofLinks.map((link: string, i: number) => (
                                                    <a key={i} href={link} target="_blank" rel="noreferrer" className="p-1.5 bg-gray-100 hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 rounded-lg transition-colors">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {showLogWork && (
                <LogWorkModal 
                    projectId={id}
                    onClose={() => setShowLogWork(false)}
                    onSuccess={(newLog) => {
                        setShowLogWork(false);
                        if (newLog) setWorkLogs(prev => [newLog, ...prev]);
                    }}
                />
            )}

            {showAddTask && (
                <CreateTaskModal
                    projectId={id}
                    initialModuleId={selectedModuleFilter === 'all' || selectedModuleFilter === 'general' ? undefined : selectedModuleFilter}
                onClose={() => setShowAddTask(false)}
                    onSuccess={(newTask) => {
                        setTasks(prev => [newTask, ...prev]);
                        toast.success('Task added successfully');
                    }}
                />
            )}

            {showEditProject && (
                <EditProjectModal
                    project={project}
                    onClose={() => setShowEditProject(false)}
                    onSuccess={(updatedProject) => {
                        setProject(updatedProject);
                        toast.success('Project updated successfully');
                    }}
                />
            )}

            {selectedTaskId && (
                <TaskDetailModal
                    taskId={selectedTaskId}
                    onClose={() => setSelectedTaskId(null)}
                    onUpdated={(updatedTask) => {
                        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
                    }}
                    onDeleted={(deletedId) => {
                        setTasks(prev => prev.filter(t => t.id !== deletedId));
                    }}
                />
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={() => {
                    if (confirmModal.type === 'milestone' && confirmModal.id) confirmDeleteMilestone(confirmModal.id);
                    if (confirmModal.type === 'note' && confirmModal.id) confirmDeleteNote(confirmModal.id);
                }}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                customActions={confirmModal.type === 'module' ? [
                    {
                        label: 'Delete All Tasks',
                        onClick: () => confirmDeleteModule(confirmModal.id!, 'wipe'),
                        className: 'bg-red-600 text-white hover:bg-red-700'
                    },
                    {
                        label: 'Move to General',
                        onClick: () => confirmDeleteModule(confirmModal.id!, 'move'),
                        className: 'bg-amber-500 text-white hover:bg-amber-600'
                    }
                ] : undefined}
            />

            {showAddModule && (
                <CreateModuleModal 
                    projectId={id}
                    onClose={() => setShowAddModule(false)}
                    onSuccess={(newMod) => {
                        setModules(prev => [...prev, { 
                            ...newMod, 
                            taskStats: { total: 0, completed: 0 },
                            calculatedProgress: 0 
                        }]);
                        toast.success('Module added');
                    }}
                />
            )}
        </div>
    );
}

function FileCard({ file }: { file: any }) {
    const ext = file.name?.split('.').pop()?.toUpperCase() || 'FILE';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext.toLowerCase());
    const isLink = file.isLinkOnly || file.storageType === 'external';

    return (
        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer"
            className="card p-4 hover:shadow-md transition-all flex items-center gap-3 cursor-pointer group"
        >
            <div className={clsx(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold',
                isImage ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500',
                isLink && 'bg-amber-50 text-amber-600'
            )}>
                {isImage && file.fileUrl
                    ? <img src={file.fileUrl} alt="" className="w-full h-full rounded-lg object-cover" />
                    : isLink ? <Globe className="w-5 h-5" /> : ext.slice(0, 4)
                }
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{file.name}</p>
                <div className="text-xs text-gray-400 mt-0.5 flex flex-col gap-0.5">
                    <span>
                        {file.fileSize > 0 ? `${(file.fileSize / 1024).toFixed(1)} KB` : isLink ? 'External Link' : ''}
                        {file.uploadedBy?.name && ` · Uploaded by ${file.uploadedBy.name}`}
                    </span>
                    {file.createdAt && (
                        <span>{format(new Date(file.createdAt), 'MMM dd, yyyy h:mm a')}</span>
                    )}
                </div>
            </div>
            {isLink && <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-amber-500 transition-colors" />}
        </a>
    );
}

function MilestoneModal({ projectId, milestone, onClose, onSuccess }: any) {
    const isEdit = !!milestone;
    const [form, setForm] = useState({
        title: milestone?.title || '',
        description: milestone?.description || '',
        dueDate: milestone?.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : '',
        order: milestone?.order || 1,
        autoInvoice: milestone?.autoInvoice || false,
        invoiceAmount: milestone?.invoiceAmount || 0,
        invoiceDescription: milestone?.invoiceDescription || ''
    });
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                const { data } = await api.put(`/api/milestones/${milestone.id}`, form);
                onSuccess(data.milestone);
            } else {
                const { data } = await api.post(`/api/milestones/project/${projectId}`, form);
                onSuccess(data.milestone);
            }
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(isEdit ? 'Failed to update milestone' : 'Failed to create milestone');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Milestone' : 'New Project Milestone'}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                        ✕
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div>
                        <label className="label">Milestone Title *</label>
                        <input required autoFocus value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input" placeholder="e.g., Phase 1 Completion" />
                    </div>
                    <div>
                        <label className="label">Description</label>
                        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input resize-none" rows={3} placeholder="What needs to be achieved?" />
                    </div>
                    <div>
                        <label htmlFor="milestone-due-date" className="label">Target Date *</label>
                        <input id="milestone-due-date" type="date" required value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="input" />
                    </div>

                    <div className="pt-2 border-t border-gray-50 mt-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                checked={form.autoInvoice}
                                onChange={e => setForm(p => ({ ...p, autoInvoice: e.target.checked }))}
                            />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    Enable Auto-Invoicing <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                </p>
                                <p className="text-xs text-gray-500">Generate a draft invoice when completed</p>
                            </div>
                        </label>
                    </div>

                    {form.autoInvoice && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="label">Invoice Amount (₹)</label>
                                <input
                                    type="number"
                                    required={form.autoInvoice}
                                    value={form.invoiceAmount}
                                    onChange={e => setForm(p => ({ ...p, invoiceAmount: Number(e.target.value) }))}
                                    className="input font-mono font-bold text-indigo-600"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="label">Invoice Description (Optional)</label>
                                <input
                                    value={form.invoiceDescription}
                                    onChange={e => setForm(p => ({ ...p, invoiceDescription: e.target.value }))}
                                    className="input"
                                    placeholder="e.g., First milestone payment"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : (isEdit ? 'Save Changes' : 'Create Milestone')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
