'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X, Briefcase, Layout, CheckSquare, Clock, Calendar, Link as LinkIcon, Plus, Trash2, CheckCircle2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import MultiVoiceRecorder from './MultiVoiceRecorder';

interface Props {
    onClose: () => void;
    onSuccess: (log: any) => void;
    projectId?: string;
    moduleId?: string;
    taskId?: string;
    initialTaskId?: string;
}

export default function LogWorkModal({ onClose, onSuccess, projectId, moduleId, taskId, initialTaskId }: Props) {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    
    // Lists for dropdowns
    const [projects, setProjects] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    
    // Loading states
    const [loadingModules, setLoadingModules] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);

    // Form state
    const [form, setForm] = useState({
        projectId: projectId || '',
        moduleId: moduleId || '',
        taskId: taskId || initialTaskId || '',
        description: '',
        hoursSpent: '',
        workDate: new Date().toISOString().split('T')[0],
        isWorkCompleted: false,
        voiceMessageUrl: '',
    });
    
    const [voiceBlobs, setVoiceBlobs] = useState<Blob[]>([]);
    
    const [links, setLinks] = useState<string[]>(['']);

    // Fetch Projects on mount
    useEffect(() => {
        api.get('/api/projects', { params: { limit: 100 } })
            .then(({ data }) => setProjects(data.projects || []))
            .catch(err => console.error('Error fetching projects:', err));
    }, []);

    // Fetch Modules when project changes
    useEffect(() => {
        const fetchModules = async () => {
            if (!form.projectId) {
                setModules([]);
                setForm(prev => ({ ...prev, moduleId: '', taskId: '' }));
                return;
            }
            setLoadingModules(true);
            try {
                const { data } = await api.get(`/api/modules/project/${form.projectId}`);
                setModules(data.modules || []);
                // If the provided moduleId is not in the new project list, reset it
                if (moduleId && data.modules.some((m: any) => m.id === moduleId)) {
                    // keep it
                } else if (form.moduleId && !data.modules.some((m: any) => m.id === form.moduleId)) {
                    setForm(prev => ({ ...prev, moduleId: '', taskId: '' }));
                }
            } catch (err) {
                console.error('Error fetching modules:', err);
            } finally {
                setLoadingModules(false);
            }
        };
        fetchModules();
    }, [form.projectId]);

    // Fetch Tasks when module or project changes
    useEffect(() => {
        const fetchTasks = async () => {
            if (!form.projectId) {
                setTasks([]);
                return;
            }
            setLoadingTasks(true);
            try {
                // Fetch tasks assigned to the user in this project/module
                // The backend /api/tasks doesn't have a perfect "filter by project AND module AND assignee" 
                // but we can pass params
                const params: any = { projectId: form.projectId, limit: 200, assigneeId: user?.id };
                params.moduleId = form.moduleId || 'null';
                
                const { data } = await api.get('/api/tasks', { params });
                setTasks(data.tasks || []);
                
                const effectiveTaskId = taskId || initialTaskId;
                if (effectiveTaskId && data.tasks.some((t: any) => t.id === effectiveTaskId)) {
                    // keep it
                } else if (form.taskId && !data.tasks.some((t: any) => t.id === form.taskId)) {
                    setForm(prev => ({ ...prev, taskId: '' }));
                }
            } catch (err) {
                console.error('Error fetching tasks:', err);
            } finally {
                setLoadingTasks(false);
            }
        };
        fetchTasks();
    }, [form.projectId, form.moduleId]);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setForm(prev => ({ ...prev, [k]: val }));
    };

    const addLink = () => setLinks([...links, '']);
    const removeLink = (index: number) => setLinks(links.filter((_, i) => i !== index));
    const updateLink = (index: number, val: string) => {
        const next = [...links];
        next[index] = val;
        setLinks(next);
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.projectId) return toast.error('Project is required');
        if (!form.description.trim()) return toast.error('Description is required');
        if (!form.hoursSpent) return toast.error('Hours spent is required');

        setSubmitting(true);
        try {
            let finalVoiceUrl = form.voiceMessageUrl;

            // Upload multiple blobs if any
            if (voiceBlobs.length > 0) {
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
                finalVoiceUrl = finalVoiceUrl ? `${finalVoiceUrl},${uploadedUrls.join(',')}` : uploadedUrls.join(',');
            }

            const payload = {
                ...form,
                voiceMessageUrl: finalVoiceUrl,
                hoursSpent: parseFloat(form.hoursSpent),
                links: links.filter(l => l.trim().length > 0)
            };

            const { data } = await api.post('/api/work-logs', payload);
            toast.success('Work log submitted for review!');
            onSuccess(data.workLog);
            setVoiceBlobs([]);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to submit work log');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Log Your Work</h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {/* Project & Module Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Project *</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select value={form.projectId} onChange={set('projectId')} className="select pl-9" required>
                                    <option value="">Select Project</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="label">Module</label>
                            <div className="relative">
                                <Layout className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select 
                                    value={form.moduleId} 
                                    onChange={set('moduleId')} 
                                    className="select pl-9" 
                                    disabled={!form.projectId || loadingModules}
                                >
                                    <option value="">General Project Work</option>
                                    {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                {loadingModules && <LogoLoader className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
                            </div>
                        </div>
                    </div>

                    {/* Task Selection */}
                    <div>
                        <label className="label">Specific Task (Optional)</label>
                        <div className="relative">
                            <CheckSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select 
                                value={form.taskId} 
                                onChange={set('taskId')} 
                                className="select pl-9"
                                disabled={!form.projectId || loadingTasks}
                            >
                                <option value="">No specific task</option>
                                {tasks.map(t => <option key={t.id} value={t.id}>{t.title} ({t.status})</option>)}
                            </select>
                            {loadingTasks && <LogoLoader className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="label">What did you work on? *</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <textarea 
                                value={form.description} 
                                onChange={set('description')} 
                                placeholder="Describe your progress, technical details, or any blockers..." 
                                rows={4} 
                                className="input pl-9 resize-none" 
                                required 
                            />
                        </div>
                    </div>

                    {/* Hours & Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Hours Spent *</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    min="0" 
                                    value={form.hoursSpent} 
                                    onChange={set('hoursSpent')} 
                                    placeholder="e.g. 4.5" 
                                    className="input pl-9" 
                                    required 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label">Work Date *</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="date" 
                                    value={form.workDate} 
                                    onChange={set('workDate')} 
                                    className="input pl-9" 
                                    required 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Proof Links */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="label mb-0">Proof of Work (Links/PRs)</label>
                            <button type="button" onClick={addLink} className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add Link
                            </button>
                        </div>
                        <div className="space-y-2">
                            {links.map((link, i) => (
                                <div key={i} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            type="url" 
                                            value={link} 
                                            onChange={(e) => updateLink(i, e.target.value)} 
                                            placeholder="https://github.com/..." 
                                            className="input pl-9" 
                                        />
                                    </div>
                                    {links.length > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={() => removeLink(i)} 
                                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2">
                        <MultiVoiceRecorder onChangeBlobs={setVoiceBlobs} label="Voice Note (Optional)" />
                    </div>

                    {/* Automation Trigger */}
                    {form.taskId && (
                        <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3 border border-amber-100">
                            <div className="pt-0.5">
                                <input 
                                    id="completed" 
                                    type="checkbox" 
                                    checked={form.isWorkCompleted} 
                                    onChange={(e) => setForm(prev => ({ ...prev, isWorkCompleted: e.target.checked }))}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                            </div>
                            <label htmlFor="completed" className="text-sm text-amber-900 leading-tight">
                                <span className="font-semibold block">Mark Task as Done</span>
                                If selected, approving this log will automatically update the selected task&apos;s status to <strong>Done</strong>.
                            </label>
                        </div>
                    )}
                </form>

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button onClick={onClose} type="button" className="btn-secondary">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={submitting} 
                        className="btn-primary min-w-[140px]"
                    >
                        {submitting ? (
                            <>
                                <LogoLoader className="w-4 h-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Submit Work Log
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
