'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { X, Briefcase, Layout, CheckSquare, Clock, Calendar, Link as LinkIcon, Plus, Trash2, CheckCircle2, FileText, Paperclip, Phone, Mail, Users as UsersIcon, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import MultiVoiceRecorder from './MultiVoiceRecorder';
import CustomSelect from '@/components/ui/CustomSelect';

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
    const [mounted, setMounted] = useState(false);
    
    // Lists for dropdowns
    const [projects, setProjects] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    
    // Loading states
    const [loadingModules, setLoadingModules] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

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
    
    // Sales Activity State
    const [isSalesActivity, setIsSalesActivity] = useState(false);
    const [salesType, setSalesType] = useState('call');
    const [salesRelationType, setSalesRelationType] = useState<'lead' | 'deal' | 'client' | 'account' | 'contact'>('lead');
    const [selectedRelationId, setSelectedRelationId] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [fetchingData, setFetchingData] = useState(false);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchTerm.length >= 2) {
                fetchSuggestions();
            } else {
                setSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchTerm, salesRelationType]);

    async function fetchSuggestions() {
        setFetchingData(true);
        try {
            let endpoint = '';
            if (salesRelationType === 'lead') endpoint = '/api/sales/deals';
            else if (salesRelationType === 'deal') endpoint = '/api/sales/leads-pipeline';
            else if (salesRelationType === 'client') endpoint = '/api/sales/clients';

            const { data } = await api.get(endpoint);
            const list = data.leads || data.opportunities || data.clients || [];
            
            const filtered = list.filter((item: any) => {
                const searchStr = (item.name || item.title || item.companyName || '').toLowerCase();
                return searchStr.includes(searchTerm.toLowerCase());
            });

            setSuggestions(filtered.slice(0, 5));
        } catch (err) {
            console.error('Failed to fetch suggestions', err);
        } finally {
            setFetchingData(false);
        }
    }

    const activityTypes = [
        { id: 'call', icon: Phone, label: 'Call', color: 'bg-blue-50 text-blue-600' },
        { id: 'email', icon: Mail, label: 'Email', color: 'bg-orange-50 text-orange-600' },
        { id: 'meeting', icon: UsersIcon, label: 'Meeting', color: 'bg-purple-50 text-purple-600' },
        { id: 'note', icon: MessageSquare, label: 'Note', color: 'bg-emerald-50 text-emerald-600' },
        { id: 'task', icon: CheckSquare, label: 'Task', color: 'bg-rose-50 text-rose-600' },
    ];
    
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

    async function handleSubmit(e?: React.FormEvent) {
        if (e && e.preventDefault) e.preventDefault();
        if (!isSalesActivity) {
            if (!form.projectId) return toast.error('Please select a project');
            if (!form.taskId) return toast.error('Please select a specific task');
            if (!form.hoursSpent || isNaN(parseFloat(form.hoursSpent)) || parseFloat(form.hoursSpent) <= 0) {
                return toast.error('Valid hours spent is required (e.g. 1.5)');
            }
        }
        if (!form.description || !form.description.trim()) {
            return toast.error('Please describe what you worked on');
        }

        setSubmitting(true);
        try {
            let finalVoiceUrl = form.voiceMessageUrl;
            let uploadedFileUrls: string[] = [];

            if (selectedFiles.length > 0) {
                const uploadPromises = selectedFiles.map(file => {
                    const formData = new FormData();
                    formData.append('file', file);
                    return api.post('/api/files/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    }).then(res => res.data?.url).catch(err => {
                        console.error('File upload failed', err);
                        return null;
                    });
                });
                const results = await Promise.all(uploadPromises);
                uploadedFileUrls = results.filter(Boolean);
            }

            if (voiceBlobs.length > 0) {
                const voicePromises = voiceBlobs.map((blob, i) => {
                    const formData = new FormData();
                    formData.append('file', blob, `voice-note-${Date.now()}-${i}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
                    return api.post('/api/files/upload-voice', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    }).then(res => res.data?.url).catch(err => {
                        console.error('Voice upload failed', err);
                        return null;
                    });
                });
                const voiceResults = await Promise.all(voicePromises);
                const validVoiceUrls = voiceResults.filter(Boolean);
                if (validVoiceUrls.length > 0) {
                    finalVoiceUrl = finalVoiceUrl ? `${finalVoiceUrl},${validVoiceUrls.join(',')}` : validVoiceUrls.join(',');
                }
            }

            const payload: any = {
                ...form,
                voiceMessageUrl: finalVoiceUrl,
                hoursSpent: parseFloat(form.hoursSpent || '0'),
                links: links.filter(l => l.trim().length > 0),
                attachmentUrls: uploadedFileUrls
            };

            if (isSalesActivity) {
                const salesPayload: any = {
                    type: salesType,
                    notes: form.description,
                    timestamp: form.workDate ? new Date(form.workDate).toISOString() : new Date().toISOString()
                };

                if (selectedRelationId) {
                    if (salesRelationType === 'lead') salesPayload.relatedLead = selectedRelationId;
                    else if (salesRelationType === 'deal') salesPayload.relatedDeal = selectedRelationId;
                    else if (salesRelationType === 'account') salesPayload.relatedAccount = selectedRelationId;
                    else if (salesRelationType === 'contact') salesPayload.relatedContact = selectedRelationId;
                }
                
                await api.post('/api/sales/activities', salesPayload);
                toast.success('Sales Activity logged successfully!');
                onSuccess(salesPayload);
                setVoiceBlobs([]);
                onClose();
                return;
            }

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

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Log Your Work</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
                            <span className="text-sm font-medium text-gray-700">Sales Activity</span>
                            <button
                                type="button"
                                onClick={() => setIsSalesActivity(!isSalesActivity)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${isSalesActivity ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            >
                                <span className="sr-only">Log as Sales Activity</span>
                                <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isSalesActivity ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto hidden-scrollbar px-6 py-5 space-y-6">
                    


                    {isSalesActivity && (
                        <div className="space-y-6 p-5 bg-gray-50 border border-gray-100 rounded-xl">
                            <div>
                                <label className="label">Activity Type</label>
                                <div className="grid grid-cols-5 gap-3 mt-1.5">
                                    {activityTypes.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setSalesType(t.id)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                                                salesType === t.id 
                                                    ? 'border-indigo-600 bg-white shadow-sm' 
                                                    : 'border-transparent bg-white hover:border-indigo-200 shadow-sm'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg mb-2 flex items-center justify-center ${
                                                salesType === t.id ? t.color : 'bg-gray-50 text-gray-400'
                                            }`}>
                                                <t.icon className="w-4 h-4" />
                                            </div>
                                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                                salesType === t.id ? 'text-indigo-900' : 'text-gray-500'
                                            }`}>
                                                {t.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="label mb-0">Relate To</label>
                                    <div className="flex bg-gray-200/50 p-1 rounded-lg">
                                        {['lead', 'deal', 'client'].map(rt => (
                                            <button
                                                key={rt}
                                                type="button"
                                                onClick={() => {
                                                    setSalesRelationType(rt as any);
                                                    setSearchTerm('');
                                                    setSelectedRelationId('');
                                                }}
                                                className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                                                    salesRelationType === rt 
                                                        ? 'bg-white text-indigo-700 shadow-sm' 
                                                        : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                {rt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="relative mt-2">
                                    <input 
                                        type="text" 
                                        placeholder={`Search for a ${salesRelationType}...`}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="select"
                                    />
                                    {fetchingData && <LogoLoader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
                                    
                                    {suggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden z-20">
                                            {suggestions.map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedRelationId(item.id);
                                                        setSearchTerm(item.name || item.title || item.companyName);
                                                        setSuggestions([]);
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                                                >
                                                    <div className="font-medium text-gray-900 text-sm">
                                                        {item.name || item.title || item.companyName}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {!isSalesActivity && (
                    <>
                    {/* Project & Module Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Project *</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <CustomSelect value={form.projectId} onChange={set('projectId')} className="select pl-9" required>
                                    <option value="">Select Project</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </CustomSelect>
                            </div>
                        </div>
                        <div>
                            <label className="label">Module</label>
                            <div className="relative">
                                <Layout className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <CustomSelect 
                                    value={form.moduleId} 
                                    onChange={set('moduleId')} 
                                    className="select pl-9" 
                                    disabled={!form.projectId || loadingModules}
                                >
                                    <option value="">General Project Work</option>
                                    {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </CustomSelect>
                                {loadingModules && <LogoLoader className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
                            </div>
                        </div>
                    </div>

                    {/* Task Selection */}
                    <div>
                        <label className="label">Specific Task *</label>
                        <div className="relative">
                            <CheckSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <CustomSelect 
                                value={form.taskId} 
                                onChange={set('taskId')} 
                                className="select pl-9"
                                disabled={!form.projectId || loadingTasks}
                                required
                            >
                                <option value="">Select Task</option>
                                {tasks.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.title} ({t.status.replace('_', ' ')})
                                    </option>
                                ))}
                            </CustomSelect>
                            {loadingTasks && <LogoLoader className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
                        </div>
                    </div>
                    </>
                    )}

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
                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0 bg-white">
                        <button onClick={onClose} type="button" className="btn-secondary">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            onClick={() => handleSubmit()}
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
                </form>
            </div>
        </div>,
        document.body
    );
}
