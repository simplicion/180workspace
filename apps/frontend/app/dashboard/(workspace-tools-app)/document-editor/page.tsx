'use client';

import { LogoLoader } from "@workspace/ui";
import { useEffect, useState, Suspense, useMemo } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { X, FileText, Edit2, Tags, Mail, Users, ChevronDown, Check, Download, Printer, HardDrive, ExternalLink, ArrowLeft, Save, FileBadge2, Search, Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Palette, ZoomIn, ZoomOut, Maximize, FileSymlink, MessageSquare, Undo, Redo, Plus, Heading1, List, Grid, Minus, Square, Image as ImageIcon, FormInput, EyeOff, Eye, LayoutTemplate, Settings2, Trash2, Signature, Scissors } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setZoomLevel, addBlock, selectBlock, reorderBlocks, updateDocumentDetails, updateDesignSettings, undo, redo, updateMetaType, MetaType, updateBlock, initializeDocument, setHeaderBlocks, setFooterBlocks } from '../../../../redux/slices/documentSlice';
import { SortableBlock } from './_components/SortableBlock';
import { StaticBlockRenderer } from './_components/StaticBlockRenderer';
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [activeTab, setActiveTab] = useState<'design' | 'details'>('design');
    const dispatch = useDispatch();
    const zoomLevel = useSelector((state: any) => state.document?.zoomLevel || 100);
    const blocks = useSelector((state: any) => state.document?.blocks || []);
    const headerBlocks = useSelector((state: any) => state.document?.headerBlocks || []);
    const footerBlocks = useSelector((state: any) => state.document?.footerBlocks || []);
    const selectedBlockId = useSelector((state: any) => state.document?.selectedBlockId || null);
    const documentDetails = useSelector((state: any) => state.document?.documentDetails);
    const metaType = useSelector((state: any) => state.document?.metaType || 'general');
    const rawDesignSettings = useSelector((state: any) => state.document?.designSettings || { fontFamily: 'sans-serif', fontSize: 16, primaryColor: '#2563eb', selectedHeaderId: 'none', selectedFooterId: 'none' });
    const isDefaultColor = rawDesignSettings.primaryColor === '#2563eb';
    const effectiveDesignSettings = { ...rawDesignSettings, primaryColor: isDefaultColor ? brand.brandColor : rawDesignSettings.primaryColor };
    const designSettings = rawDesignSettings;
    const pastLength = useSelector((state: any) => state.document?.past?.length || 0);
    const futureLength = useSelector((state: any) => state.document?.future?.length || 0);

    const { data: clientsData, isLoading: clientsLoading } = useGetClientsQuery({});
    const { data: employeesData, isLoading: employeesLoading } = useGetUsersQuery({});
    const { data: projectsData, isLoading: projectsLoading } = useGetProjectsQuery({});
    
    const clients = clientsData?.clients || clientsData?.data || [];
    const employees = employeesData?.users || employeesData?.data || [];
    const projects = projectsData?.projects || projectsData?.data || [];


    // Initialize Redux state with template
    useEffect(() => {
        if (template) {
            dispatch(initializeDocument({
                blocks: template.blocks || [],
                documentDetails: template.documentDetails || { title: template.title }
            }));
        }
    }, [template, dispatch]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = blocks.findIndex((b: any) => b.id === active.id);
            const newIndex = blocks.findIndex((b: any) => b.id === over.id);
            dispatch(reorderBlocks({ oldIndex, newIndex }));
        }
    };

    const handleZoomIn = () => dispatch(setZoomLevel(Math.min(zoomLevel + 10, 200)));
    const handleZoomOut = () => dispatch(setZoomLevel(Math.max(zoomLevel - 10, 50)));



    // Export Menu State
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [documentId, setDocumentId] = useState<string | null>(null);

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

    // headerHtmlPreview and footerHtmlPreview removed as they are now replaced by headerBlocks and footerBlocks

    // Autosave functionality
    useEffect(() => {
        const handleAutosave = async () => {
            if (!title.trim() || blocks.length === 0) return;
            setSaving(true);
            try {
                const payload = {
                    title,
                    content: JSON.stringify({ blocks, documentDetails }),
                    category: 'Document',
                    tags: ['draft'],
                };
                
                if (documentId) {
                    await api.put(`/api/180documents/files/${documentId}`, payload);
                } else {
                    const res = await api.post('/api/180documents/files', payload);
                    if (res.data?.data?._id) {
                        setDocumentId(res.data.data._id);
                    } else if (res.data?.id) {
                        setDocumentId(res.data.id);
                    }
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
    }, [blocks, documentDetails, title, documentId]);

    // Auto-fill recipient when modal opens or tagged users change
    useEffect(() => {
        if (showEmailModal && taggedUsers.length > 0 && !emailRecipient) {
            setEmailRecipient(taggedUsers[0].email || '');
            setEmailMessage(`Hi ${taggedUsers[0].name || ''},\n\nPlease find the attached ${title} for your reference.`);
        }
    }, [showEmailModal, taggedUsers, title, emailRecipient]);

    useEffect(() => {
        setLoadingUsers(true);
        api.get('/api/users?limit=200')
            .then(({ data }) => setAllUsers(data.users || data || []))
            .catch((err) => {
                console.error('Failed to fetch users:', err);
                toast.error('Could not load users for tagging');
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

            await api.post('/api/files/upload', formData, {
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
            
            await api.post('/api/180documents/files', payload);
            
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
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Documents
                    </button>
                    <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                        <Edit2 className="w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            value={title} 
                            onChange={(e) => handleDetailChange('title', e.target.value)}
                            className="text-base font-bold text-gray-900 min-w-[250px] border-none focus:outline-none focus:ring-0 bg-transparent hover:bg-gray-50 px-1 rounded transition-colors"
                        />
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
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1.5 rounded-md flex items-center gap-1.5 mr-2">
                        {saving ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        {saving ? 'Saving...' : 'Saved to drafts'}
                    </span>

                    {/* Split Button for Send to Client */}
                    <div className="relative flex items-center shadow-sm rounded-lg">
                        <button onClick={() => setShowEmailModal(true)} className="flex items-center gap-1.5 text-sm font-semibold bg-[#2563eb] text-white px-4 py-2 rounded-l-lg hover:bg-[#2563eb]/90 transition-colors border-r border-blue-600/50">
                            <Mail className="w-4 h-4" /> Send to Client
                        </button>
                        <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center justify-center bg-[#2563eb] text-white px-2 py-2 rounded-r-lg hover:bg-[#2563eb]/90 transition-colors">
                            <ChevronDown className="w-4 h-4" />
                        </button>
                        
                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[150] py-1.5">
                                <button onClick={() => { setShowExportMenu(false); handleDownload('pdf'); }} className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                                    <Download className="w-4 h-4 text-gray-400" /> Download PDF
                                </button>
                                <button onClick={() => { setShowExportMenu(false); handleDownload('docx'); }} className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                                    <FileText className="w-4 h-4 text-gray-400" /> Download DOCX
                                </button>
                                <button onClick={() => { setShowExportMenu(false); handleExportJson(); }} className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                                    <FileText className="w-4 h-4 text-gray-400" /> Download JSON
                                </button>
                                <div className="h-px bg-gray-100 my-1 mx-2" />
                                <button onClick={() => { setShowExportMenu(false); setShowTemplateModal(true); }} className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                                    <Save className="w-4 h-4 text-gray-400" /> Save as Template
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-row min-h-0">
                
                {/* Left: Sidebar (Add Elements) */}
                <div className={clsx("w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-hidden shadow-xl z-20 select-none transition-all duration-300", isFullscreen ? "w-0 border-none opacity-0" : "opacity-100")}>
                    <div className="flex px-4 py-3.5 border-b border-gray-200 flex-shrink-0 bg-gray-50 items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wide">
                            <Plus className="w-4 h-4 text-[#2563eb]" /> Add Elements
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => dispatch(addBlock({ id: Date.now().toString(), type: 'heading', content: { text: 'New Heading' } }))} className="flex flex-col items-center justify-center gap-2 p-3 bg-white hover:bg-indigo-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow group">
                                <Heading1 className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider group-hover:text-indigo-700">Heading</span>
                            </button>
                            <button onClick={() => dispatch(addBlock({ id: Date.now().toString(), type: 'text', content: { text: 'Enter your text here...' } }))} className="flex flex-col items-center justify-center gap-2 p-3 bg-white hover:bg-indigo-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow group">
                                <Type className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider group-hover:text-indigo-700">Text</span>
                            </button>
                            <button onClick={() => dispatch(addBlock({ id: Date.now().toString(), type: 'list', content: { items: ['List item 1', 'List item 2'] } }))} className="flex flex-col items-center justify-center gap-2 p-3 bg-white hover:bg-indigo-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow group">
                                <List className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider group-hover:text-indigo-700">List</span>
                            </button>
                            <button onClick={() => dispatch(addBlock({ id: Date.now().toString(), type: 'grid', content: { text: 'Grid Placeholder' } }))} className="flex flex-col items-center justify-center gap-2 p-3 bg-white hover:bg-indigo-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow group">
                                <Grid className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider group-hover:text-indigo-700">Data Grid</span>
                            </button>
                            <button onClick={() => dispatch(addBlock({ id: Date.now().toString(), type: 'divider', content: {} }))} className="flex flex-col items-center justify-center gap-2 p-3 bg-white hover:bg-indigo-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow group">
                                <Minus className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider group-hover:text-indigo-700">Divider</span>
                            </button>
                            <button onClick={() => dispatch(addBlock({ id: Date.now().toString(), type: 'box', content: { text: 'Box Content' } }))} className="flex flex-col items-center justify-center gap-2 p-3 bg-white hover:bg-indigo-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow group">
                                <Square className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider group-hover:text-indigo-700">Box</span>
                            </button>
                            <button onClick={() => dispatch(addBlock({ id: Date.now().toString(), type: 'image', content: { url: '' } }))} className="flex flex-col items-center justify-center gap-2 p-3 bg-white hover:bg-indigo-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow group">
                                <ImageIcon className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider group-hover:text-indigo-700">Image</span>
                            </button>
                            <button onClick={() => dispatch(addBlock({ id: Date.now().toString(), type: 'signature', content: { label: 'Authorized Signatory', requireName: true } }))} className="flex flex-col items-center justify-center gap-2 p-3 bg-white hover:bg-indigo-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow group">
                                <FileBadge2 className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider text-center group-hover:text-indigo-700">Signature</span>
                            </button>
                            <button onClick={() => dispatch(addBlock({ id: Date.now().toString(), type: 'input', content: { inputType: 'text', label: 'New Input Field' } }))} className="flex flex-col items-center justify-center gap-2 p-3 bg-white hover:bg-indigo-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow group">
                                <FormInput className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider text-center group-hover:text-indigo-700">Input Field</span>
                            </button>
                            <button onClick={() => dispatch(addBlock({ id: Date.now().toString(), type: 'pagebreak', content: {} }))} className="flex flex-col items-center justify-center gap-2 p-3 bg-white hover:bg-indigo-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow group">
                                <Scissors className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider text-center group-hover:text-indigo-700">Page Break</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Center: Canvas Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-100">
                    {/* Canvas Toolbar */}
                    <div className="bg-white border-b border-gray-200 px-4 flex items-center justify-between h-12 flex-shrink-0 shadow-sm z-10">
                        <div className="flex items-center gap-4 relative">

                            <div className="flex items-center gap-1">
                                <button onClick={() => dispatch(undo())} disabled={pastLength === 0} className={clsx("p-1.5 rounded transition-colors", pastLength > 0 ? "text-gray-700 hover:bg-gray-100" : "text-gray-300")}><Undo className="w-4 h-4" /></button>
                                <button onClick={() => dispatch(redo())} disabled={futureLength === 0} className={clsx("p-1.5 rounded transition-colors", futureLength > 0 ? "text-gray-700 hover:bg-gray-100" : "text-gray-300")}><Redo className="w-4 h-4" /></button>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 border-l border-gray-200 pl-4">
                                <FileText className="w-4 h-4" /> Page 1/1
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
                            <button onClick={handleZoomOut} className="hover:text-gray-800 transition-colors">-</button>
                            <span>{zoomLevel}%</span>
                            <button onClick={handleZoomIn} className="hover:text-gray-800 transition-colors">+</button>
                            <div className="w-px h-4 bg-gray-200 mx-1" />
                            <button onClick={() => setIsFullscreen(!isFullscreen)} className="hover:text-gray-800 transition-colors" title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                                <Maximize className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Canvas Document */}
                    <div id="document-canvas-container" className="flex-1 overflow-auto p-8 bg-gray-100 flex justify-center items-start hidden-scrollbar">
                        <div className="w-full max-w-[816px] bg-white rounded-sm shadow-md overflow-hidden relative" style={{ minHeight: '1056px', transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}>
                            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={blocks.map((b: any) => b.id)} strategy={verticalListSortingStrategy}>
                                    <div className="flex flex-col gap-4 p-8 w-full min-h-full" style={{ fontFamily: effectiveDesignSettings.fontFamily, fontSize: `${effectiveDesignSettings.fontSize}px`, color: effectiveDesignSettings.primaryColor }}>
                                        {headerBlocks.map((block: any) => (
                                            <StaticBlockRenderer key={block.id} block={block} />
                                        ))}
                                        {blocks.map((block: any) => (
                                            <SortableBlock key={block.id} block={block} />
                                        ))}
                                        {footerBlocks.map((block: any) => (
                                            <StaticBlockRenderer key={block.id} block={block} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                </div>

                {/* Right: Sidebar Properties (Design & Data Sources) */}
                <div className={clsx("w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-hidden shadow-xl z-20 select-none transition-all duration-300", isFullscreen ? "w-0 border-none opacity-0" : "opacity-100")}>
                    {/* Tabs */}
                    <div className="flex px-2 pt-2 gap-2 border-b border-gray-200 flex-shrink-0 overflow-x-auto hide-scrollbar">
                        <button 
                            onClick={() => setActiveTab('design')}
                            className={clsx("flex-1 py-3 text-sm font-bold rounded-t-lg transition-colors flex items-center justify-center gap-2", activeTab === 'design' ? "bg-blue-50 text-[#2563eb] border-b-2 border-[#2563eb]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50")}
                        >
                            <Palette className="w-4 h-4" /> Design
                        </button>
                        <button 
                            onClick={() => setActiveTab('details')}
                            className={clsx("flex-1 py-3 text-sm font-bold rounded-t-lg transition-colors flex items-center justify-center gap-2", activeTab === 'details' ? "bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50")}
                        >
                            <FileText className="w-4 h-4" /> Data Sources
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {activeTab === 'design' ? (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">TEXT</h3>
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <div className="flex-1 border border-gray-200 rounded-lg flex items-center px-3 bg-white hover:border-gray-300 transition-colors">
                                                <Type className="w-4 h-4 text-gray-400 mr-2" />
                                                <CustomSelect value={designSettings.fontFamily} onChange={e => dispatch(updateDesignSettings({ fontFamily: e.target.value }))} className="w-full text-sm font-medium py-2.5 bg-transparent focus:outline-none cursor-pointer text-gray-700">
                                                    <option value="sans-serif">Sans-Serif</option>
                                                    <option value="serif">Serif</option>
                                                    <option value="monospace">Monospace</option>
                                                    <option value="Inter">Inter</option>
                                                </CustomSelect>
                                            </div>
                                            <div className="w-24 border border-gray-200 rounded-lg flex items-center bg-white overflow-hidden hover:border-gray-300 transition-colors">
                                                <button onClick={() => dispatch(updateDesignSettings({ fontSize: Math.max(10, designSettings.fontSize - 1) }))} className="px-3 text-gray-500 hover:bg-gray-100 font-medium">-</button>
                                                <input type="text" value={designSettings.fontSize} readOnly className="w-full text-center text-sm font-medium text-gray-700 focus:outline-none" />
                                                <button onClick={() => dispatch(updateDesignSettings({ fontSize: Math.min(32, designSettings.fontSize + 1) }))} className="px-3 text-gray-500 hover:bg-gray-100 font-medium">+</button>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <div className="flex-1 border border-gray-200 rounded-lg flex items-center justify-around py-2 bg-white">
                                                <button className="p-1 rounded text-[#2563eb] bg-blue-50 font-bold"><Bold className="w-4 h-4" /></button>
                                                <button className="p-1 rounded hover:bg-gray-50 text-gray-600 italic"><Italic className="w-4 h-4" /></button>
                                                <button className="p-1 rounded hover:bg-gray-50 text-gray-600 underline"><Underline className="w-4 h-4" /></button>
                                                <div className="w-px h-4 bg-gray-200" />
                                                <button className="p-1 rounded hover:bg-gray-50 text-gray-600"><AlignLeft className="w-4 h-4" /></button>
                                            </div>
                                            <div className="relative w-24 border border-gray-200 rounded-lg bg-white flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden">
                                                <input type="color" value={effectiveDesignSettings.primaryColor} onChange={e => dispatch(updateDesignSettings({ primaryColor: e.target.value }))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                <div className="w-4 h-4 rounded-full shadow-sm pointer-events-none" style={{ backgroundColor: effectiveDesignSettings.primaryColor }}></div>
                                                <span className="text-xs font-bold text-gray-600 uppercase pointer-events-none">Color</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Header Template</label>
                                            <div className="border border-gray-200 rounded-lg flex items-center px-3 bg-white hover:border-gray-300 transition-colors">
                                                <LayoutTemplate className="w-4 h-4 text-gray-400 mr-2" />
                                                <CustomSelect value={designSettings.selectedHeaderId || 'none'} onChange={e => {
                                                    const val = e.target.value;
                                                    dispatch(updateDesignSettings({ selectedHeaderId: val }));
                                                    if (val !== 'none') {
                                                        const template = HEADER_TEMPLATES.find(t => t.id === val);
                                                        if (template) {
                                                            const newBlocks = JSON.parse(JSON.stringify(template.blocks)).map((b: any) => ({ ...b, id: 'header-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9) }));
                                                            dispatch(setHeaderBlocks(newBlocks));
                                                        }
                                                    } else {
                                                        dispatch(setHeaderBlocks([]));
                                                    }
                                                }} className="w-full text-sm font-medium py-2 bg-transparent focus:outline-none cursor-pointer text-gray-700">
                                                    <option value="none">No Header</option>
                                                    {HEADER_TEMPLATES.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </CustomSelect>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 mt-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Footer Template</label>
                                            <div className="border border-gray-200 rounded-lg flex items-center px-3 bg-white hover:border-gray-300 transition-colors">
                                                <LayoutTemplate className="w-4 h-4 text-gray-400 mr-2" />
                                                <CustomSelect value={designSettings.selectedFooterId || 'none'} onChange={e => {
                                                    const val = e.target.value;
                                                    dispatch(updateDesignSettings({ selectedFooterId: val }));
                                                    if (val !== 'none') {
                                                        const template = FOOTER_TEMPLATES.find(t => t.id === val);
                                                        if (template) {
                                                            const newBlocks = JSON.parse(JSON.stringify(template.blocks)).map((b: any) => ({ ...b, id: 'footer-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9) }));
                                                            dispatch(setFooterBlocks(newBlocks));
                                                        }
                                                    } else {
                                                        dispatch(setFooterBlocks([]));
                                                    }
                                                }} className="w-full text-sm font-medium py-2 bg-transparent focus:outline-none cursor-pointer text-gray-700">
                                                    <option value="none">No Footer</option>
                                                    {FOOTER_TEMPLATES.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </CustomSelect>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-gray-100 pt-4">
                                    <button className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 group">
                                        <div className="flex items-center gap-2"><AlignLeft className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" /> Arrange</div>
                                        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                    </button>
                                </div>
                                
                                {selectedBlock && (
                                    <div className="border-t border-gray-100 pt-6 mt-6">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Edit2 className="w-4 h-4" /> Block Layout
                                        </h3>
                                        <div className="space-y-4 mb-6">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-2 block">Width</label>
                                                <CustomSelect 
                                                    value={selectedBlock.styles?.width || '100%'}
                                                    onChange={(e) => dispatch(updateBlock({ 
                                                        id: selectedBlock.id, 
                                                        updates: { styles: { ...selectedBlock.styles, width: e.target.value } } 
                                                    }))}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none"
                                                >
                                                    <option value="25%">25%</option>
                                                    <option value="50%">50%</option>
                                                    <option value="75%">75%</option>
                                                    <option value="100%">100%</option>
                                                </CustomSelect>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-2 block">Alignment</label>
                                                <div className="flex border border-gray-200 rounded-lg bg-white overflow-hidden">
                                                    {(['left', 'center', 'right'] as const).map(align => (
                                                        <button 
                                                            key={align}
                                                            onClick={() => dispatch(updateBlock({ 
                                                                id: selectedBlock.id, 
                                                                updates: { styles: { ...selectedBlock.styles, alignment: align } } 
                                                            }))}
                                                            className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
                                                                (selectedBlock.styles?.alignment || 'center') === align 
                                                                    ? 'bg-[#2563eb] text-white' 
                                                                    : 'text-gray-600 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {align.charAt(0).toUpperCase() + align.slice(1)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-2 block">Padding (px)</label>
                                                <input 
                                                    type="number"
                                                    value={parseInt(selectedBlock.styles?.padding || '0')}
                                                    onChange={(e) => dispatch(updateBlock({ 
                                                        id: selectedBlock.id, 
                                                        updates: { styles: { ...selectedBlock.styles, padding: `${e.target.value}px` } } 
                                                    }))}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none"
                                                />
                                            </div>
                                        </div>

                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Eye className="w-4 h-4" /> Visibility Rules (Selected Block)
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-3">Define when this block should be visible in the generated document.</p>
                                        <div className="space-y-3">
                                            <input 
                                                type="text" 
                                                value={selectedBlock.visibilityRule || ''} 
                                                onChange={(e) => dispatch(updateBlock({ id: selectedBlock.id, updates: { visibilityRule: e.target.value } }))}
                                                placeholder="e.g. {{clientName}} != ''" 
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none" 
                                            />
                                            {selectedBlock.visibilityRule && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 p-2 rounded-md">
                                                    <EyeOff className="w-3 h-3" /> Block hidden when condition is false.
                                                </div>
                                            )}
                                        </div>

                                        {/* Block Specific Settings */}
                                        {selectedBlock.type === 'divider' && (
                                            <div className="mt-6 pt-6 border-t border-gray-100">
                                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Divider Settings</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 mb-2 block">Thickness (px)</label>
                                                        <input type="number" value={selectedBlock.styles?.borderWidth || 2} onChange={(e) => dispatch(updateBlock({ id: selectedBlock.id, updates: { styles: { ...selectedBlock.styles, borderWidth: parseInt(e.target.value) } } }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 mb-2 block">Style</label>
                                                        <CustomSelect value={selectedBlock.styles?.borderStyle || 'solid'} onChange={(e) => dispatch(updateBlock({ id: selectedBlock.id, updates: { styles: { ...selectedBlock.styles, borderStyle: e.target.value } } }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none">
                                                            <option value="solid">Solid</option>
                                                            <option value="dashed">Dashed</option>
                                                            <option value="dotted">Dotted</option>
                                                        </CustomSelect>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 mb-2 block">Color</label>
                                                        <input type="color" value={selectedBlock.styles?.borderColor || '#d1d5db'} onChange={(e) => dispatch(updateBlock({ id: selectedBlock.id, updates: { styles: { ...selectedBlock.styles, borderColor: e.target.value } } }))} className="w-full h-10 px-1 py-1 border border-gray-200 rounded-lg cursor-pointer" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {selectedBlock.type === 'box' && (
                                            <div className="mt-6 pt-6 border-t border-gray-100">
                                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Box Settings</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 mb-2 block">Background Color</label>
                                                        <input type="color" value={selectedBlock.styles?.backgroundColor || '#f9fafb'} onChange={(e) => dispatch(updateBlock({ id: selectedBlock.id, updates: { styles: { ...selectedBlock.styles, backgroundColor: e.target.value } } }))} className="w-full h-10 px-1 py-1 border border-gray-200 rounded-lg cursor-pointer" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-500 mb-2 block">Border Color</label>
                                                            <input type="color" value={selectedBlock.styles?.borderColor || '#e5e7eb'} onChange={(e) => dispatch(updateBlock({ id: selectedBlock.id, updates: { styles: { ...selectedBlock.styles, borderColor: e.target.value } } }))} className="w-full h-10 px-1 py-1 border border-gray-200 rounded-lg cursor-pointer" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-500 mb-2 block">Radius (px)</label>
                                                            <input type="number" value={selectedBlock.styles?.borderRadius || 6} onChange={(e) => dispatch(updateBlock({ id: selectedBlock.id, updates: { styles: { ...selectedBlock.styles, borderRadius: parseInt(e.target.value) } } }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none h-10" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {selectedBlock.type === 'list' && (
                                            <div className="mt-6 pt-6 border-t border-gray-100">
                                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">List Settings</h3>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 mb-2 block">List Type</label>
                                                    <div className="flex border border-gray-200 rounded-lg bg-white overflow-hidden">
                                                        {(['bullet', 'number'] as const).map(listType => (
                                                            <button 
                                                                key={listType}
                                                                onClick={() => dispatch(updateBlock({ 
                                                                    id: selectedBlock.id, 
                                                                    updates: { styles: { ...selectedBlock.styles, listType } } 
                                                                }))}
                                                                className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
                                                                    (selectedBlock.styles?.listType || 'bullet') === listType 
                                                                        ? 'bg-[#2563eb] text-white' 
                                                                        : 'text-gray-600 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                {listType === 'bullet' ? 'Bulleted' : 'Numbered'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-2 block">Document Type</label>
                                    <CustomSelect value={metaType} onChange={e => dispatch(updateMetaType(e.target.value as MetaType))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none bg-white">
                                        <option value="general">General Document / Policy</option>
                                        <option value="quotation">Quotation / Proposal</option>
                                        <option value="invoice">Invoice / Bill</option>
                                        <option value="contract">Contract / Agreement</option>
                                    </CustomSelect>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-2 block">Document title</label>
                                    <input value={title} onChange={e => handleDetailChange('title', e.target.value)} placeholder="New Document" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none" />
                                </div>

                                {/* Project Assignment */}
                                {(metaType === 'quotation' || metaType === 'general' || metaType === 'invoice' || metaType === 'contract') && (
                                    <div className="mb-4">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Link Project</label>
                                        <CustomSelect onChange={handleProjectSelect} value={documentDetails?.selectedProjectId || ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none bg-white mb-3">
                                            <option value="">Select a Project...</option>
                                            {projectsLoading ? <option disabled>Loading...</option> : projects.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.name || p.title || `Project #${p.id}`}</option>
                                            ))}
                                        </CustomSelect>
                                    </div>
                                )}
                                
                                {/* Client Data Source */}
                                {['quotation', 'invoice', 'contract', 'general'].includes(metaType) && (
                                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                        <label className="text-xs font-bold text-gray-700 mb-2 block flex items-center gap-1"><Users className="w-3 h-3" /> Link Client</label>
                                        <CustomSelect onChange={handleClientSelect} value={documentDetails?.selectedClientId || ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none bg-white mb-3">
                                            <option value="">-- Select Client --</option>
                                            {clientsLoading ? <option disabled>Loading...</option> : clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </CustomSelect>
                                    </div>
                                )}

                                {/* Employee Data Source */}
                                {['contract', 'general', 'offer_letter'].includes(metaType) && (
                                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                        <label className="text-xs font-bold text-gray-700 mb-2 block flex items-center gap-1"><Users className="w-3 h-3" /> Link Employee / Candidate</label>
                                        <CustomSelect onChange={handleEmployeeSelect} value={documentDetails?.selectedEmployeeId || ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none bg-white mb-3">
                                            <option value="">-- Select Employee --</option>
                                            {employeesLoading ? <option disabled>Loading...</option> : employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </CustomSelect>
                                    </div>
                                )}
                                
                                {['quotation', 'invoice', 'contract'].includes(metaType) && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-2 block">{metaType === 'invoice' ? 'Due Date' : 'Valid until'}</label>
                                        <div className="flex items-center gap-2">
                                            <input type="date" value={validUntil} onChange={e => handleDetailChange('validUntil', e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none text-gray-500" />
                                            <button onClick={() => { navigator.clipboard.writeText('{{validUntil}}'); toast.success('Copied {{validUntil}}'); }} className="text-[10px] bg-gray-100 hover:bg-blue-50 hover:text-blue-600 px-2 py-2 rounded border border-gray-200 whitespace-nowrap">Copy <code className="ml-1">{'{{validUntil}}'}</code></button>
                                        </div>
                                    </div>
                                )}
                                
                                <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider text-right flex justify-end items-center gap-1"><Check className="w-3 h-3" /> Auto-saved</p>
                            </div>
                        )}
                                                       {selectedBlock && (
                                        <>
                                        {/* Block Text Styling */}
                                        <div className="mb-6 pb-6 border-b border-gray-100">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                    <Type className="w-4 h-4 text-indigo-500" /> Block Text Styling
                                                </h3>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="flex gap-4">
                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-xs font-semibold text-gray-500 block">Font Size (px)</label>
                                                        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                            <button 
                                                                onClick={() => dispatch(updateBlock({ id: selectedBlock.id, updates: { styles: { ...selectedBlock.styles, fontSize: Math.max(8, parseInt(selectedBlock.styles?.fontSize as any || '16') - 1) } } }))}
                                                                className="px-2 hover:bg-gray-50 border-r border-gray-200 text-gray-600 font-bold"
                                                            >-</button>
                                                            <input 
                                                                type="number" 
                                                                value={parseInt(selectedBlock.styles?.fontSize as any || '16')}
                                                                onChange={(e) => dispatch(updateBlock({ id: selectedBlock.id, updates: { styles: { ...selectedBlock.styles, fontSize: parseInt(e.target.value) } } }))}
                                                                className="w-full px-2 py-1.5 text-sm font-medium focus:outline-none text-center" 
                                                            />
                                                            <button 
                                                                onClick={() => dispatch(updateBlock({ id: selectedBlock.id, updates: { styles: { ...selectedBlock.styles, fontSize: parseInt(selectedBlock.styles?.fontSize as any || '16') + 1 } } }))}
                                                                className="px-2 hover:bg-gray-50 border-l border-gray-200 text-gray-600 font-bold"
                                                            >+</button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex-1 space-y-1">
                                                        <label className="text-xs font-semibold text-gray-500 block">Text Color</label>
                                                        <div className="relative border border-gray-200 rounded-lg bg-white flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 h-9 transition-colors overflow-hidden">
                                                            <input 
                                                                type="color" 
                                                                value={selectedBlock.styles?.color || '#000000'} 
                                                                onChange={(e) => dispatch(updateBlock({ id: selectedBlock.id, updates: { styles: { ...selectedBlock.styles, color: e.target.value } } }))}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                                            />
                                                            <div className="w-4 h-4 rounded-full shadow-sm pointer-events-none" style={{ backgroundColor: selectedBlock.styles?.color || '#000000' }}></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-xs font-semibold text-gray-500 block">Font Family</label>
                                                    <CustomSelect 
                                                        value={selectedBlock.styles?.fontFamily || 'inherit'}
                                                        onChange={(e) => dispatch(updateBlock({ id: selectedBlock.id, updates: { styles: { ...selectedBlock.styles, fontFamily: e.target.value } } }))}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#2563eb] outline-none"
                                                    >
                                                        <option value="inherit">Inherit from document</option>
                                                        <option value="Arial, sans-serif">Arial</option>
                                                        <option value="'Courier New', monospace">Courier New</option>
                                                        <option value="Georgia, serif">Georgia</option>
                                                        <option value="'Times New Roman', serif">Times New Roman</option>
                                                        <option value="Verdana, sans-serif">Verdana</option>
                                                        <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                                                    </CustomSelect>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                <Settings2 className="w-4 h-4 text-[#2563eb]" /> Block Layout
                                            </h3>
                                        </div>
                                        </>
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
    const templateId = searchParams.get('templateId');
    const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

    useEffect(() => {
        if (templateId) {
            const template = DOCUMENT_TEMPLATES.find((t) => t.id === templateId);
            if (template) {
                setSelectedTemplate(template);
            } else {
                const fetchTemplate = async () => {
                    try {
                        const res = await api.get('/api/180documents/files?category=Template');
                        if (res.data?.success && res.data.articles) {
                            const found = res.data.articles.find((a: any) => a.id === templateId);
                            if (found) {
                                let content = null;
                                try { content = JSON.parse(found.content); } catch (e) {}
                                setSelectedTemplate({
                                    id: found.id,
                                    category: 'my_templates',
                                    title: found.title,
                                    description: 'Custom saved template',
                                    isCustom: true,
                                    blocks: content?.blocks || [],
                                    documentDetails: content?.documentDetails || null,
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
            // Default to first template or a blank one if no templateId provided
            setSelectedTemplate(DOCUMENT_TEMPLATES[0]);
        }
    }, [templateId]);

    const s = settings as any;
    const brand: any = {
        companyName: s?.companyName || 'Your Company',
        companyLogo: s?.logoUrl || '',
        companyEmail: s?.emailFrom || s?.adminEmail || '',
        companyPhone: s?.primaryPhone || '',
        companyAddress: [s?.address, s?.city, s?.state, s?.country, s?.zipCode].filter(Boolean).join(', ') || '',
        companyWebsite: s?.website || '',
        companyGst: s?.gstNumber || '',
        companySign: s?.authorizedSignatorySignature || '',
        authorizedSignatory: s?.authorizedSignatoryName || '',
        brandColor: s?.themeColor || '#4f46e5',
        ...settings, // fallback to capture any other fields
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
            onBack={() => router.push('/dashboard/documents')}
            onClose={() => router.push('/dashboard/documents')}
            onSuccess={() => router.push('/dashboard/documents')}
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
