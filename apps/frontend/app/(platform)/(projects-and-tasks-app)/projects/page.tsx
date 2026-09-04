'use client';


import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { FolderKanban, Plus, Search, Eye, PlusCircle, Archive, Trash2, Edit, Calendar, User, Briefcase, CircleDollarSign, CheckCircle2 } from 'lucide-react';
import { Skeleton, SkeletonCard } from "@workspace/ui";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ContextActions from '@/app/(platform)/(dashboard)/_components/ContextActions';
import { ConfirmModal } from "@workspace/ui";
import toast from 'react-hot-toast';
import clsx from 'clsx';
import CreateProjectModal from '@/app/(platform)/(projects-and-tasks-app)/_components/CreateProjectModal';
import { useAuth } from '@/lib/auth-context';
import CustomSelect from '@/components/ui/CustomSelect';

const STATUS_COLORS: Record<string, string> = {
    planning: 'badge-gray',
    in_progress: 'badge-blue',
    on_hold: 'badge-orange',
    completed: 'badge-green',
    cancelled: 'badge-red',
};
const PRIORITY_COLORS: Record<string, string> = {
    low: 'badge-gray',
    medium: 'badge-blue',
    high: 'badge-orange',
    critical: 'badge-red',
};

export default function ProjectsPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [projectToArchive, setProjectToArchive] = useState<any>(null);
    const [projectToDelete, setProjectToDelete] = useState<any>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const router = useRouter();
    const { user } = useAuth();
    const canCreateProject = user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'));

    // Fast In-Memory SWR Cache for 0ms Instant Navigation (Slack/Notion Gold Standard)
    const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

    const fetchProjects = async () => {
        const cacheKey = `projects:${search}:${status}`;
        const cached = swrCacheRef.current.get(cacheKey);

        if (cached) {
            // Instant 0ms Paint
            setProjects(cached.data.projects || []);
            setLoading(false);
        } else {
            setLoading(true);
        }

        try {
            const { data } = await api.get('/api/projects', { params: { search, status } });
            const fetched = data.projects || [];
            setProjects(fetched);
            swrCacheRef.current.set(cacheKey, {
                data: { projects: fetched },
                timestamp: Date.now()
            });
        } catch (err) {
            if (!cached) toast.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async () => {
        if (!projectToArchive) return;
        setIsActionLoading(true);
        try {
            await api.patch(`/api/projects/${projectToArchive.id}`, { status: 'on_hold' });
            toast.success('Project archived');
            swrCacheRef.current.clear();
            fetchProjects();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to archive project');
        } finally {
            setIsActionLoading(false);
            setProjectToArchive(null);
        }
    };

    const handleDelete = async () => {
        if (!projectToDelete) return;
        setIsActionLoading(true);
        try {
            await api.delete(`/api/projects/${projectToDelete.id}`);
            toast.success('Project deleted');
            swrCacheRef.current.clear();
            fetchProjects();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to delete project');
        } finally {
            setIsActionLoading(false);
            setProjectToDelete(null);
        }
    };

    useEffect(() => { fetchProjects(); }, [search, status]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params?.get('create') === 'true') {
                setShowCreate(true);
                window.history.replaceState({}, '', '/projects');
            }
        }
    }, []);

    return (
        <div>
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Projects</h1>
                    <p className="page-subtitle">{projects.length} projects found</p>
                </div>
                {canCreateProject && (
                    <button className="btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus className="w-4 h-4" />
                        New Project
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-5">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects..."
                        className="input pl-9"
                    />
                </div>
                <CustomSelect value={status} onChange={(e) => setStatus(e.target.value)} className="select w-44" title="Filter by status">
                    <option value="">All Statuses</option>
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                </CustomSelect>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {projects.map((project) => (
                        <div key={project.id} className="card p-5 hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between">
                            <div onClick={() => router.push(`/projects/${project.id}`)} className="cursor-pointer flex-1">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors line-clamp-1">{project.name}</h3>
                                    <span className={clsx('badge', STATUS_COLORS[project.status] || 'badge-gray')}>
                                        {project.status?.replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>

                                {/* Progress bar */}
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <div className="flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                                            <span>{project.taskStats?.completedTasks || 0}/{project.taskStats?.totalTasks || 0} Tasks</span>
                                            {project.totalModules !== undefined && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-medium">
                                                    {project.totalModules} Module{project.totalModules !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-semibold text-gray-600">{project.progress || 0}%</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                                            style={{ width: `${project.progress || 0}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
                                    <div className="flex items-center gap-2 text-xs text-gray-500" title="Project Manager">
                                        <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center">
                                            <User className="w-3 h-3 text-indigo-600" />
                                        </div>
                                        <span className="truncate">{project.owner?.name || 'Unassigned'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500" title="Client">
                                        <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center">
                                            <Briefcase className="w-3 h-3 text-emerald-600" />
                                        </div>
                                        <span className="truncate">{project.clientIds?.[0]?.company || project.clientIds?.[0]?.name || 'Internal'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400" title="Start Date">
                                        <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center">
                                            <Calendar className="w-3 h-3 text-blue-500" />
                                        </div>
                                        <span>{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400" title="Deadline">
                                        <div className="w-5 h-5 rounded-full bg-rose-50 flex items-center justify-center">
                                            <Calendar className="w-3 h-3 text-rose-500" />
                                        </div>
                                        <span className={clsx(project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed' && "text-rose-600 font-bold")}>
                                            {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No deadline'}
                                        </span>
                                    </div>
                                    {project.budget > 0 && (
                                        <div className="col-span-2 flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50" title="Budget">
                                            <CircleDollarSign className="w-4 h-4" />
                                            <span>Budget: ${project.budget.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-auto mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className={clsx('badge px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold', PRIORITY_COLORS[project.priority] || 'badge-gray')}>
                                            {project.priority}
                                        </span>
                                        {project.projectType && (
                                            <span className="badge badge-gray px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold">
                                                {project.projectType.replace('_', ' ')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex -space-x-2">
                                        {(project.members || []).slice(0, 3).map((m: any, idx: number) => (
                                            <div key={m?.id || idx} title={m.name} className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white flex items-center justify-center cursor-help overflow-hidden">
                                                {m.photoUrl ? (
                                                    <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-white text-[10px] font-bold">{m.name?.[0]?.toUpperCase()}</span>
                                                )}
                                            </div>
                                        ))}
                                        {(project.members || []).length > 3 && (
                                            <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                                                <span className="text-gray-500 text-[10px] font-bold">+{project.members.length - 3}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50 flex justify-end">
                                <ContextActions
                                    actions={[
                                        {
                                            label: 'Open',
                                            icon: Eye,
                                            onClick: () => router.push(`/projects/${project.id}`),
                                            variant: 'primary'
                                        },
                                        canCreateProject && {
                                            label: 'Add Task',
                                            icon: PlusCircle,
                                            onClick: () => router.push(`/tasks?create=true&projectId=${project.id}&projectName=${encodeURIComponent(project.name)}`)
                                        },
                                        canCreateProject && {
                                            label: 'Archive',
                                            icon: Archive,
                                            onClick: () => setProjectToArchive(project)
                                        },
                                        canCreateProject && {
                                            label: 'Delete',
                                            icon: Trash2,
                                            onClick: () => setProjectToDelete(project),
                                            variant: 'danger'
                                        }
                                    ].filter(Boolean) as any}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {
                !loading && projects.length === 0 && (
                    <div className="text-center py-20">
                        <FolderKanban className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium">No projects found</p>
                        <p className="text-gray-300 text-sm mt-1">Try adjusting filters or create a new project</p>
                    </div>
                )
            }

            {
                showCreate && (
                    <CreateProjectModal
                        onClose={() => setShowCreate(false)}
                        onSuccess={(p) => setProjects(prev => [p, ...prev])}
                    />
                )
            }

            <ConfirmModal
                isOpen={!!projectToArchive}
                title="Archive Project"
                message={`Are you sure you want to archive "${projectToArchive?.name}"?`}
                onConfirm={handleArchive}
                onCancel={() => setProjectToArchive(null)}
                loading={isActionLoading}
            />

            <ConfirmModal
                isOpen={!!projectToDelete}
                title="Delete Project"
                message={`Are you sure you want to delete "${projectToDelete?.name}"? This will also delete all associated tasks.`}
                confirmText="Delete"
                onConfirm={handleDelete}
                onCancel={() => setProjectToDelete(null)}
                loading={isActionLoading}
                variant="danger"
            />
        </div>
    );
}

