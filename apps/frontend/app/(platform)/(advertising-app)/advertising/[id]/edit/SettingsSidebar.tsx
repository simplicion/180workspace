'use client';

import { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Monitor, Smartphone, Tablet, Save, GripVertical, Settings2, Undo2, Redo2, Palette, Search, Plus, Trash2, Edit3, Image as ImageIcon, Link as LinkIcon, Type, MousePointer2, Settings, BoxSelect, Maximize, RotateCcw, ChevronDown, Check, Code2, FileCode2, Anchor, Globe, Upload, ShieldCheck, Sparkles } from 'lucide-react';
import { ElementType, ElementNode } from './types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import PageSettingsModal, { PageModalConfigType } from './PageSettingsModal';
import GlobalScriptsModal from './GlobalScriptsModal';
import MediaLibrary from './_components/MediaLibrary';


// Common Google Fonts
const TOP_FONTS = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
    'Source Sans Pro', 'Oswald', 'Raleway', 'PT Sans', 'Merriweather', 'Nunito'
];

interface SettingsSidebarProps {
    brand: any;
    updateBrand: (key: string, value: any) => void;
    config: any;
    commitConfig: (config: any) => void;
    activePageId: string;
    changeActivePage: (id: string) => void;
    sections: any[];
    website?: any;
    onOpenAIDrawer?: () => void;
}

export default function SettingsSidebar({
    brand,
    updateBrand,
    config,
    commitConfig,
    activePageId,
    changeActivePage,
    sections,
    website,
    onOpenAIDrawer
}: SettingsSidebarProps) {
    const [sidebarTab, setSidebarTab] = useState<'styles' | 'sections' | 'pages' | 'seo' | 'media'>('sections');
    const [uploadingFavicon, setUploadingFavicon] = useState(false);
    const [uploadingOgImage, setUploadingOgImage] = useState(false);
    const [showScriptsModal, setShowScriptsModal] = useState(false);
    const [pageModalConfig, setPageModalConfig] = useState<PageModalConfigType>(null);
    const [availableFonts, setAvailableFonts] = useState<string[]>([
        'Inter', 'Roboto', 'Playfair Display', 'Montserrat', 'Open Sans', 'Outfit', 'Poppins', 'Lato', 'Arial'
    ]);

    const seo = config.seo || {};

    const updateSeo = (key: string, value: any) => {
        const newConfig = JSON.parse(JSON.stringify(config));
        newConfig.seo = { ...(newConfig.seo || {}), [key]: value };
        commitConfig(newConfig);
    };

    const handleFaviconUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingFavicon(true);
            const formData = new FormData();
            formData.append('file', file);
            if (website?.id) {
                formData.append('relatedId', website.id);
                formData.append('relatedModel', 'Website');
            }

            const res = await api.post('/api/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.url) {
                updateSeo('favicon', res.data.url);
                updateBrand('favicon', res.data.url);
                toast.success('Favicon updated successfully');
            } else {
                toast.error('Upload failed');
            }
        } catch (err) {
            console.error('Favicon upload error:', err);
            toast.error('Failed to upload favicon');
        } finally {
            setUploadingFavicon(false);
        }
    };

    const handleOgUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingOgImage(true);
            const formData = new FormData();
            formData.append('file', file);
            if (website?.id) {
                formData.append('relatedId', website.id);
                formData.append('relatedModel', 'Website');
            }

            const res = await api.post('/api/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.url) {
                updateSeo('ogImage', res.data.url);
                toast.success('Social share image updated');
            } else {
                toast.error('Upload failed');
            }
        } catch (err) {
            console.error('OG image upload error:', err);
            toast.error('Failed to upload share image');
        } finally {
            setUploadingOgImage(false);
        }
    };


    useEffect(() => {
        fetch('https://api.fontsource.org/v1/fonts')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const fetchedFonts = data.map((f: any) => f.family);
                    const allFonts = Array.from(new Set([...availableFonts, ...fetchedFonts])).sort();
                    setAvailableFonts(allFonts);
                }
            })
            .catch(err => console.error('Failed to load fonts:', err));
    }, []);

    return (
        <>
            {/* AI Copilot Quick Launcher */}
            {onOpenAIDrawer && (
                <div className="p-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-xs border-b border-indigo-700/50">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-xs font-bold leading-tight">AI Website Builder</p>
                            <p className="text-[10px] text-white/80 leading-tight">Generate sections & themes live</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onOpenAIDrawer}
                        className="px-2.5 py-1 bg-white hover:bg-white/90 text-indigo-700 text-xs font-bold rounded-md shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    >
                        <span>Open AI</span>
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                    </button>
                </div>
            )}

            {/* Tab Bar */}
            <div className="flex border-b border-gray-200 bg-gray-50/50">
                <button onClick={() => setSidebarTab('sections')} className={`flex-1 py-3 px-1 text-[11px] font-bold border-b-2 uppercase tracking-wider transition-colors ${sidebarTab === 'sections' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'}`}>Sections</button>
                <button onClick={() => setSidebarTab('pages')} className={`flex-1 py-3 px-1 text-[11px] font-bold border-b-2 uppercase tracking-wider transition-colors ${sidebarTab === 'pages' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'}`}>Pages</button>
                <button onClick={() => setSidebarTab('styles')} className={`flex-1 py-3 px-1 text-[11px] font-bold border-b-2 uppercase tracking-wider transition-colors ${sidebarTab === 'styles' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'}`}>Theme</button>
                <button onClick={() => setSidebarTab('seo')} className={`flex-1 py-3 px-1 text-[11px] font-bold border-b-2 uppercase tracking-wider transition-colors ${sidebarTab === 'seo' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'}`}>SEO</button>
                <button onClick={() => setSidebarTab('media')} className={`flex-1 py-3 px-1 text-[11px] font-bold border-b-2 uppercase tracking-wider transition-colors ${sidebarTab === 'media' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'}`}>Media</button>
                {onOpenAIDrawer && (
                    <button 
                        type="button" 
                        onClick={onOpenAIDrawer} 
                        className="py-3 px-2 text-[11px] font-bold border-b-2 border-transparent uppercase tracking-wider transition-all text-purple-600 hover:text-purple-800 hover:bg-purple-50 flex items-center justify-center gap-1"
                        title="Open AI Website Builder"
                    >
                        <Sparkles className="w-3 h-3 text-purple-600 animate-pulse" />
                        <span>AI</span>
                    </button>
                )}
            </div>

            {/* Tab Content */}
            {sidebarTab === 'styles' ? (
                <div className="p-4 space-y-6">
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">Colors</label>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Primary Color (Buttons & Accents)</span>
                            <input type="color" value={brand.primaryColor} onChange={e => updateBrand('primaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Text Color</span>
                            <input type="color" value={brand.textColor || '#111827'} onChange={e => updateBrand('textColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">Typography</label>
                        <div className="space-y-1 relative">
                            <span className="text-xs text-gray-500">Font Family</span>
                            <FontSelector 
                                value={brand.fontFamily || 'Inter'} 
                                onChange={(val) => updateBrand('fontFamily', val)} 
                                availableFonts={availableFonts} 
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">Visibility</label>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={config.header?.enabled !== false} 
                                    onChange={(e) => commitConfig({ ...config, header: { ...config.header, enabled: e.target.checked } })}
                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300" 
                                />
                                <span className="text-sm">Show Header</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={config.footer?.enabled !== false} 
                                    onChange={(e) => commitConfig({ ...config, footer: { ...config.footer, enabled: e.target.checked } })}
                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300" 
                                />
                                <span className="text-sm">Show Footer</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">Header & Footer Theme</label>
                        <div className="flex flex-col gap-2">
                            <label className={`flex items-center justify-between p-2 rounded border cursor-pointer ${brand.headerFooterTheme === 'light' || !brand.headerFooterTheme ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div className="flex items-center gap-2">
                                    <input type="radio" checked={brand.headerFooterTheme === 'light' || !brand.headerFooterTheme} onChange={() => updateBrand('headerFooterTheme', 'light')} className="w-4 h-4 text-indigo-600" />
                                    <span className="text-sm font-medium">Light</span>
                                </div>
                                <div className="w-4 h-4 rounded-full bg-white border border-gray-300"></div>
                            </label>
                            <label className={`flex items-center justify-between p-2 rounded border cursor-pointer ${brand.headerFooterTheme === 'dark' ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div className="flex items-center gap-2">
                                    <input type="radio" checked={brand.headerFooterTheme === 'dark'} onChange={() => updateBrand('headerFooterTheme', 'dark')} className="w-4 h-4 text-indigo-600" />
                                    <span className="text-sm font-medium">Dark</span>
                                </div>
                                <div className="w-4 h-4 rounded-full bg-gray-900 border border-gray-900"></div>
                            </label>
                            <label className={`flex items-center justify-between p-2 rounded border cursor-pointer ${brand.headerFooterTheme === 'brand' ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div className="flex items-center gap-2">
                                    <input type="radio" checked={brand.headerFooterTheme === 'brand'} onChange={() => updateBrand('headerFooterTheme', 'brand')} className="w-4 h-4 text-indigo-600" />
                                    <span className="text-sm font-medium">Brand</span>
                                </div>
                                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: brand.primaryColor, borderColor: brand.primaryColor }}></div>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">Header & Footer Text Color</label>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Custom Text Color</span>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={!!brand.headerFooterTextColor} onChange={(e) => updateBrand('headerFooterTextColor', e.target.checked ? '#ffffff' : undefined)} className="w-3.5 h-3.5" />
                                <input type="color" value={brand.headerFooterTextColor || '#000000'} disabled={!brand.headerFooterTextColor} onChange={e => updateBrand('headerFooterTextColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 disabled:opacity-50" />
                            </div>
                        </div>
                    </div>


                    


                    <div className="space-y-3 pt-6 border-t border-gray-200">
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><FileCode2 className="w-4 h-4" /> Global Scripts</label>
                        <p className="text-xs text-gray-500">Add tracking codes (like Meta Pixel, Google Analytics) to the entire website.</p>
                        <button 
                            onClick={() => setShowScriptsModal(true)}
                            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
                        >
                            <Code2 className="w-4 h-4" />
                            Edit Head & Body Scripts
                        </button>
                    </div>
                </div>
            ) : sidebarTab === 'pages' ? (
                <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900">Website Pages</h3>
                        <button 
                            onClick={() => {
                                setPageModalConfig({
                                    isOpen: true,
                                    mode: 'add',
                                    name: '',
                                    metaTitle: '',
                                    metaDescription: '',
                                    isPublished: true,
                                    navVisibility: 'both',
                                    bgType: 'color',
                                    bgValue: '#ffffff'
                                });
                            }}
                            className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    
                    {config.pages?.map((p: any, i: number) => (
                        <div key={p.id} className={`p-3 border rounded-xl flex flex-col gap-2 transition-all ${activePageId === p.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => changeActivePage(p.id)}>
                                    <div className={`w-2 h-2 rounded-full ${p.isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                    <span className="font-bold text-sm text-gray-800">{p.name}</span>
                                    {p.bgValue && p.bgType === 'color' && (
                                        <span 
                                            className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs" 
                                            style={{ backgroundColor: p.bgValue }} 
                                            title={`Page Bg: ${p.bgValue}`}
                                        />
                                    )}
                                    {activePageId === p.id && <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded ml-2">ACTIVE</span>}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPageModalConfig({
                                                isOpen: true,
                                                mode: 'edit',
                                                pageId: p.id,
                                                name: p.name,
                                                slug: p.slug || (p.id === 'home' ? '/' : `/${p.id}`),
                                                metaTitle: p.metaTitle || '',
                                                metaDescription: p.metaDescription || '',
                                                keywords: p.keywords || '',
                                                isPublished: p.isPublished !== false && p.isEnabled !== false,
                                                isNoIndex: p.isNoIndex === true,
                                                navVisibility: p.navVisibility || 'both',
                                                bgType: p.bgType || 'color',
                                                bgValue: p.bgValue || '#ffffff'
                                            });
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                        title="Edit Page Settings"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </button>
                                    {p.id !== 'home' && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!confirm(`Delete page ${p.name}?`)) return;
                                                const newConfig = JSON.parse(JSON.stringify(config));
                                                newConfig.pages.splice(i, 1);
                                                commitConfig(newConfig);
                                                if (activePageId === p.id) changeActivePage('home');
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete Page"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : sidebarTab === 'seo' ? (
                <div className="p-4 space-y-6">
                    {/* Favicon & Browser Tab Identity */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                                <Globe className="w-4 h-4 text-indigo-600" />
                                Browser Tab & Favicon
                            </label>
                            <span className="text-[10px] text-gray-400 font-medium">Tab Identity</span>
                        </div>

                        {/* Live Browser Tab Mockup */}
                        <div className="bg-gray-100 p-2.5 rounded-xl border border-gray-200">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Live Tab Preview</div>
                            <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm border border-gray-200">
                                {seo.favicon ? (
                                    <img src={seo.favicon} alt="Favicon" className="w-4 h-4 rounded object-contain shrink-0" />
                                ) : (
                                    <div className="w-4 h-4 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                        <Globe className="w-3 h-3" />
                                    </div>
                                )}
                                <span className="text-xs font-bold text-gray-800 truncate flex-1">
                                    {seo.metaTitle || brand?.companyName || website?.name || 'My Website Title'}
                                </span>
                                <span className="text-gray-300 text-xs font-mono">×</span>
                            </div>
                        </div>

                        {/* Upload Favicon Button */}
                        <div className="flex items-center gap-2">
                            <label className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-indigo-500 text-gray-700 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm ${uploadingFavicon ? 'opacity-50 pointer-events-none' : ''}`}>
                                <input 
                                    type="file" 
                                    accept="image/x-icon,image/png,image/svg+xml,image/jpeg,image/webp" 
                                    className="hidden" 
                                    onChange={handleFaviconUpload}
                                />
                                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                                {uploadingFavicon ? 'Uploading Favicon...' : seo.favicon ? 'Change Favicon' : 'Upload Favicon (.ico, .png)'}
                            </label>
                            {seo.favicon && (
                                <button 
                                    onClick={() => {
                                        updateSeo('favicon', '');
                                        updateBrand('favicon', '');
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 transition-colors"
                                    title="Remove Favicon"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 leading-tight">Upload a 32×32 or 64×64 PNG/ICO to replace the default icon in browser tabs.</p>
                    </div>

                    {/* Google SERP Preview & Meta Settings */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                                <Search className="w-4 h-4 text-indigo-600" />
                                Search Engine Snippet
                            </label>
                            <span className="text-[10px] text-gray-400 font-medium">Google SERP</span>
                        </div>

                        {/* Live Google Search Result Preview Card */}
                        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Google Search Result
                            </div>
                            <div className="pt-1.5 border-t border-gray-100">
                                <div className="text-[11px] text-gray-500 truncate">
                                    <span className="text-gray-800 font-semibold">https://{website?.domain || 'yourdomain.com'}</span>
                                </div>
                                <div className="text-sm text-blue-700 font-semibold hover:underline cursor-pointer truncate leading-tight mt-0.5">
                                    {seo.metaTitle || brand?.companyName || website?.name || 'Website Title'}
                                </div>
                                <div className="text-xs text-gray-600 line-clamp-2 mt-1 leading-relaxed">
                                    {seo.metaDescription || 'Add a compelling search description to attract visitors from Google and Bing searches.'}
                                </div>
                            </div>
                        </div>

                        {/* Meta Title */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-gray-700">Default Meta Title</span>
                                <span className={`text-[10px] font-medium ${(seo.metaTitle || '').length > 60 ? 'text-amber-600 font-bold' : (seo.metaTitle || '').length > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {(seo.metaTitle || '').length}/60 chars
                                </span>
                            </div>
                            <input 
                                type="text" 
                                value={seo.metaTitle || ''} 
                                onChange={e => updateSeo('metaTitle', e.target.value)} 
                                placeholder="e.g. Acme Corp - Modern Solutions & Professional Services" 
                                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white transition-all"
                            />
                        </div>

                        {/* Meta Description */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-gray-700">Default Meta Description</span>
                                <span className={`text-[10px] font-medium ${(seo.metaDescription || '').length > 160 ? 'text-amber-600 font-bold' : (seo.metaDescription || '').length > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {(seo.metaDescription || '').length}/160 chars
                                </span>
                            </div>
                            <textarea 
                                value={seo.metaDescription || ''} 
                                onChange={e => updateSeo('metaDescription', e.target.value)} 
                                placeholder="Discover high-quality products and professional services tailored to your needs. Fast delivery, dedicated support, and reliable results." 
                                rows={3} 
                                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white resize-none transition-all"
                            />
                        </div>

                        {/* Target Keywords */}
                        <div>
                            <span className="text-xs font-bold text-gray-700 block mb-1">SEO Target Keywords</span>
                            <input 
                                type="text" 
                                value={seo.keywords || ''} 
                                onChange={e => updateSeo('keywords', e.target.value)} 
                                placeholder="e.g. software, consulting, business tools, professional services" 
                                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white transition-all"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Separate keywords with commas.</p>
                        </div>
                    </div>

                    {/* Social Share & WhatsApp (OpenGraph) */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-indigo-600" />
                                Social Share & WhatsApp Card
                            </label>
                            <span className="text-[10px] text-gray-400 font-medium">OpenGraph</span>
                        </div>

                        {/* Live WhatsApp / Social Card Preview */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-sm">
                            {seo.ogImage ? (
                                <div className="h-32 w-full bg-cover bg-center border-b border-gray-200 relative group" style={{ backgroundImage: `url(${seo.ogImage})` }}>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">1200 × 630 Preview</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-28 w-full bg-indigo-50/40 flex flex-col items-center justify-center text-indigo-400 border-b border-gray-200">
                                    <ImageIcon className="w-7 h-7 mb-1 opacity-60" />
                                    <span className="text-[10px] font-medium text-gray-400">No share image uploaded</span>
                                </div>
                            )}
                            <div className="p-3 bg-white">
                                <div className="text-[10px] font-mono uppercase text-gray-400 truncate">{website?.domain || 'YOURDOMAIN.COM'}</div>
                                <div className="text-xs font-bold text-gray-800 truncate mt-0.5">{seo.metaTitle || brand?.companyName || website?.name || 'Website Title'}</div>
                                <div className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{seo.metaDescription || 'Website description will appear here when shared on WhatsApp or Facebook.'}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-indigo-500 text-gray-700 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm ${uploadingOgImage ? 'opacity-50 pointer-events-none' : ''}`}>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleOgUpload}
                                />
                                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                                {uploadingOgImage ? 'Uploading Image...' : seo.ogImage ? 'Change Social Image' : 'Upload Social Image (1200×630)'}
                            </label>
                            {seo.ogImage && (
                                <button 
                                    onClick={() => updateSeo('ogImage', '')}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 transition-colors"
                                    title="Remove Social Image"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Search Engine Indexing & Analytics */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <label className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-indigo-600" />
                            Indexing & Tracking
                        </label>

                        {/* Indexing Toggle */}
                        <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:border-indigo-300 transition-colors">
                            <div>
                                <div className="text-xs font-bold text-gray-800">Search Engine Indexing</div>
                                <div className="text-[10px] text-gray-500">Allow Google and Bing to crawl and index this website</div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={seo.allowIndexing !== false} 
                                onChange={e => updateSeo('allowIndexing', e.target.checked)} 
                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                            />
                        </label>
                        {seo.allowIndexing === false && (
                            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                Website is currently hidden from search engines (<code className="font-mono text-[10px] bg-amber-100 px-1 rounded">noindex, nofollow</code>).
                            </div>
                        )}

                        {/* Google Site Verification */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-gray-700">Google Site Verification Token</span>
                                {seo.googleVerification && (
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Token Active
                                    </span>
                                )}
                            </div>
                            <input 
                                type="text" 
                                value={seo.googleVerification || ''} 
                                onChange={e => {
                                    let val = e.target.value;
                                    // Auto-sanitize on paste if full tag or prefix is entered
                                    const metaMatch = val.match(/content=["']([^"']+)["']/i);
                                    if (metaMatch && metaMatch[1]) val = metaMatch[1].trim();
                                    val = val.replace(/^google-site-verification\s*=\s*/i, '').trim();
                                    updateSeo('googleVerification', val);
                                }} 
                                placeholder="e.g. google-site-verification=abc123xyz or abc123xyz" 
                                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white font-mono transition-all"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Paste your HTML tag or token from Google Search Console.</p>
                        </div>

                        {/* Google Analytics 4 */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-gray-700">Google Analytics 4 Measurement ID</span>
                                {seo.gaMeasurementId && (
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> GA4 Connected
                                    </span>
                                )}
                            </div>
                            <input 
                                type="text" 
                                value={seo.gaMeasurementId || ''} 
                                onChange={e => {
                                    let val = e.target.value.trim();
                                    const gMatch = val.match(/\b(G-[A-Za-z0-9]+)\b/);
                                    if (gMatch && gMatch[1]) val = gMatch[1].trim();
                                    updateSeo('gaMeasurementId', val);
                                }} 
                                placeholder="G-XXXXXXXXXX" 
                                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white font-mono transition-all"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Automatically injects the official Google <code className="font-mono text-[10px]">gtag.js</code> tracking script.</p>
                        </div>
                    </div>
                </div>
            ) : sidebarTab === 'media' ? (
                <MediaLibrary websiteId={website?.id} config={config} />
            ) : (
                <div className="p-4 space-y-6">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Base Elements</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { 
                                    type: 'text', 
                                    label: 'Text', 
                                    icon: <svg width="24" height="24" viewBox="0 0 32 32" fill="currentColor" className="mb-2"><path d="M6 8v3h4v13h4V11h4V8H6zm12 5v2.5h2.5v7.5h3v-7.5H26V13h-8z"/></svg> 
                                },
                                { 
                                    type: 'column', 
                                    label: 'Column', 
                                    icon: <svg width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><line x1="8" y1="6" x2="8" y2="26" /><line x1="24" y1="6" x2="24" y2="26" /><rect x="13" y="7" width="6" height="4" rx="1" /><rect x="13" y="14" width="6" height="4" rx="1" /><rect x="13" y="21" width="6" height="4" rx="1" /></svg> 
                                },
                                { 
                                    type: 'row', 
                                    label: 'Row', 
                                    icon: <svg width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><line x1="6" y1="8" x2="26" y2="8" /><line x1="6" y1="24" x2="26" y2="24" /><rect x="7" y="13" width="4" height="6" rx="1" /><rect x="14" y="13" width="4" height="6" rx="1" /><rect x="21" y="13" width="4" height="6" rx="1" /></svg> 
                                },
                                { 
                                    type: 'box', 
                                    label: 'Container', 
                                    icon: <svg width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" className="mb-2"><rect x="6" y="6" width="20" height="20" rx="3" /></svg> 
                                },
                                { 
                                    type: 'media', 
                                    label: 'Image', 
                                    icon: <svg width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" className="mb-2"><rect x="4" y="6" width="24" height="17" rx="4" /><circle cx="10" cy="11" r="2.5" fill="currentColor" stroke="none" /><path d="M4 19l6-6 6 6 4-3 4 3" strokeLinecap="round" /><line x1="8" y1="27" x2="24" y2="27" strokeLinecap="round" /></svg> 
                                },
                                { 
                                    type: 'button', 
                                    label: 'Button', 
                                    icon: <svg width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" className="mb-2"><rect x="4" y="6" width="24" height="20" rx="6" /><text x="16" y="20.5" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="sans-serif">BTN</text></svg> 
                                },
                                {
                                    type: 'code',
                                    label: 'Embed Code',
                                    icon: <Code2 className="w-6 h-6 mb-2 text-current" />
                                },
                                {
                                    type: 'line',
                                    label: 'Line Divider',
                                    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                },
                                {
                                    type: 'floating',
                                    label: 'Floating Bar',
                                    icon: <Anchor className="w-6 h-6 mb-2 text-current" />
                                }
                            ].map(({type, label, icon}) => (
                                <div 
                                    key={type}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('newSectionType', type);
                                        e.dataTransfer.setData('application/vnd.builder.element', type);
                                        e.dataTransfer.setData('text/plain', type);
                                    }}
                                    className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-xl bg-white text-gray-700 cursor-grab active:cursor-grabbing hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm text-center min-h-[90px]"
                                >
                                    {icon}
                                    <span className="font-medium text-[11px] leading-tight mt-1">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Composite Elements</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { 
                                    type: 'product', 
                                    label: 'Product / Service',
                                    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                                },
                                { 
                                    type: 'portfolio-element', 
                                    label: 'Project / Portfolio',
                                    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                                }
                            ].map(({type, label, icon}) => (
                                <div 
                                    key={type}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('newSectionType', type);
                                        e.dataTransfer.setData('application/vnd.builder.element', type);
                                        e.dataTransfer.setData('text/plain', type);
                                    }}
                                    className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-xl bg-white text-gray-700 cursor-grab active:cursor-grabbing hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm text-center min-h-[90px]"
                                >
                                    {icon}
                                    <span className="font-medium text-[11px] leading-tight mt-1">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {(() => {
                        const activePageIndex = config.pages?.findIndex((p: any) => p.id === activePageId);
                        if (activePageIndex === undefined || activePageIndex === -1) return null;
                        const activePage = config.pages[activePageIndex];
                        return (
                            <div className="pt-2 border-t border-gray-100">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Page Visibility</h4>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={activePage.showHeader !== false}
                                            onChange={(e) => {
                                                const newConfig = JSON.parse(JSON.stringify(config));
                                                newConfig.pages[activePageIndex].showHeader = e.target.checked;
                                                commitConfig(newConfig);
                                            }}
                                            className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                        />
                                        Show Header
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={activePage.showFooter !== false}
                                            onChange={(e) => {
                                                const newConfig = JSON.parse(JSON.stringify(config));
                                                newConfig.pages[activePageIndex].showFooter = e.target.checked;
                                                commitConfig(newConfig);
                                            }}
                                            className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                        />
                                        Show Footer
                                    </label>
                                </div>
                            </div>
                        );
                    })()}

                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Pre-built Sections</h4>
                        <div className="space-y-2">
                            {(() => {
                                const hasVideoSection = sections.some((s: any) => s.type === 'video');
                                return ['hero', 'grid', 'about', 'portfolio', 'faq', 'contact', 'video'].map(type => {
                                    const isVideoDisabled = type === 'video' && hasVideoSection;
                                    return (
                                        <div 
                                            key={type}
                                            draggable={!isVideoDisabled}
                                            onDragStart={(e) => {
                                                if (isVideoDisabled) {
                                                    e.preventDefault();
                                                    return;
                                                }
                                                e.dataTransfer.setData('newSectionType', type);
                                                e.dataTransfer.setData('application/vnd.builder.section', type);
                                                e.dataTransfer.setData('text/plain', type);
                                            }}
                                            className={`p-3.5 border rounded-xl flex items-center justify-between transition-colors ${
                                                isVideoDisabled 
                                                    ? 'border-gray-200 bg-gray-100/50 text-gray-400 cursor-not-allowed opacity-50' 
                                                    : 'border-gray-200 bg-white shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50'
                                            }`}
                                        >
                                            <span className="font-bold text-sm capitalize">
                                                {type === 'grid' 
                                                    ? 'Product/Service Section' 
                                                    : type === 'video' && hasVideoSection
                                                        ? 'Video Section (Added)'
                                                        : `${type} Section`
                                                }
                                            </span>
                                            <GripVertical className="w-4 h-4 text-gray-400" />
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}


            <PageSettingsModal 
                config={pageModalConfig} 
                setConfig={setPageModalConfig} 
                domain={website?.domain || 'yourdomain.com'}
                websiteId={website?.id}
                onSave={(newConfigData) => {
                    const newConfig = JSON.parse(JSON.stringify(config));
                    
                    if (newConfigData?.mode === 'add') {
                        const id = newConfigData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                        if (newConfig.pages.find((p: any) => p.id === id)) {
                            toast.error('A page with a similar name already exists');
                            return;
                        }
                        newConfig.pages.push({
                            id,
                            name: newConfigData.name,
                            slug: newConfigData.slug || `/${id}`,
                            isEnabled: newConfigData.isPublished,
                            isPublished: newConfigData.isPublished,
                            isNoIndex: newConfigData.isNoIndex,
                            keywords: newConfigData.keywords,
                            navVisibility: newConfigData.navVisibility,
                            metaTitle: newConfigData.metaTitle,
                            metaDescription: newConfigData.metaDescription,
                            bgType: newConfigData.bgType || 'color',
                            bgValue: newConfigData.bgValue || '#ffffff',
                            sections: []
                        });
                        commitConfig(newConfig);
                        changeActivePage(id);
                    } else if (newConfigData?.mode === 'edit') {
                        const pageIndex = newConfig.pages.findIndex((p: any) => p.id === newConfigData.pageId);
                        if (pageIndex !== -1) {
                            newConfig.pages[pageIndex].name = newConfigData.name;
                            if (newConfigData.slug) newConfig.pages[pageIndex].slug = newConfigData.slug;
                            newConfig.pages[pageIndex].isEnabled = newConfigData.isPublished;
                            newConfig.pages[pageIndex].isPublished = newConfigData.isPublished;
                            newConfig.pages[pageIndex].isNoIndex = newConfigData.isNoIndex;
                            newConfig.pages[pageIndex].keywords = newConfigData.keywords;
                            newConfig.pages[pageIndex].navVisibility = newConfigData.navVisibility;
                            newConfig.pages[pageIndex].metaTitle = newConfigData.metaTitle;
                            newConfig.pages[pageIndex].metaDescription = newConfigData.metaDescription;
                            newConfig.pages[pageIndex].bgType = newConfigData.bgType || 'color';
                            newConfig.pages[pageIndex].bgValue = newConfigData.bgValue || '#ffffff';
                            commitConfig(newConfig);
                        }
                    }
                }}
            />

            <GlobalScriptsModal 
                isOpen={showScriptsModal} 
                setIsOpen={setShowScriptsModal} 
                brand={brand} 
                updateBrand={updateBrand} 
            />
        </>
    );
}

function FontSelector({ value, onChange, availableFonts }: { value: string, onChange: (val: string) => void, availableFonts: string[] }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = search.trim() === '' 
        ? TOP_FONTS 
        : availableFonts.filter(f => f.toLowerCase().includes(search.toLowerCase())).slice(0, 50);

    return (
        <div className="relative" ref={containerRef}>
            <div 
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between text-sm p-2 border border-gray-200 rounded-lg cursor-pointer bg-white hover:border-indigo-400 transition-colors"
            >
                <span className="truncate font-medium">{value}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-64">
                    <div className="p-2 border-b border-gray-100 shrink-0">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search fonts..."
                                className="w-full text-xs pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto p-1 flex-1">
                        {search.trim() === '' && (
                            <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">Popular Fonts</div>
                        )}
                        {filtered.length === 0 ? (
                            <div className="p-3 text-center text-xs text-gray-500">No fonts found</div>
                        ) : (
                            filtered.map(font => (
                                <button
                                    key={font}
                                    onClick={() => {
                                        onChange(font);
                                        setOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center justify-between transition-colors ${value === font ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                                    style={{ fontFamily: `"${font}", sans-serif` }}
                                >
                                    {font}
                                    {value === font && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
