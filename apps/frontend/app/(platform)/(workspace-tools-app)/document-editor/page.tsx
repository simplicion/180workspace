'use client';

import { LogoLoader } from "@workspace/ui";
import React, { useEffect, useState, useRef, Suspense, useMemo } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { X, FileText, Edit2, Tags, Mail, Users, ChevronDown, ChevronLeft, ChevronRight, FilePlus, Check, Download, Printer, HardDrive, ExternalLink, ArrowLeft, Save, FileBadge2, Search, Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Palette, ZoomIn, ZoomOut, Maximize, Minimize, FileSymlink, MessageSquare, Undo, Redo, Plus, Heading1, List, Grid, Minus, Square, Image as ImageIcon, FormInput, EyeOff, Eye, LayoutTemplate, Settings2, Trash2, Signature, Scissors, Link2, Sparkles, Calculator, Columns, Rows, LayoutGrid, Share2, Sliders, Code2, Keyboard } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setZoomLevel, addBlock, insertBlockAt, selectBlock, reorderBlocks, updateDocumentDetails, updateDesignSettings, undo, redo, updateMetaType, MetaType, updateBlock, removeBlock, duplicateBlock, initializeDocument, setHeaderBlocks, setFooterBlocks } from '@/redux/slices/documentSlice';
import { SortableBlock } from './_components/SortableBlock';
import { StaticBlockRenderer } from './_components/StaticBlockRenderer';
import { DocumentRecipientDropdown } from './_components/DocumentRecipientDropdown';
import { GlobalDesignPanel } from './_components/GlobalDesignPanel';
import { ElementPropertiesDispatcher } from './_components/properties/ElementPropertiesDispatcher';
import { ElementsCatalogPanel, createDefaultDocumentBlock } from './_components/ElementsCatalogPanel';
import { JsonSchemaEditorModal } from './_components/JsonSchemaEditorModal';
import { AIDocumentDrawer } from './_components/AIDocumentDrawer';
import { LiveAIStreamOverlay } from './_components/LiveAIStreamOverlay';
import { DOCUMENT_TEMPLATES, DocumentTemplate, BrandConfig } from '../_components/templatesData';
import { HEADER_TEMPLATES, FOOTER_TEMPLATES } from '../_components/headerFooterTemplates';
import { generateHtmlFromBlocks } from './_components/utils/generateHtml';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useGetClientsQuery } from '../../../../redux/api/clientApi';
import { useGetUsersQuery } from '../../../../redux/api/userApi';
import { useGetProjectsQuery } from '../../../../redux/api/projectApi';
import api from '@/lib/api';
import { useSettings } from '@/lib/settings-context';
import { generatePDF } from '@/lib/pdf-utils';
import { generateDOCX } from '@/lib/docx-utils';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomSelect from '@/components/ui/CustomSelect';
import ShareDocumentModal from '../_components/ShareDocumentModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
    contract: 'bg-blue-50 text-blue-700 border-blue-100',
    offer_letter: 'bg-purple-50 text-purple-700 border-purple-100',
    policy: 'bg-amber-50 text-amber-700 border-amber-100',
    report: 'bg-rose-50 text-rose-700 border-rose-100',
    other: 'bg-gray-50 text-gray-600 border-gray-100',
};

// ─── Export / Format buttons ──────────────────────────────────────────────────
function ExportBar({
    htmlContent,
    title,
    driveConfigured,
    onSaveToDrive,
    saving,
    onDownload,
    onSendEmail,
}: {
    htmlContent: string;
    title: string;
    driveConfigured: boolean;
    onSaveToDrive: () => void;
    saving: boolean;
    onDownload: (format: 'pdf' | 'docx') => void;
    onSendEmail: () => void;
}) {
    const slug = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const [showDropdown, setShowDropdown] = useState(false);

    function downloadHTML() {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${slug}.html`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success('Downloaded as HTML');
    }

    function printPDF() {
        const w = window.open('', '_blank', 'width=900,height=700');
        if (!w) return toast.error('Popup blocked — allow popups for this site.');
        w.document.write(htmlContent);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); }, 400);
        toast('Print dialog opened. Select "Save as PDF" to download as PDF.', { icon: '🖨️' });
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Export Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                >
                    <Download className="w-3.5 h-3.5" /> Export <ChevronDown className={clsx('w-3 h-3 transition-transform', showDropdown && 'rotate-180')} />
                </button>

                {showDropdown && (
                    <div className="absolute left-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                        <button onClick={() => { onDownload('pdf'); setShowDropdown(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 text-left font-medium">
                            <FileText className="w-3.5 h-3.5 text-rose-500" /> Download as PDF
                        </button>
                        <button onClick={() => { onDownload('docx'); setShowDropdown(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 text-left font-medium">
                            <FileText className="w-3.5 h-3.5 text-blue-500" /> Download as DOCX
                        </button>
                    </div>
                )}
            </div>

            {/* Send via Email */}
            <button
                onClick={onSendEmail}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:text-indigo-700 transition-colors"
            >
                <Mail className="w-3.5 h-3.5 text-indigo-500" /> Send via Email
            </button>

            {/* Print / Save as PDF */}
            <button
                onClick={printPDF}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:text-indigo-700 transition-colors"
            >
                <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>

            {/* Save to Drive (always shown, different label if not configured) */}
            <button
                onClick={onSaveToDrive}
                disabled={saving}
                className={clsx(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors border',
                    driveConfigured
                        ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                )}
                title={driveConfigured ? 'Save to Google Drive' : 'Drive not configured — saves to cloud storage'}
            >
                {saving
                    ? <LogoLoader className="w-3.5 h-3.5 animate-spin" />
                    : driveConfigured
                        ? <HardDrive className="w-3.5 h-3.5" />
                        : <Save className="w-3.5 h-3.5" />
                }
                {driveConfigured ? 'Save to Drive' : 'Save to Cloud'}
                {!driveConfigured && (
                    <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold border border-amber-200">
                        Drive not set
                    </span>
                )}
            </button>
        </div>
    );
}

// ─── Template Editor ──────────────────────────────────────────────────────────
function TemplateEditor({
    template,
    brand,
    driveConfigured,
    onBack,
    onClose,
    onSuccess,
}: {
    template: DocumentTemplate;
    brand: BrandConfig;
    driveConfigured: boolean;
    onBack: () => void;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [docType, setDocType] = useState<string>(template.category);
    const [taggedUsers, setTaggedUsers] = useState<any[]>([]);
    const [sendEmail, setSendEmail] = useState(false);
    const [saving, setSaving] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [showUserPicker, setShowUserPicker] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [preview, setPreview] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailRecipient, setEmailRecipient] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailFormat, setEmailFormat] = useState<'pdf' | 'docx'>('pdf');
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [activeTab, setActiveTab] = useState<'properties' | 'design'>('properties');
    const dispatch = useDispatch();
    const zoomLevel = useSelector((state: any) => state.document?.zoomLevel || 100);
    const blocks = useSelector((state: any) => state.document?.blocks || []);
    const rootBlocks = blocks.filter((b: any) => !b.parentId);
    const headerBlocks = useSelector((state: any) => state.document?.headerBlocks || []);
    const footerBlocks = useSelector((state: any) => state.document?.footerBlocks || []);
    const selectedBlockId = useSelector((state: any) => state.document?.selectedBlockId || null);
    const documentDetails = useSelector((state: any) => state.document?.documentDetails);
    const metaType = useSelector((state: any) => state.document?.metaType || 'general');
    const rawDesignSettings = useSelector((state: any) => state.document?.designSettings || { fontFamily: 'Inter, sans-serif', primaryColor: '#2563eb', pageBackground: '#ffffff', pagePadding: '40px', selectedHeaderId: 'none', selectedFooterId: 'none' });
    const isDefaultColor = rawDesignSettings.primaryColor === '#2563eb';
    const effectiveDesignSettings = { 
        fontFamily: rawDesignSettings.fontFamily || 'Inter, sans-serif',
        pageBackground: rawDesignSettings.pageBackground || '#ffffff',
        pagePadding: rawDesignSettings.pagePadding || '40px',
        ...rawDesignSettings,
        primaryColor: isDefaultColor ? (brand?.brandColor || rawDesignSettings.primaryColor) : rawDesignSettings.primaryColor
    };
    const designSettings = effectiveDesignSettings;
    const pastLength = useSelector((state: any) => state.document?.past?.length || 0);
    const futureLength = useSelector((state: any) => state.document?.future?.length || 0);

    const { data: clientsData, isLoading: clientsLoading } = useGetClientsQuery({});
    const { data: employeesData, isLoading: employeesLoading } = useGetUsersQuery({});
    const { data: projectsData, isLoading: projectsLoading } = useGetProjectsQuery({});
    
    const clients = clientsData?.clients || clientsData?.data || [];
    const employees = employeesData?.users || employeesData?.data || [];
    const projects = projectsData?.projects || projectsData?.data || [];

    // Switch to properties tab whenever a block is clicked/selected
    useEffect(() => {
        if (selectedBlockId) {
            setActiveTab('properties');
        }
    }, [selectedBlockId]);

    // Initialize Redux state with template and dynamic company brand details
    useEffect(() => {
        if (template) {
            dispatch(initializeDocument({
                blocks: template.blocks || [],
                documentDetails: {
                    companyName: (brand as any)?.companyName || 'Company Name',
                    companyAddress: (brand as any)?.companyAddress || 'Company Address',
                    companyEmail: (brand as any)?.companyEmail || 'company@example.com',
                    companyPhone: (brand as any)?.companyPhone || '+9999999999',
                    companyWebsite: (brand as any)?.companyWebsite || 'www.company.com',
                    companyLogo: (brand as any)?.companyLogo || '',
                    companyGst: (brand as any)?.companyGst || 'TAX-ID-0000',
                    authorizedSignatory: (brand as any)?.authorizedSignatory || 'Authorized Signatory',
                    ...(template.documentDetails || { title: template.title })
                }
            }));
        }
    }, [template, brand, dispatch]);

    // Dynamically inject active Google Font stylesheet into <head>
    useEffect(() => {
        const fontName = (designSettings?.fontFamily || 'Inter').split(',')[0].replace(/['"]/g, '').trim();
        if (fontName) {
            const linkId = `google-font-page-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
            if (!document.getElementById(linkId)) {
                const link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;
                document.head.appendChild(link);
            }
        }
    }, [designSettings?.fontFamily]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const activeBlock = blocks.find((b: any) => b.id === active.id);
            const overBlock = blocks.find((b: any) => b.id === over.id);
            
            if (activeBlock && overBlock) {
                // If dragging over an empty container (which is a sortable item itself)
                if (overBlock.type === 'container') {
                    // Check if they dropped it directly onto the container's sortable representation
                    dispatch(updateBlock({ id: active.id as string, updates: { parentId: overBlock.id } }));
                    
                    const oldIndex = blocks.findIndex((b: any) => b.id === active.id);
                    // Move the block to be visually inside the container by placing it right after it in the flat list
                    const newIndex = blocks.findIndex((b: any) => b.id === over.id) + 1;
                    dispatch(reorderBlocks({ oldIndex, newIndex }));
                    return;
                }
                
                // If dragging between different containers/roots, update parentId
                if (activeBlock.parentId !== overBlock.parentId) {
                    dispatch(updateBlock({ id: active.id as string, updates: { parentId: overBlock.parentId } }));
                }
            }

            const oldIndex = blocks.findIndex((b: any) => b.id === active.id);
            const newIndex = blocks.findIndex((b: any) => b.id === over.id);
            dispatch(reorderBlocks({ oldIndex, newIndex }));
        }
    };

    const handleZoomIn = () => dispatch(setZoomLevel(Math.min(zoomLevel + 10, 120)));
    const handleZoomOut = () => dispatch(setZoomLevel(Math.max(zoomLevel - 10, 50)));

    const handleToggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
            setIsFullscreen(false);
        }
    };

    // Keep fullscreen state perfectly synced with native browser changes
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    // View and Share/Export Dropdown States & Refs
    const [showViewMenu, setShowViewMenu] = useState(false);
    const [showShareExportMenu, setShowShareExportMenu] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showJsonModal, setShowJsonModal] = useState(false);
    const viewMenuRef = useRef<HTMLDivElement>(null);
    const shareExportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
                setShowViewMenu(false);
            }
            if (shareExportMenuRef.current && !shareExportMenuRef.current.contains(e.target as Node)) {
                setShowShareExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [nativeDragOverIndex, setNativeDragOverIndex] = useState<number | null>(null);
    const [documentId, setDocumentId] = useState<string | null>(
        template?.id && !template.id.startsWith('t-') ? template.id : null
    );

    // AI Document Builder Drawer & Live Generation State
    const [showAIDrawer, setShowAIDrawer] = useState(false);
    const [isAIGenerating, setIsAIGenerating] = useState(false);
    const [aiStatusMessage, setAIStatusMessage] = useState('AI is synthesizing document structure...');
    const aiAbortControllerRef = useRef<AbortController | null>(null);

    const searchParams = useSearchParams();
    useEffect(() => {
        if (searchParams?.get('ai') === 'open') {
            setShowAIDrawer(true);
        }
    }, [searchParams]);

    const handleStopAIGeneration = () => {
        if (aiAbortControllerRef.current) {
            aiAbortControllerRef.current.abort();
        }
        setIsAIGenerating(false);
        setShowAIDrawer(true);
        toast('AI Generation stopped', { icon: '⏹' });
    };

    const handleDropNewBlock = (blockType: string, index: number, parentId?: string) => {
        const newBlock = createDefaultDocumentBlock(blockType, documentDetails);
        dispatch(insertBlockAt({ block: newBlock, index, parentId }));
        toast.success(`Added ${newBlock.type} block`, { id: 'canvas-drop-toast', duration: 1500, icon: '✨' });
    };


    // Derived document detail variables
    const title = documentDetails?.title || '';
    const clientName = documentDetails?.clientName || '';
    const clientEmail = documentDetails?.clientEmail || '';
    const validUntil = documentDetails?.validUntil || '';
    const showTotalAmount = documentDetails?.showTotalAmount || false;
    const totalAmount = documentDetails?.totalAmount || 0;
    const requireName = documentDetails?.requireName || false;

    // Generate live branded HTML from template
    const liveHtml = generateHtmlFromBlocks(blocks, documentDetails, effectiveDesignSettings, brand);

    const persistDocument = async (): Promise<string | null> => {
        try {
            setSaving(true);
            const docTitle = title?.trim() || 'Untitled Document';
            const payload = {
                title: docTitle,
                name: docTitle,
                content: JSON.stringify({ blocks, documentDetails }),
                category: documentDetails?.metaType || 'Document',
                tags: ['draft'],
                documentType: (documentDetails?.metaType || 'INVOICE').toUpperCase(),
                blocks,
                headerBlocks,
                footerBlocks,
                variables: documentDetails,
                designSettings: effectiveDesignSettings,
                clientId: documentDetails?.selectedClientId || null,
                employeeId: documentDetails?.selectedEmployeeId || null,
                subtotal: Number(documentDetails?.subtotal || 0),
                taxPercent: Number(documentDetails?.taxPercent || 0),
                taxAmount: Number(documentDetails?.taxAmount || 0),
                discount: Number(documentDetails?.discount || 0),
                grandTotal: Number(documentDetails?.totalAmount || documentDetails?.grandTotal || 0)
            };

            let targetId = documentId;
            if (targetId && !targetId.startsWith('t-')) {
                try {
                    const res = await api.put(`/api/v1/workspace-tools/documents/${targetId}`, payload);
                    const updatedId = res.data?.document?.id || res.data?.article?.id || res.data?.data?.id || targetId;
                    if (updatedId) {
                        setDocumentId(updatedId);
                        return updatedId;
                    }
                } catch (putErr) {
                    console.warn('PUT failed, falling back to POST create:', putErr);
                }
            }

            // Create new document if targetId was null, starts with 't-', or PUT failed
            const res = await api.post('/api/v1/workspace-tools/documents', payload);
            const createdId = res.data?.document?.id || res.data?.article?.id || res.data?.data?.id || res.data?.data?._id || res.data?.id;
            if (createdId) {
                setDocumentId(createdId);
                return createdId;
            }
        } catch (err: any) {
            console.error('Failed to persist document:', err);
            toast.error(err?.response?.data?.message || 'Failed to save document draft.');
        } finally {
            setSaving(false);
        }
        return documentId;
    };

    const handleOpenViewer = async () => {
        let activeId = documentId;
        if (!activeId || activeId.startsWith('t-')) {
            const toastId = toast.loading('Preparing document preview...');
            activeId = await persistDocument();
            toast.dismiss(toastId);
        }
        if (activeId) {
            window.open(`/document-viewer?id=${activeId}`, '_blank');
        } else {
            toast.error('Unable to open document viewer. Please check document title.');
        }
    };

    const handleOpenShareModal = async () => {
        let activeId = documentId;
        if (!activeId || activeId.startsWith('t-')) {
            const toastId = toast.loading('Preparing document for sharing...');
            activeId = await persistDocument();
            toast.dismiss(toastId);
        }
        if (activeId) {
            setShowShareModal(true);
        } else {
            toast.error('Unable to prepare document. Please check document contents.');
        }
    };

    const handleCopyShareLink = async () => {
        try {
            let activeId = documentId;
            if (!activeId || activeId.startsWith('t-')) {
                activeId = await persistDocument();
            }

            if (!activeId) {
                toast.error('Unable to save document right now. Please try again.');
                return;
            }

            const shareRes = await api.post(`/api/v1/workspace-tools/documents/${activeId}/share`);
            if (shareRes.data?.shareToken) {
                const url = `${window.location.origin}/f/document/${shareRes.data.shareToken}`;
                await navigator.clipboard.writeText(url);
                toast.success('Public E-Sign link copied to clipboard!');
            }
        } catch (err) {
            console.error('Error generating share link:', err);
            toast.error('Failed to generate public signing link');
        }
    };

    // Autosave functionality
    useEffect(() => {
        const handleAutosave = async () => {
            if (!title.trim() || blocks.length === 0) return;
            setSaving(true);
            try {
                const payload = {
                    title,
                    name: title,
                    content: JSON.stringify({ blocks, documentDetails }),
                    category: documentDetails?.metaType || 'Document',
                    tags: ['draft'],
                    documentType: (documentDetails?.metaType || 'INVOICE').toUpperCase(),
                    blocks,
                    headerBlocks,
                    footerBlocks,
                    variables: documentDetails,
                    designSettings: effectiveDesignSettings,
                    clientId: documentDetails?.selectedClientId || null,
                    employeeId: documentDetails?.selectedEmployeeId || null,
                    subtotal: Number(documentDetails?.subtotal || 0),
                    taxPercent: Number(documentDetails?.taxPercent || 0),
                    taxAmount: Number(documentDetails?.taxAmount || 0),
                    discount: Number(documentDetails?.discount || 0),
                    grandTotal: Number(documentDetails?.totalAmount || documentDetails?.grandTotal || 0)
                };
                
                if (documentId && !documentId.startsWith('t-')) {
                    try {
                        await api.put(`/api/v1/workspace-tools/documents/${documentId}`, payload);
                    } catch (putErr) {
                        const res = await api.post('/api/v1/workspace-tools/documents', payload);
                        const newId = res.data?.document?.id || res.data?.data?.id || res.data?.data?._id || res.data?.id;
                        if (newId) setDocumentId(newId);
                    }
                } else {
                    const res = await api.post('/api/v1/workspace-tools/documents', payload);
                    const newId = res.data?.document?.id || res.data?.data?.id || res.data?.data?._id || res.data?.id;
                    if (newId) setDocumentId(newId);
                }
            } catch (err) {
                console.error("Autosave failed", err);
            } finally {
                setSaving(false);
            }
        };

        const timer = setTimeout(() => {
            handleAutosave();
        }, 2000); // 2 seconds debounce

        return () => clearTimeout(timer);
    }, [blocks, documentDetails, title, documentId, headerBlocks, footerBlocks, effectiveDesignSettings]);

    // Auto-fill recipient when modal opens or tagged users change
    useEffect(() => {
        if (showEmailModal && taggedUsers.length > 0 && !emailRecipient) {
            setEmailRecipient(taggedUsers[0].email || '');
            setEmailMessage(`Hi ${taggedUsers[0].name || ''},\n\nPlease find the attached ${title} for your reference.`);
        }
    }, [showEmailModal, taggedUsers, title, emailRecipient]);

    useEffect(() => {
        setLoadingUsers(true);
        api.get('/api/v1/identity/users')
            .catch(() => api.get('/api/users'))
            .then((res) => {
                if (res?.data) {
                    setAllUsers(res.data.users || res.data.data || res.data || []);
                }
            })
            .catch((err) => {
                console.warn('Optional users tagging fetch skipped:', err);
                setAllUsers([]);
            })
            .finally(() => setLoadingUsers(false));
    }, []);

    useEffect(() => {
        const handleGlobalWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                const target = e.target as HTMLElement;
                const container = target.closest('#document-canvas-container');
                
                if (container) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -10 : 10;
                    dispatch(setZoomLevel(Math.min(Math.max(50, zoomLevel + delta), 200)));
                } else {
                    e.preventDefault(); 
                }
            }
        };
        
        window.addEventListener('wheel', handleGlobalWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleGlobalWheel);
    }, [dispatch, zoomLevel]);

    // ─────────────────────────────────────────────────────────────────────────────
    // System Controls & Keyboard Shortcuts (Ctrl+A, Delete, Ctrl+B, Ctrl+Z, Ctrl+S, etc.)
    // ─────────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            const isInputActive = activeEl && (
                activeEl.tagName === 'INPUT' || 
                activeEl.tagName === 'TEXTAREA' || 
                activeEl.getAttribute('contenteditable') === 'true' ||
                (activeEl as HTMLElement).isContentEditable ||
                Boolean(activeEl.closest('.ProseMirror')) ||
                Boolean(activeEl.closest('.tiptap'))
            );

            const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
            const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

            // 1. DELETE / BACKSPACE: Delete selected block when not typing inside an input field
            if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputActive) {
                if (selectedBlockId) {
                    e.preventDefault();
                    dispatch(removeBlock(selectedBlockId));
                    toast.success('Block deleted', { id: 'block-del', duration: 1200 });
                }
                return;
            }

            // 2. ESCAPE: Deselect active block, close shortcuts modal, or exit fullscreen
            if (e.key === 'Escape') {
                if (showShortcutsModal) {
                    setShowShortcutsModal(false);
                } else if (isFullscreen) {
                    setIsFullscreen(false);
                } else if (selectedBlockId) {
                    dispatch(selectBlock(null));
                }
                return;
            }

            // 3. CTRL / CMD KEYBOARD CONTROLS
            if (isCmdOrCtrl) {
                const key = e.key.toLowerCase();

                // Ctrl + S : Save Document Draft
                if (key === 's') {
                    e.preventDefault();
                    persistDocument().then(() => {
                        toast.success('Document draft saved!', { id: 'doc-saved', duration: 1500 });
                    });
                    return;
                }

                // Ctrl + Z : Undo
                if (key === 'z' && !e.shiftKey) {
                    if (!isInputActive) {
                        e.preventDefault();
                        if (pastLength > 0) {
                            dispatch(undo());
                            toast('Undo', { icon: '↶', id: 'undo', duration: 1000 });
                        }
                    }
                    return;
                }

                // Ctrl + Y or Ctrl + Shift + Z : Redo
                if (key === 'y' || (key === 'z' && e.shiftKey)) {
                    if (!isInputActive) {
                        e.preventDefault();
                        if (futureLength > 0) {
                            dispatch(redo());
                            toast('Redo', { icon: '↷', id: 'redo', duration: 1000 });
                        }
                    }
                    return;
                }

                // Ctrl + D : Duplicate Selected Block
                if (key === 'd') {
                    if (selectedBlockId && !isInputActive) {
                        e.preventDefault();
                        dispatch(duplicateBlock(selectedBlockId));
                        toast.success('Block duplicated', { id: 'block-dup', duration: 1200 });
                    }
                    return;
                }

                // Ctrl + B : Bold Text / Style Toggle
                if (key === 'b') {
                    if (!isInputActive && selectedBlockId) {
                        e.preventDefault();
                        const b = blocks.find((item: any) => item.id === selectedBlockId);
                        if (b) {
                            const isBold = b.styles?.fontWeight === 'bold' || b.styles?.fontWeight === 700 || b.styles?.fontWeight === '700';
                            dispatch(updateBlock({
                                id: selectedBlockId,
                                updates: {
                                    styles: {
                                        ...b.styles,
                                        fontWeight: isBold ? 'normal' : 'bold'
                                    }
                                }
                            }));
                            toast.success(isBold ? 'Normal weight' : 'Bold weight', { id: 'style-bold', duration: 1000 });
                        }
                    }
                    return;
                }

                // Ctrl + I : Italic Text / Style Toggle
                if (key === 'i') {
                    if (!isInputActive && selectedBlockId) {
                        e.preventDefault();
                        const b = blocks.find((item: any) => item.id === selectedBlockId);
                        if (b) {
                            const isItalic = b.styles?.fontStyle === 'italic';
                            dispatch(updateBlock({
                                id: selectedBlockId,
                                updates: {
                                    styles: {
                                        ...b.styles,
                                        fontStyle: isItalic ? 'normal' : 'italic'
                                    }
                                }
                            }));
                            toast.success(isItalic ? 'Normal style' : 'Italic style', { id: 'style-italic', duration: 1000 });
                        }
                    }
                    return;
                }

                // Ctrl + U : Underline Text / Style Toggle
                if (key === 'u') {
                    if (!isInputActive && selectedBlockId) {
                        e.preventDefault();
                        const b = blocks.find((item: any) => item.id === selectedBlockId);
                        if (b) {
                            const isUnderlined = b.styles?.textDecoration === 'underline';
                            dispatch(updateBlock({
                                id: selectedBlockId,
                                updates: {
                                    styles: {
                                        ...b.styles,
                                        textDecoration: isUnderlined ? 'none' : 'underline'
                                    }
                                }
                            }));
                            toast.success(isUnderlined ? 'Underline removed' : 'Underline applied', { id: 'style-underline', duration: 1000 });
                        }
                    }
                    return;
                }

                // Ctrl + / : Open Shortcuts Cheat Sheet
                if (key === '/' || key === '?') {
                    e.preventDefault();
                    setShowShortcutsModal(prev => !prev);
                    return;
                }

                // Ctrl + A : When block is selected and not editing an input, focus the block's text content and select all
                if (key === 'a' && !isInputActive && selectedBlockId) {
                    const blockEl = document.getElementById(`block-${selectedBlockId}`);
                    if (blockEl) {
                        const targetInput = blockEl.querySelector('input') || blockEl.querySelector('textarea') || blockEl.querySelector('.tiptap');
                        if (targetInput) {
                            e.preventDefault();
                            (targetInput as HTMLElement).focus();
                            if (targetInput instanceof HTMLInputElement || targetInput instanceof HTMLTextAreaElement) {
                                targetInput.select();
                            }
                        }
                    }
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedBlockId, blocks, isFullscreen, pastLength, futureLength, showShortcutsModal, dispatch]);

    const filteredUsers = allUsers.filter(u =>
        `${u.name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
    );

    const toggleUser = (u: any) => {
        setTaggedUsers(prev =>
            prev.find(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]
        );
    };

    const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const clientId = e.target.value;
        const client = clients.find((c: any) => c.id.toString() === clientId);
        if (client) {
            const updates: any = { 
                selectedClientId: client.id,
                clientName: client.name, 
                clientEmail: client.email,
                clientPhone: client.phone || client.mobile || '',
                clientAddress: client.address || client.billingAddress || ''
            };
            
            // Auto-select project
            const clientProjects = projects.filter((p: any) => p.clientId?.toString() === clientId);
            if (clientProjects.length > 0) {
                // Sort descending by createdAt to get the most recent
                const mostRecentProject = clientProjects.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
                updates.selectedProjectId = mostRecentProject.id;
                updates.projectName = mostRecentProject.name || mostRecentProject.title || '';
                toast.success('Most recent project auto-selected');
            }
            
            dispatch(updateDocumentDetails(updates));
        } else {
            dispatch(updateDocumentDetails({ selectedClientId: '', clientName: '', clientEmail: '', clientPhone: '', clientAddress: '' }));
        }
    };

    const handleEmployeeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const emp = employees.find((emp: any) => emp.id.toString() === e.target.value);
        if (emp) {
            dispatch(updateDocumentDetails({ 
                selectedEmployeeId: emp.id,
                employeeName: emp.name, 
                employeeEmail: emp.email,
                employeeDesignation: emp.designation || emp.role || '',
                employeeSalary: emp.salary || emp.ctc || '',
                joiningDate: emp.joiningDate || emp.createdAt || ''
            }));
        } else {
            dispatch(updateDocumentDetails({ selectedEmployeeId: '', employeeName: '', employeeEmail: '', employeeDesignation: '', employeeSalary: '', joiningDate: '' }));
        }
    };

    const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const proj = projects.find((p: any) => p.id.toString() === e.target.value);
        if (proj) {
            dispatch(updateDocumentDetails({
                selectedProjectId: proj.id,
                projectName: proj.name || proj.title || ''
            }));
        } else {
            dispatch(updateDocumentDetails({ selectedProjectId: '', projectName: '' }));
        }
    };

    const handleDetailChange = (key: string, value: any) => {
        dispatch(updateDocumentDetails({ [key]: value }));
    };


    const selectedBlock = [...blocks, ...headerBlocks, ...footerBlocks].find((b: any) => b.id === selectedBlockId);

    const handleExportJson = () => {
        const payload = { blocks, documentDetails };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    async function handleDownload(format: 'pdf' | 'docx') {
        const loading = toast.loading(`Generating ${format.toUpperCase()}...`);
        try {
            let blob: Blob;
            if (format === 'pdf') {
                blob = await generatePDF(liveHtml);
            } else {
                blob = await generateDOCX(title, liveHtml);
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Downloaded as ${format.toUpperCase()}`, { id: loading });
        } catch (err) {
            toast.error('Failed to generate file', { id: loading });
        }
    }

    async function handleSendEmail() {
        if (!emailRecipient.trim()) return toast.error('Please enter a recipient email.');
        setSendingEmail(true);
        const loading = toast.loading(`Preparing ${emailFormat.toUpperCase()} and sending email...`);
        try {
            let blob: Blob;
            if (emailFormat === 'pdf') {
                blob = await generatePDF(liveHtml);
            } else {
                blob = await generateDOCX(title, liveHtml);
            }

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                try {
                    await api.post('/api/email/send-document', {
                        to: emailRecipient,
                        name: taggedUsers.find(u => u.email === emailRecipient)?.name || 'Recipient',
                        documentName: title,
                        message: emailMessage,
                        fileData: base64data,
                        fileName: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${emailFormat}`
                    });
                    toast.success('Email sent successfully!', { id: loading });
                    setShowEmailModal(false);
                    setEmailRecipient('');
                    setEmailMessage('');
                } catch (err: any) {
                    toast.error(err?.response?.data?.error || 'Failed to send email', { id: loading });
                } finally {
                    setSendingEmail(false);
                }
            };
        } catch (err) {
            toast.error('Failed to prepare document', { id: loading });
            setSendingEmail(false);
        }
    }

    async function handleSaveToDrive() {
        if (!title.trim()) return toast.error('Please provide a document title.');
        setSaving(true);
        const loading = toast.loading('Converting to PDF and saving...');
        try {
            const pdfBlob = await generatePDF(liveHtml);
            const file = new File([pdfBlob], `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`, { type: 'application/pdf' });

            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', title);
            formData.append('type', docType);
            formData.append('sendEmail', sendEmail.toString());
            if (taggedUsers.length > 0) {
                formData.append('taggedUsers', JSON.stringify(taggedUsers.map(u => u.id)));
            }

            await api.post('/api/v1/workspace-tools/storage/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success(driveConfigured ? '✅ Saved to Google Drive!' : '✅ Saved to cloud storage!', { id: loading });
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to save document', { id: loading });
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveAsCustomTemplate() {
        if (!templateName.trim()) return toast.error('Please provide a template name.');
        setSaving(true);
        const loadingId = toast.loading('Saving custom template...');
        try {
            const payload = {
                title: templateName,
                content: JSON.stringify({ blocks, documentDetails }),
                category: 'Template',
                tags: ['template', 'custom_template'],
            };
            
            await api.post('/api/v1/workspace-tools/documents/files', payload);
            
            toast.success('Saved to My Templates!', { id: loadingId });
            setShowTemplateModal(false);
            setTemplateName('');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save template', { id: loadingId });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col w-full h-full overflow-hidden">
            
            {/* Top Navigation Bar */}
            <div className={clsx("bg-white border-b border-gray-200 px-4 flex items-center justify-between h-16 flex-shrink-0 transition-all duration-300", isFullscreen ? "h-0 overflow-hidden border-none p-0 opacity-0" : "opacity-100")}>
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                        <Edit2 className="w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            value={title} 
                            onChange={(e) => handleDetailChange('title', e.target.value)}
                            placeholder="Untitled Document"
                            className="text-sm font-bold text-gray-900 min-w-[180px] max-w-[260px] border-none focus:outline-none focus:ring-0 bg-transparent hover:bg-gray-50 px-1 rounded transition-colors truncate"
                        />
                    </div>

                    {/* Document Type Selector Pill */}
                    <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
                        <select
                            value={metaType}
                            onChange={(e) => dispatch(updateMetaType(e.target.value as MetaType))}
                            className="text-xs font-bold text-gray-700 bg-gray-100/80 hover:bg-gray-200/70 border border-gray-200/80 rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                        >
                            <option value="general">📄 General Doc</option>
                            <option value="quotation">💼 Quotation</option>
                            <option value="invoice">🧾 Tax Invoice</option>
                            <option value="contract">📜 Contract</option>
                        </select>
                    </div>

                    {/* Document Recipient Linker (CRM Client / HR Employee / Terms) */}
                    <div className="border-l border-gray-200 pl-3">
                        <DocumentRecipientDropdown />
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1 mr-2">
                        <button onClick={() => dispatch(undo())} disabled={pastLength === 0} className={clsx("p-1.5 rounded-md transition-colors", pastLength > 0 ? "text-gray-700 hover:bg-gray-200 cursor-pointer" : "text-gray-300 cursor-not-allowed")} title="Undo">
                            <Undo className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                        <button onClick={() => dispatch(redo())} disabled={futureLength === 0} className={clsx("p-1.5 rounded-md transition-colors", futureLength > 0 ? "text-gray-700 hover:bg-gray-200 cursor-pointer" : "text-gray-300 cursor-not-allowed")} title="Redo">
                            <Redo className="w-4 h-4" />
                        </button>
                    </div>
                    
                    {/* Autosave Status */}
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 mr-1 border border-gray-200/60 shadow-2xs">
                        {saving ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        {saving ? 'Saving...' : 'Saved'}
                    </span>

                    {/* AI Builder Button */}
                    <button
                        onClick={() => setShowAIDrawer(true)}
                        className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-3.5 py-2 rounded-xl transition-all shadow-xs shadow-indigo-600/20 active:scale-[0.98] cursor-pointer"
                        title="Open AI Document Builder"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                        <span>AI Builder</span>
                    </button>

                    {/* 1. Unified View Dropdown (Live Preview + JSON AST) */}
                    <div className="relative" ref={viewMenuRef}>
                        <button
                            onClick={() => {
                                setShowViewMenu(v => !v);
                                setShowShareExportMenu(false);
                            }}
                            className={clsx(
                                "flex items-center gap-1.5 text-sm font-semibold border px-3.5 py-2 rounded-xl transition-all shadow-2xs active:scale-[0.98]",
                                showViewMenu 
                                    ? "bg-blue-50 text-blue-700 border-blue-200" 
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                            )}
                            title="View Options"
                        >
                            <Eye className="w-4 h-4 text-blue-600" />
                            <span>View</span>
                            <ChevronDown className={clsx("w-3.5 h-3.5 text-gray-400 transition-transform duration-150", showViewMenu && "rotate-180")} />
                        </button>

                        {showViewMenu && (
                            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-[150] py-1.5 animate-in fade-in-50 duration-100">
                                <button 
                                    onClick={() => { setShowViewMenu(false); handleOpenViewer(); }} 
                                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors"
                                >
                                    <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <div>
                                        <div className="font-bold">Live Preview</div>
                                        <div className="text-[10px] text-gray-400 font-normal">Open public document viewer</div>
                                    </div>
                                </button>
                                <div className="h-px bg-gray-100 my-1 mx-2" />
                                <button 
                                    onClick={() => { setShowViewMenu(false); setShowJsonModal(true); }} 
                                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors"
                                >
                                    <Code2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                    <div>
                                        <div className="font-bold">JSON Schema AST</div>
                                        <div className="text-[10px] text-gray-400 font-normal">View AST & generate with AI</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 2. Unified Share & Export Dropdown */}
                    <div className="relative" ref={shareExportMenuRef}>
                        <button
                            onClick={() => {
                                setShowShareExportMenu(v => !v);
                                setShowViewMenu(false);
                            }}
                            className="flex items-center gap-1.5 text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-xs shadow-blue-600/20 active:scale-[0.98]"
                            title="Share or Export Document"
                        >
                            <Share2 className="w-4 h-4" />
                            <span>Share & Export</span>
                            <ChevronDown className={clsx("w-3.5 h-3.5 text-blue-100 transition-transform duration-150", showShareExportMenu && "rotate-180")} />
                        </button>

                        {showShareExportMenu && (
                            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-[150] py-1.5 animate-in fade-in-50 duration-100">
                                {/* Share Action */}
                                <div className="px-2 py-1">
                                    <button 
                                        onClick={() => { setShowShareExportMenu(false); handleOpenShareModal(); }} 
                                        className="w-full text-left px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 rounded-lg flex items-center gap-2.5 transition-colors"
                                    >
                                        <Share2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                        <div>
                                            <div>Share & Send Link</div>
                                            <div className="text-[10px] text-blue-500/80 font-normal">Email or copy secure client link</div>
                                        </div>
                                    </button>
                                </div>

                                <div className="h-px bg-gray-100 my-1 mx-2" />
                                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Export As</div>

                                <button onClick={() => { setShowShareExportMenu(false); handleDownload('pdf'); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors">
                                    <Download className="w-4 h-4 text-gray-500 flex-shrink-0" /> Download PDF
                                </button>
                                <button onClick={() => { setShowShareExportMenu(false); handleDownload('docx'); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors">
                                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" /> Download DOCX
                                </button>
                                <button onClick={() => { setShowShareExportMenu(false); handleDownload('html' as any); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors">
                                    <Code2 className="w-4 h-4 text-gray-500 flex-shrink-0" /> Download HTML Package
                                </button>
                                <button onClick={() => { setShowShareExportMenu(false); handleExportJson(); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors">
                                    <Code2 className="w-4 h-4 text-gray-500 flex-shrink-0" /> Export JSON
                                </button>

                                <div className="h-px bg-gray-100 my-1 mx-2" />
                                <button onClick={() => { setShowShareExportMenu(false); setShowTemplateModal(true); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors">
                                    <Save className="w-4 h-4 text-gray-500 flex-shrink-0" /> Save as Template
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-row min-h-0">
                
                {/* Left: Sidebar (Elements & Blocks Catalog) */}
                <ElementsCatalogPanel
                    isFullscreen={isFullscreen}
                    documentDetails={documentDetails}
                    onAddBlock={(block) => dispatch(addBlock(block))}
                />

                {/* Center: Canvas Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-100">
                    {/* Canvas Toolbar - Completely hidden in Full View */}
                    <div className={clsx("bg-white border-b border-gray-200 px-4 items-center justify-between h-12 flex-shrink-0 shadow-sm z-10 transition-all duration-200", isFullscreen ? "hidden" : "flex")}>
                        <div className="flex items-center gap-4 relative">

                            <div className="flex items-center gap-1">
                                <button onClick={() => dispatch(undo())} disabled={pastLength === 0} title="Undo (Ctrl+Z)" className={clsx("p-1.5 rounded transition-colors", pastLength > 0 ? "text-gray-700 hover:bg-gray-100" : "text-gray-300")}><Undo className="w-4 h-4" /></button>
                                <button onClick={() => dispatch(redo())} disabled={futureLength === 0} title="Redo (Ctrl+Y)" className={clsx("p-1.5 rounded transition-colors", futureLength > 0 ? "text-gray-700 hover:bg-gray-100" : "text-gray-300")}><Redo className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm font-medium text-gray-500">
                            <button onClick={handleZoomOut} className="hover:text-gray-800 transition-colors px-1">-</button>
                            <span>{zoomLevel}%</span>
                            <button onClick={handleZoomIn} className="hover:text-gray-800 transition-colors px-1">+</button>
                            <div className="w-px h-4 bg-gray-200 mx-1" />
                            <button 
                                onClick={() => setShowShortcutsModal(true)} 
                                className="p-1.5 rounded-lg transition-colors flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                                title="Keyboard Shortcuts (Ctrl + /)"
                            >
                                <Keyboard className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={handleToggleFullscreen} 
                                className={clsx(
                                    "p-1.5 rounded-lg transition-colors flex items-center justify-center",
                                    isFullscreen ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "hover:text-gray-800 hover:bg-gray-100"
                                )}
                                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
                            >
                                {isFullscreen ? <Minimize className="w-4 h-4 text-blue-600" /> : <Maximize className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Canvas Document */}
                    <div 
                        id="document-canvas-container" 
                        onClick={() => dispatch(selectBlock(null))}
                        className={clsx(
                            "flex-1 overflow-auto bg-gray-100 flex justify-center items-start hidden-scrollbar relative transition-all",
                            isFullscreen ? "p-4 sm:p-8" : "p-8"
                        )}
                    >
                        {/* Live AI Streaming Glassmorphism Overlay */}
                        <LiveAIStreamOverlay
                            isGenerating={isAIGenerating}
                            statusMessage={aiStatusMessage}
                            onStop={handleStopAIGeneration}
                        />

                        {isFullscreen && (
                            <button
                                onClick={handleToggleFullscreen}
                                className="fixed top-5 right-5 z-[300] bg-gray-900/90 hover:bg-gray-900 text-white backdrop-blur shadow-2xl px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95 border border-white/20"
                                title="Exit Full View (Esc)"
                            >
                                <Minimize className="w-3.5 h-3.5 text-blue-400" />
                                <span>Exit Full View</span>
                            </button>
                        )}
                        <div 
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    dispatch(selectBlock(null));
                                }
                            }}
                            className="w-full max-w-[816px] rounded-sm shadow-md overflow-hidden relative transition-colors duration-200" 
                            style={{ 
                                minHeight: '1056px', 
                                transform: `scale(${zoomLevel / 100})`, 
                                transformOrigin: 'top center',
                                backgroundColor: effectiveDesignSettings.pageBackground || '#ffffff',
                                color: '#1e293b'
                            }}
                        >
                            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={rootBlocks.map((b: any) => b.id)} strategy={verticalListSortingStrategy}>
                                    <div 
                                        onClick={(e) => {
                                            if (e.target === e.currentTarget) {
                                                dispatch(selectBlock(null));
                                            }
                                        }}
                                        className="flex flex-col gap-3 w-full min-h-full transition-all" 
                                        style={{ 
                                            fontFamily: effectiveDesignSettings.fontFamily || 'Inter, sans-serif',
                                            padding: effectiveDesignSettings.pagePadding || '40px'
                                        }}
                                    >
                                        {headerBlocks.map((block: any) => (
                                            <StaticBlockRenderer key={block.id} block={block} />
                                        ))}

                                        {rootBlocks.length === 0 ? (
                                            <div
                                                className={clsx(
                                                    "w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 my-4",
                                                    nativeDragOverIndex === 0
                                                        ? "bg-indigo-50/90 border-indigo-500 scale-[1.01] shadow-inner"
                                                        : "border-gray-200 hover:border-indigo-300 bg-gray-50/40 hover:bg-indigo-50/20"
                                                )}
                                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(0); }}
                                                onDragLeave={(e) => { e.preventDefault(); if (nativeDragOverIndex === 0) setNativeDragOverIndex(null); }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setNativeDragOverIndex(null);
                                                    const blockType = e.dataTransfer.getData('newBlockType') || e.dataTransfer.getData('text/plain');
                                                    if (blockType) handleDropNewBlock(blockType, 0);
                                                }}
                                                onClick={() => handleDropNewBlock('heading', 0)}
                                            >
                                                <div className="w-14 h-14 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center mb-3 shadow-xs">
                                                    <Plus className="w-7 h-7" />
                                                </div>
                                                <h3 className="text-base font-bold text-gray-900 mb-1">Start Building Your Document</h3>
                                                <p className="text-xs text-gray-500 max-w-sm">
                                                    Drag & drop any block from the left panel, or click here to add a heading.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Top Dropzone */}
                                                <div
                                                    className={clsx(
                                                        "w-full transition-all duration-200 flex items-center justify-center -mb-2 relative z-50 rounded-xl",
                                                        nativeDragOverIndex === 0
                                                            ? "h-16 bg-indigo-50/90 border-2 border-indigo-400 border-dashed mb-2 mt-1 shadow-inner"
                                                            : "h-3 opacity-0 hover:opacity-100 hover:h-4"
                                                    )}
                                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(0); }}
                                                    onDragLeave={(e) => { e.preventDefault(); if (nativeDragOverIndex === 0) setNativeDragOverIndex(null); }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setNativeDragOverIndex(null);
                                                        const blockType = e.dataTransfer.getData('newBlockType') || e.dataTransfer.getData('text/plain');
                                                        if (blockType) handleDropNewBlock(blockType, 0);
                                                    }}
                                                >
                                                    {nativeDragOverIndex === 0 && (
                                                        <span className="text-indigo-600 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                                                            <Plus className="w-3.5 h-3.5" /> Drop Block Here (Top)
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Blocks List with Dropzones */}
                                                {rootBlocks.map((block: any, idx: number) => (
                                                    <React.Fragment key={block.id}>
                                                        <SortableBlock block={block} />

                                                        {/* Dropzone after this block */}
                                                        <div
                                                            className={clsx(
                                                                "w-full transition-all duration-200 flex items-center justify-center -my-2 relative z-50 rounded-xl",
                                                                nativeDragOverIndex === idx + 1
                                                                    ? "h-16 bg-indigo-50/90 border-2 border-indigo-400 border-dashed my-2 shadow-inner"
                                                                    : "h-3 opacity-0 hover:opacity-100 hover:h-4"
                                                            )}
                                                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(idx + 1); }}
                                                            onDragLeave={(e) => { e.preventDefault(); if (nativeDragOverIndex === idx + 1) setNativeDragOverIndex(null); }}
                                                            onDrop={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setNativeDragOverIndex(null);
                                                                const blockType = e.dataTransfer.getData('newBlockType') || e.dataTransfer.getData('text/plain');
                                                                if (blockType) handleDropNewBlock(blockType, idx + 1);
                                                            }}
                                                        >
                                                            {nativeDragOverIndex === idx + 1 && (
                                                                <span className="text-indigo-600 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                                                                    <Plus className="w-3.5 h-3.5" /> Drop Block Here
                                                                </span>
                                                            )}
                                                        </div>
                                                    </React.Fragment>
                                                ))}
                                            </>
                                        )}

                                        {footerBlocks.map((block: any) => (
                                            <StaticBlockRenderer key={block.id} block={block} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                </div>

                {/* Right: Sidebar Properties & Page Design */}
                <div className={clsx("w-[420px] lg:w-[440px] xl:w-[460px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-hidden shadow-xl z-20 select-none transition-all duration-300", isFullscreen ? "w-0 border-none opacity-0" : "opacity-100")}>
                    {/* Tabs */}
                    <div className="flex px-3 pt-2.5 gap-2 border-b border-gray-200 flex-shrink-0 bg-slate-50/80">
                        <button 
                            onClick={() => setActiveTab('properties')}
                            className={clsx(
                                "flex-1 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                activeTab === 'properties' 
                                    ? "bg-white text-indigo-600 border-t-2 border-x border-b-0 border-indigo-600 shadow-xs" 
                                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/60"
                            )}
                        >
                            <Sliders className="w-3.5 h-3.5" /> Properties
                        </button>
                        <button 
                            onClick={() => setActiveTab('design')}
                            className={clsx(
                                "flex-1 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                activeTab === 'design' 
                                    ? "bg-white text-indigo-600 border-t-2 border-x border-b-0 border-indigo-600 shadow-xs" 
                                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/60"
                            )}
                        >
                            <Palette className="w-3.5 h-3.5" /> Page Design
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {activeTab === 'properties' ? (
                            <ElementPropertiesDispatcher />
                        ) : (
                            <div className="p-4">
                                <GlobalDesignPanel />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-gray-900">Send via Email</h3>
                            <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Recipient Email</label>
                                <input
                                    type="email"
                                    value={emailRecipient}
                                    onChange={e => setEmailRecipient(e.target.value)}
                                    placeholder="e.g. client@example.com"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Message (Optional)</label>
                                <textarea
                                    value={emailMessage}
                                    onChange={e => setEmailMessage(e.target.value)}
                                    placeholder="Write a brief message..."
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm min-h-[100px] focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow resize-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Attachment Format</label>
                                <div className="flex gap-2">
                                    {(['pdf', 'docx'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setEmailFormat(f)}
                                            className={clsx(
                                                'flex-1 py-2.5 text-xs font-bold rounded-lg border transition-all',
                                                emailFormat === f
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-gray-50'
                                            )}
                                        >
                                            {f.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={handleSendEmail}
                                disabled={sendingEmail}
                                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group shadow-sm shadow-indigo-600/20 active:scale-[0.98]"
                            >
                                {sendingEmail ? (
                                    <LogoLoader className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Mail className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                                )}
                                {sendingEmail ? 'Sending...' : 'Send Attachment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Template Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Save className="w-5 h-5 text-indigo-600" /> Save as Custom Template
                            </h3>
                            <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="e.g. Acme Standard Contract"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                This template will be saved to your "My Templates" library and can be used to generate new documents in the future.
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <button
                                onClick={() => setShowTemplateModal(false)}
                                className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAsCustomTemplate}
                                disabled={saving || !templateName.trim()}
                                className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : <Check className="w-4 h-4" />}
                                Save Template
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* System Controls & Keyboard Shortcuts Modal */}
            {showShortcutsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    <Keyboard className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">Keyboard Shortcuts & System Controls</h3>
                                    <p className="text-xs text-gray-500">Accelerate your document workflow with fast keyboard commands</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowShortcutsModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
                            {/* Group 1: General & History */}
                            <div>
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">General & History</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-gray-700 font-medium">Save Document Draft</span>
                                        <div className="flex items-center gap-1">
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">Ctrl</kbd>
                                            <span className="text-gray-400">+</span>
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">S</kbd>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-gray-700 font-medium">Undo Last Action</span>
                                        <div className="flex items-center gap-1">
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">Ctrl</kbd>
                                            <span className="text-gray-400">+</span>
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">Z</kbd>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-gray-700 font-medium">Redo Last Action</span>
                                        <div className="flex items-center gap-1">
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">Ctrl</kbd>
                                            <span className="text-gray-400">+</span>
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">Y</kbd>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Group 2: Block Actions */}
                            <div>
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Block Management</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-gray-700 font-medium">Delete Selected Block</span>
                                        <div className="flex items-center gap-1">
                                            <kbd className="px-2 py-1 bg-rose-50 border border-rose-200 rounded font-mono text-[11px] text-rose-700 shadow-2xs">Delete</kbd>
                                            <span className="text-gray-400">or</span>
                                            <kbd className="px-2 py-1 bg-rose-50 border border-rose-200 rounded font-mono text-[11px] text-rose-700 shadow-2xs">Backspace</kbd>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-gray-700 font-medium">Duplicate Selected Block</span>
                                        <div className="flex items-center gap-1">
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">Ctrl</kbd>
                                            <span className="text-gray-400">+</span>
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">D</kbd>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-gray-700 font-medium">Deselect Block / Exit Fullscreen</span>
                                        <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">Esc</kbd>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-gray-700 font-medium">Select Block Text Content</span>
                                        <div className="flex items-center gap-1">
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">Ctrl</kbd>
                                            <span className="text-gray-400">+</span>
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">A</kbd>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Group 3: Text & Typography Styling */}
                            <div>
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Text & Style Controls</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-gray-700 font-medium">Bold Formatting / Weight</span>
                                        <div className="flex items-center gap-1">
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">Ctrl</kbd>
                                            <span className="text-gray-400">+</span>
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs font-bold">B</kbd>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-gray-700 font-medium">Italic Formatting / Style</span>
                                        <div className="flex items-center gap-1">
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">Ctrl</kbd>
                                            <span className="text-gray-400">+</span>
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs italic">I</kbd>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                        <span className="text-gray-700 font-medium">Underline Formatting</span>
                                        <div className="flex items-center gap-1">
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs">Ctrl</kbd>
                                            <span className="text-gray-400">+</span>
                                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-[11px] text-gray-800 shadow-2xs underline">U</kbd>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                            <span>Tip: macOS users can use <kbd className="font-mono font-bold">⌘</kbd> instead of <kbd className="font-mono font-bold">Ctrl</kbd></span>
                            <button
                                onClick={() => setShowShortcutsModal(false)}
                                className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Universal Share & Send Modal with Public vs Restricted Access Controls */}
            {showShareModal && (
                <ShareDocumentModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    documentId={documentId || ''}
                    documentTitle={title || 'Document'}
                    clientName={clientName}
                    clientEmail={clientEmail}
                    initialAccessType={documentDetails?.accessType}
                    initialAllowedUserIds={documentDetails?.allowedUserIds}
                    initialAllowedEmails={documentDetails?.allowedEmails}
                    onAccessTypeUpdated={(newType) => {
                        dispatch(updateDocumentDetails({ accessType: newType } as any));
                    }}
                />
            )}

            {/* Document JSON Schema AST Editor & AI Prompt Modal */}
            {showJsonModal && (
                <JsonSchemaEditorModal
                    isOpen={showJsonModal}
                    onClose={() => setShowJsonModal(false)}
                />
            )}

            {/* AI Document Builder Side Drawer */}
            <AIDocumentDrawer
                isOpen={showAIDrawer}
                onClose={() => setShowAIDrawer(false)}
                onStartGenerating={(status) => {
                    setShowAIDrawer(false);
                    setIsAIGenerating(true);
                    setAIStatusMessage(status);
                }}
                onFinishGenerating={() => {
                    setIsAIGenerating(false);
                    setShowAIDrawer(true);
                }}
                abortControllerRef={aiAbortControllerRef}
            />
        </div>
    );
}

// ─── Templates Grid ───────────────────────────────────────────────────────────
const MOCK_CLIENTS = [
  { id: 1, name: 'Acme Corp', email: 'contact@acme.com', address: '123 Acme St' },
  { id: 2, name: 'Globex', email: 'hello@globex.com', address: '456 Globex Ave' },
];

const MOCK_EMPLOYEES = [
  { id: 1, name: 'Alice Smith', email: 'alice@company.com', role: 'Sales Rep' },
  { id: 2, name: 'Bob Jones', email: 'bob@company.com', role: 'Manager' },
];

function DocumentEditorPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { settings } = useSettings();
    const id = searchParams?.get('id');
    const templateId = searchParams?.get('templateId');
    const clientId = searchParams?.get('clientId');
    const clientName = searchParams?.get('clientName');
    const employeeId = searchParams?.get('employeeId');
    const employeeName = searchParams?.get('employeeName');
    const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

    useEffect(() => {
        if (id) {
            const fetchDocument = async () => {
                try {
                    const res = await api.get(`/api/v1/workspace-tools/documents/${id}`);
                    const doc = res.data?.document || res.data?.article || res.data;
                    if (doc) {
                        let contentBlocks = doc.contentBlocks || doc.blocks || [];
                        let parsedVariables = doc.variables || {};

                        if ((!contentBlocks || contentBlocks.length === 0) && doc.content) {
                            try {
                                const parsed = JSON.parse(doc.content);
                                contentBlocks = parsed.blocks || [];
                                parsedVariables = parsed.documentDetails || parsedVariables;
                            } catch (e) {}
                        }

                        setSelectedTemplate({
                            id: doc.id || id,
                            category: doc.category || doc.documentType || 'other',
                            title: doc.title || doc.name || 'Untitled Document',
                            description: doc.description || '',
                            blocks: contentBlocks,
                            documentDetails: {
                                title: doc.title || doc.name || 'Untitled Document',
                                documentType: doc.documentType || 'general',
                                metaType: doc.documentType || 'Document',
                                subtotal: doc.subtotal || 0,
                                taxPercent: doc.taxPercent || 0,
                                taxAmount: doc.taxAmount || 0,
                                discount: doc.discount || 0,
                                totalAmount: doc.grandTotal || doc.subtotal || '0.00',
                                showTotalAmount: !!(doc.grandTotal || doc.subtotal),
                                clientName: doc.client?.name || doc.client?.companyName || parsedVariables.clientName || clientName || '',
                                clientEmail: doc.client?.email || parsedVariables.clientEmail || '',
                                clientAddress: doc.client?.billingAddress || parsedVariables.clientAddress || '',
                                selectedClientId: doc.clientId || parsedVariables.selectedClientId || clientId || null,
                                selectedEmployeeId: doc.employeeId || parsedVariables.selectedEmployeeId || employeeId || null,
                                selectedProjectId: doc.projectId || parsedVariables.selectedProjectId || null,
                                ...parsedVariables
                            }
                        } as any);
                    }
                } catch (e) {
                    console.error('Failed to load document by id', e);
                    toast.error('Failed to load document');
                    setSelectedTemplate(DOCUMENT_TEMPLATES[0]);
                }
            };
            fetchDocument();
        } else if (templateId) {
            const template = DOCUMENT_TEMPLATES.find((t) => t.id === templateId);
            if (template) {
                const initialDetails = {
                    ...template.documentDetails,
                    ...(clientId ? { selectedClientId: clientId, clientName: clientName || '' } : {}),
                    ...(employeeId ? { selectedEmployeeId: employeeId, employeeName: employeeName || '' } : {})
                };
                setSelectedTemplate({ ...template, documentDetails: initialDetails });
            } else {
                const fetchTemplate = async () => {
                    try {
                        const res = await api.get('/api/v1/workspace-tools/documents/files?category=Template');
                        if (res.data?.success && res.data.articles) {
                            const found = res.data.articles.find((a: any) => a.id === templateId);
                            if (found) {
                                let content: any = null;
                                try { content = JSON.parse(found.content); } catch (e) {}
                                setSelectedTemplate({
                                    id: found.id,
                                    category: 'my_templates',
                                    title: found.title,
                                    description: 'Custom saved template',
                                    isCustom: true,
                                    blocks: content?.blocks || [],
                                    documentDetails: {
                                        ...(content?.documentDetails || {}),
                                        ...(clientId ? { selectedClientId: clientId, clientName: clientName || '' } : {}),
                                        ...(employeeId ? { selectedEmployeeId: employeeId, employeeName: employeeName || '' } : {})
                                    },
                                } as any);
                            } else {
                                toast.error('Template not found');
                            }
                        }
                    } catch (e) {
                        console.error("Failed to fetch template", e);
                        toast.error('Failed to load template');
                    }
                };
                fetchTemplate();
            }
        } else {
            // Default to first template with pre-filled query params if present
            const baseTemplate = DOCUMENT_TEMPLATES[0];
            const initialDetails = {
                ...baseTemplate.documentDetails,
                ...(clientId ? { selectedClientId: clientId, clientName: clientName || '' } : {}),
                ...(employeeId ? { selectedEmployeeId: employeeId, employeeName: employeeName || '' } : {})
            };
            setSelectedTemplate({ ...baseTemplate, documentDetails: initialDetails });
        }
    }, [id, templateId, clientId, clientName, employeeId, employeeName]);

    const s = settings as any;
    const brand: any = {
        ...(s || {}),
        companyName: s?.companyName?.trim() || 'Company Name',
        companyLogo: s?.logoUrl || '',
        companyEmail: s?.emailFrom || s?.supportEmail || s?.adminEmail || 'company@example.com',
        companyPhone: s?.primaryPhone || s?.companyPhone || s?.phone || '+9999999999',
        companyAddress: [s?.address, s?.city, s?.state, s?.country, s?.zipCode].filter(Boolean).join(', ') || s?.companyAddress || 'Company Address',
        companyWebsite: s?.website || s?.companyWebsite || 'www.company.com',
        companyGst: s?.gstNumber || s?.taxId || 'TAX-ID-0000',
        companySign: s?.authorizedSignatorySignature || '',
        authorizedSignatory: s?.authorizedSignatoryName || s?.authorizedSignatory || 'Authorized Signatory',
        brandColor: s?.themeColor || '#2563eb',
    };

    const driveConfigured = settings?.storageMode === 'google_drive' && !!settings?.googleDriveServiceAccount;

    if (!selectedTemplate) {
        return (
            <div className="flex h-screen items-center justify-center">
                <LogoLoader className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <TemplateEditor
            template={selectedTemplate}
            brand={brand}
            driveConfigured={driveConfigured}
            onBack={() => router.push('/documents')}
            onClose={() => router.push('/documents')}
            onSuccess={() => router.push('/documents')}
        />
    );
}

export default function DocumentEditorPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><LogoLoader className="w-8 h-8 animate-spin" /></div>}>
            <DocumentEditorPageContent />
        </Suspense>
    );
}
