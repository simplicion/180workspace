'use client';

import { LogoLoader } from "@workspace/ui";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BuilderElement } from './BuilderElement';
import { getDefaultElementForType, migrateLegacySection } from './ElementFactory';
import { SITE_ROOT_CLASS, SITE_ROOT_STYLE, ResponsiveStyles } from './responsive-styles';

import {
    Eye, ArrowLeft, Monitor, Tablet, Smartphone, ChevronLeft, ChevronRight, Palette, Sparkles,
    CheckCircle2, Plus, Undo2, Redo2, Upload, AlertCircle, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSettings } from '@/lib/settings-context';
import PropertyPanel from './PropertyPanel';
import SettingsSidebar from './SettingsSidebar';
import TextEditor from './TextEditor';
import { AIWebsiteDrawer } from './_components/AIWebsiteDrawer';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

/** Undo history is capped so long sessions don't grow memory without bound. */
const HISTORY_LIMIT = 100;

const DEVICES: { mode: ViewMode; label: string; Icon: any }[] = [
    { mode: 'desktop', label: 'Desktop', Icon: Monitor },
    { mode: 'tablet', label: 'Tablet', Icon: Tablet },
    { mode: 'mobile', label: 'Mobile', Icon: Smartphone },
];

/**
 * Editor-only chrome CSS. Header/footer are rendered by this page (not by the element compiler), so they use the same
 * `@container site` breakpoints (tablet ≤ 1024px, mobile ≤ 767px) as the compiled element styles.
 */
const EDITOR_CHROME_CSS = `
.wb-ed-header{flex-direction:row}
.wb-ed-footer-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
@container site (max-width: 1024px){.wb-ed-footer-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container site (max-width: 767px){.wb-ed-header{flex-direction:column}.wb-ed-footer-grid{grid-template-columns:minmax(0,1fr)}}
`;

const deepClone = <T,>(v: T): T => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

/** Immutable set of a dotted path. `undefined` deletes the key (used for "reset to desktop"). */
function setIn(obj: any, keys: string[], value: any): any {
    const base = obj && typeof obj === 'object' ? obj : {};
    const [k, ...rest] = keys;
    if (rest.length === 0) {
        const copy: any = Array.isArray(base) ? [...base] : { ...base };
        if (value === undefined) delete copy[k];
        else copy[k] = value;
        return copy;
    }
    return { ...base, [k]: setIn(base[k], rest, value) };
}

/** Immutable node update by id; only the path from the root to the node is copied (structural sharing). */
function updateInTree(nodes: any[] | undefined, id: string, fn: (n: any) => any): { nodes: any[] | undefined; found: boolean } {
    if (!Array.isArray(nodes)) return { nodes, found: false };
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!n) continue;
        if (n.id === id) {
            const copy = nodes.slice();
            copy[i] = fn(n);
            return { nodes: copy, found: true };
        }
        if (n.children) {
            const r = updateInTree(n.children, id, fn);
            if (r.found) {
                const copy = nodes.slice();
                copy[i] = { ...n, children: r.nodes };
                return { nodes: copy, found: true };
            }
        }
    }
    return { nodes, found: false };
}

const subtreeHasFloating = (n: any): boolean => !!n?.children?.some((c: any) => !c || c.type === 'floating' || subtreeHasFloating(c));
const needsHoist = (sections: any): boolean => !Array.isArray(sections) || sections.some((s: any) => !s || subtreeHasFloating(s));

/** Floating elements always live at the page root (they're anchored to the viewport, not to a section). */
function hoistFloatingNodes(sections: any[]): any[] {
    if (!sections || !Array.isArray(sections)) return [];
    const hoisted: any[] = [];
    const cleanChildren = (nodes: any[]): any[] => {
        if (!nodes || !Array.isArray(nodes)) return [];
        const res: any[] = [];
        for (const n of nodes) {
            if (!n) continue;
            if (n.type === 'floating') {
                hoisted.push(n);
            } else {
                const cloned = { ...n };
                if (cloned.children && Array.isArray(cloned.children)) {
                    cloned.children = cleanChildren(cloned.children);
                }
                res.push(cloned);
            }
        }
        return res;
    };

    const inFlow = cleanChildren(sections.filter((s: any) => s && s.type !== 'floating'));
    const existingRootFloating = sections.filter((s: any) => s && s.type === 'floating');
    return [...inFlow, ...existingRootFloating, ...hoisted];
}

/** Returns a new config whose pages have floating nodes hoisted. Never mutates the input. */
function normalizePages(cfg: any): any {
    if (!cfg?.pages || !Array.isArray(cfg.pages)) return cfg;
    let changed = false;
    const pages = cfg.pages.map((p: any) => {
        if (p?.sections && needsHoist(p.sections)) {
            changed = true;
            return { ...p, sections: hoistFloatingNodes(p.sections) };
        }
        return p;
    });
    return changed ? { ...cfg, pages } : cfg;
}

/** Same token lookup as the shared api client (`@/lib/api`): localStorage first, then the cross-subdomain cookie. */
function readAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    const local = localStorage.getItem('platform_auth_token');
    if (local) return local;
    const m = document.cookie.match(/(^| )platform_auth_token=([^;]+)/);
    return m ? m[2] : null;
}

const isTypingTarget = (el: Element | null) => {
    const h = el as HTMLElement | null;
    return !!h && (h.tagName === 'INPUT' || h.tagName === 'TEXTAREA' || h.tagName === 'SELECT' || h.isContentEditable);
};

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

function EditorSkeleton() {
    return (
        <div className="fixed inset-0 z-[9999] bg-gray-100 flex flex-col overflow-hidden" aria-busy="true" aria-label="Loading editor">
            <div className="h-14 bg-white border-b border-gray-200 px-6 flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-4 w-48 rounded bg-gray-100 animate-pulse" />
                <div className="ml-auto flex gap-2">
                    <div className="h-9 w-24 rounded-lg bg-gray-100 animate-pulse" />
                    <div className="h-9 w-24 rounded-lg bg-gray-100 animate-pulse" />
                </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 p-6 space-y-4">
                    <div className="h-16 rounded-xl bg-white animate-pulse" />
                    <div className="h-72 rounded-xl bg-white animate-pulse" />
                    <div className="h-48 rounded-xl bg-white animate-pulse" />
                </div>
                <div className="w-80 bg-white border-l border-gray-200 p-4 space-y-3 hidden md:block">
                    <div className="h-10 rounded-lg bg-gray-100 animate-pulse" />
                    <div className="h-24 rounded-lg bg-gray-100 animate-pulse" />
                    <div className="h-24 rounded-lg bg-gray-100 animate-pulse" />
                </div>
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
    const [loadError, setLoadError] = useState<string | null>(null);

    // Auto-save State & Refs
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const lastSavedConfigRef = useRef<string>('');
    /** Identity of the last config known to be saved: lets the autosave effect skip stringify when nothing changed. */
    const lastSavedConfigObjRef = useRef<any>(null);
    const lastSavedNameRef = useRef<string>('');
    const autoSaveTimeoutRef = useRef<any>(null);
    const maxWaitTimeoutRef = useRef<any>(null);
    const isInitialLoadRef = useRef<boolean>(true);
    const inFlightSaveRef = useRef<boolean>(false);
    const pendingSaveRef = useRef<boolean>(false);

    // Latest values for long-lived listeners (keydown, beforeunload) so they don't re-subscribe on every edit.
    const configRef = useRef<any>(null);
    configRef.current = config;
    const websiteNameRef = useRef<string>('');
    websiteNameRef.current = website?.name || '';

    const [showSettings, setShowSettings] = useState(true);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const { company: settingsCompany } = useSettings();
    const currencySymbol = settingsCompany?.currencySymbol || '$';

    // View Modes
    const [viewMode, setViewMode] = useState<ViewMode>('desktop');

    // Multi-Page State
    const [activePageId, setActivePageId] = useState<string>('home');

    const changeActivePage = (pageId: string) => {
        setSelectedElementId(null);
        setActivePageId(pageId);
    };

    // Undo / Redo
    const [history, setHistory] = useState<any[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyIndexRef = useRef(historyIndex);
    useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);
    const historyTimeoutRef = useRef<any>(null);

    // Drag and Drop
    const [nativeDragOverIndex, setNativeDragOverIndex] = useState<number | null>(null);

    // Selected Element
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    useEffect(() => {
        if (selectedElementId) {
            setIsPanelCollapsed(false);
        }
    }, [selectedElementId]);

    const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);
    const [showAIDrawer, setShowAIDrawer] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isCanvasDragOver) setIsCanvasDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
        setIsCanvasDragOver(false);
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        setIsCanvasDragOver(false);

        const newType = e.dataTransfer.getData('newSectionType') || e.dataTransfer.getData('newsectiontype') || e.dataTransfer.getData('text/plain');
        if (newType) {
            addSection(newType, index + 1);
        }
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
            if (website?.id) {
                formData.append('relatedId', website.id);
                formData.append('relatedModel', 'Website');
            }
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
            setLoadError(null);
            const res = await api.get(`/api/websites/${id}`);
            setWebsite(res.data.website);

            // Normalize config to v2 Multi-Page structure
            let loadedConfig = res.data.website.config || {};
            const symbol = settingsCompany?.currencySymbol || '$';
            if (loadedConfig.version !== 2 && Array.isArray(loadedConfig.pages)) {
                // Multi-page config saved without a version tag (older create-website modal): keep its pages.
                loadedConfig = { ...loadedConfig, version: 2 };
            } else if (loadedConfig.version !== 2) {
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

            // Legacy (v1) section types (hero/services/about/faq/contact…) render nothing in the element renderer:
            // convert them to real element trees, keeping their copy.
            if (Array.isArray(loadedConfig?.pages)) {
                loadedConfig = {
                    ...loadedConfig,
                    pages: loadedConfig.pages.map((p: any) => (
                        Array.isArray(p?.sections)
                            ? { ...p, sections: hoistFloatingNodes(p.sections.filter(Boolean).map((s: any) => migrateLegacySection(s, symbol))) }
                            : p
                    ))
                };
            }

            setConfig(loadedConfig);
            lastSavedConfigRef.current = JSON.stringify(loadedConfig);
            lastSavedConfigObjRef.current = loadedConfig;
            lastSavedNameRef.current = res.data.website?.name || '';
            setHistory([deepClone(loadedConfig)]);
            setHistoryIndex(0);
            setSaveStatus('saved');
            setTimeout(() => {
                isInitialLoadRef.current = false;
            }, 300);
        } catch (err: any) {
            console.error('Failed to load website:', err);
            setLoadError(err?.response?.data?.error || err?.message || 'Failed to load website');
        } finally {
            setLoading(false);
        }
    };

    const performAutoSave = async (targetConfig?: any, targetName?: string) => {
        const currentConfig = targetConfig !== undefined ? targetConfig : configRef.current;
        const currentName = targetName !== undefined ? targetName : websiteNameRef.current;

        if (!currentConfig || isInitialLoadRef.current || !id) return;

        const currentConfigStr = JSON.stringify(currentConfig);
        if (currentConfigStr === lastSavedConfigRef.current && currentName === lastSavedNameRef.current) {
            lastSavedConfigObjRef.current = currentConfig;
            setSaveStatus('saved');
            return;
        }

        if (inFlightSaveRef.current) {
            pendingSaveRef.current = true;
            return;
        }

        try {
            inFlightSaveRef.current = true;
            setSaveStatus('saving');
            await api.patch(`/api/websites/${id}`, { name: currentName, config: currentConfig });
            lastSavedConfigRef.current = currentConfigStr;
            lastSavedConfigObjRef.current = currentConfig;
            lastSavedNameRef.current = currentName;
            setSaveStatus('saved');
        } catch (err) {
            console.error('Autosave error:', err);
            setSaveStatus('error');
        } finally {
            inFlightSaveRef.current = false;
            if (pendingSaveRef.current) {
                pendingSaveRef.current = false;
                performAutoSave();
            }
        }
    };

    const [isPublishing, setIsPublishing] = useState(false);
    const performPublish = async () => {
        if (!config || !id) return;
        setIsPublishing(true);
        try {
            await api.patch(`/api/websites/${id}`, {
                name: website?.name || '',
                config: config,
                publishedConfig: config,
                isPublished: true
            });
            toast.success('Website published successfully!');
        } catch (err) {
            console.error('Publish error:', err);
            toast.error('Failed to publish website');
        } finally {
            setIsPublishing(false);
        }
    };

    // Auto-save debounce effect (1200ms debounce, 4s max wait)
    useEffect(() => {
        if (isInitialLoadRef.current || !config || loading) return;

        const currentName = website?.name || '';

        // Unchanged since the last save (same object): nothing to do. Content-equal objects are detected
        // by performAutoSave, which serialises once per save instead of once per keystroke.
        if (config === lastSavedConfigObjRef.current && currentName === lastSavedNameRef.current) {
            if (saveStatus === 'unsaved') setSaveStatus('saved');
            return;
        }

        setSaveStatus('unsaved');

        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = setTimeout(() => {
            if (maxWaitTimeoutRef.current) {
                clearTimeout(maxWaitTimeoutRef.current);
                maxWaitTimeoutRef.current = null;
            }
            performAutoSave(config, currentName);
        }, 1200);

        // Max throttle ceiling (forces a save if continuous typing exceeds 4s)
        if (!maxWaitTimeoutRef.current) {
            maxWaitTimeoutRef.current = setTimeout(() => {
                maxWaitTimeoutRef.current = null;
                performAutoSave(configRef.current, websiteNameRef.current);
            }, 4000);
        }

        return () => {
            if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        };
    }, [config, website?.name]);

    // Keepalive emergency flush on window unload/tab close. Subscribed once; reads the latest state from refs.
    useEffect(() => {
        const handleBeforeUnload = () => {
            const cfg = configRef.current;
            if (!cfg || !id) return;
            const currentName = websiteNameRef.current;
            if (cfg === lastSavedConfigObjRef.current && currentName === lastSavedNameRef.current) return;
            const configStr = JSON.stringify(cfg);
            if (configStr === lastSavedConfigRef.current && currentName === lastSavedNameRef.current) return;
            const apiBase = api.defaults.baseURL;
            if (!apiBase) {
                console.error('Keepalive save skipped: API base URL is not configured (NEXT_PUBLIC_API_URL).');
                return;
            }
            try {
                const token = readAuthToken();
                fetch(`${apiBase.replace(/\/+$/, '')}/api/websites/${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: `{"name":${JSON.stringify(currentName)},"config":${configStr}}`,
                    keepalive: true
                });
            } catch (err) {
                console.error('Keepalive save error:', err);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [id]);

    const handleClose = async () => {
        if (saveStatus === 'unsaved' || inFlightSaveRef.current) {
            await performAutoSave();
        }
        router.push('/advertising');
    };

    const commitConfig = (newConfigOrUpdater: any) => {
        let computedConfig: any = null;
        setConfig((prevConfig: any) => {
            // Configs are treated as immutable: updaters return new objects (structural sharing), so no deep clone here.
            const next = typeof newConfigOrUpdater === 'function' ? newConfigOrUpdater(prevConfig) : newConfigOrUpdater;
            computedConfig = normalizePages(next);
            return computedConfig;
        });

        // History snapshots are taken once per burst of edits (500ms), not per keystroke.
        if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
        historyTimeoutRef.current = setTimeout(() => {
            historyTimeoutRef.current = null;
            const snapshot = deepClone(computedConfig);
            setHistory(prevHistory => {
                const hIndex = historyIndexRef.current;
                let nextHistory = prevHistory.slice(0, hIndex + 1);
                nextHistory.push(snapshot);
                if (nextHistory.length > HISTORY_LIMIT) nextHistory = nextHistory.slice(nextHistory.length - HISTORY_LIMIT);
                setHistoryIndex(nextHistory.length - 1);
                return nextHistory;
            });
        }, 500);
    };

    const handleUndo = () => {
        // An edit made in the last 500ms has no snapshot yet: undo it by restoring the latest snapshot.
        if (historyTimeoutRef.current) {
            clearTimeout(historyTimeoutRef.current);
            historyTimeoutRef.current = null;
            if (history[historyIndex]) {
                setConfig(deepClone(history[historyIndex]));
                return;
            }
        }
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setConfig(deepClone(history[historyIndex - 1]));
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setConfig(deepClone(history[historyIndex + 1]));
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
            if (!node) continue;
            if (node.id === id) return node;
            if (node.children) {
                const found = findElementById(node.children, id);
                if (found) return found;
            }
        }
        return undefined;
    };

    /** Set a dotted path on a node (`style.x`, `responsive.mobile.x`, `hiddenOn.tablet`, `data.y`, or `all` = data). */
    const updateElement = (id: string, path: string, value: any) => {
        const applyPath = (target: any) => (path === 'all' ? { ...target, data: value } : setIn(target, path.split('.'), value));
        commitConfig((prev: any) => {
            if (!prev) return prev;
            if (id === 'header') return { ...prev, header: applyPath(prev.header || {}) };
            if (id === 'footer') return { ...prev, footer: applyPath(prev.footer || {}) };

            if (prev.header) {
                const r = updateInTree([prev.header], id, applyPath);
                if (r.found) return { ...prev, header: r.nodes![0] };
            }
            if (prev.footer) {
                const r = updateInTree([prev.footer], id, applyPath);
                if (r.found) return { ...prev, footer: r.nodes![0] };
            }
            const pIndex = getActivePageIndex(prev);
            if (pIndex === -1) return prev;
            const page = prev.pages[pIndex];
            const r = updateInTree(page.sections, id, applyPath);
            if (!r.found) return prev;
            const pages = prev.pages.slice();
            pages[pIndex] = { ...page, sections: r.nodes };
            return { ...prev, pages };
        });
    };

    const showUndoToast = (message: string, before: any) => {
        toast((t) => (
            <span className="flex items-center gap-3 text-sm">
                {message}
                <button
                    onClick={() => { commitConfig(before); toast.dismiss(t.id); }}
                    className="min-h-11 px-3 font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg"
                >
                    Undo
                </button>
            </span>
        ), { duration: 6000 });
    };

    /** Deletes immediately (sections and elements alike) and offers Undo in a toast — no confirmation modal. */
    const removeElement = (id: string) => {
        const before = config;
        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;

        let removedType: string | undefined;
        const removeRecursive = (nodes: any[]): boolean => {
            if (!nodes) return false;
            for (let i = 0; i < nodes.length; i++) {
                if (!nodes[i]) continue;
                if (nodes[i].id === id) {
                    // Prevent removing root header/footer by checking if it's the only element in a single-element wrapper
                    if (nodes.length === 1 && (nodes[0].type === 'header' || nodes[0].type === 'footer')) {
                        return false;
                    }
                    removedType = nodes[i].type;
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
            showUndoToast(removedType === 'section' ? 'Section deleted' : 'Element deleted', before);
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

    // Keyboard shortcuts. The listener is attached once; the handler ref always sees the latest state.
    const shortcutHandlerRef = useRef<(e: KeyboardEvent) => void>(() => { });
    shortcutHandlerRef.current = (e: KeyboardEvent) => {
        if (isTypingTarget(document.activeElement) || isTypingTarget(e.target as Element)) return;
        const mod = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();
        const editableSelection = selectedElementId && selectedElementId !== 'header' && selectedElementId !== 'footer' ? selectedElementId : null;

        if (mod && key === 'z' && !e.shiftKey) {
            e.preventDefault();
            handleUndo();
        } else if (mod && ((key === 'z' && e.shiftKey) || key === 'y')) {
            e.preventDefault();
            handleRedo();
        } else if (mod && key === 'd') {
            e.preventDefault(); // also blocks the browser's bookmark shortcut
            if (editableSelection) duplicateElement(editableSelection);
        } else if (mod && key === 'a') {
            e.preventDefault(); // Prevent native text selection outside inputs
        } else if (e.key === 'Escape') {
            if (selectedElementId) setSelectedElementId(null);
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && editableSelection) {
            e.preventDefault();
            removeElement(editableSelection);
        }
    };
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => shortcutHandlerRef.current(e);
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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

        if (newConfig.header && findAndRemove([newConfig.header])) { /* found in header */ }
        else if (newConfig.footer && findAndRemove([newConfig.footer])) { /* found in footer */ }
        else findAndRemove(newConfig.pages[pIndex].sections);

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

    const addSection = (type: string, index: number, initialData?: any) => {
        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex > -1) {
            if (!newConfig.pages[pIndex].sections) {
                newConfig.pages[pIndex].sections = [];
            }
            const activeSections = newConfig.pages[pIndex].sections;
            if (type === 'video' && activeSections.some((s: any) => s?.type === 'video' || s?.data?.preset === 'video')) {
                toast.error("Only one Video section is allowed per page.");
                return;
            }

            // Generate the fully formed node from ElementFactory
            const generatedNode = getDefaultElementForType(type, currencySymbol);

            // Give it a fresh root-level ID to be safe
            generatedNode.id = 'sec-' + Date.now();
            if (initialData) {
                generatedNode.data = { ...generatedNode.data, ...initialData };
            }

            newConfig.pages[pIndex].sections.splice(index, 0, generatedNode);
            commitConfig(newConfig);
            if (type === 'floating') {
                setSelectedElementId(generatedNode.id);
            }
        }
    };

    const insertElementRelative = (targetId: string, elementType: string, position: 'left' | 'right' | 'top' | 'bottom' | 'inside', initialData?: any) => {
        // Floating elements can never be inserted inside or relative to sections/boxes!
        if (elementType === 'floating') {
            addSection('floating', 0, initialData);
            return;
        }

        const newConfig = JSON.parse(JSON.stringify(config));
        const pIndex = getActivePageIndex(newConfig);
        if (pIndex === -1) return;

        const insertTarget = (nodes: any[]): boolean => {
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === targetId) {
                    const newNode = getDefaultElementForType(elementType, currencySymbol);
                    newNode.id = 'el-' + Date.now(); // Generate unique ID
                    if (initialData) {
                        newNode.data = { ...newNode.data, ...initialData };
                    }

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

    const openLivePreview = () => {
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
    };

    if (loading) {
        return <EditorSkeleton />;
    }

    if (loadError || !website || !config) {
        return (
            <div className="fixed inset-0 z-[9999] bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-sm w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Couldn't open this website</h2>
                    <p className="text-sm text-gray-500 mb-6">{loadError || 'The website could not be loaded.'}</p>
                    <div className="flex flex-col gap-2">
                        <button onClick={fetchWebsite} className="min-h-11 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">
                            <RefreshCw className="w-4 h-4" /> Try again
                        </button>
                        <button onClick={() => router.push('/advertising')} className="min-h-11 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold">
                            Back to websites
                        </button>
                    </div>
                </div>
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

    const renderDeviceToggle = (compact: boolean) => (
        <div className={`flex items-center gap-0.5 ${compact ? '' : 'bg-gray-100 p-1 rounded-lg'}`} role="group" aria-label="Preview device">
            {DEVICES.map(({ mode, label, Icon }) => (
                <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    aria-pressed={viewMode === mode}
                    title={`${label} view${mode === 'desktop' ? '' : ` (edits become ${label.toLowerCase()} overrides)`}`}
                    className={`min-h-11 min-w-11 flex items-center justify-center gap-2 rounded-md transition-colors ${compact ? '' : 'px-3'} ${viewMode === mode ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-indigo-100' : 'text-gray-500 hover:text-gray-900 hover:bg-white/70'}`}
                >
                    <Icon className="w-4 h-4" />
                    {!compact && <span className="text-sm font-medium">{label}</span>}
                </button>
            ))}
        </div>
    );

    const renderSaveStatus = () => (
        <>
            {saveStatus === 'saving' && (
                <div title="Saving..." className="min-w-11 min-h-11 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg animate-pulse flex items-center justify-center shadow-xs">
                    <LogoLoader className="w-4 h-4 animate-spin text-indigo-600" />
                </div>
            )}
            {saveStatus === 'saved' && (
                <div title="Saved" className="min-w-11 min-h-11 text-emerald-600 bg-emerald-50/80 border border-emerald-100/80 rounded-lg flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
            )}
            {saveStatus === 'unsaved' && (
                <div title="Unsaved changes" className="min-w-11 min-h-11 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center shadow-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                </div>
            )}
            {saveStatus === 'error' && (
                <button
                    onClick={() => performAutoSave()}
                    className="min-w-11 min-h-11 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center justify-center shadow-xs"
                    title="Save failed. Click to retry"
                >
                    <AlertCircle className="w-4 h-4" />
                </button>
            )}
        </>
    );

    const renderNode = (node: any) => (
        <BuilderElement
            node={node}
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
    );

    const handleDropzoneDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(null); setIsCanvasDragOver(false);
        const mediaUrl = e.dataTransfer.getData('application/vnd.builder.media.url');
        const type = e.dataTransfer.getData('newSectionType') || e.dataTransfer.getData('newsectiontype') || e.dataTransfer.getData('text/plain');
        if (mediaUrl) {
            addSection('media', index, { imageUrl: mediaUrl });
        } else if (type) {
            addSection(type, index);
        }
    };

    const selectedNode = selectedElementId === 'header' ? {
        id: 'header',
        type: 'header',
        style: config.header?.style || {},
        logo: config.header?.logo,
        title: config.brand?.companyName || config.header?.title || website?.name || ''
    } : selectedElementId === 'footer' ? {
        id: 'footer',
        type: 'footer',
        style: config.footer?.style || {},
        copyright: config.footer?.copyright
    } : selectedElementId ? (
        findElementById(sections, selectedElementId) ||
        (config.header && findElementById([config.header], selectedElementId)) ||
        (config.footer && findElementById([config.footer], selectedElementId))
    ) : null;

    return (
        <div className="fixed inset-0 z-[9999] bg-gray-100 flex flex-col overflow-hidden">
            {/* Editor Top Head Toolbar - Smooth Slide Down/Up Animation */}
            <div
                className={`fixed top-0 inset-x-0 z-50 h-14 bg-white/95 backdrop-blur-md border-b border-gray-200 px-6 flex items-center justify-between shadow-xs transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${((selectedElementId || showSettings) && !isPanelCollapsed) ? '-translate-y-full' : 'translate-y-0'}`}
            >
                <div className="flex items-center gap-4">
                    <button onClick={handleClose} className="min-w-11 min-h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="Back to Websites" aria-label="Back to websites">
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

                    <div className="hidden md:flex items-center gap-1">
                        {renderDeviceToggle(false)}
                        <button onClick={openLivePreview} className="min-h-11 flex items-center gap-2 px-3 rounded-md transition-colors hover:bg-gray-100 text-gray-600 hover:text-indigo-600" title="Preview Live Site">
                            <Eye className="w-4 h-4" />
                            <span className="text-sm font-medium">Preview</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex justify-center items-center" id="text-editor-container">
                </div>

                <div className="flex items-center gap-3">
                    {renderSaveStatus()}

                    <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
                        <button onClick={handleUndo} disabled={historyIndex <= 0 && !historyTimeoutRef.current} title="Undo (Ctrl+Z)" aria-label="Undo" className="min-w-11 min-h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"><Undo2 className="w-4 h-4" /></button>
                        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Shift+Z)" aria-label="Redo" className="min-w-11 min-h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"><Redo2 className="w-4 h-4" /></button>
                    </div>
                    <button
                        onClick={() => setShowAIDrawer(true)}
                        className="min-h-11 flex items-center gap-1.5 px-3.5 text-sm font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg transition-all shadow-xs shadow-indigo-600/20 active:scale-95 cursor-pointer border border-indigo-500/30"
                        title="Open AI Website Builder & Live Synthesis"
                    >
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        <span>AI Builder</span>
                    </button>
                    <button
                        onClick={() => { setShowSettings(true); setIsPanelCollapsed(false); }}
                        className="min-h-11 flex items-center gap-2 px-4 text-sm font-bold rounded-lg transition-all duration-200 border bg-white hover:bg-indigo-50/70 hover:border-indigo-200 hover:text-indigo-600 text-gray-700 border-gray-200 shadow-xs active:scale-95"
                    >
                        <Palette className="w-4 h-4 text-indigo-600" />
                        Edit Design
                    </button>
                    <button
                        onClick={performPublish}
                        disabled={isPublishing}
                        className="min-h-11 px-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 border border-indigo-700 shadow-xs flex items-center gap-2 active:scale-95"
                        title="Publish current changes to the live website"
                    >
                        {isPublishing ? (
                            <LogoLoader className="w-4 h-4 animate-spin text-white" />
                        ) : (
                            <Upload className="w-4 h-4" />
                        )}
                        <span>Publish</span>
                    </button>
                </div>
            </div>

            <div className={`flex-1 flex overflow-hidden transition-all duration-300 ${!(showSettings || selectedElementId) ? 'pt-14' : 'pt-0'}`}>
                {/* Dynamically load Google Font */}
                <style dangerouslySetInnerHTML={{
                    __html: `@import url('https://fonts.googleapis.com/css2?family=${(brand.fontFamily || 'Inter').replace(/ /g, '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap');${EDITOR_CHROME_CSS}`
                }} />
                {/* Same compiled per-device CSS the live site uses; the frame width below drives its container queries. */}
                <ResponsiveStyles nodes={sections} brand={brand} showHidden />

                {/* Live Website Canvas */}
                <div
                    className={`flex-1 overflow-hidden flex flex-col justify-center items-center transition-colors relative ${viewMode !== 'desktop' ? 'bg-[#0b0c10] bg-[radial-gradient(#1e2230_1px,transparent_1px)] [background-size:20px_20px] py-6 px-4 overflow-x-auto' : 'bg-gray-100'} ${isCanvasDragOver ? 'bg-indigo-50/50' : ''}`}
                    onClick={() => setSelectedElementId(null)}
                    onDragOver={(e) => handleDragOver(e)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, sections.length - 1)}
                >
                    {/* Floating Device Info Badge */}
                    {viewMode !== 'desktop' && (
                        <div className="mb-3 flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[11px] font-medium text-gray-300 shadow-sm pointer-events-none select-none">
                            {viewMode === 'mobile' ? <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> : <Tablet className="w-3.5 h-3.5 text-indigo-400" />}
                            <span>{viewMode === 'mobile' ? 'iPhone 16 Pro' : 'iPad Pro 11"'}</span>
                            <span className="text-white/20">•</span>
                            <span className="text-gray-400 font-mono text-[10px]">{viewMode === 'mobile' ? '393 × 852' : '834 × 1194'}</span>
                            <span className="text-white/20">•</span>
                            <span className="text-amber-300 font-semibold">Editing {viewMode} overrides</span>
                        </div>
                    )}

                    {/* Device Frame Wrapper (Chassis). Screen widths match the real device CSS widths
                        (393px phone, 834px tablet) so container queries resolve exactly as on the device. */}
                    <div className={`relative transition-all duration-300 flex-shrink-0 ${viewMode === 'mobile'
                            ? 'w-[418px] h-[835px] max-h-[calc(100vh-120px)] bg-[#16171b] rounded-[54px] p-[10px] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.15),inset_0_0_0_2px_rgba(0,0,0,0.85)] border-[2.5px] border-[#292b34] flex flex-col'
                            : viewMode === 'tablet'
                                ? 'w-[863px] h-[1000px] max-h-[calc(100vh-120px)] bg-[#16171b] rounded-[36px] p-3 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.15)] border-[2.5px] border-[#292b34] flex flex-col'
                                : 'w-full h-full flex flex-col overflow-x-auto'
                        } ${isCanvasDragOver ? 'ring-4 ring-indigo-500 scale-[0.99] shadow-2xl' : ''}`}>

                        {/* Physical Hardware Buttons on Phone Chassis */}
                        {viewMode === 'mobile' && (
                            <>
                                <div className="absolute -left-[4px] top-[110px] w-[4px] h-[28px] bg-[#343744] rounded-l-xs shadow-xs" />
                                <div className="absolute -left-[4px] top-[152px] w-[4px] h-[52px] bg-[#343744] rounded-l-xs shadow-xs" />
                                <div className="absolute -left-[4px] top-[214px] w-[4px] h-[52px] bg-[#343744] rounded-l-xs shadow-xs" />
                                <div className="absolute -right-[4px] top-[165px] w-[4px] h-[76px] bg-[#343744] rounded-r-xs shadow-xs" />
                            </>
                        )}

                        {/* Tablet Camera dot */}
                        {viewMode === 'tablet' && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black rounded-full ring-1 ring-white/10 z-50"></div>
                        )}

                        {/* Mobile Status Bar & Dynamic Island */}
                        {viewMode === 'mobile' && (
                            <>
                                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[116px] h-[28px] bg-black rounded-full z-50 flex items-center justify-between px-3 pointer-events-none shadow-md shadow-black/60 ring-1 ring-white/10">
                                    <div className="w-3 h-3 rounded-full bg-[#0a0a0d] ring-1 ring-[#222530] flex items-center justify-center relative overflow-hidden">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#1e293b]/70" />
                                        <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-blue-400/50" />
                                    </div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#0d0f14]" />
                                </div>

                                <div className="absolute top-0 inset-x-0 h-10 px-7 flex items-center justify-between z-40 pointer-events-none select-none text-[12px] font-semibold text-gray-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
                                    <span>9:41</span>
                                    <div className="flex items-center gap-1.5 text-gray-900">
                                        <div className="flex items-end gap-[1.5px] h-3">
                                            <div className="w-[3px] h-1.5 bg-current rounded-[0.5px]" />
                                            <div className="w-[3px] h-2 bg-current rounded-[0.5px]" />
                                            <div className="w-[3px] h-2.5 bg-current rounded-[0.5px]" />
                                            <div className="w-[3px] h-3 bg-current rounded-[0.5px]" />
                                        </div>
                                        <span className="text-[10px] font-black tracking-tighter">5G</span>
                                        <div className="flex items-center">
                                            <div className="w-5 h-2.5 border border-current rounded-[3px] p-[1px] flex items-center">
                                                <div className="w-3 h-full bg-current rounded-[1px]" />
                                            </div>
                                            <div className="w-[1.5px] h-1 bg-current rounded-r-xs" />
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-36 h-1 bg-black/40 backdrop-blur-md rounded-full pointer-events-none z-50 shadow-xs" />
                            </>
                        )}

                        {/* Site root: the container that `@container site` queries resolve against (editor = live site).
                            Desktop view keeps at least the desktop breakpoint width so a narrow laptop window doesn't
                            silently show tablet styles while "Desktop" is selected. */}
                        <div
                            className={`${SITE_ROOT_CLASS} relative flex-1 min-h-0 flex flex-col overflow-hidden ${viewMode === 'mobile' ? 'rounded-[44px]' : viewMode === 'tablet' ? 'rounded-[26px]' : ''}`}
                            style={{ ...SITE_ROOT_STYLE, ...(viewMode === 'desktop' ? { minWidth: 1025 } : {}) }}
                        >
                        <div
                            className={`bg-white relative overflow-y-auto overflow-x-hidden flex-1 scrollbar-hide ${viewMode === 'mobile' ? 'pt-7' : ''}`}
                            style={{
                                fontFamily: `"${brand.fontFamily || 'Inter'}", sans-serif`,
                                color: brand.textColor || '#111827',
                                backgroundColor: (activePage?.bgType === 'image' ? 'transparent' : (activePage?.bgValue || brand.bgValue || '#ffffff')),
                                backgroundImage: (activePage?.bgType === 'image' && activePage?.bgValue) ? `url(${activePage.bgValue})` : (brand.bgType === 'image' && brand.bgValue ? `url(${brand.bgValue})` : 'none'),
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                '--primary': primaryColor,
                            } as any}
                        >
                        {/* Header */}
                        {config.header?.enabled !== false && activePage.showHeader !== false && (
                        <header
                            onClick={(e) => { e.stopPropagation(); setSelectedElementId('header'); }}
                            className={`wb-ed-header flex items-center justify-between gap-6 group relative border-b border-black/5 ${config.header?.style?.isSticky !== false ? 'sticky top-0 z-40' : ''} transition-all cursor-pointer ring-0 hover:ring-2 hover:ring-indigo-500/50 hover:ring-inset`}
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
                                        className="h-11 px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 border-dashed rounded-lg flex items-center justify-center gap-2 text-xs font-bold text-gray-500 transition-colors"
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

                        {(() => {
                            const inFlowSections = sections.filter((s: any) => s.type !== 'floating');
                            return (
                                <main
                                    className={`w-full flex-1 flex flex-col ${isCanvasDragOver && inFlowSections.length > 0 ? 'bg-indigo-50/10' : ''}`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        if (inFlowSections.length > 0) setIsCanvasDragOver(true);
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        setIsCanvasDragOver(false);
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsCanvasDragOver(false);
                                        // Only handle drop on main if we didn't drop on a specific dropzone
                                        if (nativeDragOverIndex === null && inFlowSections.length > 0) {
                                            const type = e.dataTransfer.getData('newSectionType') || e.dataTransfer.getData('text/plain');
                                            if (type) addSection(type, sections.length);
                                        }
                                    }}
                                >
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndDnd}>
                                    <SortableContext items={inFlowSections.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                                        {/* Empty State / First Dropzone */}
                                        {inFlowSections.length === 0 ? (
                                            <div
                                                className={`w-full min-h-[200px] py-12 transition-all duration-200 flex flex-col items-center justify-center px-4 relative z-50 ${nativeDragOverIndex === 0 || isCanvasDragOver ? 'bg-indigo-50 border-2 border-indigo-400 border-dashed' : 'bg-gray-50/90 border-2 border-dashed border-gray-200 hover:bg-gray-50'}`}
                                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(0); }}
                                                onDragLeave={(e) => { e.preventDefault(); if (nativeDragOverIndex === 0) setNativeDragOverIndex(null); }}
                                                onDrop={(e) => handleDropzoneDrop(e, 0)}
                                            >
                                                <div className="w-16 h-16 mb-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 shadow-inner">
                                                    <Plus className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">Start Building Your Page</h3>
                                                <p className="text-gray-500 text-center max-w-sm mb-4">
                                                    Drag and drop a section or image from the sidebar, or add a starter section.
                                                </p>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); addSection('hero', 0); }}
                                                    className="min-h-11 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold"
                                                >
                                                    Add a hero section
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className={`w-full transition-all duration-200 flex items-center justify-center -mb-2 relative z-50 ${nativeDragOverIndex === 0 ? 'h-20 bg-indigo-50 border-2 border-indigo-400 border-dashed rounded-lg mb-2 mt-4' : 'h-8 opacity-0 hover:h-8'}`}
                                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(0); }}
                                                onDragLeave={(e) => { e.preventDefault(); if (nativeDragOverIndex === 0) setNativeDragOverIndex(null); }}
                                                onDrop={(e) => handleDropzoneDrop(e, 0)}
                                            >
                                                {nativeDragOverIndex === 0 && <span className="text-indigo-400 text-sm font-bold">Drop Section or Media Here</span>}
                                            </div>
                                        )}

                                        {inFlowSections.map((section: any, idx: number) => (
                                            <React.Fragment key={section.id}>
                                                {renderNode(section)}
                                                {/* Dropzone after this section */}
                                                <div
                                                    className={`w-full transition-all duration-200 flex items-center justify-center -my-2 relative z-50 ${nativeDragOverIndex === idx + 1 ? 'h-20 bg-indigo-50 border-2 border-indigo-400 border-dashed rounded-lg my-2' : 'h-8 opacity-0 hover:h-8'}`}
                                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(idx + 1); }}
                                                    onDragLeave={(e) => { e.preventDefault(); if (nativeDragOverIndex === idx + 1) setNativeDragOverIndex(null); }}
                                                    onDrop={(e) => handleDropzoneDrop(e, idx + 1)}
                                                >
                                                    {nativeDragOverIndex === idx + 1 && <span className="text-indigo-400 text-sm font-bold">Drop Section or Media Here</span>}
                                                </div>
                                            </React.Fragment>
                                        ))}
                                    </SortableContext>
                                </DndContext>
                                </main>
                            );
                        })()}

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
                                const companyAddress = brand?.address || (settingsCompany as any)?.headquarters;
                                const companyEmail = brand?.email || (settingsCompany as any)?.email;
                                return (
                                    <div className={`wb-ed-footer-grid max-w-4xl mx-auto grid gap-10 mb-12 ${config.footer?.style?.layout === 'left-aligned' ? 'text-left' : 'text-center'}`}>
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
                                                <div className="font-semibold">{brand?.companyName || config.header?.title || (settingsCompany as any)?.companyName || (settingsCompany as any)?.name || website.name}</div>
                                                {companyAddress ? <div className="opacity-90">{companyAddress}</div> : <div className="opacity-50 italic">Add your address</div>}
                                                {companyEmail ? <div className="opacity-90">{companyEmail}</div> : <div className="opacity-50 italic">Add your email</div>}
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

                    </div>
                    {/* End of Scrollable Content Container */}

                    {/* Floating Screen Elements Overlay (anchored to the site root / device screen) */}
                    {sections.filter((s: any) => s.type === 'floating').map((floatingSec: any) => (
                        <React.Fragment key={floatingSec.id}>{renderNode(floatingSec)}</React.Fragment>
                    ))}
                    </div>
                    {/* End of Site Root */}

                    {/* End of Device Frame Wrapper */}
                    </div>
                </div>

                {/* Right Side Panel – Smooth Slide-In / Slide-Out Animation */}
                <div
                    className={`bg-white border-l border-gray-200 flex flex-col overflow-visible z-40 relative transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        (selectedElementId || showSettings)
                            ? (isPanelCollapsed ? 'w-0 border-l-0 translate-x-0' : 'w-80 translate-x-0 shadow-[-10px_0_30px_rgba(0,0,0,0.06)]')
                            : 'w-0 opacity-0 translate-x-12 pointer-events-none border-l-0 overflow-hidden shadow-none'
                    }`}
                >
                    {(selectedElementId || showSettings) && (
                        <button
                            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                            className="absolute top-1/2 -translate-y-1/2 -left-6 w-6 h-16 bg-white border border-gray-200 border-r-0 rounded-l-md flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-[-2px_0_8px_rgba(0,0,0,0.05)] z-50 transition-all duration-300"
                            title={isPanelCollapsed ? "Expand panel" : "Collapse panel"}
                            aria-label={isPanelCollapsed ? "Expand panel" : "Collapse panel"}
                        >
                            {isPanelCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    )}
                    <div className="w-80 min-w-[20rem] flex flex-col h-full overflow-hidden">
                        {/* SIDEBAR HEADER ACTIONS */}
                        <div className="flex flex-col gap-2 p-3 border-b border-gray-200 bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-md shadow-sm border border-gray-200">
                                    <button onClick={handleUndo} disabled={historyIndex <= 0 && !historyTimeoutRef.current} title="Undo (Ctrl+Z)" aria-label="Undo" className="min-w-11 min-h-11 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"><Undo2 className="w-4 h-4" /></button>
                                    <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Shift+Z)" aria-label="Redo" className="min-w-11 min-h-11 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"><Redo2 className="w-4 h-4" /></button>
                                </div>
                                <div className="bg-gray-100 p-0.5 rounded-md">
                                    {renderDeviceToggle(true)}
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-1.5">
                                <button onClick={openLivePreview} className="min-h-11 px-3 flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors" title="Preview live site">
                                    <Eye className="w-4 h-4" /> Preview
                                </button>
                                <div className="flex items-center gap-1.5">
                                    {renderSaveStatus()}
                                    <button
                                        onClick={performPublish}
                                        disabled={isPublishing}
                                        className="min-h-11 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 border border-indigo-700 shadow-xs flex items-center gap-1.5 active:scale-95 shrink-0"
                                        title="Publish current changes to the live website"
                                    >
                                        {isPublishing ? (
                                            <LogoLoader className="w-3.5 h-3.5 animate-spin text-white" />
                                        ) : (
                                            <Upload className="w-3.5 h-3.5" />
                                        )}
                                        <span>Publish</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        {selectedElementId ? (
                            <PropertyPanel
                                website={website}
                                viewMode={viewMode}
                                selectedElement={selectedNode}
                                brand={config.brand}
                                onUpdateBrand={updateBrand}
                                onUpdate={(key: string, value: any) => {
                                    if (selectedElementId === 'header') {
                                        commitConfig((prev: any) => {
                                            const next = { ...prev, header: setIn(prev.header || {}, key.split('.'), value) };
                                            if (key === 'title') next.brand = { ...(prev.brand || {}), companyName: value };
                                            return next;
                                        });
                                    } else if (selectedElementId === 'footer') {
                                        commitConfig((prev: any) => ({ ...prev, footer: setIn(prev.footer || {}, key.split('.'), value) }));
                                    } else {
                                        updateElement(selectedElementId, key, value);
                                    }
                                }}
                                onClose={() => setSelectedElementId(null)}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0 bg-white overflow-y-auto overflow-x-hidden pb-12">
                                <SettingsSidebar
                                website={website}
                                brand={brand}
                                updateBrand={updateBrand}
                                config={config}
                                commitConfig={commitConfig}
                                activePageId={activePageId}
                                changeActivePage={changeActivePage}
                                sections={sections}
                                onOpenAIDrawer={() => setShowAIDrawer(true)}
                                onSelectElement={(nodeId: string) => setSelectedElementId(nodeId)}
                                selectedElementId={selectedElementId}
                            />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Live Website Builder Side Drawer */}
            <AIWebsiteDrawer
                isOpen={showAIDrawer}
                onClose={() => setShowAIDrawer(false)}
                website={website}
                config={{ ...config, activePageId }}
                onApplyConfig={(newConfig) => {
                    commitConfig(newConfig);
                    if (newConfig?.activePageId && newConfig.activePageId !== activePageId) {
                        setActivePageId(newConfig.activePageId);
                    }
                }}
            />

        </div>
    );
}
