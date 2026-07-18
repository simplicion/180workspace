'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X, CheckSquare, AlignLeft, FolderKanban, User, Flag, Calendar, Layout, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import MultiVoiceRecorder from './MultiVoiceRecorder';

import { useAuth } from '@/lib/auth-context';

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
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [form, setForm] = useState({
        title: '',
        description: '',
        projectId: projectId || '',
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

    const [modules, setModules] = useState<any[]>([]);
    const [fetchingModules, setFetchingModules] = useState(false);

    useEffect(() => {
        api.get('/api/projects', { params: { limit: 100 } }).then(({ data }) => setProjects(data.projects || []));
        api.get('/api/users', { params: { limit: 100 } }).then(({ data }) => setEmployees(data.users || []));
    }, []);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm(prev => {
            const next = { ...prev, [k]: e.target.value };
            // If project changes, reset assignee if they are no longer in the project
            // and fetch modules for the new project
            if (k === 'projectId') {
                next.assigneeId = '';
                next.moduleId = '';
            }
            return next;
        });
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

        let finalVoiceUrl = form.voiceMessageUrl;

        // Upload multiple blobs if any
        if (voiceBlobs.length > 0) {
            try {
                const uploadedUrls = [];
                for (let i = 0; i < voiceBlobs.length; i++) {
                    const blob = voiceBlobs[i];
                    const formData = new FormData();
                    formData.append('file', blob, `voice-note-${Date.now()}-${i}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
                    
                    const { data: uploadData } = await api.post('/api/files/upload-voice', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    uploadedUrls.push(uploadData.url);
                }
                
                // Append to any existing voiceMessageUrl
                finalVoiceUrl = finalVoiceUrl ? `${finalVoiceUrl},${uploadedUrls.join(',')}` : uploadedUrls.join(',');
            } catch (err: any) {
                console.error('Failed to upload voice notes:', err);
                toast.error('Failed to upload voice notes. Task creation aborted.');
                setLoading(false);
                return;
            }
        }

        const { assigneeId, moduleId, dueDate, voiceMessageUrl, attachments, ...rest } = form;
        const payload: Record<string, unknown> = { ...rest };
        if (assigneeId) payload.assigneeId = assigneeId;
        if (moduleId) payload.moduleId = moduleId;
        if (dueDate) payload.dueDate = dueDate;
        if (finalVoiceUrl) payload.voiceMessageUrl = finalVoiceUrl;
        if (attachments && attachments.length > 0) payload.attachments = attachments;

        try {
            const { data } = await api.post('/api/tasks', payload);
            toast.success('Task created!');

            // Show email notification status if it was requested
            if (payload.sendEmailNotification && payload.assigneeId) {
                if (data.notificationResult?.success) {
                    toast.success('Assignment email sent successfully!');
                } else if (data.notificationResult?.error) {
                    toast.error(`Email failed: ${data.notificationResult.error}`);
                } else if (data.notificationResult?.skipped) {
                    toast('Email skipped (user may be online)');
                }
            }

            onSuccess(data.task);
            setVoiceBlobs([]);
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
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

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
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
                            <label htmlFor="taskProject" className="label">Project *</label>
                            <select id="taskProject" value={form.projectId} onChange={set('projectId')} className="select" title="Select project" required>
                                <option value="" disabled>Select a project</option>
                                {projects.map(p => <option key={p.id || p.id} value={p.id || p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="taskAssignee" className="label">Assignee</label>
                            <select id="taskAssignee" value={form.assigneeId} onChange={set('assigneeId')} className="select" title="Select assignee">
                                <option value="">Unassigned</option>
                                {availableAssignees.map((u: any) => <option key={u.id || u.id} value={u.id || u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {form.projectId && (
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label htmlFor="taskModule" className="label">Module (Optional)</label>
                                <div className="relative">
                                    <Layout className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                                    <select 
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
                                    </select>
                                </div>
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
                            <select id="taskPriority" value={form.priority} onChange={set('priority')} className="select" title="Select priority">
                                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="taskStatus" className="label">Status</label>
                            <select id="taskStatus" value={form.status} onChange={set('status')} className="select" title="Select status">
                                {STATUSES.map(s => {
                                let label = s.replace('_', ' ');
                                if (s === 'custom' && selectedProject?.customTaskStatusName) {
                                    label = selectedProject.customTaskStatusName;
                                }
                                return <option key={s} value={s}>{label}</option>
                            })}
                            </select>
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
                </form>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} type="button" className="btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading} className="btn-primary">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Create Task'}
                    </button>
                </div>
            </div>
        </div>
    );
}
