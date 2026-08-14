'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BuilderElement } from './BuilderElement';
import { getDefaultElementForType, getDefaultSectionsForPageType } from './ElementFactory';

import { LayoutTemplate, Settings, Save, Eye, ArrowLeft, Monitor, Tablet, Smartphone, Search, RefreshCw, X, ChevronDown, Check, MousePointer2, Image as ImageIcon, Type, Layout, Palette, MapPin, Phone, Mail, Sparkles, ShieldCheck, User, CheckCircle2, Plus, Trash2, ArrowUp, ArrowDown, MessageSquare, List, GripVertical, Undo2, Redo2, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';

function EditableText({ value, onChange, className, style, tagName = 'div', placeholder }: any) {
    const Tag = tagName as any;
    return (
        <Tag
            contentEditable
            suppressContentEditableWarning
            className={`outline-none hover:ring-2 hover:ring-indigo-400 focus:ring-2 focus:ring-indigo-500 rounded px-1 transition-all ${className}`}
            style={style}
            onBlur={(e) => {
                const text = e.currentTarget.textContent || '';
                if (text !== value) {
                    onChange(text);
                }
            }}
            dangerouslySetInnerHTML={{ __html: value || placeholder }}
        />
    );
}

export default function WebsiteEditorPage() {
    const { id } = useParams();
    const router = useRouter();
    const [website, setWebsite] = useState<any>(null);
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const { company } = useAuth();
    const { company: settingsCompany } = useSettings();
    const currencySymbol = settingsCompany?.currencySymbol || '$';
    
    // Task 1: View Modes
    const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    
    // Task 2: Undo / Redo
    const [history, setHistory] = useState<any[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    useEffect(() => {
        fetchWebsite();
    }, [id]);

    const fetchWebsite = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/websites/${id}`);
            setWebsite(res.data.website);
            
            // Normalize sections to array
            const loadedConfig = res.data.website.config || {};
            if (!Array.isArray(loadedConfig.sections)) {
                // If they are on the old object-based format, convert them (or just reset to empty array)
                loadedConfig.sections = [
                    { id: 'sec-1', type: 'hero', data: loadedConfig.hero || { title: 'Welcome' } },
                    ...(loadedConfig.sections?.benefits?.active ? [{ id: 'sec-2', type: 'services', data: loadedConfig.sections.benefits }] : []),
                    ...(loadedConfig.sections?.faq?.active ? [{ id: 'sec-3', type: 'faq', data: loadedConfig.sections.faq }] : [])
                ];
            }
            if (!loadedConfig.brand) {
                loadedConfig.brand = loadedConfig.colors ? { primaryColor: loadedConfig.colors.primary, secondaryColor: loadedConfig.colors.secondary, textColor: '#111827', headingFont: 'Inter', bodyFont: 'Inter', bgType: 'color', bgValue: '#ffffff' } : { primaryColor: '#4f46e5', secondaryColor: '#ffffff', textColor: '#111827', headingFont: 'Inter', bodyFont: 'Inter', bgType: 'color', bgValue: '#ffffff' };
            }
            setConfig(loadedConfig);
            setHistory([JSON.parse(JSON.stringify(loadedConfig))]);
            setHistoryIndex(0);
        } catch (err) {
            console.error('Failed to load website:', err);
            toast.error('Failed to load website');
            router.push('/dashboard/advertising');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.patch(`/api/websites/${id}`, { config });
            toast.success('Website saved successfully!');
        } catch (err) {
            console.error('Failed to save:', err);
            toast.error('Failed to save website');
        } finally {
            setSaving(false);
        }
    };

    const commitConfig = (newConfig: any) => {
        setConfig(newConfig);
        const nextHistory = history.slice(0, historyIndex + 1);
        nextHistory.push(JSON.parse(JSON.stringify(newConfig)));
        setHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setConfig(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setConfig(JSON.parse(JSON.stringify(history[historyIndex + 1])));
        }
    };

    const revertToDefault = () => {
        if (!confirm("Are you sure you want to revert to the default template? All your content changes will be lost.")) return;
        const defaultSections = [
            { id: 'sec-' + Date.now() + 1, type: 'hero', data: getDefaultElementForType('hero', currencySymbol) },
            { id: 'sec-' + Date.now() + 2, type: 'services', data: getDefaultElementForType('services', currencySymbol) },
            { id: 'sec-' + Date.now() + 3, type: 'about', data: getDefaultElementForType('about', currencySymbol) },
            { id: 'sec-' + Date.now() + 4, type: 'contact', data: getDefaultElementForType('contact', currencySymbol) }
        ];
        commitConfig({
            ...config,
            sections: defaultSections
        });
    };

    const updateBrand = (key: string, value: any) => {
        const newConfig = {
            ...config,
            brand: { ...config.brand, [key]: value }
        };
        commitConfig(newConfig);
    };

    
    const updateElement = (id: string, path: string, value: any) => {
        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;
        
        const updateRecursive = (nodes: any[]): boolean => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === id) {
                    const keys = path.split('.');
                    let current = nodes[i].data;
                    if (path === 'style' || path.startsWith('style.')) {
                        if (!nodes[i].style) nodes[i].style = {};
                        current = nodes[i].style;
                        const styleKeys = path === 'style' ? [] : path.split('.').slice(1);
                        if (styleKeys.length === 0) {
                            nodes[i].style = value;
                        } else {
                            for (let j = 0; j < styleKeys.length - 1; j++) {
                                if (!current[styleKeys[j]]) current[styleKeys[j]] = {};
                                current = current[styleKeys[j]];
                            }
                            current[styleKeys[styleKeys.length - 1]] = value;
                        }
                    } else if (path === 'all') {
                        nodes[i].data = value;
                    } else {
                        for (let j = 0; j < keys.length - 1; j++) {
                            if (!current[keys[j]]) current[keys[j]] = {};
                            current = current[keys[j]];
                        }
                        current[keys[keys.length - 1]] = value;
                    }
                    return true;
                }
                if (nodes[i].children && updateRecursive(nodes[i].children)) {
                    return true;
                }
            }
            return false;
        };
        
        updateRecursive(newConfig.pages[pIndex].sections);
        commitConfig(newConfig);
    };

    const removeElement = (id: string) => {
        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;
        
        const removeRecursive = (nodes: any[]): boolean => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === id) {
                    nodes.splice(i, 1);
                    return true;
                }
                if (nodes[i].children && removeRecursive(nodes[i].children)) {
                    return true;
                }
            }
            return false;
        };
        
        removeRecursive(newConfig.pages[pIndex].sections);
        commitConfig(newConfig);
        if (selectedElementId === id) setSelectedElementId(null);
    };

    const handleDragEndDnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;
        
        let draggedNode: any = null;
        let sourceArray: any[] | null = null;
        let sourceIndex = -1;

        // Find and remove dragged element
        const findAndRemove = (nodes: any[]): boolean => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === active.id) {
                    draggedNode = nodes[i];
                    sourceArray = nodes;
                    sourceIndex = i;
                    nodes.splice(i, 1);
                    return true;
                }
                if (nodes[i].children && findAndRemove(nodes[i].children)) return true;
            }
            return false;
        };
        findAndRemove(newConfig.pages[pIndex].sections);
        
        if (!draggedNode) return;

        // Find target and insert
        const findAndInsert = (nodes: any[]): boolean => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === over.id) {
                    // insert at same level
                    nodes.splice(i, 0, draggedNode);
                    return true;
                }
                if (nodes[i].children && findAndInsert(nodes[i].children)) return true;
            }
            return false;
        };
        
        if (!findAndInsert(newConfig.pages[pIndex].sections)) {
            // Fallback, put it back
            if (sourceArray && sourceIndex !== -1) {
                sourceArray.splice(sourceIndex, 0, draggedNode);
            }
        }
        
        commitConfig(newConfig);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );
const moveSection = (index: number, direction: 'up' | 'down') => {
        const newConfig = JSON.parse(JSON.stringify(config));
        const sections = newConfig.sections;
        if (direction === 'up' && index > 0) {
            [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
        } else if (direction === 'down' && index < sections.length - 1) {
            [sections[index + 1], sections[index]] = [sections[index], sections[index + 1]];
        }
        commitConfig(newConfig);
    };

    const removeSection = (index: number) => {
        if (!confirm('Are you sure you want to remove this section?')) return;
        const newConfig = JSON.parse(JSON.stringify(config));
        newConfig.sections.splice(index, 1);
        commitConfig(newConfig);
    };

    const addSection = (type: string, index: number) => {
        const newSection = {
            id: 'sec-' + Date.now(),
            type,
            data: getDefaultElementForType(type, currencySymbol)
        };
        const newConfig = JSON.parse(JSON.stringify(config));
        newConfig.sections.splice(index, 0, newSection);
        commitConfig(newConfig);
    };

    if (loading || !website || !config) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <LogoLoader className="w-10 h-10 animate-spin text-indigo-600" />
                <p className="text-gray-500 text-sm mt-4">Loading editor...</p>
            </div>
        );
    }

    const brand = config.brand || {};
    const primaryColor = brand.primaryColor || '#4f46e5';
    const sections = config.sections || [];

    return (
        <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
            {/* Editor Toolbar */}
            <div className="flex-none sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push(`/dashboard/advertising/${id}`)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-sm font-bold text-gray-900">Editing: {website.name}</h1>
                        <p className="text-xs text-gray-500">Click any text on the page to edit</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setViewMode('desktop')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'desktop' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}><Monitor className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('tablet')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'tablet' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}><Tablet className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('mobile')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'mobile' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}><Smartphone className="w-4 h-4" /></button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
                        <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
                        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"><Redo2 className="w-4 h-4" /></button>
                    </div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => window.open(`/p/${website.slug}`, '_blank')}
                        className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                    >
                        Preview
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all disabled:opacity-50"
                    >
                        {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Publish Changes
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Optional Settings Sidebar */}
                {showSettings && (
                    <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="font-bold text-gray-900">Global Styles</h3>
                        </div>
                        <div className="p-4 space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase">Colors</label>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Primary Color</span>
                                    <input type="color" value={brand.primaryColor} onChange={e => updateBrand('primaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Text Color</span>
                                    <input type="color" value={brand.textColor || '#111827'} onChange={e => updateBrand('textColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase">Typography</label>
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-500">Heading Font</span>
                                    <select value={brand.headingFont} onChange={e => updateBrand('headingFont', e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg">
                                        <option value="Inter">Inter</option>
                                        <option value="Roboto">Roboto</option>
                                        <option value="Playfair Display">Playfair Display</option>
                                        <option value="Montserrat">Montserrat</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-500">Body Font</span>
                                    <select value={brand.bodyFont} onChange={e => updateBrand('bodyFont', e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg">
                                        <option value="Inter">Inter</option>
                                        <option value="Roboto">Roboto</option>
                                        <option value="Open Sans">Open Sans</option>
                                    </select>
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
                                        <input type="text" placeholder="Image URL..." value={brand.bgValue || ''} onChange={e => updateBrand('bgValue', e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
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
                    </div>
                )}

                {/* Live Website Canvas */}
                <div className="flex-1 overflow-auto p-4 md:p-8 bg-gray-100 flex justify-center">
                    <div 
                        className={`relative transition-all duration-300 ${viewMode === 'mobile' ? 'w-[375px]' : viewMode === 'tablet' ? 'w-[768px]' : 'w-full max-w-[1200px]'} ${viewMode !== 'desktop' ? 'bg-white shadow-[0_0_0_12px_rgba(0,0,0,0.8),0_0_0_14px_rgba(255,255,255,0.1)] rounded-[2.5rem] overflow-hidden my-8 border border-gray-800' : 'bg-white shadow-xl overflow-hidden border border-gray-200'}`}
                        style={{ 
                            fontFamily: brand.bodyFont || 'Inter',
                            color: brand.textColor || '#111827',
                            backgroundColor: brand.bgType === 'color' ? (brand.bgValue || brand.secondaryColor) : 'transparent',
                            backgroundImage: brand.bgType === 'image' && brand.bgValue ? `url(${brand.bgValue})` : 'none',
                            backgroundSize: 'cover',
                            backgroundAttachment: 'fixed',
                            backgroundPosition: 'center',
                            '--primary': primaryColor,
                            '--heading-font': brand.headingFont || 'Inter'
                        } as any}
                    >
                        {/* Header */}
                        <header className="px-6 py-8 flex justify-center group relative backdrop-blur-md bg-white/30 border-b border-black/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-white font-black text-xl" style={{ backgroundColor: primaryColor }}>
                                    {website.name[0]}
                                </div>
                                <span className="text-xl font-black tracking-tight">{website.name}</span>
                            </div>
                        </header>

                        <SectionAdder onAdd={(type) => addSection(type, 0)} />

                        {/* Dynamic Sections Loop */}
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndDnd}>
                            <SortableContext items={sections.map((s:any) => s.id)} strategy={verticalListSortingStrategy}>
                                {sections.map((section: any) => (
                                    <BuilderElement 
                                        key={section.id}
                                        node={section}
                                        selectedElementId={selectedElementId}
                                        setSelectedElementId={setSelectedElementId}
                                        updateElement={updateElement}
                                        removeElement={removeElement}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>

                        <footer className="py-12 border-t border-black/10 text-center backdrop-blur-md bg-white/30 mt-12">
                            <p className="text-sm opacity-60 font-medium">© {new Date().getFullYear()} {website.name}. All Rights Reserved.</p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helpers

function FakeLeadForm({ primaryColor, buttonText }: any) {
    return (
        <div className="space-y-5 bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-black/5 border border-gray-100 text-left pointer-events-none">
            <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input disabled type="text" placeholder="John Doe" className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm" />
                </div>
            </div>
            <button 
                disabled
                className="w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor || '#4f46e5' }}
            >
                {buttonText || 'Get Started Now'}
            </button>
        </div>
    );
}

function SectionAdder({ onAdd }: { onAdd: (type: string) => void }) {
    return (
        <div className="relative group/adder h-0 hover:h-12 py-1 flex justify-center items-center transition-all z-20">
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/adder:opacity-100 transition-opacity">
                <div className="w-full h-px bg-indigo-200 absolute inset-x-0" />
                <div className="bg-white px-2 relative group/menu">
                    <button className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white shadow-lg hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5" />
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-2 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all flex flex-col gap-1">
                        <button onClick={() => onAdd('hero')} className="text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg text-gray-700">Hero Section</button>
                        <button onClick={() => onAdd('services')} className="text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg text-gray-700">Services Grid</button>
                        <button onClick={() => onAdd('products')} className="text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg text-gray-700">Products Grid</button>
                        <button onClick={() => onAdd('about')} className="text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg text-gray-700">About Us</button>
                        <button onClick={() => onAdd('faq')} className="text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg text-gray-700">FAQ / Accordeon</button>
                        <button onClick={() => onAdd('contact')} className="text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg text-gray-700">Contact Form</button>
                        <button onClick={() => onAdd('text')} className="text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg text-gray-700">Rich Text Area</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
