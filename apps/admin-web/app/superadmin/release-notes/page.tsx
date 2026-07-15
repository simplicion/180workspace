'use client';

import { useState, useEffect } from 'react';
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
    X
} from 'lucide-react';
import axios from '@/lib/superadmin-api';

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
}

export default function SuperAdminReleaseNotes() {
    const [notes, setNotes] = useState<ReleaseNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<ReleaseNote>({
        version: '',
        title: '',
        description: '',
        features: [],
        isPublished: false
    });

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const res = await axios.get('/superadmin/release-notes');
            setNotes(res.data);
        } catch (error) {
            console.error('Failed to fetch', error);
        } finally {
            setLoading(false);
        }
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formData.id) {
                await axios.put(`/superadmin/release-notes/${formData.id}`, formData);
            } else {
                await axios.post('/superadmin/release-notes', formData);
            }
            setIsAdding(false);
            setFormData({ version: '', title: '', description: '', features: [], isPublished: false });
            fetchNotes();
        } catch (error) {
            console.error('Save failed', error);
        }
    };

    const deleteNote = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await axios.delete(`/superadmin/release-notes/${id}`);
            fetchNotes();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Release Notes</h1>
                    <p className="text-sm text-slate-500 font-medium tracking-wide">Manage product updates and new feature guides</p>
                </div>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-500/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Create Release
                    </button>
                )}
            </div>

            {isAdding ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Version (e.g. 2.4.0)</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
                                    value={formData.version}
                                    onChange={e => setFormData({ ...formData, version: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                            <textarea 
                                required
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Main Features ({formData.features.length})</label>
                                <button type="button" onClick={addFeature} className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
                                    <Plus className="w-3.5 h-3.5" /> Add Feature
                                </button>
                            </div>
                            
                            {formData.features.map((feature, idx) => (
                                <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 relative group/feature">
                                    <button 
                                        type="button" 
                                        onClick={() => removeFeature(idx)}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <input 
                                            placeholder="Feature Name"
                                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                                            value={feature.name}
                                            onChange={e => updateFeature(idx, 'name', e.target.value)}
                                        />
                                        <input 
                                            placeholder="Navigation Page Link (e.g. /dashboard/tools)"
                                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                                            value={feature.navLink}
                                            onChange={e => updateFeature(idx, 'navLink', e.target.value)}
                                        />
                                    </div>
                                    <textarea 
                                        placeholder="Brief explanation..."
                                        rows={2}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm mb-4"
                                        value={feature.description}
                                        onChange={e => updateFeature(idx, 'description', e.target.value)}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2">
                                            <PlayCircle className="w-4 h-4 text-red-500" />
                                            <input 
                                                placeholder="Video Demo URL"
                                                className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                                                value={feature.videoUrl}
                                                onChange={e => updateFeature(idx, 'videoUrl', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-blue-500" />
                                            <input 
                                                placeholder="Documentation Guide URL"
                                                className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                                                value={feature.guideUrl}
                                                onChange={e => updateFeature(idx, 'guideUrl', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                                    checked={formData.isPublished}
                                    onChange={e => setFormData({ ...formData, isPublished: e.target.checked })}
                                />
                                <span className="text-sm font-bold text-slate-700">Publish immediately</span>
                            </label>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsAdding(false)}
                                    className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-xl active:scale-95"
                                >
                                    <Save className="w-5 h-5" />
                                    Save Release
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {loading ? (
                        <div className="h-40 rounded-3xl bg-slate-50 animate-pulse" />
                    ) : notes.map(note => (
                        <div key={note.id} className="p-6 bg-white border border-slate-200 rounded-3xl flex items-center justify-between group hover:border-sky-200 hover:shadow-lg hover:shadow-sky-500/5 transition-all">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                                    <Rocket className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded">v{note.version}</span>
                                        {note.isPublished ? (
                                            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                                <CheckCircle2 className="w-3 h-3" /> Published
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Draft</span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">{note.title}</h3>
                                    <p className="text-sm text-slate-500 font-medium">{note.features.length} features highlighted</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => { setFormData(note); setIsAdding(true); }}
                                    className="p-2.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                                >
                                    <Eye className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => note.id && deleteNote(note.id)}
                                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
