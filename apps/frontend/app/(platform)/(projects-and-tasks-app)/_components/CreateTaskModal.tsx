'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { offlineApi } from '@/lib/offline/offline-api';
import { X, CheckSquare, AlignLeft, FolderKanban, User, Flag, Calendar, Layout, Paperclip, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import MultiVoiceRecorder from './MultiVoiceRecorder';

import { useAuth } from '@/lib/auth-context';
import CustomSelect from '@/components/ui/CustomSelect';
import { useDispatch } from 'react-redux';
import { addUploadJob } from '@/redux/slices/uploadQueueSlice';
import { v4 as uuidv4 } from 'uuid';

interface Props {
    onClose: () => void;
    onSuccess: (task: any) => void;
    projectId?: string; // pre-select project if opened from project detail
    initialModuleId?: string;
}

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['todo', 'in_progress', 'in_review', 'done', 'backlog', 'custom'];

export default function CreateTaskModal({ onClose, onSuccess, projectId, initialModuleId }: Props) {
    const { user } = useAuth();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);
    const [projects, setProjects] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [form, setForm] = useState({
        title: '',
        description: '',
        projectId: projectId || '',
        clientId: '',
        assigneeId: '',
        priority: 'medium',
        status: 'todo',
        dueDate: '',
        moduleId: initialModuleId || '',
        sendEmailNotification: true,
        voiceMessageUrl: '',
        attachments: [] as string[]
    });
    
    const [voiceBlobs, setVoiceBlobs] = useState<Blob[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [linkInput, setLinkInput] = useState('');
    const [links, setLinks] = useState<string[]>([]);

    const [modules, setModules] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [fetchingModules, setFetchingModules] = useState(false);

    useEffect(() => {
        api.get('/api/projects', { params: { limit: 100 } }).then(({ data }) => setProjects(data.projects || []));
        api.get('/api/users', { params: { limit: 100 } }).then(({ data }) => setEmployees(data.users || []));
        api.get('/api/clients', { params: { limit: 100 } }).then(({ data }) => setClients(data.clients || []));
    }, []);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm(prev => {
            const next = { ...prev, [k]: e.target.value };
            // If project changes, reset assignee if they are no longer in the project
            // and fetch modules for the new project
            if (k === 'projectId') {
                next.assigneeId = '';
                next.moduleId = '';
                next.clientId = '';
            }
            return next;
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        
        const validFiles = files.filter(file => {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`File ${file.name} exceeds 5MB limit`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles]);
        }
        
        // Reset input so the same file can be selected again if needed
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Fetch modules when project changes
    useEffect(() => {
        const fetchModules = async () => {
            const pId = form.projectId || projectId;
            if (!pId) {
                setModules([]);
                return;
            }

            setFetchingModules(true);
            try {
                const { data } = await api.get(`/api/modules/project/${pId}`);
                setModules(data.modules || []);
            } catch (err) {
                console.error('Error fetching modules:', err);
            } finally {
                setFetchingModules(false);
            }
        };

        fetchModules();
    }, [form.projectId, projectId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.title.trim()) return toast.error('Title is required');
        setLoading(true);

        const { assigneeId, moduleId, dueDate, voiceMessageUrl, attachments, clientId, ...rest } = form;
        const payload: Record<string, unknown> = { ...rest };
        if (assigneeId) payload.assigneeId = assigneeId;
        if (moduleId) payload.moduleId = moduleId;
        if (clientId) payload.clientId = clientId;
        if (dueDate) payload.dueDate = dueDate;
        
        const allAttachments = [...(attachments || []), ...links];
        if (allAttachments.length > 0) payload.attachments = allAttachments;
        if (voiceMessageUrl) payload.voiceMessageUrl = voiceMessageUrl; // any pre-existing URLs

        try {
            // 1. Create the task through offline-aware API (executes instantly locally & queues for sync if offline)
            const deterministicId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const optimisticTask = {
                id: deterministicId,
                ...payload,
                status: form.status || 'todo',
                priority: form.priority || 'medium',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending_sync',
                assignee: availableAssignees.find(a => a.id === form.assigneeId),
                project: selectedProject,
            };

            const { data, isOptimisticOffline } = await offlineApi.post('/api/tasks', payload, {
                entityType: 'task',
                entityId: deterministicId,
                optimisticData: optimisticTask,
            });
            
            // Show email notification status if it was requested
            if (payload.sendEmailNotification && payload.assigneeId && data?.notificationResult) {
                if (data.notificationResult?.success) {
                    toast.success('Assignment email sent successfully!');
                } else if (data.notificationResult?.error) {
                    toast.error(`Email failed: ${data.notificationResult.error}`);
                } else if (data.notificationResult?.skipped) {
                    toast('Email skipped (user may be online)');
                }
            }
            
            const task = (data && (data.task || data.id)) ? (data.task || data) : optimisticTask;
            
            // 2. Dispatch background upload job if files are selected
            if (selectedFiles.length > 0 || voiceBlobs.length > 0) {
                dispatch(addUploadJob({
                    id: uuidv4(),
                    entityId: task.id,
                    entityType: 'task',
                    files: selectedFiles,
                    voiceBlobs: voiceBlobs
                }));
                toast.success(isOptimisticOffline ? 'Task saved offline! Uploads queued.' : 'Task created! Uploads queued in background.');
            } else {
                toast.success(isOptimisticOffline ? 'Task saved offline! Will sync automatically when online.' : 'Task created!');
            }

            onSuccess(task);
            setVoiceBlobs([]);
            setSelectedFiles([]);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to create task');
        } finally {
            setLoading(false);
        }
    }

    const selectedProject = projects.find(p => p.id === form.projectId || p.id === form.projectId);

    // Use all employees as available assignees
    const availableAssignees = employees;

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Create Task</h2>
                    </div>
                    <button onClick={onClose} aria-label="Close modal" title="Close modal" className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X className="w-4 h-4 text-gray-500" aria-hidden="true" />
                    </button>
                </div>

                <form id="create-task-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div>
                        <label htmlFor="taskTitle" className="label">Task Title *</label>
                        <div className="relative">
                            <CheckSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="taskTitle" value={form.title} onChange={set('title')} placeholder="What needs to be done?" className="input pl-9" required />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="taskDescription" className="label">Description</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <textarea id="taskDescription" value={form.description} onChange={set('description')} placeholder="Add more details..." rows={3} className="input pl-9 resize-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="taskProject" className="label">Project</label>
                            <CustomSelect id="taskProject" value={form.projectId} onChange={set('projectId')} className="select" title="Select project">
                                <option value="">No Project (Standalone Task)</option>
                                {projects.map(p => <option key={p.id || p.id} value={p.id || p.id}>{p.name}</option>)}
                            </CustomSelect>
                        </div>
                        <div>
                            <label htmlFor="taskAssignee" className="label">Assignee</label>
                            <CustomSelect id="taskAssignee" value={form.assigneeId} onChange={set('assigneeId')} className="select" title="Select assignee">
                                <option value="">Unassigned</option>
                                {availableAssignees.map((u: any) => <option key={u.id || u.id} value={u.id || u.id}>{u.name}</option>)}
                            </CustomSelect>
                        </div>
                    </div>

                    {form.projectId && (
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label htmlFor="taskModule" className="label">Module (Optional)</label>
                                <div className="relative">
                                    <Layout className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                                    <CustomSelect 
                                        id="taskModule" 
                                        value={form.moduleId} 
                                        onChange={set('moduleId')} 
                                        className="select pl-9"
                                        disabled={fetchingModules}
                                    >
                                        {fetchingModules ? (
                                            <option value="">Loading modules...</option>
                                        ) : (
                                            <>
                                                <option value="">General Project Tasks</option>
                                                {modules.map(m => <option key={m.id || m.id} value={m.id || m.id}>{m.name}</option>)}
                                            </>
                                        )}
                                    </CustomSelect>
                                </div>
                            </div>
                        </div>
                    )}

                    {!form.projectId && (
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label htmlFor="taskClient" className="label">Client (Optional)</label>
                                <CustomSelect id="taskClient" value={form.clientId} onChange={set('clientId')} className="select" title="Select client">
                                    <option value="">Select a client</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </CustomSelect>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 px-1">
                        <input
                            type="checkbox"
                            id="sendEmailNotification"
                            checked={form.sendEmailNotification}
                            onChange={(e) => setForm(prev => ({ ...prev, sendEmailNotification: e.target.checked }))}
                            className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                        />
                        <label htmlFor="sendEmailNotification" className="text-sm text-gray-600 cursor-pointer select-none">
                            Notify assignee via email
                        </label>
                    </div>

                    {/* Show Project Summary when a project is selected */}
                    {selectedProject && (
                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                            <div className="flex items-center justify-between mb-2 border-b border-indigo-100/50 pb-2">
                                <div className="font-semibold text-sm text-indigo-900 flex items-center gap-2">
                                    <FolderKanban className="w-4 h-4 text-indigo-500" />
                                    {selectedProject.name}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white text-indigo-600 border border-indigo-200">
                                        {selectedProject.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs font-medium text-indigo-700">{selectedProject.progress || 0}%</span>
                                </div>
                            </div>
                            <p className="text-xs text-indigo-700/80 line-clamp-2 leading-relaxed">
                                {selectedProject.description || 'No description provided for this project.'}
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="taskPriority" className="label">Priority</label>
                            <CustomSelect id="taskPriority" value={form.priority} onChange={set('priority')} className="select" title="Select priority">
                                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                            </CustomSelect>
                        </div>
                        <div>
                            <label htmlFor="taskStatus" className="label">Status</label>
                            <CustomSelect id="taskStatus" value={form.status} onChange={set('status')} className="select" title="Select status">
                                {STATUSES.map(s => {
                                let label = s.replace('_', ' ');
                                if (s === 'custom' && selectedProject?.customTaskStatusName) {
                                    label = selectedProject.customTaskStatusName;
                                }
                                return <option key={s} value={s}>{label}</option>
                            })}
                            </CustomSelect>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label htmlFor="taskDueDate" className="label">Deadline (Date & Time)</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                                <input id="taskDueDate" value={form.dueDate} onChange={set('dueDate')} type="datetime-local" className="input pl-9" title="Due date and time" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <MultiVoiceRecorder onChangeBlobs={setVoiceBlobs} label="Voice Note (Optional)" />
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <label className="label mb-2 flex items-center justify-between">
                            <span>Attachments (Optional)</span>
                            <span className="text-xs text-gray-500 font-normal">Max 5MB per file</span>
                        </label>
                        
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 hover:border-indigo-300 transition-colors cursor-pointer group">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                        <Paperclip className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Click to upload files</span>
                                    <span className="text-xs text-gray-500">Images, PDFs, Docs</span>
                                </div>
                                <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                            </label>

                            {selectedFiles.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {selectedFiles.map((file, i) => {
                                        const isImage = file.type.startsWith('image/');
                                        const url = isImage ? URL.createObjectURL(file) : null;
                                        
                                        return (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 bg-gray-50/50">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    {isImage && url ? (
                                                        <img src={url} alt={file.name} className="w-8 h-8 object-cover rounded shadow-sm border border-gray-200" />
                                                    ) : (
                                                        <div className="w-8 h-8 flex-shrink-0 bg-blue-50 rounded flex items-center justify-center border border-blue-100">
                                                            <FileText className="w-4 h-4 text-blue-500" />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-medium text-gray-700 truncate">{file.name}</span>
                                                        <span className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeFile(i)}
                                                    className="w-6 h-6 flex-shrink-0 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="url"
                                    placeholder="Paste a link here..."
                                    value={linkInput}
                                    onChange={(e) => setLinkInput(e.target.value)}
                                    className="input flex-1 text-sm py-2 px-3"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (linkInput.trim()) {
                                            setLinks(prev => [...prev, linkInput.trim()]);
                                            setLinkInput('');
                                        }
                                    }}
                                    disabled={!linkInput.trim()}
                                    className="btn-secondary whitespace-nowrap text-xs py-2"
                                >
                                    Add Link
                                </button>
                            </div>

                            {links.length > 0 && (
                                <div className="grid grid-cols-1 gap-2 mt-2">
                                    {links.map((link, i) => (
                                        <div key={`link-${i}`} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 bg-gray-50/50">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-8 h-8 flex-shrink-0 bg-indigo-50 rounded flex items-center justify-center border border-indigo-100">
                                                    <Paperclip className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-indigo-600 truncate hover:underline">
                                                    {link}
                                                </a>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => setLinks(prev => prev.filter((_, idx) => idx !== i))}
                                                className="w-6 h-6 flex-shrink-0 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </form>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} type="button" className="btn-secondary">Cancel</button>
                    <button type="submit" form="create-task-form" disabled={loading} className="btn-primary">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Create Task'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
