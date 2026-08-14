'use client';

import { LogoLoader } from "@workspace/ui";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BuilderElement } from './BuilderElement';
import { getDefaultElementForType } from './ElementFactory';

import {
    LayoutTemplate, Settings, Save, Eye, ArrowLeft, Monitor, Tablet, Smartphone,
    Search, RefreshCw, X, ChevronDown, Check, MousePointer2, Image as ImageIcon,
    Type, Layout, Palette, MapPin, Phone, Mail, Sparkles, ShieldCheck, User,
    CheckCircle2, Plus, Trash2, ArrowUp, ArrowDown, MessageSquare, List,
    GripVertical, Undo2, Redo2, RotateCcw, Video, Upload
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import PropertyPanel from './PropertyPanel';
import SettingsSidebar from './SettingsSidebar';
import TextEditor from './TextEditor';

function EditableText({ tagName: Tag = 'div', value, onChange, placeholder, className, style }: any) {
    const [showToolbar, setShowToolbar] = useState(false);
    const editorRef = useRef<any>(null);
    const lastHtml = useRef(value);
    const initialHtml = useRef(value || placeholder || '');

    // Only update innerHTML if value changed from outside
    useEffect(() => {
        if (editorRef.current && value !== lastHtml.current) {
            editorRef.current.innerHTML = value || placeholder || '';
            lastHtml.current = value;
        }
    }, [value, placeholder]);

    const checkSelection = () => {
        setTimeout(() => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0 && editorRef.current?.contains(selection.anchorNode)) {
                setShowToolbar(true);
            } else {
                setShowToolbar(false);
            }
        }, 10);
    };

    const handleInput = (e: any) => {
        const html = e.currentTarget.innerHTML || '';
        lastHtml.current = html;
        if (html !== value) {
            onChange(html);
        }
    };

    return (
        <>
            <TextEditor
                anchorRef={editorRef}
                visible={showToolbar}
                onClose={() => setShowToolbar(false)}
            />
            <Tag
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className={`outline-none hover:ring-2 hover:ring-indigo-400 focus:ring-2 focus:ring-indigo-500 rounded px-1 transition-all ${className}`}
                style={style}
                onMouseUp={checkSelection}
                onKeyUp={checkSelection}
                onInput={handleInput}
                onBlur={() => setTimeout(() => setShowToolbar(false), 200)}
                dangerouslySetInnerHTML={{ __html: initialHtml.current }}
            />
        </>
    );
}

function MediaCarousel({ images = [], videoUrl = '', muted = true, className = '', style = {} }: any) {
    const [activeIdx, setActiveIdx] = useState(0);
    const hasVideo = !!videoUrl;
    const mediaCount = (images?.length || 0) + (hasVideo ? 1 : 0);

    if (mediaCount === 0) {
        return (
            <div className={`bg-gray-100 flex items-center justify-center text-gray-400 ${className}`}>
                <ImageIcon className="w-8 h-8 opacity-20" />
            </div>
        );
    }

    const renderMedia = (idx: number) => {
        if (hasVideo && idx === 0) {
            const embedUrl = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')
                ? `https://www.youtube.com/embed/${videoUrl.split('v=')[1]?.split('&')[0] || videoUrl.split('/').pop()}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&loop=1`
                : videoUrl;

            return videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                <iframe src={embedUrl} className="w-full h-full object-cover pointer-events-none" frameBorder="0" allow="autoplay; encrypted-media"></iframe>
            ) : (
                <video src={videoUrl} className="w-full h-full object-cover" autoPlay muted={muted} loop playsInline />
            );
        }

        const imgIdx = hasVideo ? idx - 1 : idx;
        return <img src={images[imgIdx]} alt="" className="w-full h-full object-cover" />;
    };

    return (
        <div className={`relative group overflow-hidden bg-black ${className}`}>
            <div className="w-full h-full">
                {renderMedia(activeIdx)}
            </div>
            {mediaCount > 1 && (
                <>
                    <button
                        onClick={() => setActiveIdx((prev) => (prev - 1 + mediaCount) % mediaCount)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        ‹
                    </button>
                    <button
                        onClick={() => setActiveIdx((prev) => (prev + 1) % mediaCount)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        ›
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {Array.from({ length: mediaCount }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveIdx(i)}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${activeIdx === i ? 'bg-white w-3' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function ImageEditor({ imageUrl, onChange, className = '', iconOnly = false, primaryColor = '#4f46e5', style = {} }: any) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.post('/api/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.url) {
                onChange(res.data.url);
            } else {
                toast.error('Upload failed');
            }
        } catch (err) {
            console.error('Upload error:', err);
            toast.error('Failed to upload image');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className={`relative group/img overflow-hidden ${className}`} style={style}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
            />
            {imageUrl ? (
                <img src={imageUrl} alt="img" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-black/5 flex flex-col items-center justify-center gap-2 min-h-[150px]">
                    {uploading ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                            <LogoLoader className="w-5 h-5 animate-spin" /> Uploading...
                        </div>
                    ) : iconOnly ? (
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                    ) : (
                        <>
                            <ImageIcon className="w-12 h-12 opacity-20" />
                            <span className="text-sm font-medium opacity-40">Click to add image</span>
                        </>
                    )}
                </div>
            )}
            {!uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-white rounded-lg text-sm font-bold text-gray-900 shadow-xl"
                    >
                        {imageUrl ? 'Change Image' : 'Upload Image'}
                    </button>
                </div>
            )}
        </div>
    );
}

function VideoEditor({ sectionData, onChange, className = '' }: any) {
    const { sourceType = 'youtube', videoUrl = '', autoplay = false, muted = true } = sectionData;
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.post('/api/files/upload-video', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.url) {
                onChange({ ...sectionData, sourceType: 'upload', videoUrl: res.data.url });
            } else {
                toast.error('Upload failed');
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            toast.error(err.response?.data?.error || 'Failed to upload video');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const embedUrl = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')
        ? `https://www.youtube.com/embed/${videoUrl.split('v=')[1]?.split('&')[0] || videoUrl.split('/').pop()}?autoplay=${autoplay ? 1 : 0}&mute=${muted ? 1 : 0}&controls=0&loop=1`
        : videoUrl;

    return (
        <div className={`relative group/video overflow-hidden bg-black ${className}`}>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*" className="hidden" />

            {videoUrl ? (
                sourceType === 'youtube' ? (
                    <iframe
                        className="w-full h-full pointer-events-none"
                        src={embedUrl}
                        frameBorder="0"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                    ></iframe>
                ) : (
                    <video
                        src={videoUrl}
                        className="w-full h-full object-cover"
                        autoPlay={autoplay}
                        muted={muted}
                        loop
                        playsInline
                    />
                )
            ) : (
                <div className="w-full h-[300px] flex flex-col items-center justify-center gap-2 text-white/50">
                    <Monitor className="w-12 h-12 opacity-50" />
                    <span className="text-sm font-medium">Click to setup video</span>
                </div>
            )}

            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity p-4 z-20">
                {uploading ? (
                    <div className="text-white flex items-center gap-2 font-bold">
                        <LogoLoader className="w-5 h-5 animate-spin" /> Processing Video...
                    </div>
                ) : (
                    <div className="w-full max-w-sm space-y-4">
                        <div className="flex gap-2">
                            <button onClick={() => onChange({ ...sectionData, sourceType: 'youtube' })} className={`flex-1 py-2 text-sm font-bold rounded ${sourceType === 'youtube' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>YouTube</button>
                            <button onClick={() => onChange({ ...sectionData, sourceType: 'upload' })} className={`flex-1 py-2 text-sm font-bold rounded ${sourceType === 'upload' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>Upload</button>
                        </div>

                        {sourceType === 'youtube' ? (
                            <input
                                type="text"
                                placeholder="YouTube URL..."
                                value={videoUrl}
                                onChange={(e) => onChange({ ...sectionData, videoUrl: e.target.value })}
                                className="w-full bg-white/10 border-0 text-white px-3 py-2 rounded text-sm placeholder-white/50 focus:ring-2 focus:ring-indigo-500"
                            />
                        ) : (
                            <div className="text-center">
                                <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2 bg-white text-gray-900 rounded-lg text-sm font-bold hover:bg-gray-100">Upload Video (Max 30s)</button>
                            </div>
                        )}

                        <div className="flex justify-center gap-4 pt-2">
                            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                <input type="checkbox" checked={autoplay} onChange={(e) => onChange({ ...sectionData, autoplay: e.target.checked })} /> Autoplay
                            </label>
                            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                <input type="checkbox" checked={muted} onChange={(e) => onChange({ ...sectionData, muted: e.target.checked })} /> Muted
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function WebsiteEditorPage() {
    const { id } = useParams();
    const router = useRouter();
    const [website, setWebsite] = useState<any>(null);
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSettings, setShowSettings] = useState(true);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const { company } = useAuth();
    const { company: settingsCompany } = useSettings();
    const currencySymbol = settingsCompany?.currencySymbol || '$';

    // View Modes
    const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

    // Multi-Page State
    const [activePageId, setActivePageId] = useState<string>('home');

    const changeActivePage = (pageId: string) => {
        setSelectedElementId(null);
        setActivePageId(pageId);
    };

    // Undo / Redo
    const [history, setHistory] = useState<any[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyTimeoutRef = useRef<any>(null);

    // Drag and Drop
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
    const [nativeDragOverIndex, setNativeDragOverIndex] = useState<number | null>(null);

    // Selected Element & Delete Modal
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [sectionToDelete, setSectionToDelete] = useState<number | null>(null);

    // Drag-to-Resize Padding (Moved to BuilderElement)

    const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIdx(index);
        setTimeout(() => {
            if (e.target instanceof HTMLElement) {
                e.target.style.opacity = '0.5';
            }
        }, 0);
    };

    const handleDragOver = (e: React.DragEvent, index?: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (index !== undefined) {
            if (dragOverIdx !== index) setDragOverIdx(index);
            if (isCanvasDragOver) setIsCanvasDragOver(false);
        } else {
            if (dragOverIdx !== null) setDragOverIdx(null);
            if (!isCanvasDragOver) setIsCanvasDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
        setDragOverIdx(null);
        setIsCanvasDragOver(false);
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverIdx(null);
        setIsCanvasDragOver(false);

        const newType = e.dataTransfer.getData('newSectionType') || e.dataTransfer.getData('newsectiontype') || e.dataTransfer.getData('text/plain');
        if (newType) {
            addSection(newType, index + 1);
            return;
        }

        if (draggedIdx === null || draggedIdx === index) return;

        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = newConfig.pages.findIndex((p: any) => p.id === activePageId);
        if (pIndex === -1) return;

        const newSections = [...(newConfig.pages[pIndex].sections || [])];
        const draggedItem = newSections[draggedIdx];
        newSections.splice(draggedIdx, 1);
        newSections.splice(index, 0, draggedItem);

        newConfig.pages[pIndex].sections = newSections;
        commitConfig(newConfig);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (e.target instanceof HTMLElement) {
            e.target.style.opacity = '1';
        }
        setDraggedIdx(null);
        setDragOverIdx(null);
    };

    useEffect(() => {
        fetchWebsite();
    }, [id]);

    const handleLogoUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingLogo(true);
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/api/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.url) {
                commitConfig({ ...config, header: { ...config.header, logo: res.data.url } });
            } else {
                toast.error('Upload failed');
            }
        } catch (err) {
            console.error('Upload error:', err);
            toast.error('Failed to upload logo');
        } finally {
            setUploadingLogo(false);
            if (logoInputRef.current) logoInputRef.current.value = '';
        }
    };

    const fetchWebsite = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/websites/${id}`);
            setWebsite(res.data.website);

            // Normalize config to v2 Multi-Page structure
            let loadedConfig = res.data.website.config || {};
            const symbol = settingsCompany?.currencySymbol || '$';
            if (loadedConfig.version !== 2) {
                let oldSections = loadedConfig.sections || [];
                if (!Array.isArray(oldSections)) {
                    oldSections = [
                        { id: 'sec-1', type: 'hero', data: loadedConfig.hero || { title: 'Welcome' } },
                        ...(loadedConfig.sections?.benefits?.active ? [{ id: 'sec-2', type: 'services', data: loadedConfig.sections.benefits }] : []),
                        ...(loadedConfig.sections?.faq?.active ? [{ id: 'sec-3', type: 'faq', data: loadedConfig.sections.faq }] : [])
                    ];
                }
                loadedConfig = {
                    version: 2,
                    brand: loadedConfig.brand || (loadedConfig.colors ? { primaryColor: loadedConfig.colors.primary, secondaryColor: loadedConfig.colors.secondary, textColor: '#111827', headingFont: 'Inter', bodyFont: 'Inter', bgType: 'color', bgValue: '#ffffff' } : { primaryColor: '#4f46e5', secondaryColor: '#ffffff', textColor: '#111827', headingFont: 'Inter', bodyFont: 'Inter', bgType: 'color', bgValue: '#ffffff' }),
                    header: loadedConfig.header || {},
                    footer: loadedConfig.footer || {},
                    pages: [
                        {
                            id: 'home',
                            name: 'Home',
                            slug: '/',
                            isEnabled: true,
                            sections: oldSections
                        }
                    ]
                };
            }
            if (loadedConfig.pages) {
                const standardPages = [
                    { id: 'about', name: 'About', slug: '/about' },
                    { id: 'services', name: 'Services', slug: '/services' },
                    { id: 'contact', name: 'Contact', slug: '/contact' },
                    { id: 'portfolio', name: 'Portfolio', slug: '/portfolio' },
                    { id: 'terms', name: 'Terms & Conditions', slug: '/terms' },
                    { id: 'privacy', name: 'Privacy Policy', slug: '/privacy' }
                ];
                standardPages.forEach(sp => {
                    if (!loadedConfig.pages.some((p: any) => p.id === sp.id)) {
                        loadedConfig.pages.push({
                            id: sp.id,
                            name: sp.name,
                            slug: sp.slug,
                            isEnabled: false,
                            sections: getDefaultSectionsForPageType(sp.id, symbol)
                        });
                    }
                });
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
        if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
        historyTimeoutRef.current = setTimeout(() => {
            setHistory(prevHistory => {
                const nextHistory = prevHistory.slice(0, historyIndex + 1);
                nextHistory.push(JSON.parse(JSON.stringify(newConfig)));
                setHistoryIndex(nextHistory.length - 1);
                return nextHistory;
            });
        }, 500);
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
            { id: 'sec-' + Date.now() + 2, type: 'grid', data: getDefaultElementForType('grid', currencySymbol) },
            { id: 'sec-' + Date.now() + 3, type: 'about', data: getDefaultElementForType('about', currencySymbol) },
            { id: 'sec-' + Date.now() + 4, type: 'contact', data: getDefaultElementForType('contact', currencySymbol) }
        ];
        commitConfig({
            ...config,
            pages: config.pages.map((p: any) => p.id === activePageId ? { ...p, sections: defaultSections } : p)
        });
    };

    const updateBrand = (key: string, value: any) => {
        const newConfig = {
            ...config,
            brand: { ...config.brand, [key]: value }
        };
        commitConfig(newConfig);
    };

    const getActivePageIndex = (cfg: any) => cfg.pages.findIndex((p: any) => p.id === activePageId);



    const findElementById = (nodes: any[], id: string): any => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findElementById(node.children, id);
                if (found) return found;
            }
        }
        return undefined;
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
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;
        const sections = newConfig.pages[pIndex].sections;
        if (direction === 'up' && index > 0) {
            [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
        } else if (direction === 'down' && index < sections.length - 1) {
            [sections[index + 1], sections[index]] = [sections[index], sections[index + 1]];
        }
        commitConfig(newConfig);
    };

    const removeSection = (index: number) => {
        setSectionToDelete(index);
    };

    const confirmRemoveSection = () => {
        if (sectionToDelete === null) return;
        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;
        const newSections = [...(newConfig.pages[pIndex].sections || [])];
        const removed = newSections[sectionToDelete];
        newSections.splice(sectionToDelete, 1);
        newConfig.pages[pIndex].sections = newSections;
        commitConfig(newConfig);
        if (selectedElementId === removed.id) setSelectedElementId(null);
        setSectionToDelete(null);
    };

    const addSection = (type: string, index: number) => {
        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex > -1) {
            if (!newConfig.pages[pIndex].sections) {
                newConfig.pages[pIndex].sections = [];
            }
            const activeSections = newConfig.pages[pIndex].sections;
            if (type === 'video' && activeSections.some((s: any) => s.type === 'video')) {
                toast.error("Only one Video section is allowed per page.");
                return;
            }

            // Generate the fully formed node from ElementFactory
            const generatedNode = getDefaultElementForType(type, currencySymbol);

            // Give it a fresh root-level ID to be safe
            generatedNode.id = 'sec-' + Date.now();

            newConfig.pages[pIndex].sections.splice(index, 0, generatedNode);
            commitConfig(newConfig);
        }
    };

    const appendElementToNode = (parentId: string, elementType: string) => {
        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;

        let appended = false;
        const appendToTarget = (nodes: any[]): boolean => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === parentId) {
                    if (!nodes[i].children) nodes[i].children = [];
                    const newNode = getDefaultElementForType(elementType, currencySymbol);
                    newNode.id = 'el-' + Date.now(); // Generate unique ID
                    nodes[i].children.push(newNode);
                    return true;
                }
                if (nodes[i].children && appendToTarget(nodes[i].children)) return true;
            }
            return false;
        };

        appended = appendToTarget(newConfig.pages[pIndex].sections || []);
        if (appended) {
            commitConfig(newConfig);
        }
    };

    const renderImagePaddingHandles = (section: any) => {
        if (hoveredSectionId !== section.id && paddingDrag?.id !== section.id) return null;

        const ip = section.style?.imagePadding ?? 0;

        return (
            <>
                <div className="absolute top-0 inset-x-0 h-4 cursor-ns-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 group/imagedrag"
                    onMouseDown={(e) => { e.stopPropagation(); setPaddingDrag({ id: section.id, type: 'image', edge: 'top', startY: e.clientY, startX: e.clientX, startPadding: ip, currentPadding: ip }); }}
                >
                    <div className="w-16 h-1.5 bg-indigo-500 rounded-full group-hover/imagedrag:shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                </div>
                <div className="absolute bottom-0 inset-x-0 h-4 cursor-ns-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 group/imagedrag"
                    onMouseDown={(e) => { e.stopPropagation(); setPaddingDrag({ id: section.id, type: 'image', edge: 'bottom', startY: e.clientY, startX: e.clientX, startPadding: ip, currentPadding: ip }); }}
                >
                    <div className="w-16 h-1.5 bg-indigo-500 rounded-full group-hover/imagedrag:shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                </div>
                <div className="absolute left-0 inset-y-0 w-4 cursor-ew-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 group/imagedrag"
                    onMouseDown={(e) => { e.stopPropagation(); setPaddingDrag({ id: section.id, type: 'image', edge: 'left', startY: e.clientY, startX: e.clientX, startPadding: ip, currentPadding: ip }); }}
                >
                    <div className="h-16 w-1.5 bg-indigo-500 rounded-full group-hover/imagedrag:shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                </div>
                <div className="absolute right-0 inset-y-0 w-4 cursor-ew-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 group/imagedrag"
                    onMouseDown={(e) => { e.stopPropagation(); setPaddingDrag({ id: section.id, type: 'image', edge: 'right', startY: e.clientY, startX: e.clientX, startPadding: ip, currentPadding: ip }); }}
                >
                    <div className="h-16 w-1.5 bg-indigo-500 rounded-full group-hover/imagedrag:shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                </div>

                {paddingDrag?.id === section.id && paddingDrag?.type === 'image' && paddingDrag.edge === 'top' && (
                    <div className="absolute top-0 inset-x-0 bg-indigo-500/20 pointer-events-none z-40" style={{ height: `${paddingDrag.currentPadding}px` }} />
                )}
                {paddingDrag?.id === section.id && paddingDrag?.type === 'image' && paddingDrag.edge === 'bottom' && (
                    <div className="absolute bottom-0 inset-x-0 bg-indigo-500/20 pointer-events-none z-40" style={{ height: `${paddingDrag.currentPadding}px` }} />
                )}
                {paddingDrag?.id === section.id && paddingDrag?.type === 'image' && paddingDrag.edge === 'left' && (
                    <div className="absolute left-0 inset-y-0 bg-indigo-500/20 pointer-events-none z-40" style={{ width: `${paddingDrag.currentPadding}px` }} />
                )}
                {paddingDrag?.id === section.id && paddingDrag?.type === 'image' && paddingDrag.edge === 'right' && (
                    <div className="absolute right-0 inset-y-0 bg-indigo-500/20 pointer-events-none z-40" style={{ width: `${paddingDrag.currentPadding}px` }} />
                )}
            </>
        );
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
    const activePage = config.pages?.find((p: any) => p.id === activePageId) || config.pages?.[0] || {};
    const sections = activePage.sections || [];

    const getHeaderFooterStyles = (b: any) => {
        const theme = b.headerFooterTheme || 'light';
        const customTextColor = b.headerFooterTextColor;
        let styles: any = {};

        if (theme === 'dark') {
            styles = { backgroundColor: '#111827', color: customTextColor || '#ffffff' };
        } else if (theme === 'brand') {
            styles = { backgroundColor: b.primaryColor || '#4f46e5', color: customTextColor || '#ffffff' };
        } else {
            styles = { backgroundColor: 'rgba(255, 255, 255, 0.8)', color: customTextColor || 'inherit' };
        }

        if (b.fontFamily) {
            styles.fontFamily = `"${b.fontFamily}", sans-serif`;
        }

        return styles;
    };
    const hfStyles = getHeaderFooterStyles(brand);

    return (
        <div className="fixed inset-0 z-[9999] bg-gray-100 flex flex-col overflow-hidden">
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

                    <div className="w-px h-8 bg-gray-200 mx-2"></div>

                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setViewMode('desktop')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'desktop' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}><Monitor className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode('tablet')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'tablet' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}><Tablet className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode('mobile')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'mobile' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}><Smartphone className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="flex-1 flex justify-center items-center" id="text-editor-container">
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
                        <Palette className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => {
                            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
                            const isLocal = rootDomain.includes('localhost');
                            let url = '';
                            if (website.company?.customDomain) {
                                url = website.isPrimary
                                    ? `https://${website.company.customDomain}`
                                    : `https://${website.slug}.${website.company.customDomain}`;
                            } else {
                                url = `http${isLocal ? '' : 's'}://${website.company?.slug || 'company'}.${rootDomain}${website.isPrimary ? '' : `/${website.slug}`}`;
                            }
                            window.open(url, '_blank');
                        }}
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
                {/* Dynamically load Google Font */}
                <style dangerouslySetInnerHTML={{
                    __html: `@import url('https://fonts.googleapis.com/css2?family=${(brand.fontFamily || 'Inter').replace(/ /g, '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap');`
                }} />

                {/* Live Website Canvas */}
                <div
                    className={`flex-1 overflow-y-auto scrollbar-hide flex justify-center items-start transition-colors ${viewMode !== 'desktop' ? 'bg-gray-900 py-12 px-4' : 'bg-gray-100'} ${isCanvasDragOver ? 'bg-indigo-50/50' : ''}`}
                    onClick={() => setSelectedElementId(null)}
                    onDragOver={(e) => handleDragOver(e)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, sections.length - 1)}
                >
                    <div
                        className={`bg-white overflow-hidden relative transition-all duration-300 ${viewMode === 'mobile' ? 'w-[375px] rounded-3xl min-h-[812px] shadow-2xl border border-gray-200' : viewMode === 'tablet' ? 'w-[768px] rounded-2xl min-h-[1024px] shadow-2xl border border-gray-200' : 'w-full min-h-full'} ${isCanvasDragOver ? 'ring-4 ring-indigo-500 scale-[0.99] shadow-2xl' : ''}`}
                        style={{
                            fontFamily: `"${brand.fontFamily || 'Inter'}", sans-serif`,
                            color: brand.textColor || '#111827',
                            backgroundColor: brand.bgType === 'color' ? (brand.bgValue || brand.secondaryColor) : 'transparent',
                            backgroundImage: brand.bgType === 'image' && brand.bgValue ? `url(${brand.bgValue})` : 'none',
                            backgroundSize: 'cover',
                            backgroundAttachment: 'fixed',
                            backgroundPosition: 'center',
                            '--primary': primaryColor,
                        } as any}
                    >
                        {/* Header */}
                        <header
                            className={`flex flex-col md:flex-row items-center justify-between gap-6 group relative border-b border-black/5 ${config.header?.style?.isSticky !== false ? 'sticky top-0 z-40' : ''} transition-all`}
                            style={{
                                backgroundColor: hfStyles.backgroundColor,
                                color: hfStyles.color,
                                backdropFilter: 'blur(12px)',
                                paddingTop: config.header?.style?.paddingY !== undefined ? `${config.header.style.paddingY}rem` : '1.5rem',
                                paddingBottom: config.header?.style?.paddingY !== undefined ? `${config.header.style.paddingY}rem` : '1.5rem',
                                paddingLeft: config.header?.style?.paddingX !== undefined ? `${config.header.style.paddingX}rem` : '1.5rem',
                                paddingRight: config.header?.style?.paddingX !== undefined ? `${config.header.style.paddingX}rem` : '1.5rem',
                            }}
                        >
                            <div className="flex items-center gap-3">
                                {config.header?.logo ? (
                                    <div className="relative group/logo">
                                        <img src={config.header.logo} alt={config.header?.title || website.name} className="h-10 w-auto object-contain" />
                                        <div
                                            className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center rounded cursor-pointer"
                                            onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); }}
                                        >
                                            <Upload className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); }}
                                        disabled={uploadingLogo}
                                        className="h-10 px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 border-dashed rounded-lg flex items-center justify-center gap-2 text-xs font-bold text-gray-500 transition-colors"
                                    >
                                        {uploadingLogo ? (
                                            <LogoLoader className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Upload className="w-3 h-3" />
                                                Upload Logo
                                            </>
                                        )}
                                    </button>
                                )}
                                <input
                                    type="file"
                                    ref={logoInputRef}
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                />
                                <EditableText
                                    tagName="span"
                                    className="text-xl font-black tracking-tight text-current"
                                    style={{ color: 'inherit' }}
                                    value={config.header?.title || website.name}
                                    onChange={(v: string) => commitConfig({ ...config, header: { ...config.header, title: v } })}
                                />
                            </div>

                            <nav className="flex flex-wrap justify-center items-center gap-6 text-sm font-bold opacity-80">
                                {config.pages?.filter((p: any) => p.isEnabled && p.id !== 'terms' && p.id !== 'privacy').map((p: any) => (
                                    <button
                                        key={p.id}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeActivePage(p.id); }}
                                        className={`hover:opacity-100 transition-opacity py-1 ${activePageId === p.id ? 'border-b-2 border-current' : ''}`}
                                        style={{ color: 'inherit' }}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </nav>
                        </header>

                        <main 
                            className={`w-full flex-1 flex flex-col ${isCanvasDragOver && sections.length > 0 ? 'bg-indigo-50/10' : ''}`}
                            onDragOver={(e) => { 
                                e.preventDefault(); 
                                if (sections.length > 0) setIsCanvasDragOver(true);
                            }}
                            onDragLeave={(e) => { 
                                e.preventDefault(); 
                                setIsCanvasDragOver(false);
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsCanvasDragOver(false);
                                // Only handle drop on main if we didn't drop on a specific dropzone
                                if (nativeDragOverIndex === null && sections.length > 0) {
                                    const type = e.dataTransfer.getData('newSectionType') || e.dataTransfer.getData('text/plain');
                                    if (type) addSection(type, sections.length);
                                }
                            }}
                        >
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndDnd}>
                            <SortableContext items={sections.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                                {/* Empty State / First Dropzone */}
                                {sections.length === 0 ? (
                                    <div
                                        className={`w-full min-h-[200px] py-12 transition-all duration-200 flex flex-col items-center justify-center px-4 relative z-50 ${nativeDragOverIndex === 0 || isCanvasDragOver ? 'bg-indigo-50 border-2 border-indigo-400 border-dashed' : 'bg-gray-50/90 border-2 border-dashed border-gray-200 hover:bg-gray-50'}`}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(0); }}
                                        onDragLeave={(e) => { e.preventDefault(); if (nativeDragOverIndex === 0) setNativeDragOverIndex(null); }}
                                        onDrop={(e) => {
                                            e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(null); setIsCanvasDragOver(false);
                                            const type = e.dataTransfer.getData('newSectionType') || e.dataTransfer.getData('newsectiontype') || e.dataTransfer.getData('text/plain');
                                            if (type) addSection(type, 0);
                                        }}
                                    >
                                        <div className="w-16 h-16 mb-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 shadow-inner">
                                            <Plus className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Start Building Your Page</h3>
                                        <p className="text-gray-500 text-center max-w-sm mb-4">
                                            Drag and drop a section from the sidebar to add your first content block.
                                        </p>
                                    </div>
                                ) : (
                                    <div
                                        className={`w-full transition-all duration-200 flex items-center justify-center -mb-2 relative z-50 ${nativeDragOverIndex === 0 ? 'h-20 bg-indigo-50 border-2 border-indigo-400 border-dashed rounded-lg mb-2 mt-4' : 'h-8 opacity-0 hover:h-8'}`}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(0); }}
                                        onDragLeave={(e) => { e.preventDefault(); if (nativeDragOverIndex === 0) setNativeDragOverIndex(null); }}
                                        onDrop={(e) => {
                                            e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(null); setIsCanvasDragOver(false);
                                            const type = e.dataTransfer.getData('newSectionType') || e.dataTransfer.getData('newsectiontype') || e.dataTransfer.getData('text/plain');
                                            if (type) addSection(type, 0);
                                        }}
                                    >
                                        {nativeDragOverIndex === 0 && <span className="text-indigo-400 text-sm font-bold">Drop Section Here</span>}
                                    </div>
                                )}

                                {sections.map((section: any, idx: number) => (
                                    <React.Fragment key={section.id}>
                                        <BuilderElement
                                            node={section}
                                            selectedElementId={selectedElementId}
                                            setSelectedElementId={setSelectedElementId}
                                            updateElement={updateElement}
                                            removeElement={removeElement}
                                            appendElementToNode={appendElementToNode}
                                        />
                                        {/* Dropzone after this section */}
                                        <div
                                            className={`w-full transition-all duration-200 flex items-center justify-center -my-2 relative z-50 ${nativeDragOverIndex === idx + 1 ? 'h-20 bg-indigo-50 border-2 border-indigo-400 border-dashed rounded-lg my-2' : 'h-8 opacity-0 hover:h-8'}`}
                                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(idx + 1); }}
                                            onDragLeave={(e) => { e.preventDefault(); if (nativeDragOverIndex === idx + 1) setNativeDragOverIndex(null); }}
                                            onDrop={(e) => {
                                                e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(null);
                                                const type = e.dataTransfer.getData('newSectionType') || e.dataTransfer.getData('text/plain');
                                                if (type) addSection(type, idx + 1);
                                            }}
                                        >
                                            {nativeDragOverIndex === idx + 1 && <span className="text-indigo-400 text-sm font-bold">Drop Section Here</span>}
                                        </div>
                                    </React.Fragment>
                                ))}
                            </SortableContext>
                        </DndContext>
                        </main>

                        <footer
                            className="border-t border-black/10 transition-all"
                            style={{
                                backgroundColor: hfStyles.backgroundColor,
                                color: hfStyles.color,
                                backdropFilter: 'blur(12px)',
                                paddingTop: config.footer?.style?.paddingY !== undefined ? `${config.footer.style.paddingY}rem` : '3rem',
                                paddingBottom: config.footer?.style?.paddingY !== undefined ? `${config.footer.style.paddingY}rem` : '3rem',
                                paddingLeft: config.footer?.style?.paddingX !== undefined ? `${config.footer.style.paddingX}rem` : '1.5rem',
                                paddingRight: config.footer?.style?.paddingX !== undefined ? `${config.footer.style.paddingX}rem` : '1.5rem',
                            }}
                        >
                            <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 text-left mb-12">
                                <div className="flex flex-col">
                                    <h4 className="font-bold mb-4 opacity-90 text-current" style={{ color: 'inherit' }}>Company</h4>
                                    <EditableText
                                        tagName="div"
                                        className="text-sm leading-relaxed whitespace-pre-wrap animate-none text-current"
                                        style={{ color: 'inherit' }}
                                        value={config.footer?.companyInfo || `${settingsCompany?.name || website.name}\n${settingsCompany?.headquarters || '123 Business Avenue'}\n${settingsCompany?.email || 'email@example.com'}`}
                                        onChange={(v: string) => commitConfig({ ...config, footer: { ...config.footer, companyInfo: v } })}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="font-bold mb-4 opacity-90 text-current" style={{ color: 'inherit' }}>Links</h4>
                                    <nav className="flex flex-col gap-3 text-sm opacity-80 font-medium animate-none">
                                        {config.pages?.filter((p: any) => p.isEnabled && p.id !== 'privacy' && p.id !== 'terms' && p.id !== 'home' && p.id !== 'about').map((p: any) => (
                                            <button key={p.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeActivePage(p.id); }} className="text-left hover:opacity-100 transition-opacity text-current" style={{ color: 'inherit' }}>{p.name}</button>
                                        ))}
                                    </nav>
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="font-bold mb-4 opacity-90 text-current" style={{ color: 'inherit' }}>Legal</h4>
                                    <nav className="flex flex-col gap-3 text-sm opacity-80 font-medium animate-none">
                                        {config.pages?.filter((p: any) => p.isEnabled && (p.id === 'privacy' || p.id === 'terms')).map((p: any) => (
                                            <button key={p.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeActivePage(p.id); }} className="text-left hover:opacity-100 transition-opacity text-current" style={{ color: 'inherit' }}>{p.name}</button>
                                        ))}
                                    </nav>
                                </div>
                            </div>
                            <div className="text-center pt-8 border-t border-current/20 flex flex-col items-center justify-center w-full">
                                <div className="w-full max-w-lg mx-auto flex justify-center">
                                    <EditableText
                                        tagName="div"
                                        className="text-sm opacity-60 font-medium text-current text-center"
                                        style={{ color: 'inherit' }}
                                        value={config.footer?.copyright || `© ${new Date().getFullYear()} ${website.name}. All Rights Reserved.`}
                                        onChange={(v: string) => commitConfig({ ...config, footer: { ...config.footer, copyright: v } })}
                                    />
                                </div>
                            </div>
                        </footer>

                        {/* WhatsApp Floating Button */}
                        {config.whatsapp?.enabled && (
                            <a
                                href={config.whatsapp.phone ? `https://wa.me/${config.whatsapp.phone}` : '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`absolute z-50 flex items-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition-transform hover:scale-105 cursor-pointer 
                                    ${config.whatsapp.position === 'bottom-right' ? 'bottom-6 right-6 w-14 h-14 rounded-full bg-[#25D366] text-white justify-center' :
                                        config.whatsapp.position === 'middle-right' ? 'top-1/2 -translate-y-1/2 right-0 rounded-l-xl bg-[#25D366] text-white px-4 py-3' :
                                            'top-1/2 -translate-y-1/2 left-0 rounded-r-xl bg-[#25D366] text-white px-4 py-3'}`}
                            >
                                <MessageSquare className={config.whatsapp.position === 'bottom-right' ? "w-7 h-7 fill-current" : "w-6 h-6 fill-current"} />
                                {config.whatsapp.position !== 'bottom-right' && <span className="font-bold text-sm tracking-wide">WhatsApp</span>}
                            </a>
                        )}
                    </div>
                </div>

                {/* Right Side Panel – one panel at a time */}
                {(selectedElementId || showSettings) && (
                    <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto scrollbar-hide shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-40 relative">
                        {selectedElementId ? (
                            <PropertyPanel
                                selectedElement={
                                    selectedElementId === 'header' ? { id: 'header', type: 'header', style: config.header?.style || {}, logo: config.header?.logo } :
                                        selectedElementId === 'footer' ? { id: 'footer', type: 'footer', style: config.footer?.style || {} } :
                                            findElementById(sections, selectedElementId)
                                }
                                onUpdate={(key: string, value: any) => {
                                    if (selectedElementId === 'header') {
                                        const keys = key.split('.');
                                        const newConfig = JSON.parse(JSON.stringify(config));
                                        if (!newConfig.header) newConfig.header = {};
                                        let current = newConfig.header;
                                        for (let i = 0; i < keys.length - 1; i++) {
                                            if (!current[keys[i]]) current[keys[i]] = {};
                                            current = current[keys[i]];
                                        }
                                        current[keys[keys.length - 1]] = value;
                                        commitConfig(newConfig);
                                    } else if (selectedElementId === 'footer') {
                                        const keys = key.split('.');
                                        const newConfig = JSON.parse(JSON.stringify(config));
                                        if (!newConfig.footer) newConfig.footer = {};
                                        let current = newConfig.footer;
                                        for (let i = 0; i < keys.length - 1; i++) {
                                            if (!current[keys[i]]) current[keys[i]] = {};
                                            current = current[keys[i]];
                                        }
                                        current[keys[keys.length - 1]] = value;
                                        commitConfig(newConfig);
                                    } else {
                                        updateElement(selectedElementId, key, value);
                                    }
                                }}
                                onClose={() => setSelectedElementId(null)}
                            />
                        ) : (
                            <SettingsSidebar
                                brand={brand}
                                updateBrand={updateBrand}
                                revertToDefault={revertToDefault}
                                config={config}
                                commitConfig={commitConfig}
                                activePageId={activePageId}
                                changeActivePage={changeActivePage}
                                sections={sections}
                                currencySymbol={currencySymbol}
                                getDefaultSectionsForPageType={getDefaultSectionsForPageType}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Custom Delete Modal */}
            {sectionToDelete !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Delete Section?</h3>
                        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                            Are you sure you want to remove this section? This action cannot be undone.
                        </p>
                        <div className="flex w-full gap-3">
                            <button
                                onClick={() => setSectionToDelete(null)}
                                className="flex-1 py-4 px-4 rounded-2xl font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors uppercase text-xs tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRemoveSection}
                                className="flex-1 py-4 px-4 rounded-2xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all uppercase text-xs tracking-widest"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helpers

function getDefaultSectionsForPageType(pageType: string, currencySymbol: string) {
    if (pageType === 'home') {
        return [
            getDefaultElementForType('hero', currencySymbol),
            getDefaultElementForType('grid', currencySymbol),
            getDefaultElementForType('about', currencySymbol),
            getDefaultElementForType('contact', currencySymbol)
        ];
    }
    if (pageType === 'about' || pageType.includes('about')) {
        return [
            getDefaultElementForType('hero', currencySymbol),
            getDefaultElementForType('about', currencySymbol),
            getDefaultElementForType('faq', currencySymbol)
        ];
    }
    if (pageType === 'services' || pageType.includes('service')) {
        return [
            getDefaultElementForType('hero', currencySymbol),
            getDefaultElementForType('grid', currencySymbol),
            getDefaultElementForType('contact', currencySymbol)
        ];
    }
    if (pageType === 'contact' || pageType.includes('contact')) {
        return [
            getDefaultElementForType('hero', currencySymbol),
            getDefaultElementForType('contact', currencySymbol)
        ];
    }
    if (pageType === 'portfolio' || pageType.includes('portfolio')) {
        return [
            getDefaultElementForType('hero', currencySymbol),
            getDefaultElementForType('portfolio', currencySymbol)
        ];
    }
    if (pageType === 'terms' || pageType.includes('term')) {
        const textNode = getDefaultElementForType('text', currencySymbol);
        if (textNode.children && textNode.children[0]) {
            textNode.children[0].data = { content: '<h1>Terms and Conditions</h1><p>Please read these terms and conditions carefully before using our services...</p>' };
        }
        return [textNode];
    }
    if (pageType === 'privacy' || pageType.includes('privacy')) {
        const textNode = getDefaultElementForType('text', currencySymbol);
        if (textNode.children && textNode.children[0]) {
            textNode.children[0].data = { content: '<h1>Privacy Policy</h1><p>We value your privacy and protect your personal data in accordance with modern standards...</p>' };
        }
        return [textNode];
    }
    return [
        getDefaultElementForType('hero', currencySymbol),
        getDefaultElementForType('text', currencySymbol)
    ];
}

function FakeLeadForm({ primaryColor, buttonText }: any) {
    return (
        <div className="space-y-5 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-black/5 border border-gray-100 text-left pointer-events-none">
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