'use client';

import { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Monitor, Smartphone, Tablet, Save, GripVertical, Settings2, Undo2, Redo2, Palette, Search, Plus, Trash2, Edit3, Image as ImageIcon, Link as LinkIcon, Type, MousePointer2, Settings, BoxSelect, Maximize, RotateCcw, ChevronDown, Check } from 'lucide-react';
import { ElementType, ElementNode } from './types';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// Common Google Fonts
const TOP_FONTS = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
    'Source Sans Pro', 'Oswald', 'Raleway', 'PT Sans', 'Merriweather', 'Nunito'
];

interface SettingsSidebarProps {
    brand: any;
    updateBrand: (key: string, value: any) => void;
    revertToDefault: () => void;
    config: any;
    commitConfig: (config: any) => void;
    activePageId: string;
    changeActivePage: (id: string) => void;
    sections: any[];
    currencySymbol: string;
    getDefaultSectionsForPageType: (pageType: string, currencySymbol: string) => any[];
}

export default function SettingsSidebar({
    brand,
    updateBrand,
    revertToDefault,
    config,
    commitConfig,
    activePageId,
    changeActivePage,
    sections,
    currencySymbol,
    getDefaultSectionsForPageType,
}: SettingsSidebarProps) {
    const [sidebarTab, setSidebarTab] = useState<'styles' | 'sections' | 'pages'>('sections');
    const [uploadingBg, setUploadingBg] = useState(false);
    const [availableFonts, setAvailableFonts] = useState<string[]>([
        'Inter', 'Roboto', 'Playfair Display', 'Montserrat', 'Open Sans', 'Outfit', 'Poppins', 'Lato', 'Arial'
    ]);

    const handleBgUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingBg(true);
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await api.post('/api/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.url) {
                updateBrand('bgValue', res.data.url);
            } else {
                toast.error('Upload failed');
            }
        } catch (err) {
            console.error('Upload error:', err);
            toast.error('Failed to upload image');
        } finally {
            setUploadingBg(false);
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
            {/* Tab Bar */}
            <div className="flex border-b border-gray-200">
                <button onClick={() => setSidebarTab('sections')} className={`flex-1 p-4 text-sm font-bold border-b-2 ${sidebarTab === 'sections' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>Sections</button>
                <button onClick={() => setSidebarTab('pages')} className={`flex-1 p-4 text-sm font-bold border-b-2 ${sidebarTab === 'pages' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>Pages</button>
                <button onClick={() => setSidebarTab('styles')} className={`flex-1 p-4 text-sm font-bold border-b-2 ${sidebarTab === 'styles' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>Theme</button>
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

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">Background</label>
                        <div className="flex gap-2">
                            <button onClick={() => updateBrand('bgType', 'color')} className={`flex-1 py-1.5 text-xs font-bold rounded ${brand.bgType === 'color' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>Color</button>
                            <button onClick={() => updateBrand('bgType', 'image')} className={`flex-1 py-1.5 text-xs font-bold rounded ${brand.bgType === 'image' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>Image</button>
                        </div>
                        {brand.bgType === 'color' ? (
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-sm">Bg Color</span>
                                <input type="color" value={brand.bgValue || '#ffffff'} onChange={e => updateBrand('bgValue', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                            </div>
                        ) : (
                            <div className="mt-2 space-y-2">
                                {brand.bgValue ? (
                                    <div className="relative rounded-lg overflow-hidden border border-gray-200">
                                        <img src={brand.bgValue} alt="Background" className="w-full h-24 object-cover" />
                                        <button 
                                            onClick={() => updateBrand('bgValue', '')}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-md shadow-sm hover:bg-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {uploadingBg ? (
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                            ) : (
                                                <>
                                                    <ImageIcon className="w-6 h-6 text-gray-400 mb-2" />
                                                    <p className="text-xs text-gray-500">Click to upload image</p>
                                                </>
                                            )}
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} disabled={uploadingBg} />
                                    </label>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp Widget</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                checked={config.whatsapp?.enabled || false}
                                onChange={(e) => {
                                    const newConfig = JSON.parse(JSON.stringify(config));
                                    if (!newConfig.whatsapp) newConfig.whatsapp = {};
                                    newConfig.whatsapp.enabled = e.target.checked;
                                    // Default values if not set
                                    if (!newConfig.whatsapp.position) newConfig.whatsapp.position = 'bottom-right';
                                    if (!newConfig.whatsapp.phone) newConfig.whatsapp.phone = '';
                                    commitConfig(newConfig);
                                }}
                            />
                            <span className="text-sm font-medium">Enable WhatsApp Button</span>
                        </div>
                        {config.whatsapp?.enabled && (
                            <div className="space-y-3 mt-2 pl-6">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Phone Number</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 1234567890" 
                                        value={config.whatsapp?.phone || ''}
                                        onChange={(e) => {
                                            const newConfig = JSON.parse(JSON.stringify(config));
                                            newConfig.whatsapp.phone = e.target.value;
                                            commitConfig(newConfig);
                                        }}
                                        className="w-full text-xs p-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Position & Style</label>
                                    <select
                                        value={config.whatsapp?.position || 'bottom-right'}
                                        onChange={(e) => {
                                            const newConfig = JSON.parse(JSON.stringify(config));
                                            newConfig.whatsapp.position = e.target.value;
                                            commitConfig(newConfig);
                                        }}
                                        className="w-full text-xs p-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                                    >
                                        <option value="bottom-right">Bottom Right (Floating Circle)</option>
                                        <option value="middle-right">Middle Right (Rectangular Stick)</option>
                                        <option value="middle-left">Middle Left (Rectangular Stick)</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <button 
                            onClick={revertToDefault}
                            className="w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Revert to Default Theme
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">Warning: Resets all custom sections.</p>
                    </div>
                </div>
            ) : sidebarTab === 'pages' ? (
                <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900">Website Pages</h3>
                        <button 
                            onClick={() => {
                                const name = prompt("Enter page name:");
                                if (!name) return;
                                const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                const newConfig = {
                                    ...config,
                                    pages: [
                                        ...(config.pages || []),
                                        { 
                                            id, 
                                            name, 
                                            slug: `/${id}`, 
                                            isEnabled: true, 
                                            sections: getDefaultSectionsForPageType(id, currencySymbol) 
                                        }
                                    ]
                                };
                                commitConfig(newConfig);
                                changeActivePage(id);
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
                                    {activePageId === p.id && <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded ml-2">ACTIVE</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100/50">
                                <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={p.isEnabled}
                                        onChange={(e) => {
                                            const newConfig = JSON.parse(JSON.stringify(config));
                                            newConfig.pages[i].isEnabled = e.target.checked;
                                            commitConfig(newConfig);
                                        }}
                                    />
                                    Visible in Nav
                                </label>
                                <div className="flex-1"></div>
                                <button 
                                    onClick={() => {
                                        const newName = prompt("Rename page:", p.name);
                                        if (!newName) return;
                                        const newConfig = JSON.parse(JSON.stringify(config));
                                        newConfig.pages[i].name = newName;
                                        commitConfig(newConfig);
                                    }}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                >
                                    Rename
                                </button>
                                {p.id !== 'home' && (
                                    <button 
                                        onClick={() => {
                                            if (!confirm(`Delete page ${p.name}?`)) return;
                                            const newConfig = JSON.parse(JSON.stringify(config));
                                            newConfig.pages.splice(i, 1);
                                            commitConfig(newConfig);
                                             if (activePageId === p.id) changeActivePage('home');
                                        }}
                                        className="text-xs font-bold text-red-500 hover:text-red-700 ml-2"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                            
                            {activePageId === p.id && (
                                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">SEO Settings</h4>
                                    <div>
                                        <label className="text-[10px] font-semibold text-gray-600 block mb-1">Meta Title</label>
                                        <input
                                            type="text"
                                            placeholder="Page Title"
                                            value={p.metaTitle || ''}
                                            onChange={(e) => {
                                                const newConfig = JSON.parse(JSON.stringify(config));
                                                newConfig.pages[i].metaTitle = e.target.value;
                                                commitConfig(newConfig);
                                            }}
                                            className="w-full text-xs p-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-gray-600 block mb-1">Meta Description</label>
                                        <textarea
                                            placeholder="Page Description..."
                                            value={p.metaDescription || ''}
                                            rows={2}
                                            onChange={(e) => {
                                                const newConfig = JSON.parse(JSON.stringify(config));
                                                newConfig.pages[i].metaDescription = e.target.value;
                                                commitConfig(newConfig);
                                            }}
                                            className="w-full text-xs p-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-4 space-y-6">
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
                                                    : 'border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:bg-indigo-50'
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

                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Raw Elements</h4>
                        <div className="space-y-2">
                            {['box', 'text', 'media', 'button', 'line'].map(type => (
                                <div 
                                    key={type}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('newSectionType', type);
                                        e.dataTransfer.setData('application/vnd.builder.element', type);
                                        e.dataTransfer.setData('text/plain', type);
                                    }}
                                    className="p-3.5 border border-gray-200 rounded-xl bg-gray-50 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-between"
                                >
                                    <span className="font-bold text-sm capitalize">{type} Element</span>
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Composite Elements</h4>
                        <div className="space-y-2">
                            {['product', 'portfolio-element'].map(type => (
                                <div 
                                    key={type}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('newSectionType', type);
                                        e.dataTransfer.setData('application/vnd.builder.element', type);
                                        e.dataTransfer.setData('text/plain', type);
                                    }}
                                    className="p-3.5 border border-gray-200 rounded-xl bg-gray-50 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-between"
                                >
                                    <span className="font-bold text-sm capitalize">{type === 'product' ? 'Product/Service' : 'Project/Portfolio'} Element</span>
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
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
