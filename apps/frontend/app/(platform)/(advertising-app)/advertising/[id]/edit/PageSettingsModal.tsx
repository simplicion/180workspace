'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings2, Globe, Search, Palette, Image as ImageIcon, Trash2, Upload, Sparkles, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export type PageModalConfigType = {
    isOpen: boolean;
    mode: 'add' | 'edit';
    pageId?: string;
    name: string;
    slug?: string;
    metaTitle: string;
    metaDescription: string;
    keywords?: string;
    isPublished: boolean;
    isNoIndex?: boolean;
    navVisibility: string;
    bgType?: 'color' | 'image' | 'default';
    bgValue?: string;
} | null;

interface PageSettingsModalProps {
    config: PageModalConfigType;
    setConfig: (config: PageModalConfigType) => void;
    onSave: (newConfig: PageModalConfigType) => void;
    domain?: string;
    websiteId?: string;
}

const PRESET_COLORS = [
    { label: 'White', value: '#ffffff', isDark: false },
    { label: 'Pure Black', value: '#000000', isDark: true },
    { label: 'Slate Dark', value: '#0f172a', isDark: true },
    { label: 'Charcoal', value: '#18181b', isDark: true },
    { label: 'Deep Navy', value: '#0a0f1d', isDark: true },
    { label: 'Deep Wine', value: '#450a0a', isDark: true },
    { label: 'Soft Gray', value: '#f8fafc', isDark: false },
    { label: 'Cream', value: '#fffbeb', isDark: false },
];

export default function PageSettingsModal({ config, setConfig, onSave, domain = 'yourdomain.com', websiteId }: PageSettingsModalProps) {
    const [mounted, setMounted] = useState(false);
    const [uploadingBg, setUploadingBg] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!config?.isOpen || !mounted) return null;

    const metaTitle = config.metaTitle || config.name || 'Page Title';
    const metaDesc = config.metaDescription || 'No description set. Add a compelling summary for search engine results.';
    const displaySlug = config.slug || (config.name ? `/${config.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : '/');

    const titleLength = (config.metaTitle || '').length;
    const descLength = (config.metaDescription || '').length;

    const bgType = config.bgType || 'color';
    const bgValue = config.bgValue || (bgType === 'color' ? '#ffffff' : '');

    const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingBg(true);
            const formData = new FormData();
            formData.append('file', file);
            if (websiteId) {
                formData.append('relatedId', websiteId);
                formData.append('relatedModel', 'Website');
            }

            const res = await api.post('/api/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.url) {
                setConfig({
                    ...config,
                    bgType: 'image',
                    bgValue: res.data.url
                });
                toast.success('Page background image uploaded!');
            } else {
                toast.error('Upload failed');
            }
        } catch (err) {
            console.error('Page background upload error:', err);
            toast.error('Failed to upload background image');
        } finally {
            setUploadingBg(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4" style={{ zIndex: 99999 }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="p-4 px-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-indigo-50/30">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <Settings2 className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">
                                {config.mode === 'add' ? 'Add New Page' : 'Page Settings & SEO'}
                            </h3>
                            <p className="text-[11px] text-gray-500">Configure page details, per-page background color, and SEO ranking metadata</p>
                        </div>
                    </div>
                    <button onClick={() => setConfig(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Page Name & URL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Page Name</label>
                            <input 
                                type="text" 
                                value={config.name}
                                onChange={(e) => setConfig({...config, name: e.target.value})}
                                placeholder="e.g. About Us"
                                className="w-full text-sm p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Page Slug (URL)</label>
                            <input 
                                type="text" 
                                value={config.slug !== undefined ? config.slug : (config.name ? `/${config.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : '/')}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    if (val && !val.startsWith('/')) val = '/' + val;
                                    setConfig({...config, slug: val});
                                }}
                                placeholder="/about"
                                className="w-full text-sm p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white font-mono text-xs transition-all"
                            />
                        </div>
                    </div>

                    {/* ─── PER-PAGE BACKGROUND COLOR & IMAGE SECTION ────────────── */}
                    <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Palette className="w-4 h-4 text-indigo-600" />
                                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                    Page Background
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                Specific to this Page
                            </span>
                        </div>

                        {/* Switcher */}
                        <div className="flex bg-gray-200/70 p-1 rounded-xl gap-1">
                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, bgType: 'color', bgValue: config.bgValue?.startsWith('#') ? config.bgValue : '#ffffff' })}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    bgType === 'color' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Solid Color
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, bgType: 'image' })}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    bgType === 'image' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Background Image
                            </button>
                        </div>

                        {bgType === 'color' ? (
                            <div className="space-y-3">
                                {/* Preset color chips */}
                                <div>
                                    <div className="text-[11px] font-semibold text-gray-500 mb-2">Preset Colors:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_COLORS.map((preset) => {
                                            const isSelected = (bgValue || '#ffffff').toLowerCase() === preset.value.toLowerCase();
                                            return (
                                                <button
                                                    key={preset.value}
                                                    type="button"
                                                    onClick={() => setConfig({ ...config, bgType: 'color', bgValue: preset.value })}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                                        isSelected
                                                            ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-white shadow-xs font-bold text-gray-900'
                                                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                                                    }`}
                                                >
                                                    <span 
                                                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" 
                                                        style={{ backgroundColor: preset.value }}
                                                    />
                                                    <span>{preset.label}</span>
                                                    {isSelected && <Check className="w-3 h-3 text-indigo-600" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Custom Color Picker & Hex Input */}
                                <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
                                    <span className="text-xs font-bold text-gray-700">Custom Hex Color</span>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="text"
                                            value={bgValue || '#ffffff'}
                                            onChange={(e) => setConfig({ ...config, bgType: 'color', bgValue: e.target.value })}
                                            placeholder="#ffffff"
                                            className="w-24 px-2 py-1 text-xs font-mono border border-gray-200 rounded-lg outline-none focus:border-indigo-500 uppercase"
                                        />
                                        <div className="relative">
                                            <input 
                                                type="color" 
                                                value={bgValue?.startsWith('#') && bgValue.length === 7 ? bgValue : '#ffffff'} 
                                                onChange={(e) => setConfig({ ...config, bgType: 'color', bgValue: e.target.value })} 
                                                className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {bgValue ? (
                                    <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white group">
                                        <img src={bgValue} alt="Page Background" className="w-full h-32 object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => setConfig({ ...config, bgValue: '' })}
                                                className="p-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors flex items-center gap-1 text-xs font-bold"
                                            >
                                                <Trash2 className="w-4 h-4" /> Remove Image
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl cursor-pointer bg-white hover:bg-indigo-50/20 transition-all">
                                        <div className="flex flex-col items-center justify-center py-4">
                                            {uploadingBg ? (
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                                                    <Upload className="w-5 h-5" />
                                                </div>
                                            )}
                                            <p className="text-xs font-bold text-gray-700">
                                                {uploadingBg ? 'Uploading image...' : 'Click to upload page background image'}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WebP up to 10MB</p>
                                        </div>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*" 
                                            onChange={handleBgUpload} 
                                            disabled={uploadingBg} 
                                        />
                                    </label>
                                )}

                                {/* Image URL Direct Input */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Or paste image URL</label>
                                    <input 
                                        type="text"
                                        value={bgValue || ''}
                                        onChange={(e) => setConfig({ ...config, bgType: 'image', bgValue: e.target.value })}
                                        placeholder="https://images.unsplash.com/..."
                                        className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Live Google Search Snippet Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                <Search className="w-3.5 h-3.5 text-indigo-600" />
                                Google Search Result Preview
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">Live SERP</span>
                        </div>
                        <div className="pt-2 border-t border-gray-100">
                            <div className="text-[12px] text-gray-600 flex items-center gap-1 truncate">
                                <span className="font-semibold text-gray-800">https://{domain}</span>
                                <span className="text-gray-400">› {displaySlug.replace(/^\//, '') || 'home'}</span>
                            </div>
                            <div className="text-base text-blue-700 font-medium hover:underline cursor-pointer truncate mt-0.5 leading-snug">
                                {metaTitle}
                            </div>
                            <div className="text-xs text-gray-600 line-clamp-2 mt-1 leading-relaxed">
                                {metaDesc}
                            </div>
                        </div>
                    </div>

                    {/* Meta Title with Character Meter */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700">SEO Meta Title</label>
                            <span className={`text-[10px] font-medium ${titleLength > 60 ? 'text-amber-600 font-bold' : titleLength > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                {titleLength}/60 chars {titleLength >= 40 && titleLength <= 60 && '• Optimal'}
                            </span>
                        </div>
                        <input 
                            type="text" 
                            value={config.metaTitle}
                            onChange={(e) => setConfig({...config, metaTitle: e.target.value})}
                            placeholder="e.g. About Us | Leading Innovative Solutions & Services"
                            className="w-full text-sm p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white transition-all"
                        />
                    </div>

                    {/* Meta Description with Character Meter */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-gray-700">SEO Meta Description</label>
                            <span className={`text-[10px] font-medium ${descLength > 160 ? 'text-amber-600 font-bold' : descLength > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                {descLength}/160 chars {descLength >= 120 && descLength <= 160 && '• Optimal'}
                            </span>
                        </div>
                        <textarea 
                            value={config.metaDescription}
                            onChange={(e) => setConfig({...config, metaDescription: e.target.value})}
                            placeholder="Learn more about our mission, core values, and dedicated team providing industry-leading services."
                            rows={3}
                            className="w-full text-sm p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white resize-none transition-all"
                        />
                    </div>

                    {/* SEO Keywords */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">SEO Target Keywords (Comma Separated)</label>
                        <input 
                            type="text" 
                            value={config.keywords || ''}
                            onChange={(e) => setConfig({...config, keywords: e.target.value})}
                            placeholder="e.g. innovation, company values, professional team, expert support"
                            className="w-full text-sm p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white transition-all"
                        />
                    </div>

                    {/* Visibility & Indexing Options */}
                    <div className="pt-4 border-t border-gray-100 space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Publishing & Navigation</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:border-indigo-300 cursor-pointer bg-gray-50/50">
                                <input 
                                    type="checkbox" 
                                    checked={config.isPublished}
                                    onChange={(e) => setConfig({...config, isPublished: e.target.checked})}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                <span className="text-xs font-bold text-gray-800">Publish Page (Live)</span>
                            </label>

                            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:border-indigo-300 cursor-pointer bg-gray-50/50">
                                <input 
                                    type="checkbox" 
                                    checked={config.isNoIndex === true}
                                    onChange={(e) => setConfig({...config, isNoIndex: e.target.checked})}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                <span className="text-xs font-bold text-gray-800">Hide from Google (noindex)</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">Show in Navigation Bars</label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={config.navVisibility === 'both' || config.navVisibility === 'header'}
                                        onChange={(e) => {
                                            const isHeaderChecked = e.target.checked;
                                            const isFooterChecked = config.navVisibility === 'both' || config.navVisibility === 'footer';
                                            let newVisibility = 'none';
                                            if (isHeaderChecked && isFooterChecked) newVisibility = 'both';
                                            else if (isHeaderChecked) newVisibility = 'header';
                                            else if (isFooterChecked) newVisibility = 'footer';
                                            setConfig({...config, navVisibility: newVisibility});
                                        }}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    Header Navbar
                                </label>
                                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={config.navVisibility === 'both' || config.navVisibility === 'footer'}
                                        onChange={(e) => {
                                            const isFooterChecked = e.target.checked;
                                            const isHeaderChecked = config.navVisibility === 'both' || config.navVisibility === 'header';
                                            let newVisibility = 'none';
                                            if (isHeaderChecked && isFooterChecked) newVisibility = 'both';
                                            else if (isHeaderChecked) newVisibility = 'header';
                                            else if (isFooterChecked) newVisibility = 'footer';
                                            setConfig({...config, navVisibility: newVisibility});
                                        }}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    Footer Links
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 px-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                    <button 
                        onClick={() => setConfig(null)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 text-xs font-bold rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            if (!config.name.trim()) {
                                toast.error('Page name is required');
                                return;
                            }
                            onSave(config);
                            setConfig(null);
                        }}
                        className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        {config.mode === 'add' ? 'Create Page' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
