'use client';

import { LogoLoader, ConfirmModal } from "@workspace/ui";
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

            if (res.data.url || res.data.fileUrl) {
                const url = res.data.url || res.data.fileUrl;
                onChange(url);
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
            const res = await api.post('/api/v1/workspace-tools/storage/upload?streaming=true', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.url || res.data.fileUrl) {
                const url = res.data.url || res.data.fileUrl;
                onChange({ ...sectionData, sourceType: 'upload', videoUrl: url });
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
    const params = useParams();
    const id = params?.id;
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

    // Confirmation Modals
    const [showDiscardModal, setShowDiscardModal] = useState(false);

    // Hover and Padding Drag for Sections/Images
    const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
    const [paddingDrag, setPaddingDrag] = useState<any>(null);
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

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setViewMode('desktop'); // Force full width on mobile devices
            }
        };
        handleResize(); // Check on mount
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogoUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingLogo(true);
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/api/v1/workspace-tools/storage/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.url || res.data.fileUrl) {
                commitConfig({ ...config, header: { ...config.header, logo: res.data.url || res.data.fileUrl } });
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
            await api.patch(`/api/websites/${id}`, { name: website?.name, config });
            toast.success('Website saved successfully!');
            setShowSettings(false);
            setSelectedElementId(null);
        } catch (err) {
            console.error('Failed to save:', err);
            toast.error('Failed to save website');
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = () => {
        setShowDiscardModal(true);
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

    const updateBrand = (key: string, value: any) => {
        const newConfig = {
            ...config,
            brand: { ...config.brand, [key]: value },
            ...(key === 'companyName' ? { header: { ...config.header, title: value } } : {})
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
            if (!nodes) return false;
            for (let i = 0; i < nodes.length; i++) {
                if (!nodes[i]) continue;
                if (nodes[i].id === id) {
                    const keys = path.split('.');
                    let current = nodes[i];
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

        if (id === 'header') {
            const keys = path.split('.');
            let current = newConfig.header || {};
            newConfig.header = current; // Ensure it exists
            
            if (path === 'style' || path.startsWith('style.')) {
                if (!current.style) current.style = {};
                let styleCurrent = current.style;
                const styleKeys = path === 'style' ? [] : path.split('.').slice(1);
                if (styleKeys.length === 0) {
                    current.style = value;
                } else {
                    for (let j = 0; j < styleKeys.length - 1; j++) {
                        if (!styleCurrent[styleKeys[j]]) styleCurrent[styleKeys[j]] = {};
                        styleCurrent = styleCurrent[styleKeys[j]];
                    }
                    styleCurrent[styleKeys[styleKeys.length - 1]] = value;
                }
            } else {
                for (let j = 0; j < keys.length - 1; j++) {
                    if (!current[keys[j]]) current[keys[j]] = {};
                    current = current[keys[j]];
                }
                current[keys[keys.length - 1]] = value;
            }
            commitConfig(newConfig);
            return;
        }

        if (id === 'footer') {
            const keys = path.split('.');
            let current = newConfig.footer || {};
            newConfig.footer = current; // Ensure it exists
            
            if (path === 'style' || path.startsWith('style.')) {
                if (!current.style) current.style = {};
                let styleCurrent = current.style;
                const styleKeys = path === 'style' ? [] : path.split('.').slice(1);
                if (styleKeys.length === 0) {
                    current.style = value;
                } else {
                    for (let j = 0; j < styleKeys.length - 1; j++) {
                        if (!styleCurrent[styleKeys[j]]) styleCurrent[styleKeys[j]] = {};
                        styleCurrent = styleCurrent[styleKeys[j]];
                    }
                    styleCurrent[styleKeys[styleKeys.length - 1]] = value;
                }
            } else {
                for (let j = 0; j < keys.length - 1; j++) {
                    if (!current[keys[j]]) current[keys[j]] = {};
                    current = current[keys[j]];
                }
                current[keys[keys.length - 1]] = value;
            }
            commitConfig(newConfig);
            return;
        }

        if (newConfig.header && updateRecursive([newConfig.header])) {
            commitConfig(newConfig);
            return;
        }
        if (newConfig.footer && updateRecursive([newConfig.footer])) {
            commitConfig(newConfig);
            return;
        }
        
        updateRecursive(newConfig.pages[pIndex].sections);
        commitConfig(newConfig);
    };

    const removeElement = (id: string) => {
        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;

        const removeRecursive = (nodes: any[]): boolean => {
            if (!nodes) return false;
            for (let i = 0; i < nodes.length; i++) {
                if (!nodes[i]) continue;
                if (nodes[i].id === id) {
                    // Prevent removing root header/footer by checking if it's the only element in a single-element wrapper
                    if (nodes.length === 1 && (nodes[0].type === 'header' || nodes[0].type === 'footer')) {
                        return false; 
                    }
                    nodes.splice(i, 1);
                    return true;
                }
                if (nodes[i].children && removeRecursive(nodes[i].children)) {
                    return true;
                }
            }
            return false;
        };

        let found = false;
        if (newConfig.header && removeRecursive([newConfig.header])) found = true;
        else if (newConfig.footer && removeRecursive([newConfig.footer])) found = true;
        else if (removeRecursive(newConfig.pages[pIndex].sections)) found = true;

        if (found) {
            commitConfig(newConfig);
            if (selectedElementId === id) setSelectedElementId(null);
        }
    };

    const duplicateElement = (id: string) => {
        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;

        const duplicateRecursive = (nodes: any[]): boolean => {
            if (!nodes) return false;
            for (let i = 0; i < nodes.length; i++) {
                if (!nodes[i]) continue;
                if (nodes[i].id === id) {
                    if (nodes.length === 1 && (nodes[0].type === 'header' || nodes[0].type === 'footer')) {
                        return false; 
                    }
                    const clone = JSON.parse(JSON.stringify(nodes[i]));
                    const updateIds = (node: any) => {
                        node.id = node.type + '-' + Math.random().toString(36).substring(2, 9);
                        if (node.children) node.children.forEach(updateIds);
                    };
                    updateIds(clone);
                    nodes.splice(i + 1, 0, clone);
                    return true;
                }
                if (nodes[i].children && duplicateRecursive(nodes[i].children)) {
                    return true;
                }
            }
            return false;
        };

        let found = false;
        if (newConfig.header && duplicateRecursive([newConfig.header])) found = true;
        else if (newConfig.footer && duplicateRecursive([newConfig.footer])) found = true;
        else if (duplicateRecursive(newConfig.pages[pIndex].sections)) found = true;

        if (found) commitConfig(newConfig);
    };

    const moveElementUp = (id: string) => {
        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;

        const moveRecursive = (nodes: any[]): boolean => {
            if (!nodes) return false;
            for (let i = 0; i < nodes.length; i++) {
                if (!nodes[i]) continue;
                if (nodes[i].id === id) {
                    if (i > 0) {
                        const temp = nodes[i];
                        nodes[i] = nodes[i - 1];
                        nodes[i - 1] = temp;
                    }
                    return true;
                }
                if (nodes[i].children && moveRecursive(nodes[i].children)) {
                    return true;
                }
            }
            return false;
        };

        let found = false;
        if (newConfig.header && moveRecursive([newConfig.header])) found = true;
        else if (newConfig.footer && moveRecursive([newConfig.footer])) found = true;
        else if (moveRecursive(newConfig.pages[pIndex].sections)) found = true;

        if (found) commitConfig(newConfig);
    };

    const moveElementDown = (id: string) => {
        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;

        const moveRecursive = (nodes: any[]): boolean => {
            if (!nodes) return false;
            for (let i = 0; i < nodes.length; i++) {
                if (!nodes[i]) continue;
                if (nodes[i].id === id) {
                    if (i < nodes.length - 1) {
                        const temp = nodes[i];
                        nodes[i] = nodes[i + 1];
                        nodes[i + 1] = temp;
                    }
                    return true;
                }
                if (nodes[i].children && moveRecursive(nodes[i].children)) {
                    return true;
                }
            }
            return false;
        };

        let found = false;
        if (newConfig.header && moveRecursive([newConfig.header])) found = true;
        else if (newConfig.footer && moveRecursive([newConfig.footer])) found = true;
        else if (moveRecursive(newConfig.pages[pIndex].sections)) found = true;

        if (found) commitConfig(newConfig);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement as HTMLElement;
            const isInput = activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' || 
                activeElement.tagName === 'SELECT' ||
                activeElement.isContentEditable
            );

            if (isInput) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }
            
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                handleRedo();
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                e.preventDefault(); // Prevent native text selection outside inputs
            }

            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
                e.preventDefault();
                removeElement(selectedElementId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, historyIndex, selectedElementId, config, activePageId]);

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
            if (!nodes) return false;
            for (let i = 0; i < nodes.length; i++) {
                if (!nodes[i]) continue;
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

        let foundSource = false;
        if (newConfig.header && findAndRemove([newConfig.header])) foundSource = true;
        else if (newConfig.footer && findAndRemove([newConfig.footer])) foundSource = true;
        else if (findAndRemove(newConfig.pages[pIndex].sections)) foundSource = true;

        if (!draggedNode) return;

        // Find target and insert
        const findAndInsert = (nodes: any[]): boolean => {
            if (!nodes) return false;
            for (let i = 0; i < nodes.length; i++) {
                if (!nodes[i]) continue;
                if (nodes[i].id === over.id) {
                    // insert at same level
                    nodes.splice(i, 0, draggedNode);
                    return true;
                }
                if (nodes[i].children && findAndInsert(nodes[i].children)) return true;
            }
            return false;
        };

        let foundTarget = false;
        if (newConfig.header && findAndInsert([newConfig.header])) foundTarget = true;
        else if (newConfig.footer && findAndInsert([newConfig.footer])) foundTarget = true;
        else if (findAndInsert(newConfig.pages[pIndex].sections)) foundTarget = true;

        if (!foundTarget) {
            // Fallback, put it back
            if (sourceArray && sourceIndex !== -1) {
                (sourceArray as any[]).splice(sourceIndex, 0, draggedNode);
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

    const insertElementRelative = (targetId: string, elementType: string, position: 'left' | 'right' | 'top' | 'bottom' | 'inside') => {
        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;


        const insertTarget = (nodes: any[]): boolean => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === targetId) {
                    const newNode = getDefaultElementForType(elementType, currencySymbol);
                    newNode.id = 'el-' + Date.now(); // Generate unique ID
                    
                    if (position === 'inside') {
                        if (!nodes[i].children) nodes[i].children = [];
                        nodes[i].children.push(newNode);
                    } else if (position === 'left' || position === 'top') {
                        nodes.splice(i, 0, newNode);
                    } else if (position === 'right' || position === 'bottom') {
                        nodes.splice(i + 1, 0, newNode);
                    }
                    return true;
                }
                if (nodes[i].children && insertTarget(nodes[i].children)) return true;
            }
            return false;
        };

        const inserted = insertTarget(newConfig.pages[pIndex].sections || []);
        if (inserted) {
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
        let styles: any;

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
            {/* Editor Toolbar - Hidden when sidebar is open */}
            {!(showSettings || selectedElementId) && (
                <div className="flex-none sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push(`/dashboard/advertising/${id}`)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-1">
                                <span className="text-sm font-bold text-gray-900">Editing: </span>
                                <EditableText 
                                    tagName="h1" 
                                    className="text-sm font-bold text-gray-900 inline" 
                                    value={website?.name} 
                                    onChange={(v: string) => {
                                        if (website) setWebsite({ ...website, name: v });
                                    }} 
                                />
                            </div>
                            <p className="text-xs text-gray-500">Click any text on the page to edit</p>
                        </div>

                        <div className="w-px h-8 bg-gray-200 mx-2 hidden md:block"></div>

                        <div className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                            {viewMode === 'desktop' ? (
                                <button onClick={() => setViewMode('mobile')} className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors bg-white shadow-sm text-indigo-600">
                                    <Smartphone className="w-4 h-4" />
                                    <span className="text-sm font-medium">Mobile Preview</span>
                                </button>
                            ) : (
                                <button onClick={() => setViewMode('desktop')} className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors bg-white shadow-sm text-indigo-600">
                                    <Monitor className="w-4 h-4" />
                                    <span className="text-sm font-medium">PC View</span>
                                </button>
                            )}
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
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors border ${showSettings ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-200'}`}
                        >
                            <Palette className="w-4 h-4" />
                            Edit Design
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Dynamically load Google Font */}
                <style dangerouslySetInnerHTML={{
                    __html: `@import url('https://fonts.googleapis.com/css2?family=${(brand.fontFamily || 'Inter').replace(/ /g, '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap');`
                }} />

                {/* Live Website Canvas */}
                <div
                    className={`flex-1 overflow-hidden flex justify-center items-center transition-colors ${viewMode !== 'desktop' ? 'bg-[#2A303C] py-8 px-4' : 'bg-gray-100'} ${isCanvasDragOver ? 'bg-indigo-50/50' : ''}`}
                    onClick={() => setSelectedElementId(null)}
                    onDragOver={(e) => handleDragOver(e)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, sections.length - 1)}
                >
                    {/* Device Frame Wrapper */}
                    <div className={`relative transition-all duration-300 flex-shrink-0 ${
                        viewMode === 'mobile' 
                            ? 'w-[375px] h-[812px] max-h-full bg-white rounded-[3rem] shadow-[0_0_0_12px_white,0_0_0_14px_#e5e7eb,0_25px_50px_-12px_rgba(0,0,0,0.5)] p-2 flex flex-col' 
                            : viewMode === 'tablet' 
                            ? 'w-[768px] h-[1024px] max-h-full bg-white rounded-[2rem] shadow-[0_0_0_12px_white,0_0_0_14px_#e5e7eb,0_25px_50px_-12px_rgba(0,0,0,0.5)] p-2 flex flex-col' 
                            : 'w-full h-full flex flex-col'
                    } ${isCanvasDragOver ? 'ring-4 ring-indigo-500 scale-[0.99] shadow-2xl' : ''}`}>
                        
                        {/* Mobile/Tablet Notch & Sensors */}
                        {(viewMode === 'mobile' || viewMode === 'tablet') && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-white rounded-b-2xl flex items-center justify-center gap-2 z-[999]">
                                <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                <div className="w-12 h-2 rounded-full bg-gray-200"></div>
                            </div>
                        )}

                        <div
                            className={`bg-white relative overflow-y-auto overflow-x-hidden flex-1 scrollbar-hide ${viewMode !== 'desktop' ? 'rounded-[2.5rem]' : ''}`}
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
                        {config.header?.enabled !== false && activePage.showHeader !== false && (
                        <header
                            onClick={(e) => { e.stopPropagation(); setSelectedElementId('header'); }}
                            className={`flex flex-col md:flex-row items-center justify-between gap-6 group relative border-b border-black/5 ${config.header?.style?.isSticky !== false ? 'sticky top-0 z-40' : ''} transition-all cursor-pointer ring-0 hover:ring-2 hover:ring-indigo-500/50 hover:ring-inset`}
                            style={{
                                backgroundColor: config.header?.style?.backgroundColor || hfStyles.backgroundColor,
                                color: config.header?.style?.color || hfStyles.color,
                                backdropFilter: 'blur(12px)',
                                paddingTop: config.header?.style?.paddingTop || (config.header?.style?.paddingY !== undefined ? `${config.header.style.paddingY}rem` : '1.5rem'),
                                paddingBottom: config.header?.style?.paddingBottom || (config.header?.style?.paddingY !== undefined ? `${config.header.style.paddingY}rem` : '1.5rem'),
                                paddingLeft: config.header?.style?.paddingLeft || (config.header?.style?.paddingX !== undefined ? `${config.header.style.paddingX}rem` : '1.5rem'),
                                paddingRight: config.header?.style?.paddingRight || (config.header?.style?.paddingX !== undefined ? `${config.header.style.paddingX}rem` : '1.5rem'),
                            }}
                        >
                            <div className="flex items-center gap-3">
                                {config.header?.logo ? (
                                    <div className="relative group/logo">
                                        <img src={config.header.logo} alt={config.header?.title || website.name} style={{ height: config.header?.style?.logoHeight ? `${config.header.style.logoHeight}px` : '40px' }} className="w-auto object-contain" />
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
                                    value={brand?.companyName || config.header?.title || website?.name || 'Website Name'}
                                    onChange={(v: string) => commitConfig({ 
                                        ...config, 
                                        brand: { ...config.brand, companyName: v },
                                        header: { ...config.header, title: v } 
                                    })}
                                />
                            </div>

                            <nav className="flex flex-wrap justify-center items-center gap-6 text-sm font-bold opacity-80">
                                {config.pages?.filter((p: any) => p.isEnabled && (!p.navVisibility || p.navVisibility === 'both' || p.navVisibility === 'header')).map((p: any) => (
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
                        )}

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
                                            brand={brand}
                                            selectedElementId={selectedElementId}
                                            setSelectedElementId={setSelectedElementId}
                                            updateElement={updateElement}
                                            removeElement={removeElement}
                                            duplicateElement={duplicateElement}
                                            moveElementUp={moveElementUp}
                                            moveElementDown={moveElementDown}
                                            insertElementRelative={insertElementRelative}
                                            viewMode={viewMode}
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

                        {config.footer?.enabled !== false && activePage.showFooter !== false && (
                        <footer
                            onClick={(e) => { e.stopPropagation(); setSelectedElementId('footer'); }}
                            className="border-t border-black/10 transition-all cursor-pointer ring-0 hover:ring-2 hover:ring-indigo-500/50 hover:ring-inset"
                            style={{
                                backgroundColor: config.footer?.style?.backgroundColor || hfStyles.backgroundColor,
                                color: config.footer?.style?.color || hfStyles.color,
                                backdropFilter: 'blur(12px)',
                                paddingTop: config.footer?.style?.paddingTop || (config.footer?.style?.paddingY !== undefined ? `${config.footer.style.paddingY}rem` : '3rem'),
                                paddingBottom: config.footer?.style?.paddingBottom || (config.footer?.style?.paddingY !== undefined ? `${config.footer.style.paddingY}rem` : '3rem'),
                                paddingLeft: config.footer?.style?.paddingLeft || (config.footer?.style?.paddingX !== undefined ? `${config.footer.style.paddingX}rem` : '1.5rem'),
                                paddingRight: config.footer?.style?.paddingRight || (config.footer?.style?.paddingX !== undefined ? `${config.footer.style.paddingX}rem` : '1.5rem'),
                            }}
                        >
                            {(() => {
                                const footerLinks = config.pages?.filter((p: any) => p.isEnabled && p.id !== 'privacy' && p.id !== 'terms' && (!p.navVisibility || p.navVisibility === 'both' || p.navVisibility === 'footer')) || [];
                                const legalLinks = config.pages?.filter((p: any) => p.isEnabled && (p.id === 'privacy' || p.id === 'terms') && (!p.navVisibility || p.navVisibility === 'both' || p.navVisibility === 'footer')) || [];
                                return (
                                    <div className={`max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 mb-12 ${config.footer?.style?.layout === 'left-aligned' ? 'text-left' : 'text-center'}`}>
                                        <div className={`flex flex-col ${config.footer?.style?.layout === 'left-aligned' ? 'items-start' : 'items-center'}`}>
                                            {config.header?.logo && (
                                                <div className="mb-4">
                                                    <img src={config.header.logo} alt={config.header?.title || website.name} className="h-10 w-auto object-contain" />
                                                </div>
                                            )}
                                            <h4 className="font-bold mb-4 opacity-90 text-current" style={{ color: 'inherit' }}>Company</h4>
                                            <div 
                                                className="text-sm leading-relaxed whitespace-pre-wrap animate-none text-current cursor-pointer hover:opacity-75 transition-opacity" 
                                                style={{ color: 'inherit' }}
                                                onClick={(e) => { e.stopPropagation(); setSelectedElementId('footer'); }}
                                                title="Click to edit Company Information"
                                            >
                                                <div className="font-semibold">{brand?.companyName || config.header?.title || settingsCompany?.name || website.name}</div>
                                                <div className="opacity-90">{brand?.address || settingsCompany?.headquarters || '123 Business Avenue'}</div>
                                                <div className="opacity-90">{brand?.email || settingsCompany?.email || 'email@example.com'}</div>
                                                {brand?.phone && <div className="opacity-90">{brand.phone}</div>}
                                                {brand?.twitter && (
                                                    <div className="opacity-90 mt-1">
                                                        <a href={brand.twitter} target="_blank" rel="noopener noreferrer" className="hover:underline" onClick={e => e.preventDefault()}>Twitter</a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {footerLinks.length > 0 && (
                                            <div className={`flex flex-col ${config.footer?.style?.layout === 'left-aligned' ? 'items-start' : 'items-center'}`}>
                                                <h4 className="font-bold mb-4 opacity-90 text-current" style={{ color: 'inherit' }}>Links</h4>
                                                <nav className={`flex flex-col gap-3 text-sm opacity-80 font-medium animate-none ${config.footer?.style?.layout === 'left-aligned' ? 'text-left' : 'text-center'}`}>
                                                    {footerLinks.map((p: any) => (
                                                        <button key={p.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeActivePage(p.id); }} className="text-left hover:opacity-100 transition-opacity text-current" style={{ color: 'inherit' }}>{p.name}</button>
                                                    ))}
                                                </nav>
                                            </div>
                                        )}
                                        {legalLinks.length > 0 && (
                                            <div className={`flex flex-col ${config.footer?.style?.layout === 'left-aligned' ? 'items-start' : 'items-center'}`}>
                                                <h4 className="font-bold mb-4 opacity-90 text-current" style={{ color: 'inherit' }}>Legal</h4>
                                                <nav className={`flex flex-col gap-3 text-sm opacity-80 font-medium animate-none ${config.footer?.style?.layout === 'left-aligned' ? 'text-left' : 'text-center'}`}>
                                                    {legalLinks.map((p: any) => (
                                                        <button key={p.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeActivePage(p.id); }} className="text-left hover:opacity-100 transition-opacity text-current" style={{ color: 'inherit' }}>{p.name}</button>
                                                    ))}
                                                </nav>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                            <div className="text-center pt-8 border-t border-current/20 flex flex-col items-center justify-center w-full">
                                <div className="w-full max-w-lg mx-auto flex justify-center">
                                    <EditableText
                                        tagName="div"
                                        className="text-sm opacity-60 font-medium text-current text-center"
                                        style={{ color: 'inherit' }}
                                        value={config.footer?.copyright || `© ${new Date().getFullYear()} ${brand?.companyName || config.header?.title || website.name}. All Rights Reserved.`}
                                        onChange={(v: string) => commitConfig({ ...config, footer: { ...config.footer, copyright: v } })}
                                    />
                                </div>
                            </div>
                        </footer>
                        )}

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
                    {/* End of Device Frame Wrapper */}
                    </div>
                </div>

                {/* Right Side Panel – one panel at a time */}
                {(selectedElementId || showSettings) && (
                    <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto scrollbar-hide shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-40 relative">
                        {/* SIDEBAR HEADER ACTIONS */}
                        <div className="flex flex-col gap-2 p-3 border-b border-gray-200 bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 bg-white p-1 rounded-md shadow-sm border border-gray-200">
                                    <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"><Undo2 className="w-4 h-4" /></button>
                                    <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"><Redo2 className="w-4 h-4" /></button>
                                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                    {viewMode === 'desktop' ? (
                                        <button onClick={() => setViewMode('mobile')} className="p-1.5 rounded transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100" title="Mobile Preview">
                                            <Smartphone className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button onClick={() => setViewMode('desktop')} className="p-1.5 rounded transition-colors bg-indigo-50 text-indigo-600" title="PC View">
                                            <Monitor className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={() => {
                                         let url = '';
                                         const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
                                         const isLocal = rootDomain.includes('localhost') || !rootDomain;
                                         if (website?.customDomain) {
                                             url = `https://${website.customDomain}`;
                                         } else if (website?.slug) {
                                             const port = isLocal && typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : '';
                                             const domainWithPort = rootDomain ? (rootDomain.includes(':') ? rootDomain : `${rootDomain}${port}`) : `localhost${port || ':3000'}`;
                                             url = `http${isLocal ? '' : 's'}://${website.slug}.${domainWithPort}`;
                                         }
                                         if (url) {
                                             window.open(url, '_blank');
                                         }
                                     }} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors" title="Preview"><Eye className="w-4 h-4" /></button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleDiscard} className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">Discard</button>
                                    <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5">
                                        {saving ? <LogoLoader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>

                        {selectedElementId ? (
                            <PropertyPanel
                                selectedElement={
                                    selectedElementId === 'header' ? { 
                                        id: 'header', 
                                        type: 'header', 
                                        style: config.header?.style || {}, 
                                        logo: config.header?.logo, 
                                        title: config.brand?.companyName || config.header?.title || website?.name || '' 
                                    } :
                                        selectedElementId === 'footer' ? { 
                                            id: 'footer', 
                                            type: 'footer', 
                                            style: config.footer?.style || {}, 
                                            copyright: config.footer?.copyright 
                                        } :
                                            (
                                                findElementById(sections, selectedElementId) ||
                                                (config.header && findElementById([config.header], selectedElementId)) ||
                                                (config.footer && findElementById([config.footer], selectedElementId))
                                            )
                                }
                                brand={config.brand}
                                onUpdateBrand={updateBrand}
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
                                        if (key === 'title') {
                                            if (!newConfig.brand) newConfig.brand = {};
                                            newConfig.brand.companyName = value;
                                        }
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
                                config={config}
                                commitConfig={commitConfig}
                                activePageId={activePageId}
                                changeActivePage={changeActivePage}
                                sections={sections}
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

            <ConfirmModal 
                isOpen={showDiscardModal}
                title="Discard Changes"
                message="Are you sure you want to discard your changes? All unsaved work will be lost."
                confirmText="Discard Changes"
                cancelText="Cancel"
                onConfirm={() => {
                    window.location.reload();
                }}
                onCancel={() => setShowDiscardModal(false)}
                variant="danger"
            />

        </div>
    );
}

// Helpers



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