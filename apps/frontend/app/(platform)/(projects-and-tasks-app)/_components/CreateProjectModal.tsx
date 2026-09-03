'use client';

import { LogoLoader } from "@workspace/ui";
import { useEffect, useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { X, FolderKanban, Plus, Users, Calendar, Flag, Tag, AlignLeft, CheckCircle2, DollarSign, Settings, User, Briefcase, Eye, Building } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';

interface Props {
    onClose: () => void;
    onSuccess: (project: any) => void;
}

const STATUS_OPTS = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'];
const PRIORITY_OPTS = [
    { value: 'low', label: 'Low', dot: 'bg-gray-400' },
    { value: 'medium', label: 'Medium', dot: 'bg-blue-500' },
    { value: 'high', label: 'High', dot: 'bg-orange-500' },
    { value: 'critical', label: 'Critical', dot: 'bg-red-500' },
];

const PROJECT_TYPE_OPTS = [
    { value: 'internal', label: 'Internal' },
    { value: 'client', label: 'Client' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'development', label: 'Development' }
];

const BILLING_TYPE_OPTS = [
    { value: 'non_billable', label: 'Non-Billable' },
    { value: 'hourly', label: 'Hourly Rate' },
    { value: 'fixed', label: 'Fixed Price' }
];

const VISIBILITY_OPTS = [
    { value: 'public', label: 'Public to Workspace' },
    { value: 'private', label: 'Private (Invite Only)' }
];

export default function CreateProjectModal({ onClose, onSuccess }: Props) {
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Step 1 — Details
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [projectType, setProjectType] = useState('internal');
    const [clientIds, setClientIds] = useState<string[]>([]);
    const [startDate, setStartDate] = useState('');
    const [deadline, setDeadline] = useState('');

    const [clients, setClients] = useState<any[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);

    // Step 2 — Configuration
    const [status, setStatus] = useState('planning');
    const [priority, setPriority] = useState('medium');
    const [budget, setBudget] = useState('');
    const [billingType, setBillingType] = useState('non_billable');
    const [visibility, setVisibility] = useState('public');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);

    // Step 3 — Members & Owner
    const [users, setUsers] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [ownerId, setOwnerId] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (step === 1 && clients.length === 0) {
            setLoadingClients(true);
            api.get('/api/clients')
                .then(({ data }) => setClients(data.clients || []))
                .catch(console.error)
                .finally(() => setLoadingClients(false));
        }
        if (step === 3 && users.length === 0) {
            setLoadingUsers(true);
            api.get('/api/users', { params: { limit: 100 } })
                .then(({ data }) => setUsers(data.users || []))
                .catch(console.error)
                .finally(() => setLoadingUsers(false));
        }
    }, [step]);

    const addTag = () => {
        const val = tagInput.trim();
        if (val && !tags.includes(val)) setTags(prev => [...prev, val]);
        setTagInput('');
    };

    const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

    const toggleMember = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return toast.error('Project name is required');
        setSubmitting(true);
        try {
            const { data } = await api.post('/api/projects', {
                name: name.trim(),
                description: description.trim(),
                projectType,
                clientIds,
                startDate: startDate || undefined,
                deadline: deadline || undefined,
                status,
                priority,
                budget: budget ? parseFloat(budget) : 0,
                billingType,
                visibility,
                tags,
                memberIds: Array.from(selectedIds),
                ownerId: ownerId || undefined
            });
            toast.success('Project created!');
            onSuccess(data.project);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to create project');
        } finally {
            setSubmitting(false);
        }
    };

    const nextStep = () => {
        if (step === 1 && !name.trim()) return toast.error('Project name is required');
        if (step < 3) setStep(s => s + 1);
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            {step === 1 && <Briefcase className="w-5 h-5 text-white" aria-hidden="true" />}
                            {step === 2 && <Settings className="w-5 h-5 text-white" aria-hidden="true" />}
                            {step === 3 && <Users className="w-5 h-5 text-white" aria-hidden="true" />}
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900">Create Project</h2>
                            <p className="text-xs text-gray-400">Step {step} of 3 — {step === 1 ? 'Details' : step === 2 ? 'Configuration' : 'Team'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close modal" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-4 h-4 text-gray-500" aria-hidden="true" />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="flex px-6 pt-4 gap-2">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={clsx('h-1 flex-1 rounded-full transition-all', s <= step ? 'bg-indigo-500' : 'bg-gray-100')} />
                    ))}
                </div>

                <form onSubmit={submit} className="flex-1 overflow-y-auto">
                    {/* ── Step 1: Details ── */}
                    {step === 1 && (
                        <div className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label htmlFor="projectName" className="form-label">Project Name <span className="text-red-400">*</span></label>
                                <input id="projectName" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Website Redesign" className="input" required />
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="projectDesc" className="form-label flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5" aria-hidden="true" />Description</label>
                                <textarea id="projectDesc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this project about?" rows={3} className="input resize-none" />
                            </div>

                            {/* Type and Client */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="projectType" className="form-label">Project Type</label>
                                    <CustomSelect id="projectType" value={projectType} onChange={e => setProjectType(e.target.value)} className="select">
                                        {PROJECT_TYPE_OPTS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </CustomSelect>
                                </div>
                                {projectType === 'client' && (
                                    <div>
                                        <label htmlFor="clientId" className="form-label flex items-center gap-1.5"><Building className="w-3.5 h-3.5" aria-hidden="true" />Client</label>
                                        <CustomSelect id="clientId" value={clientIds[0] || ''} onChange={e => setClientIds(e.target.value ? [e.target.value] : [])} className="select" disabled={loadingClients}>
                                            <option value="">Select a Client...</option>
                                            {clients.map(c => <option key={c.id || c.id} value={c.id || c.id}>{c.name}</option>)}
                                        </CustomSelect>
                                    </div>
                                )}
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="startDate" className="form-label flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" aria-hidden="true" />Start Date</label>
                                    <input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
                                </div>
                                <div>
                                    <label htmlFor="projectDeadline" className="form-label flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" aria-hidden="true" />Deadline</label>
                                    <input id="projectDeadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="input" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 2: Configuration ── */}
                    {step === 2 && (
                        <div className="p-6 space-y-4">
                            {/* Status + Priority */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="projectStatus" className="form-label">Status</label>
                                    <CustomSelect id="projectStatus" value={status} onChange={e => setStatus(e.target.value)} className="select">
                                        {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                    </CustomSelect>
                                </div>
                                <div>
                                    <span className="form-label flex items-center gap-1.5"><Flag className="w-3.5 h-3.5" aria-hidden="true" />Priority</span>
                                    <div className="flex gap-1 flex-wrap mt-1">
                                        {PRIORITY_OPTS.map(p => (
                                            <button key={p.value} type="button" onClick={() => setPriority(p.value)} className={clsx('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all', priority === p.value ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                                                <span className={clsx('w-1.5 h-1.5 rounded-full', p.dot)} aria-hidden="true" />{p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Budget and Billing */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="projectBudget" className="form-label flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" aria-hidden="true" />Budget</label>
                                    <input id="projectBudget" type="number" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0.00" className="input" />
                                </div>
                                <div>
                                    <label htmlFor="billingType" className="form-label">Billing Type</label>
                                    <CustomSelect id="billingType" value={billingType} onChange={e => setBillingType(e.target.value)} className="select">
                                        {BILLING_TYPE_OPTS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </CustomSelect>
                                </div>
                            </div>
                            
                            {/* Visibility */}
                            <div>
                                <label htmlFor="visibility" className="form-label flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" aria-hidden="true" />Visibility</label>
                                <CustomSelect id="visibility" value={visibility} onChange={e => setVisibility(e.target.value)} className="select">
                                    {VISIBILITY_OPTS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </CustomSelect>
                            </div>

                            {/* Tags */}
                            <div>
                                <label htmlFor="projectTags" className="form-label flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" aria-hidden="true" />Tags</label>
                                <div className="flex gap-2">
                                    <input id="projectTags" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Press Enter to add tag" className="input flex-1" />
                                    <button type="button" onClick={addTag} aria-label="Add tag" className="btn-secondary px-3"><Plus className="w-4 h-4" aria-hidden="true" /></button>
                                </div>
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {tags.map(t => (
                                            <span key={t} className="badge badge-blue cursor-pointer hover:bg-red-100 hover:text-red-600 transition-colors" onClick={() => removeTag(t)}>{t} ×</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Members & Owner ── */}
                    {step === 3 && (
                        <div className="p-6 flex flex-col h-full space-y-4">
                            <div>
                                <label htmlFor="ownerSelect" className="form-label flex items-center gap-1.5"><User className="w-3.5 h-3.5" aria-hidden="true" />Project Owner</label>
                                <CustomSelect id="ownerSelect" value={ownerId} onChange={e => setOwnerId(e.target.value)} className="select">
                                    <option value="">Myself (Default)</option>
                                    {users.map(u => <option key={u.id || u.id} value={u.id || u.id}>{u.name}</option>)}
                                </CustomSelect>
                            </div>

                            <div>
                                <p className="form-label flex items-center gap-1.5 mb-1"><Users className="w-3.5 h-3.5" aria-hidden="true" />Team Members</p>
                                <input id="memberSearch" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search employees..." className="input mb-3" />
                                <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin">
                                    {loadingUsers ? (
                                        <div className="flex items-center justify-center py-8">
                                            <LogoLoader className="w-5 h-5 animate-spin text-indigo-500" />
                                        </div>
                                    ) : filteredUsers.map(u => {
                                        const uid = u.id || u.id;
                                        const selected = selectedIds.has(uid);
                                        return (
                                            <button key={uid} type="button" onClick={() => toggleMember(uid)} className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left border', selected ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-transparent hover:bg-gray-100')}>
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-white text-xs font-bold">{u.name?.[0]?.toUpperCase()}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                                                    <p className="text-xs text-gray-400 truncate">{u.position || u.role}</p>
                                                </div>
                                                {selected && <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-gray-100">
                    <button type="button" onClick={() => step === 1 ? onClose() : setStep(step - 1)} className="btn-secondary">
                        {step === 1 ? 'Cancel' : '← Back'}
                    </button>
                    {step < 3 ? (
                        <button type="button" onClick={nextStep} className="btn-primary">
                            Next Step →
                        </button>
                    ) : (
                        <button type="button" onClick={submit as any} disabled={submitting} className="btn-primary">
                            {submitting ? <LogoLoader className="w-4 h-4 animate-spin" /> : <FolderKanban className="w-4 h-4" aria-hidden="true" />}
                            {submitting ? 'Creating...' : 'Create Project'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
