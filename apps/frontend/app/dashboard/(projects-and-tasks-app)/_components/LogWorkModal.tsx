'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X, Briefcase, Layout, CheckSquare, Clock, Calendar, Link as LinkIcon, Plus, Trash2, CheckCircle2, FileText, Paperclip } from 'lucide-react';
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
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    
    const [links, setLinks] = useState<string[]>(['']);

    // Fetch Projects on mount
    useEffect(() => {
        api.get('/api/projects', { params: { limit: 100 } })
            .then(({ data }) => {
                const fetchedProjects = data.projects || [];
                setProjects(fetchedProjects);
                // Auto-select if there's at least 1 project and no project is currently selected
                if (fetchedProjects.length > 0 && !form.projectId) {
                    setForm(prev => ({ ...prev, projectId: fetchedProjects[0].id }));
                }
            })
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
                const params: any = { projectId: form.projectId, limit: 200 };
                if (form.moduleId) {
                    params.moduleId = form.moduleId;
                }
                
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
        
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
        if (!form.projectId) return toast.error('Please select a project');
        if (!form.taskId) return toast.error('Please select a specific task');
        if (!form.description) return toast.error('Please describe what you worked on');
        if (!form.hoursSpent) return toast.error('Hours spent is required');

        setSubmitting(true);
        try {
            let finalVoiceUrl = form.voiceMessageUrl;

            let uploadedFileUrls: string[] = [];
            if (selectedFiles.length > 0) {
                for (let i = 0; i < selectedFiles.length; i++) {
                    const file = selectedFiles[i];
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    const { data: uploadData } = await api.post('/api/files/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    uploadedFileUrls.push(uploadData.url);
                }
            }

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
                links: links.filter(l => l.trim().length > 0),
                attachmentUrls: uploadedFileUrls
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
                        <label className="label">Specific Task *</label>
                        <div className="relative">
                            <CheckSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select 
                                value={form.taskId} 
                                onChange={set('taskId')} 
                                className="select pl-9"
                                disabled={!form.projectId || loadingTasks}
                                required
                            >
                                <option value="">Select Task</option>
                                {tasks.map(t => (
                                    <option key={t.id} value={t.id} disabled={t.status !== 'in_progress'}>
                                        {t.title} ({t.status.replace('_', ' ')})
                                    </option>
                                ))}
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
                        </div>
                    </div>

                    <div className="pt-2">
                        <MultiVoiceRecorder onChangeBlobs={setVoiceBlobs} label="Voice Note (Optional)" />
                    </div>

                    {/* Automation Trigger */}
                    {form.taskId && (
                        <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3 border border-amber-100">
                            <label className="text-sm text-amber-900 leading-tight">
                                <span className="font-semibold block">Automatic Status Update</span>
                                Upon submission, this task will be marked as <strong>In Review</strong>. Once your work log is approved, the task will automatically be marked as <strong>Done</strong>.
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
