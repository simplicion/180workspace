'use client';

import { useState } from 'react';
import { X, Globe, Type, Palette, Layout, Loader2, Save } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface CreateWebsiteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateWebsiteModal({ isOpen, onClose, onSuccess }: CreateWebsiteModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        template: 'modern',
        theme: {
            primaryColor: '#4f46e5',
            accentColor: '#10b981',
            backgroundColor: '#ffffff'
        }
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.post('/api/websites', formData);
            toast.success('Website created successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to create website:', error);
            toast.error(error.response?.data?.error || 'Failed to create website');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                            <Globe className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Create New Website</h2>
                            <p className="text-xs text-gray-500">Configure your landing page basic details.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Website Name</label>
                                <div className="relative">
                                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="E.g. Summer Campaign 2024"
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        value={formData.name}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                name, 
                                                slug: prev.slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-') 
                                            }));
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">URL Slug</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <div className="flex items-center">
                                        <span className="pl-10 pr-1 py-2.5 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-[10px] text-gray-400 font-medium">ims.com/p/</span>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="summer-promo"
                                            className="flex-1 px-1 py-2.5 bg-gray-50 border border-l-0 border-gray-200 rounded-r-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            value={formData.slug}
                                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Template Choice</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['modern', 'minimal', 'corporate', 'startup'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, template: t }))}
                                            className={`px-4 py-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                                                formData.template === t 
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Style */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Primary Brand Color</label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="color" 
                                        className="w-12 h-12 rounded-lg border-2 border-white shadow-sm cursor-pointer"
                                        value={formData.theme.primaryColor}
                                        onChange={(e) => setFormData(prev => ({ ...prev, theme: { ...prev.theme, primaryColor: e.target.value } }))}
                                    />
                                    <input 
                                        type="text" 
                                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono uppercase"
                                        value={formData.theme.primaryColor}
                                        onChange={(e) => setFormData(prev => ({ ...prev, theme: { ...prev.theme, primaryColor: e.target.value } }))}
                                    />
                                </div>
                            </div>

                            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                                <h4 className="text-xs font-bold text-indigo-700 flex items-center gap-2 mb-2">
                                    <Layout className="w-3.5 h-3.5" />
                                    Preview
                                </h4>
                                <div className="aspect-video bg-white rounded-lg border border-indigo-100 shadow-inner overflow-hidden flex flex-col">
                                    <div className="h-2" style={{ backgroundColor: formData.theme.primaryColor }} />
                                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                                        <div className="w-12 h-1 bg-gray-100 rounded-full mb-1" />
                                        <div className="w-8 h-1 bg-gray-50 rounded-full mb-4" />
                                        <div className="w-full h-8 rounded-md shadow-sm" style={{ backgroundColor: formData.theme.primaryColor }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Create Website
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
