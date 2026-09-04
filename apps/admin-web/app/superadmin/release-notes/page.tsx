'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    Plus, 
    Save, 
    Trash2, 
    Rocket, 
    ExternalLink, 
    PlayCircle, 
    BookOpen, 
    Eye,
    CheckCircle2,
    X,
    Sparkles,
    Calendar
} from 'lucide-react';
import saApi from '@/lib/superadmin-api';
import { useModal } from '@/lib/modal-context';
import { Skeleton, LogoLoader } from '@workspace/ui';
import toast, { Toaster } from 'react-hot-toast';

interface Feature {
    name: string;
    description: string;
    navLink: string;
    videoUrl: string;
    guideUrl: string;
}

interface ReleaseNote {
    _id?: string;
    id?: string;
    version: string;
    title: string;
    description: string;
    features: Feature[];
    isPublished: boolean;
    publishedAt?: string;
    createdAt?: string;
}

export default function SuperAdminReleaseNotes() {
    const modal = useModal();
    const [mounted, setMounted] = useState(false);
    const [notes, setNotes] = useState<ReleaseNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<ReleaseNote>({
        version: '',
        title: '',
        description: '',
        features: [],
        isPublished: true
    });

    useEffect(() => {
        setMounted(true);
        fetchNotes();
    }, []);

    // Close modal on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen]);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const res = await saApi.get('/release-notes');
            setNotes(res.data || []);
        } catch (error) {
            console.error('Failed to fetch release notes', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setFormData({
            version: '',
            title: '',
            description: '',
            features: [],
            isPublished: true
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (note: ReleaseNote) => {
        setFormData({
            ...note,
            features: Array.isArray(note.features) ? note.features : []
        });
        setIsModalOpen(true);
    };

    const addFeature = () => {
        setFormData({
            ...formData,
            features: [...formData.features, { name: '', description: '', navLink: '', videoUrl: '', guideUrl: '' }]
        });
    };

    const updateFeature = (index: number, field: keyof Feature, value: string) => {
        const newFeatures = [...formData.features];
        newFeatures[index] = { ...newFeatures[index], [field]: value };
        setFormData({ ...formData, features: newFeatures });
    };

    const removeFeature = (index: number) => {
        setFormData({
            ...formData,
            features: formData.features.filter((_, i) => i !== index)
        });
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        try {
            setIsSaving(true);
            const { id, _id, ...cleanForm } = formData;
            const payload: any = {
                title: cleanForm.title,
                description: cleanForm.description,
                features: cleanForm.features || [],
                isPublished: cleanForm.isPublished !== undefined ? cleanForm.isPublished : true,
                version: cleanForm.version || `v${new Date().getFullYear()}.${new Date().getMonth() + 1}.${notes.length + 1}`,
                content: JSON.stringify({
                    description: cleanForm.description || '',
                    features: cleanForm.features || [],
                    fixes: [],
                    isPublished: cleanForm.isPublished !== undefined ? cleanForm.isPublished : true,
                })
            };

            const targetId = id || _id;
            if (targetId) {
                await saApi.put(`/release-notes/${targetId}`, payload);
                toast.success('Release note updated');
            } else {
                await saApi.post('/release-notes', payload);
                toast.success('Release note published');
            }
            setIsModalOpen(false);
            fetchNotes();
        } catch (error: any) {
            console.error('Save failed', error);
            const errMsg = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to save release note';
            toast.error(errMsg);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteNote = async (id: string) => {
        const ok = await modal.confirm({
            title: 'Delete Release Note?',
            message: 'Are you sure you want to remove this release note? Users will no longer see what is new for this release.',
            confirmText: 'Delete Release',
            variant: 'danger'
        });
        if (!ok) return;

        try {
            await saApi.delete(`/release-notes/${id}`);
            toast.success('Release note deleted');
            fetchNotes();
        } catch (error) {
            console.error('Delete failed', error);
            toast.error('Failed to delete release note');
        }
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-center" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Rocket className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Platform Release Notes</h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Publish version milestones, product changelogs, and feature guides for all tenants.
                    </p>
                </div>

                <button 
                    onClick={handleOpenCreate}
                    className="btn-primary flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Release</span>
                </button>
            </div>

            {/* Release Notes List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                                <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-5 w-40 rounded" />
                                    <Skeleton className="h-4 w-64 rounded" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-16 rounded-lg" />
                        </div>
                    ))
                ) : notes.length === 0 ? (
                    <div className="glass-card text-center py-20 text-slate-400">
                        <Rocket className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-base font-bold text-slate-900 dark:text-white">No release notes published yet</p>
                        <p className="text-xs text-slate-500 mt-1">Click &quot;Create Release&quot; to announce new releases to your tenants.</p>
                    </div>
                ) : (
                    notes.map(note => (
                        <div 
                            key={note.id || note._id} 
                            className="glass-card stat-card-glow p-6 flex items-center justify-between group transition-all"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                                    <Rocket className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        {note.isPublished ? (
                                            <span className="badge-emerald text-[10px] font-bold">
                                                Published
                                            </span>
                                        ) : (
                                            <span className="badge-slate text-[10px] font-bold">
                                                Draft
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {note.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                        {note.features?.length || 0} highlights included
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0">
                                <button 
                                    onClick={() => handleOpenEdit(note)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                    title="Edit release"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => (note.id || note._id) && deleteNote((note.id || note._id)!)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                                    title="Delete release"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Dialog Portal */}
            {mounted && isModalOpen && createPortal(
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsModalOpen(false);
                    }}
                >
                    <div 
                        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <Rocket className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                        {formData.id || formData._id ? 'Edit Release Note' : 'Draft New Release'}
                                    </h2>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                        Configure changelog announcements and feature guide updates
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                title="Close popup"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Scrollable Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Changelog Title (Full Width) */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Changelog Title
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="e.g. Multi-Tenant Work Graph & Analytics"
                                    className="w-full h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            {/* Summary Description */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Summary Description
                                </label>
                                <textarea 
                                    required
                                    rows={3}
                                    placeholder="Summary of what is shipped in this release..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none font-medium"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {/* Feature Highlights */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Feature Highlights ({formData.features.length})
                                    </label>
                                    <button 
                                        type="button" 
                                        onClick={addFeature} 
                                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Highlight
                                    </button>
                                </div>
                                
                                {formData.features.map((feature, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 relative group/feature space-y-3">
                                        <button 
                                            type="button" 
                                            onClick={() => removeFeature(idx)}
                                            className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                            title="Remove highlight"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                                            <input 
                                                placeholder="Feature Name"
                                                className="w-full h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-lg px-3 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                                                value={feature.name}
                                                onChange={e => updateFeature(idx, 'name', e.target.value)}
                                            />
                                            <input 
                                                placeholder="App Route (e.g. /dashboard/tools)"
                                                className="w-full h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-lg px-3 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                                                value={feature.navLink}
                                                onChange={e => updateFeature(idx, 'navLink', e.target.value)}
                                            />
                                        </div>
                                        <textarea 
                                            placeholder="Brief highlight description..."
                                            rows={2}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 resize-none font-medium"
                                            value={feature.description}
                                            onChange={e => updateFeature(idx, 'description', e.target.value)}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2">
                                                <PlayCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                                <input 
                                                    placeholder="Video Walkthrough URL"
                                                    className="w-full h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-lg px-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                                                    value={feature.videoUrl}
                                                    onChange={e => updateFeature(idx, 'videoUrl', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                                                <input 
                                                    placeholder="Documentation Guide URL"
                                                    className="w-full h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-lg px-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                                                    value={feature.guideUrl}
                                                    onChange={e => updateFeature(idx, 'guideUrl', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Modal Actions Footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                        checked={formData.isPublished}
                                        onChange={e => setFormData({ ...formData, isPublished: e.target.checked })}
                                    />
                                    <span>Publish to all workspaces immediately</span>
                                </label>
                                
                                <div className="flex items-center gap-2.5">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>{isSaving ? 'Saving...' : 'Save Release'}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
