"use client";

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Plus, Trash2, Send,
  ExternalLink, GripHorizontal, Copy, CheckCircle,
  Key, Webhook, Download, RefreshCw, Eye, TrendingUp,
  FileText, Palette, Sliders, Code, Search, X, Check,
  Sparkles, ShieldCheck, HelpCircle, ArrowUpRight,
  Zap, UserCheck, DollarSign, Layers, Tag, ChevronDown,
  Image as ImageIcon, Type, AlignLeft, ToggleLeft,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import CustomSelect from '@/components/ui/CustomSelect';
import { ConfirmModal, LogoLoader } from "@workspace/ui";

type FieldType = 
  | 'TEXT' 
  | 'TEXTAREA' 
  | 'EMAIL' 
  | 'PHONE' 
  | 'NUMBER' 
  | 'DATE' 
  | 'DATETIME' 
  | 'SELECT' 
  | 'RADIO' 
  | 'CHECKBOX' 
  | 'RATING' 
  | 'FILE_UPLOAD' 
  | 'HEADING' 
  | 'PARAGRAPH' 
  | 'DIVIDER';

interface FormPage {
  id: string; // e.g. "page_1", "page_2"
  title: string; // e.g. "Step 1: Basic Information"
  description?: string; // e.g. "Tell us about yourself"
  order: number; // 0, 1, 2...
}

interface FormField {
  id?: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: any;
  order: number;
  mapping?: string;
  pageId?: string;
}

interface SalesSettings {
  isSalesActivity?: boolean;
  targetStage?: string;
  defaultDealValue?: number;
  assignedSalesRepId?: string;
  autoCreateActivity?: boolean;
}

interface FormSettings {
  buttonColor?: string;
  buttonTextColor?: string;
  submitButtonText?: string;
  backgroundColor?: string;
  backgroundType?: 'default' | 'color' | 'image';
  backgroundImage?: string;
  headerImage?: string;
  footerImage?: string;
  footerText?: string;
  redirectUrl?: string;
  pixelEventName?: string;
  webhookUrl?: string;
  notificationEmails?: string[];
  successMessage?: string;
  showCompanyLogo?: boolean;
  salesSettings?: SalesSettings;
  isSalesActivity?: boolean;
  allowedDomains?: string[];
  honeypotField?: string;
  isHeadless?: boolean;
  pages?: FormPage[];
}

const PRESET_COLORS = [
  '#4f46e5', '#059669', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#18181b',
];

const STAGES = [
  { value: 'Lead', label: 'New Leads (Default)' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'Qualified', label: 'Qualified' },
  { value: 'Demo', label: 'Demo / Meeting' },
  { value: 'Proposal', label: 'Proposal' },
  { value: 'Negotiation', label: 'Negotiating' }
];

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'TEXT', label: 'Short Text' },
  { value: 'TEXTAREA', label: 'Long Text' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'RADIO', label: 'Radio' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'RATING', label: 'Rating' },
  { value: 'FILE_UPLOAD', label: 'File Upload' },
  { value: 'HEADING', label: 'Heading' },
  { value: 'DIVIDER', label: 'Divider' },
  { value: 'PARAGRAPH', label: 'Paragraph' },
];

export default function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: formId } = use(params);
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'integrations' | 'submissions'>('editor');
  const [showDesignPanel, setShowDesignPanel] = useState<boolean>(true);
  const [hoveredFieldIndex, setHoveredFieldIndex] = useState<number | null>(null);
  
  // Inline editor state
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  
  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Multi-Page / Step State (Google Forms Style)
  const [pages, setPages] = useState<FormPage[]>([
    { id: 'page_1', title: 'Page 1', description: '', order: 0 }
  ]);
  const [activePageId, setActivePageId] = useState<string>('page_1');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [slug, setSlug] = useState('');
  const [formType, setFormType] = useState<'GENERAL_SURVEY' | 'SALES_ACTIVITY' | 'HEADLESS_ENDPOINT'>('GENERAL_SURVEY');
  const [formCode, setFormCode] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [viewsCount, setViewsCount] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [fields, setFields] = useState<FormField[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<FormSettings>({
    buttonColor: '#4f46e5',
    buttonTextColor: '#ffffff',
    submitButtonText: 'Submit Form',
    backgroundType: 'default',
    backgroundColor: '#f8fafc',
    pixelEventName: 'Lead',
    successMessage: 'Thank you! Your submission has been received.',
    headerImage: '',
    footerImage: '',
    footerText: '',
    allowedDomains: [],
    honeypotField: '_gotcha',
    salesSettings: {
      isSalesActivity: false,
      targetStage: 'Lead',
      defaultDealValue: 0,
      autoCreateActivity: true
    }
  });

  // Headless Endpoint State
  const [headlessSnippetTab, setHeadlessSnippetTab] = useState<'html' | 'react' | 'webflow' | 'curl' | 'python'>('html');
  const [domainInput, setDomainInput] = useState('');
  const [testPayloadName, setTestPayloadName] = useState('Sarah Connor');
  const [testPayloadEmail, setTestPayloadEmail] = useState('sarah@cyberdyne.io');
  const [testPayloadPhone, setTestPayloadPhone] = useState('+1 (555) 321-9988');
  const [testPayloadCompany, setTestPayloadCompany] = useState('Cyberdyne Systems');
  const [testPayloadBudget, setTestPayloadBudget] = useState('10000');
  const [isSendingTest, setIsSendingTest] = useState(false);
  
  // Submissions State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [codeLang, setCodeLang] = useState<'curl' | 'javascript' | 'python'>('curl');

  // Auto-save State & Refs
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const lastSavedStateRef = useRef<string>('');
  const autoSaveTimeoutRef = useRef<any>(null);
  const maxWaitTimeoutRef = useRef<any>(null);
  const inFlightSaveRef = useRef<boolean>(false);
  const pendingSaveRef = useRef<boolean>(false);
  const isInitialLoadRef = useRef<boolean>(true);

  // Refs
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const headerFileRef = useRef<HTMLInputElement>(null);
  const footerFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  // Multi-Page Management Helpers
  const addPage = () => {
    const newPageId = `page_${Date.now()}`;
    const newPageNumber = pages.length + 1;
    const newPage: FormPage = {
      id: newPageId,
      title: `Page ${newPageNumber}`,
      description: '',
      order: pages.length
    };
    const updatedPages = [...pages, newPage];
    setPages(updatedPages);
    setActivePageId(newPageId);
    toast.success(`Page ${newPageNumber} added!`);
  };

  const removePage = (pageIdToRemove: string) => {
    if (pages.length <= 1) {
      toast.error('A form must have at least one page');
      return;
    }
    const updatedPages = pages.filter(p => p.id !== pageIdToRemove).map((p, idx) => ({ ...p, order: idx }));
    const remainingFirstPageId = updatedPages[0].id;
    // Safely re-assign any orphaned fields from deleted page to first page
    setFields(prev => prev.map(f => ((f.pageId || 'page_1') === pageIdToRemove ? { ...f, pageId: remainingFirstPageId } : f)));
    setPages(updatedPages);
    if (activePageId === pageIdToRemove) {
      setActivePageId(remainingFirstPageId);
    }
    toast.success('Page section deleted (questions preserved)');
  };

  const updatePage = (pageId: string, key: keyof FormPage, val: any) => {
    setPages(prev => prev.map(p => (p.id === pageId ? { ...p, [key]: val } : p)));
  };

  const movePage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= pages.length) return;
    const updated = [...pages];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setPages(updated.map((p, idx) => ({ ...p, order: idx })));
  };

  const serializeFormState = (t: string, d: string, act: boolean, ft: any, fc: string, s: any, f: any[], pgs: FormPage[]) => {
    return JSON.stringify({
      title: t,
      description: d,
      isActive: act,
      formType: ft,
      formCode: fc,
      settings: {
        ...s,
        pages: pgs
      },
      fields: (f || []).map(item => ({
        id: item.id,
        name: item.name,
        label: item.label,
        type: item.type,
        required: item.required,
        placeholder: item.placeholder,
        description: item.description,
        order: item.order,
        mapping: item.mapping,
        options: item.options,
        pageId: item.pageId || 'page_1'
      }))
    });
  };

  useEffect(() => {
    fetchForm();
    fetchUsers();
  }, [formId]);

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingDescription && descRef.current) descRef.current.focus();
  }, [editingDescription]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users', { params: { limit: 100 } });
      setUsers(res.data?.users || res.data?.data?.users || []);
    } catch (e) {
      console.error('Failed to load users for sales rep assignment', e);
    }
  };

  const fetchForm = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const response = await api.get(`/api/forms/${formId}`);
      const form = response.data.data.form;
      setTitle(form.title);
      setDescription(form.description || '');
      setIsActive(form.isActive);
      setSlug(form.slug);
      const resolvedFormType = form.formType || (form.settings?.isHeadless ? 'HEADLESS_ENDPOINT' : (form.settings?.isSalesActivity ? 'SALES_ACTIVITY' : 'GENERAL_SURVEY'));
      setFormType(resolvedFormType);
      setFormCode(form.formCode || '');
      setApiKey(form.apiKey || '');
      setViewsCount(form.viewsCount || 0);
      setConversionRate(form.conversionRate || 0);

      // Load & Normalize Multi-Page Sections
      const loadedPages: FormPage[] = Array.isArray(form.settings?.pages) && form.settings.pages.length > 0
        ? form.settings.pages
        : [{ id: 'page_1', title: 'Page 1', description: '', order: 0 }];
      setPages(loadedPages);
      setActivePageId(loadedPages[0].id);

      const mappedLoadedFields: FormField[] = (form.fields || []).map((field: any, idx: number) => ({
        ...field,
        order: field.order !== undefined ? field.order : idx,
        pageId: field.pageId || (field.validation as any)?.pageId || (field.options as any)?.pageId || 'page_1'
      }));
      setFields(mappedLoadedFields);

      if (resolvedFormType === 'HEADLESS_ENDPOINT' || form.settings?.isHeadless) {
        setActiveTab(prev => (prev === 'integrations' ? 'editor' : prev));
      }
      
      const resolvedSettings: FormSettings = {
        buttonColor: form.settings?.buttonColor || '#4f46e5',
        buttonTextColor: form.settings?.buttonTextColor || '#ffffff',
        submitButtonText: form.settings?.submitButtonText || 'Submit Form',
        backgroundType: form.settings?.backgroundType || 'default',
        backgroundColor: form.settings?.backgroundColor || '#f8fafc',
        pixelEventName: form.settings?.pixelEventName || 'Lead',
        successMessage: form.settings?.successMessage || 'Thank you! Your submission has been received.',
        headerImage: form.settings?.headerImage || '',
        footerImage: form.settings?.footerImage || '',
        footerText: form.settings?.footerText || '',
        allowedDomains: form.settings?.allowedDomains || [],
        honeypotField: form.settings?.honeypotField || '_gotcha',
        pages: loadedPages,
        salesSettings: {
          isSalesActivity: resolvedFormType === 'SALES_ACTIVITY' || resolvedFormType === 'HEADLESS_ENDPOINT' || form.settings?.isSalesActivity || form.settings?.salesSettings?.isSalesActivity || false,
          targetStage: form.settings?.salesSettings?.targetStage || 'Lead',
          defaultDealValue: form.settings?.salesSettings?.defaultDealValue || 0,
          assignedSalesRepId: form.settings?.salesSettings?.assignedSalesRepId || '',
          autoCreateActivity: form.settings?.salesSettings?.autoCreateActivity !== false
        }
      };

      setSettings(resolvedSettings);
      
      const subResponse = await api.get(`/api/forms/${formId}/submissions`);
      setSubmissions(subResponse.data.data.submissions || []);

      const initialSnapshot = serializeFormState(
        form.title,
        form.description || '',
        form.isActive,
        resolvedFormType,
        form.formCode || '',
        resolvedSettings,
        mappedLoadedFields,
        loadedPages
      );
      lastSavedStateRef.current = initialSnapshot;
      setSaveStatus('saved');
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 300);
    } catch (error) {
      console.error('Failed to fetch form:', error);
      toast.error('Failed to load form details');
      router.push('/forms');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const performAutoSave = async (customPayload?: any) => {
    if (isInitialLoadRef.current || !formId || isLoading) return;

    const isHeadlessMode = formType === 'HEADLESS_ENDPOINT' || settings.isHeadless;
    const isSalesMode = isHeadlessMode
      ? (settings.isSalesActivity !== false && settings.salesSettings?.isSalesActivity !== false)
      : (formType === 'SALES_ACTIVITY');

    const currentSnapshot = serializeFormState(title, description, isActive, formType, formCode, settings, fields, pages);

    if (currentSnapshot === lastSavedStateRef.current) {
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

      const payload = customPayload || {
        title,
        description,
        isActive,
        formType: isHeadlessMode ? 'HEADLESS_ENDPOINT' : formType,
        formCode,
        settings: {
          ...settings,
          isHeadless: isHeadlessMode,
          isSalesActivity: isSalesMode,
          pages,
          salesSettings: {
            ...(settings.salesSettings || {}),
            isSalesActivity: isSalesMode
          }
        },
        fields: fields.map((f, index) => {
          const autoKey = f.name || f.label.toLowerCase().replace(/[^a-z0-9]/g, '_') || `field_${index + 1}`;
          return { ...f, order: index, name: autoKey, mapping: f.mapping || autoKey, pageId: f.pageId || 'page_1' };
        })
      };

      await api.patch(`/api/forms/${formId}`, payload);
      lastSavedStateRef.current = currentSnapshot;
      setSaveStatus('saved');
    } catch (err) {
      console.error('Auto-save error:', err);
      setSaveStatus('error');
    } finally {
      inFlightSaveRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        performAutoSave();
      }
    }
  };

  // Auto-save debounce effect (1200ms debounce, 4000ms max throttle ceiling)
  useEffect(() => {
    if (isInitialLoadRef.current || isLoading) return;

    const currentSnapshot = serializeFormState(title, description, isActive, formType, formCode, settings, fields, pages);
    if (currentSnapshot === lastSavedStateRef.current) {
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
      performAutoSave();
    }, 1200);

    if (!maxWaitTimeoutRef.current) {
      maxWaitTimeoutRef.current = setTimeout(() => {
        maxWaitTimeoutRef.current = null;
        performAutoSave();
      }, 4000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [title, description, isActive, formType, formCode, settings, fields, pages]);

  // Keepalive emergency flush on tab close/unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInitialLoadRef.current || isLoading || !formId) return;
      const currentSnapshot = serializeFormState(title, description, isActive, formType, formCode, settings, fields, pages);
      if (currentSnapshot !== lastSavedStateRef.current) {
        const isHeadlessMode = formType === 'HEADLESS_ENDPOINT' || settings.isHeadless;
        const isSalesMode = isHeadlessMode
          ? (settings.isSalesActivity !== false && settings.salesSettings?.isSalesActivity !== false)
          : (formType === 'SALES_ACTIVITY');
        const payload = {
          title,
          description,
          isActive,
          formType: isHeadlessMode ? 'HEADLESS_ENDPOINT' : formType,
          formCode,
          settings: {
            ...settings,
            isHeadless: isHeadlessMode,
            isSalesActivity: isSalesMode,
            pages,
            salesSettings: {
              ...(settings.salesSettings || {}),
              isSalesActivity: isSalesMode
            }
          },
          fields: fields.map((f, index) => {
            const autoKey = f.name || f.label.toLowerCase().replace(/[^a-z0-9]/g, '_') || `field_${index + 1}`;
            return { ...f, order: index, name: autoKey, mapping: f.mapping || autoKey, pageId: f.pageId || 'page_1' };
          })
        };
        try {
          const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null;
          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';
          fetch(`${apiBase}/api/forms/${formId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload),
            keepalive: true
          });
        } catch (_) {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [title, description, isActive, formType, formCode, settings, fields, pages, formId, isLoading]);

  const handleAddDomain = () => {
    if (!domainInput.trim()) return;
    const cleanDomain = domainInput.trim().toLowerCase();
    const current = settings.allowedDomains || [];
    if (!current.includes(cleanDomain)) {
      setSettings(prev => ({
        ...prev,
        allowedDomains: [...(prev.allowedDomains || []), cleanDomain]
      }));
      setDomainInput('');
      toast.success(`Domain ${cleanDomain} added to whitelist`);
    }
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      allowedDomains: (prev.allowedDomains || []).filter(d => d !== domainToRemove)
    }));
  };

  const handleSendTestPayload = async () => {
    setIsSendingTest(true);
    try {
      const payload = {
        name: testPayloadName,
        email: testPayloadEmail,
        phone: testPayloadPhone,
        company: testPayloadCompany,
        budget: Number(testPayloadBudget) || 10000,
        message: 'Interactive live test payload sent directly from Form Studio.'
      };
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002'}/api/public/capture/${formId}`, payload);
      toast.success('Live test payload dispatched & captured!');
      fetchForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch test payload');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handlePublish = async () => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    if (maxWaitTimeoutRef.current) clearTimeout(maxWaitTimeoutRef.current);
    setIsPublishing(true);
    try {
      if (formType !== 'HEADLESS_ENDPOINT') {
        for (const field of fields) {
          if (!field.label && !['DIVIDER', 'PARAGRAPH'].includes(field.type)) {
            toast.error('All input fields must have a label before publishing');
            setIsPublishing(false);
            return;
          }
        }
      }

      setIsActive(true);

      const isHeadlessMode = formType === 'HEADLESS_ENDPOINT' || settings.isHeadless;
      const isSalesMode = isHeadlessMode
        ? (settings.isSalesActivity !== false && settings.salesSettings?.isSalesActivity !== false)
        : (formType === 'SALES_ACTIVITY');

      const payload = {
        title,
        description,
        isActive: true,
        formType: isHeadlessMode ? 'HEADLESS_ENDPOINT' : formType,
        formCode,
        settings: {
          ...settings,
          isHeadless: isHeadlessMode,
          isSalesActivity: isSalesMode,
          pages,
          salesSettings: {
            ...(settings.salesSettings || {}),
            isSalesActivity: isSalesMode
          }
        },
        fields: fields.map((f, index) => {
          const autoKey = f.name || f.label.toLowerCase().replace(/[^a-z0-9]/g, '_') || `field_${index + 1}`;
          return { ...f, order: index, name: autoKey, mapping: f.mapping || autoKey, pageId: f.pageId || 'page_1' };
        })
      };

      await api.patch(`/api/forms/${formId}`, payload);
      lastSavedStateRef.current = serializeFormState(title, description, true, formType, formCode, settings, fields, pages);
      setSaveStatus('saved');
      toast.success('Form published successfully! All changes are live.');
    } catch (error) {
      console.error('Failed to publish form:', error);
      toast.error('Failed to publish changes');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSave = async () => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    if (maxWaitTimeoutRef.current) clearTimeout(maxWaitTimeoutRef.current);
    setIsSaving(true);
    try {
      if (formType !== 'HEADLESS_ENDPOINT') {
        for (const field of fields) {
          if (!field.label && !['DIVIDER', 'PARAGRAPH'].includes(field.type)) {
            toast.error('All input fields must have a label');
            setIsSaving(false);
            return;
          }
        }
      }

      await performAutoSave();
      toast.success('Form draft saved');
    } catch (error) {
      console.error('Failed to save form:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRegenerateKey = async () => {
    setIsRegeneratingKey(true);
    try {
      const res = await api.post(`/api/forms/${formId}/api-key/regenerate`);
      setApiKey(res.data.data.apiKey);
      toast.success('API key regenerated successfully');
      setShowRegenerateConfirm(false);
    } catch (err) {
      toast.error('Failed to regenerate API key');
    } finally {
      setIsRegeneratingKey(false);
    }
  };

  const handleExportCsv = () => {
    const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/forms/${formId}/export/csv`;
    window.open(downloadUrl, '_blank');
    toast.success('Downloading submissions CSV...');
  };

  const handleImageUpload = async (file: File, target: 'header' | 'footer' | 'background') => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WebP, SVG, GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image file size exceeds 10MB limit');
      return;
    }

    const label = target === 'header' ? 'header banner' : target === 'footer' ? 'footer banner' : 'background image';
    const toastId = toast.loading(`Uploading ${label}...`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'forms');

      const res = await api.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const url = res.data?.url || res.data?.fileUrl || res.data?.data?.url || res.data?.data?.fileUrl;
      if (url) {
        const key = target === 'header' ? 'headerImage' : target === 'footer' ? 'footerImage' : 'backgroundImage';
        setSettings(prev => ({
          ...prev,
          [key]: url,
          ...(target === 'background' ? { backgroundType: 'image' } : {})
        }));
        toast.success(`${target === 'header' ? 'Header' : target === 'footer' ? 'Footer' : 'Background'} image uploaded successfully`, { id: toastId });
      } else {
        toast.error('Failed to get uploaded image URL', { id: toastId });
      }
    } catch (err: any) {
      console.error('Image upload error:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to upload image';
      toast.error(msg, { id: toastId });
    }
  };

  // ── Field CRUD ────────────────────────────────────────────────
  const addField = (type: FieldType = 'TEXT') => {
    const ts = Date.now();
    const newField: FormField = {
      name: `field_${ts}`,
      label: type === 'HEADING' ? 'Section Title' : type === 'DIVIDER' ? '' : '',
      type,
      required: !['HEADING', 'PARAGRAPH', 'DIVIDER'].includes(type),
      placeholder: '',
      description: '',
      order: fields.length,
      mapping: `field_${ts}`,
      options: ['SELECT', 'RADIO', 'CHECKBOX'].includes(type) ? ['Option 1', 'Option 2'] : undefined,
      pageId: activePageId || pages[0]?.id || 'page_1'
    };
    setFields(prev => [...prev, newField]);
    setActiveFieldIndex(fields.length);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
    if (activeFieldIndex === index) setActiveFieldIndex(null);
  };

  const updateField = (index: number, key: keyof FormField, value: any) => {
    const newFields = [...fields];
    if (key === 'label') {
      const sanitizedKey = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (sanitizedKey && !newFields[index].id) {
        newFields[index].name = sanitizedKey;
        newFields[index].mapping = sanitizedKey;
      }
    }
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const addOption = (fieldIndex: number) => {
    const currentOptions = Array.isArray(fields[fieldIndex].options) && fields[fieldIndex].options.length > 0
      ? [...fields[fieldIndex].options] 
      : ['Option 1'];
    currentOptions.push(`Option ${currentOptions.length + 1}`);
    updateField(fieldIndex, 'options', currentOptions);
  };

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const currentOptions = Array.isArray(fields[fieldIndex].options) && fields[fieldIndex].options.length > 0
      ? [...fields[fieldIndex].options] 
      : ['Option 1'];
    currentOptions[optionIndex] = value;
    updateField(fieldIndex, 'options', currentOptions);
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const currentOptions = Array.isArray(fields[fieldIndex].options) && fields[fieldIndex].options.length > 0
      ? [...fields[fieldIndex].options] 
      : ['Option 1'];
    if (currentOptions.length <= 1) return;
    currentOptions.splice(optionIndex, 1);
    updateField(fieldIndex, 'options', currentOptions);
  };

  // ── Drag & Drop ───────────────────────────────────────────────
  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) setDragOverIndex(index);
  };
  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null); setDragOverIndex(null); return;
    }
    const newFields = [...fields];
    const item = newFields.splice(draggedIndex, 1)[0];
    newFields.splice(dropIndex, 0, item);
    setFields(newFields);
    if (activeFieldIndex === draggedIndex) setActiveFieldIndex(dropIndex);
    setDraggedIndex(null); setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDraggedIndex(null); setDragOverIndex(null); };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return sub.values?.some((v: any) => String(v.value || '').toLowerCase().includes(q)) || String(sub.ipAddress || '').toLowerCase().includes(q);
  });

  const accentColor = settings.buttonColor || '#4f46e5';

  // ── Helper: render the input preview for a field ──────────────
  const renderFieldPreview = (field: FormField, index: number, isExpanded: boolean) => {
    switch (field.type) {
      case 'TEXTAREA':
        return isExpanded ? (
          <textarea
            rows={2}
            value={field.placeholder || ''}
            onChange={(e) => updateField(index, 'placeholder', e.target.value)}
            placeholder="Type placeholder text for long answer..."
            className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 focus:border-indigo-600 focus:border-solid rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all placeholder:text-zinc-400 placeholder:italic resize-none"
          />
        ) : (
          <div className="w-full h-16 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-400">
            {field.placeholder || 'Long text answer'}
          </div>
        );
      case 'RADIO':
      case 'CHECKBOX':
      case 'SELECT': {
        const optionsList = Array.isArray(field.options) && field.options.length > 0 
          ? field.options 
          : ['Option 1', 'Option 2'];

        if (isExpanded) {
          return (
            <div className="space-y-2 pt-1">
              {optionsList.map((opt: string, optIdx: number) => (
                <div key={optIdx} className="flex items-center gap-2.5 group/opt">
                  {field.type === 'RADIO' && (
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-400 dark:border-zinc-600 shrink-0" />
                  )}
                  {field.type === 'CHECKBOX' && (
                    <div className="w-4 h-4 rounded border-2 border-zinc-400 dark:border-zinc-600 shrink-0" />
                  )}
                  {field.type === 'SELECT' && (
                    <span className="text-xs font-mono text-zinc-400 shrink-0 w-4 text-center">{optIdx + 1}.</span>
                  )}
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(index, optIdx, e.target.value)}
                    placeholder={`Option ${optIdx + 1}`}
                    className="flex-1 px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 bg-transparent border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                  {optionsList.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeOption(index, optIdx);
                      }}
                      className="p-1 text-zinc-400 hover:text-red-500 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors opacity-0 group-hover/opt:opacity-100"
                      title="Remove option"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add Option Row */}
              <div className="flex items-center gap-2.5 pt-1">
                {field.type === 'RADIO' && (
                  <div className="w-4 h-4 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 shrink-0" />
                )}
                {field.type === 'CHECKBOX' && (
                  <div className="w-4 h-4 rounded border-2 border-dashed border-zinc-300 dark:border-zinc-700 shrink-0" />
                )}
                {field.type === 'SELECT' && (
                  <span className="text-xs font-mono text-zinc-300 dark:text-zinc-600 shrink-0 w-4 text-center">{optionsList.length + 1}.</span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    addOption(index);
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1.5 py-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add option</span>
                </button>
              </div>
            </div>
          );
        }

        // Inactive preview state
        if (field.type === 'RADIO') {
          return (
            <div className="space-y-1.5">
              {optionsList.map((opt: string, i: number) => (
                <label key={i} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 rounded-full shrink-0" />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          );
        }

        if (field.type === 'CHECKBOX') {
          return (
            <div className="space-y-1.5">
              {optionsList.map((opt: string, i: number) => (
                <label key={i} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 rounded shrink-0" />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          );
        }

        return (
          <div className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400 flex items-center justify-between">
            <span>{optionsList[0] || 'Select an option'}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        );
      }
      case 'RATING':
        return (
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map(s => (
              <span key={s} className="text-xl text-amber-400 cursor-default">★</span>
            ))}
          </div>
        );
      case 'FILE_UPLOAD':
        return <div className="w-full border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-4 text-center text-xs text-zinc-400">Click or drag to upload file</div>;
      case 'DATE':
      case 'DATETIME':
        return isExpanded ? (
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => updateField(index, 'placeholder', e.target.value)}
            placeholder="Placeholder date format (e.g. mm/dd/yyyy)..."
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 focus:border-indigo-600 focus:border-solid rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all placeholder:text-zinc-400 placeholder:italic"
          />
        ) : (
          <div className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400">
            {field.placeholder || 'mm/dd/yyyy'}
          </div>
        );
      default:
        return isExpanded ? (
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => updateField(index, 'placeholder', e.target.value)}
            placeholder="Type placeholder text here (e.g. Jane Doe)..."
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 focus:border-indigo-600 focus:border-solid rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none transition-all placeholder:text-zinc-400 placeholder:italic"
          />
        ) : (
          <div className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400">
            {field.placeholder || 'Your answer'}
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <LogoLoader size={48} className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-xs text-zinc-500 font-medium">Loading Form Studio...</p>
      </div>
    );
  }

  const effectiveId = formCode || slug;
  const isHeadless = formType === 'HEADLESS_ENDPOINT' || settings.isHeadless;
  const captureUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/public/capture/${effectiveId}` : `/api/public/capture/${effectiveId}`;
  const publicUrl = isHeadless ? captureUrl : (typeof window !== 'undefined' ? `${window.location.origin}/f/${effectiveId}` : `/f/${effectiveId}`);
  const jsEmbedCode = `<div id="form-container-${effectiveId}"></div>\n<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/form-embed.js" data-form-slug="${effectiveId}" data-target="#form-container-${effectiveId}" async></script>`;
  const iframeEmbedCode = `<iframe src="${publicUrl}?embed=true" width="100%" height="600" frameborder="0" style="border:none; border-radius:12px; overflow:hidden;" allow="camera; microphone; autoplay; encrypted-media;"></iframe>`;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-zinc-100 dark:bg-zinc-950 min-h-screen">
      {/* ─── TOP HEADER BAR ─────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/forms')} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white truncate max-w-md">
                {title || 'Untitled Form'}
              </h2>
              {effectiveId && (
                <button onClick={() => copyToClipboard(effectiveId, 'Form ID')} title="Copy 10-Digit Form ID" className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 transition-colors">
                  <Tag className="w-3 h-3 text-indigo-500" />
                  <span>#{effectiveId}</span>
                </button>
              )}
              {/* Form Purpose Badge */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                (isHeadless ? (settings.isSalesActivity !== false && settings.salesSettings?.isSalesActivity !== false) : formType === 'SALES_ACTIVITY')
                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-500/30'
                  : 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-500/30'
              }`}>
                {(isHeadless ? (settings.isSalesActivity !== false && settings.salesSettings?.isSalesActivity !== false) : formType === 'SALES_ACTIVITY') ? (
                  <>
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Sales Form</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3 h-3 text-blue-500" />
                    <span>Form</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Form ID: <span className="font-mono text-zinc-700 dark:text-zinc-300">#{effectiveId}</span> • Views: <strong>{viewsCount}</strong> • Submissions: <strong>{submissions.length}</strong> ({conversionRate}% CVR)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!isHeadless && (
            <button 
              type="button"
              onClick={() => setShowDesignPanel(!showDesignPanel)} 
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-xs ${
                showDesignPanel 
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-500/10' 
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
              title="Toggle Design & Theme Side Panel"
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Design Panel</span>
              {showDesignPanel && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
            </button>
          )}
          <label className="flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <div className="w-10 h-5 bg-gray-200 dark:bg-zinc-700 rounded-full peer-checked:bg-emerald-600 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">{isActive ? 'Active (Live)' : 'Draft (Paused)'}</span>
          </label>
          <a 
            href={isHeadless ? '#' : `/f/${effectiveId}`} 
            target={isHeadless ? '_self' : '_blank'} 
            rel="noopener noreferrer" 
            onClick={(e) => {
              if (isHeadless) {
                e.preventDefault();
                copyToClipboard(captureUrl, 'Submission URL');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isHeadless ? 'Copy Submission URL' : 'Preview'}</span>
          </a>

          {/* Live Auto-Save Status Indicator */}
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 rounded-xl shadow-xs animate-in fade-in duration-150">
              <LogoLoader size={12} className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Saving draft...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 rounded-xl shadow-xs animate-in fade-in duration-150">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Saved</span>
            </div>
          )}
          {saveStatus === 'unsaved' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-500/20 rounded-xl shadow-xs animate-in fade-in duration-150">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="hidden sm:inline">Unsaved</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-500/20 rounded-xl shadow-xs animate-in fade-in duration-150">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="hidden sm:inline">Save error</span>
            </div>
          )}

          {/* Primary "Publish Changes" Action Button */}
          <button 
            onClick={handlePublish} 
            disabled={isPublishing || saveStatus === 'saving'} 
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
            title="Publish latest changes live"
          >
            {isPublishing ? (
              <>
                <LogoLoader size={16} className="w-4 h-4 animate-spin text-white" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Publish Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── TABS ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 pb-px">
        {(isHeadless ? [
          { id: 'editor', label: 'Capture Dashboard', icon: Sparkles },
          { id: 'submissions', label: `Submissions (${submissions.length})`, icon: Download },
        ] : [
          { id: 'editor', label: 'Form Builder', icon: FileText },
          { id: 'integrations', label: 'Developer API & Sales Engine', icon: Code },
          { id: 'submissions', label: `Submissions (${submissions.length})`, icon: Download },
        ]).map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${isSelected ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-900 border-x border-t border-zinc-200 dark:border-zinc-800' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'}`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          HEADLESS DATA INGESTION DASHBOARD (When HEADLESS_ENDPOINT is active)
          ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'editor' && isHeadless && (
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Top Ingestion Endpoint Card – Clean 180workspace SaaS Pro Max Theme */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs relative overflow-hidden space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Website Form Data Capture
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  #{effectiveId}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  (settings.isSalesActivity !== false && settings.salesSettings?.isSalesActivity !== false)
                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-500/30'
                    : 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-500/30'
                }`}>
                  {(settings.isSalesActivity !== false && settings.salesSettings?.isSalesActivity !== false) ? '⚡ Sales Pipeline Sync' : '📋 General Data Collection'}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                {title || 'Website Form Data Capture'}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Connect your existing website form (WordPress, Webflow, Framer, React, or plain HTML). Submissions are captured automatically with zero initial setup.
              </p>
            </div>

            {/* Ingestion Link Box */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Your Website Form Submission Link (Action URL)
              </label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 pl-3">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800 uppercase tracking-wider">
                  POST
                </span>
                <input
                  readOnly
                  value={captureUrl}
                  className="flex-1 bg-transparent text-xs sm:text-sm font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(captureUrl, 'Submission URL')}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy URL</span>
                </button>
              </div>
            </div>

            {/* Friendly 3-Step Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[11px] flex items-center justify-center font-black">1</span>
                  <span>Paste URL in Form</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-tight">
                  Add this link as your form&apos;s action URL or POST endpoint.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[11px] flex items-center justify-center font-black">2</span>
                  <span>Auto-Discovers Fields</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-tight">
                  Zero setup required — all input names are detected automatically.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[11px] flex items-center justify-center font-black">3</span>
                  <span>Instant CRM & Leads</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-tight">
                  Submissions flow directly into your CRM Deals & Submissions table.
                </p>
              </div>
            </div>
          </div>

          {/* ── 1-CLICK INTEGRATION CODE GENERATOR ── */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-600" />
                  How to Connect Your Website Form
                </h3>
                <p className="text-xs text-zinc-500">Copy ready-to-paste snippets for your custom website, CMS, or web app.</p>
              </div>
              <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                {(['html', 'react', 'webflow', 'curl', 'python'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setHeadlessSnippetTab(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      headlessSnippetTab === tab 
                        ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs' 
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {tab === 'html' ? 'HTML Form' : tab === 'react' ? 'React / Next.js' : tab === 'webflow' ? 'Webflow / Framer' : tab.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative bg-zinc-900 dark:bg-zinc-950 rounded-xl p-4.5 border border-zinc-800 text-xs font-mono text-zinc-200 overflow-x-auto">
              {headlessSnippetTab === 'html' && (
                <pre className="leading-relaxed">
{`<!-- Standard HTML Form (WordPress, Webflow, Static HTML) -->
<form action="${captureUrl}" method="POST">
  <!-- Optional Honeypot spam shield (hidden from humans, traps bots) -->
  <input type="text" name="_gotcha" style="display:none !important" tabindex="-1" autocomplete="off" />

  <!-- Optional custom redirect URL after submit -->
  <input type="hidden" name="_next" value="https://yourwebsite.com/thank-you" />

  <!-- Any custom form inputs (automatically discovered & structured!) -->
  <input type="text" name="name" placeholder="Full Name" required />
  <input type="email" name="email" placeholder="Work Email" required />
  <input type="tel" name="phone" placeholder="Phone Number" />
  <input type="text" name="company" placeholder="Company Name" />
  <input type="number" name="budget" placeholder="Estimated Budget ($)" />
  <textarea name="message" placeholder="Project Details"></textarea>

  <button type="submit">Submit Inquiry</button>
</form>`}
                </pre>
              )}

              {headlessSnippetTab === 'react' && (
                <pre className="leading-relaxed">
{`// Modern React / Next.js / Vue AJAX Handler (No Page Reload)
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const data = Object.fromEntries(formData.entries());

  const response = await fetch('${captureUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();
  if (result.success) {
    alert('Lead captured and Deal created in CRM!');
  }
};`}
                </pre>
              )}

              {headlessSnippetTab === 'webflow' && (
                <div className="font-sans text-xs space-y-2 text-zinc-300 py-1">
                  <p className="font-semibold text-white">How to connect Webflow / Framer in 30 seconds:</p>
                  <ol className="list-decimal pl-5 space-y-1 text-zinc-400">
                    <li>Select your Form element in Webflow Designer or Framer.</li>
                    <li>In the Form Settings panel, set <strong className="text-white">Method</strong> to <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-400 font-mono">POST</code>.</li>
                    <li>Set <strong className="text-white">Action / URL</strong> to <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-400 font-mono">{captureUrl}</code>.</li>
                    <li>Ensure input fields have clean names (<code className="text-zinc-300">name</code>, <code className="text-zinc-300">email</code>, <code className="text-zinc-300">phone</code>, <code className="text-zinc-300">company</code>, <code className="text-zinc-300">budget</code>).</li>
                    <li>Publish your site! Submissions will flow into 180workspace CRM instantly.</li>
                  </ol>
                </div>
              )}

              {headlessSnippetTab === 'curl' && (
                <pre className="leading-relaxed">
{`curl -X POST "${captureUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Sarah Connor",
    "email": "sarah@cyberdyne.io",
    "phone": "+1 (555) 321-9988",
    "company": "Cyberdyne Systems",
    "budget": 10000,
    "message": "Interested in enterprise CRM and automated lead capture."
  }'`}
                </pre>
              )}

              {headlessSnippetTab === 'python' && (
                <pre className="leading-relaxed">
{`import requests

url = "${captureUrl}"
payload = {
    "name": "Sarah Connor",
    "email": "sarah@cyberdyne.io",
    "phone": "+1 (555) 321-9988",
    "company": "Cyberdyne Systems",
    "budget": 10000,
    "message": "Interested in enterprise CRM and automated lead capture."
}

response = requests.post(url, json=payload)
print(response.json())`}
                </pre>
              )}
            </div>
          </div>

          {/* ── AUTO-DISCOVERED SCHEMA & CRM FIELD MAPPING TABLE ── */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Auto-Discovered Schema & CRM Field Mappings
                </h3>
                <p className="text-xs text-zinc-500">
                  {fields.length === 0 
                    ? "No fields captured yet. Send a test payload or connect your form to auto-discover keys."
                    : `${fields.length} dynamic fields registered. You can customize field names and target CRM attributes.`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => addField('TEXT')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Field</span>
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Schema-Free Auto-Discovery Ready</p>
                <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                  Send your first form submission via HTML, React, or the Live Simulator below. All JSON/Form keys will be mapped automatically!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider text-[10px] border-b border-zinc-100 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-2.5">Field Label</th>
                      <th className="px-4 py-2.5">Discovered Payload Key</th>
                      <th className="px-4 py-2.5">Inferred Type</th>
                      <th className="px-4 py-2.5">CRM Lead Mapping</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {fields.map((field, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateField(idx, 'label', e.target.value)}
                            className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs w-48 font-semibold"
                          />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-zinc-600 dark:text-zinc-300">
                          <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px]">
                            {field.mapping || field.name || field.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                            {field.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={field.mapping || ''}
                            onChange={(e) => updateField(idx, 'mapping', e.target.value)}
                            className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-800 dark:text-zinc-200"
                          >
                            <option value={field.mapping || field.name || ''}>{(field.mapping || field.name || 'Custom Key')} (Direct Key)</option>
                            <option value="name">👤 Client Name</option>
                            <option value="email">📧 Client Email</option>
                            <option value="phone">📞 Phone Number</option>
                            <option value="company">🏢 Company Name</option>
                            <option value="budget">💰 Deal Budget / Value</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeField(idx)}
                            className="p-1 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── SPAM SHIELD & SECURITY WHITELIST ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Authorized Website Domains (CORS)</h3>
              </div>
              <p className="text-xs text-zinc-500">
                Limit submissions to specific website domains (leave empty to accept from any origin).
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. myagency.com or https://site.webflow.io"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDomain())}
                  className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddDomain}
                  className="px-3.5 py-2 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(settings.allowedDomains || []).map((dom, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                    <span>{dom}</span>
                    <button type="button" onClick={() => handleRemoveDomain(dom)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Spam Bot Shield (Honeypot)</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Custom Honeypot Field Name
                  </label>
                  <input
                    type="text"
                    value={settings.honeypotField || '_gotcha'}
                    onChange={(e) => setSettings(prev => ({ ...prev, honeypotField: e.target.value }))}
                    placeholder="_gotcha"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Any automated spam bots filling this hidden input will be silently quarantined without polluting your CRM pipeline.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: GOOGLE FORMS–STYLE INLINE BUILDER + RIGHT DESIGN PANEL
          ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'editor' && !isHeadless && (
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center max-w-6xl mx-auto" onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('[data-field-card]') && !target.closest('[data-form-header]') && !target.closest('[data-design-panel]')) {
            setActiveFieldIndex(null);
            setEditingTitle(false);
            setEditingDescription(false);
          }
        }}>
          {/* ─── CENTER FORM CANVAS ───────────────────────────────────── */}
          <div className="flex-1 max-w-2xl w-full space-y-3">

            {/* ─── MULTI-PAGE STEPPER & SECTION BAR (Google Forms Style) ─── */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-zinc-100 dark:border-zinc-800 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">Form Pages & Steps</span>
                    <span className="text-[11px] text-zinc-400 ml-1.5 font-medium">({pages.length} {pages.length === 1 ? 'page' : 'pages'})</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addPage}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all active:scale-95 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Page / Step</span>
                </button>
              </div>

              {/* Page Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {pages.map((page, pIdx) => {
                  const isCurrentPage = page.id === activePageId;
                  const pageFieldCount = fields.filter(f => (f.pageId || 'page_1') === page.id).length;
                  return (
                    <div
                      key={page.id}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all shrink-0 cursor-pointer select-none ${
                        isCurrentPage
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/10 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                      onClick={() => setActivePageId(page.id)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                          isCurrentPage ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                        }`}>
                          {pIdx + 1}
                        </span>
                        <span className="max-w-[130px] truncate">{page.title || `Page ${pIdx + 1}`}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-200/60 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300 font-mono">
                          {pageFieldCount}
                        </span>
                      </div>

                      {/* Action buttons on tab */}
                      {pages.length > 1 && (
                        <div className="flex items-center gap-0.5 ml-1 border-l border-zinc-200 dark:border-zinc-700 pl-1" onClick={(e) => e.stopPropagation()}>
                          {pIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => movePage(pIdx, pIdx - 1)}
                              title="Move step left"
                              className="p-1 hover:text-indigo-600 text-zinc-400 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700 transition-colors"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          )}
                          {pIdx < pages.length - 1 && (
                            <button
                              type="button"
                              onClick={() => movePage(pIdx, pIdx + 1)}
                              title="Move step right"
                              className="p-1 hover:text-indigo-600 text-zinc-400 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700 transition-colors"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removePage(page.id)}
                            title="Delete this step"
                            className="p-1 hover:text-red-600 text-zinc-400 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── MAIN FORM HEADER CARD (Always on Page 1) ──── */}
            {activePageId === (pages[0]?.id || 'page_1') && (
              <div 
                data-form-header
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden transition-all"
                style={{ borderTopWidth: '6px', borderTopColor: accentColor }}
              >
                {/* Header Image Zone */}
                <div className="relative group">
                  {settings.headerImage ? (
                    <div className="relative">
                      <img 
                        src={settings.headerImage} 
                        alt="Form header" 
                        className="w-full h-40 object-cover"
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button onClick={() => headerFileRef.current?.click()} className="px-3 py-1.5 bg-white/90 text-zinc-800 text-xs font-semibold rounded-lg shadow-sm hover:bg-white transition-colors">
                          Change
                        </button>
                        <button onClick={() => setSettings(prev => ({ ...prev, headerImage: '' }))} className="px-3 py-1.5 bg-red-500/90 text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-red-600 transition-colors">
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => headerFileRef.current?.click()} 
                      className="w-full py-4 flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors border-b border-zinc-100 dark:border-zinc-800"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Add header image</span>
                    </button>
                  )}
                  <input ref={headerFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleImageUpload(f, 'header'); }} />
                </div>

                {/* Editable Title & Description */}
                <div className="p-6 pb-7 space-y-3">
                  {editingTitle ? (
                    <input
                      ref={titleRef}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => setEditingTitle(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                      placeholder="Untitled Form"
                      className="w-full text-2xl font-bold text-zinc-900 dark:text-white bg-transparent border-b-2 border-indigo-500 focus:outline-none pb-1 placeholder:text-zinc-300"
                    />
                  ) : (
                    <h1 
                      onClick={() => setEditingTitle(true)} 
                      className="text-2xl font-bold text-zinc-900 dark:text-white cursor-text pb-1 border-b-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors"
                    >
                      {title || <span className="text-zinc-300 dark:text-zinc-600">Untitled Form</span>}
                    </h1>
                  )}

                  {editingDescription ? (
                    <textarea
                      ref={descRef}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={() => setEditingDescription(false)}
                      placeholder="Form description"
                      rows={2}
                      className="w-full text-sm text-zinc-600 dark:text-zinc-400 bg-transparent border-b-2 border-indigo-500 focus:outline-none pb-1 resize-none placeholder:text-zinc-300"
                    />
                  ) : (
                    <p 
                      onClick={() => setEditingDescription(true)} 
                      className="text-sm text-zinc-600 dark:text-zinc-400 cursor-text pb-1 border-b-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors min-h-[1.25rem]"
                    >
                      {description || <span className="text-zinc-300 dark:text-zinc-600">Form description (click to edit)</span>}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ─── ACTIVE STEP HEADER CARD (When multi-page form) ─── */}
            {pages.length > 1 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Step {pages.findIndex(p => p.id === activePageId) + 1} of {pages.length} Details
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    {fields.filter(f => (f.pageId || 'page_1') === activePageId).length} questions in this step
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={`Step ${pages.findIndex(p => p.id === activePageId) + 1} Title (e.g. Professional Details)`}
                    value={pages.find(p => p.id === activePageId)?.title || ''}
                    onChange={(e) => updatePage(activePageId, 'title', e.target.value)}
                    className="w-full text-base font-bold text-zinc-900 dark:text-white bg-transparent border-b border-zinc-200 dark:border-zinc-700 focus:border-indigo-500 focus:outline-none pb-1"
                  />
                  <input
                    type="text"
                    placeholder="Optional description or guidance for this step..."
                    value={pages.find(p => p.id === activePageId)?.description || ''}
                    onChange={(e) => updatePage(activePageId, 'description', e.target.value)}
                    className="w-full text-xs text-zinc-600 dark:text-zinc-400 bg-transparent border-b border-zinc-100 dark:border-zinc-800 focus:border-indigo-500 focus:outline-none pb-1"
                  />
                </div>
              </div>
            )}

            {/* ─── FIELD CARDS (Inline Edit-in-Place with Hover Expansion) ────────────────────── */}
            {fields
              .map((field, originalIndex) => ({ field, originalIndex }))
              .filter(({ field }) => (field.pageId || 'page_1') === activePageId)
              .map(({ field, originalIndex }) => {
                const isActive = activeFieldIndex === originalIndex;
                const isHovered = hoveredFieldIndex === originalIndex;
                const isExpanded = isActive || isHovered;
                const isDragging = draggedIndex === originalIndex;
                const isOver = dragOverIndex === originalIndex;
                const isStructural = ['HEADING', 'DIVIDER', 'PARAGRAPH'].includes(field.type);

                return (
                  <div
                    key={originalIndex}
                    data-field-card
                    draggable
                    onDragStart={() => handleDragStart(originalIndex)}
                    onDragOver={(e) => handleDragOver(e, originalIndex)}
                    onDrop={() => handleDrop(originalIndex)}
                    onDragEnd={handleDragEnd}
                    onMouseEnter={() => setHoveredFieldIndex(originalIndex)}
                    onMouseLeave={() => setHoveredFieldIndex(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFieldIndex(originalIndex);
                    }}
                    className={`relative bg-white dark:bg-zinc-900 rounded-2xl border transition-all duration-200 cursor-pointer group ${
                      isDragging ? 'opacity-40 scale-[0.98]' : ''
                    } ${isOver ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-950' : ''} ${
                      isActive 
                        ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' 
                        : isHovered
                          ? 'border-indigo-300 dark:border-indigo-700/80 shadow-md ring-1 ring-indigo-500/20'
                          : 'border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                    style={isActive ? { borderLeftWidth: '4px', borderLeftColor: accentColor } : isHovered ? { borderLeftWidth: '4px', borderLeftColor: `${accentColor}88` } : {}}
                  >
                    {/* Drag handle – centered horizontally at the top-middle of the field card */}
                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing select-none">
                      <div 
                        className={`p-1 rounded-md text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all ${
                          isExpanded || isDragging ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'
                        }`}
                        title="Drag to reorder field"
                      >
                        <GripHorizontal className="w-5 h-3.5" />
                      </div>
                    </div>

                    <div className="p-5 pt-6">
                      {/* ── HEADING type ─────────────────── */}
                      {field.type === 'HEADING' && (
                        isActive ? (
                          <input
                            value={field.label}
                            onChange={(e) => updateField(originalIndex, 'label', e.target.value)}
                            placeholder="Section heading"
                            className="w-full text-base font-bold text-zinc-900 dark:text-white bg-transparent border-b-2 border-indigo-500 focus:outline-none pb-1"
                            autoFocus
                          />
                        ) : (
                          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">{field.label || 'Section heading'}</h3>
                        )
                      )}

                      {/* ── DIVIDER type ─────────────────── */}
                      {field.type === 'DIVIDER' && <hr className="border-zinc-200 dark:border-zinc-700 my-1" />}

                      {/* ── PARAGRAPH type ───────────────── */}
                      {field.type === 'PARAGRAPH' && (
                        isActive ? (
                          <textarea
                            value={field.label}
                            onChange={(e) => updateField(originalIndex, 'label', e.target.value)}
                            placeholder="Paragraph text..."
                            rows={2}
                            className="w-full text-sm text-zinc-600 dark:text-zinc-400 bg-transparent border-b-2 border-indigo-500 focus:outline-none pb-1 resize-none"
                            autoFocus
                          />
                        ) : (
                          <p className="text-sm text-zinc-500">{field.label || 'Paragraph text...'}</p>
                        )
                      )}

                      {/* ── INPUT field types ────────────── */}
                      {!isStructural && (
                        <div className="space-y-3">
                          {/* Field label – inline editable on click, nice label preview on hover */}
                          {isActive ? (
                            <input
                              value={field.label}
                              onChange={(e) => updateField(originalIndex, 'label', e.target.value)}
                              placeholder="Question"
                              className="w-full text-sm font-semibold text-zinc-900 dark:text-white bg-transparent border-b-2 border-indigo-500 focus:outline-none pb-1 placeholder:text-zinc-300"
                              autoFocus
                            />
                          ) : (
                            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {field.label || <span className="text-zinc-300">Question</span>}
                              {field.required && <span className="text-red-500 ml-0.5">*</span>}
                            </label>
                          )}

                          {/* Field description / guidance */}
                          {isExpanded ? (
                            <input
                              value={field.description || ''}
                              onChange={(e) => updateField(originalIndex, 'description', e.target.value)}
                              placeholder="Add description or guidance for this field (optional)"
                              className="w-full text-xs text-zinc-500 bg-transparent border-b border-zinc-200 dark:border-zinc-700 focus:border-indigo-500 focus:outline-none pb-1 placeholder:text-zinc-300"
                            />
                          ) : (
                            field.description && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">{field.description}</p>
                            )
                          )}

                          {/* Input preview */}
                          {renderFieldPreview(field, originalIndex, isExpanded)}
                        </div>
                      )}

                      {/* ── FIELD TOOLBAR (Type, Page Assignment, Required, Delete) ── */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-3 animate-in fade-in duration-150">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Field type selector */}
                            <div className="w-44">
                              <CustomSelect
                                searchable={false}
                                value={field.type}
                                onChange={(val: any) => {
                                  const actual = val?.target?.value ?? String(val);
                                  updateField(originalIndex, 'type', actual);
                                  if (['SELECT', 'RADIO', 'CHECKBOX'].includes(actual) && (!field.options || !field.options.length)) {
                                    updateField(originalIndex, 'options', ['Option 1', 'Option 2']);
                                  }
                                }}
                                options={FIELD_TYPE_OPTIONS}
                              />
                            </div>

                            {/* Page assignment selector (if multiple pages exist) */}
                            {pages.length > 1 && (
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[11px] text-zinc-400 font-medium">Page:</span>
                                <select
                                  value={field.pageId || 'page_1'}
                                  onChange={(e) => updateField(originalIndex, 'pageId', e.target.value)}
                                  className="text-xs px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 font-semibold"
                                  title="Move question to another page"
                                >
                                  {pages.map((p, pIdx) => (
                                    <option key={p.id} value={p.id}>
                                      Step {pIdx + 1}: {p.title || `Page ${pIdx + 1}`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Required toggle */}
                            {!isStructural && (
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <span className="text-xs font-medium text-zinc-500">Required</span>
                                <div className="relative">
                                  <input type="checkbox" className="sr-only peer" checked={field.required} onChange={(e) => updateField(originalIndex, 'required', e.target.checked)} />
                                  <div className="w-8 h-[18px] bg-gray-200 dark:bg-zinc-700 rounded-full peer-checked:bg-indigo-600 transition-colors" />
                                  <div className="absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full shadow transition-transform peer-checked:translate-x-[14px]" />
                                </div>
                              </label>
                            )}

                            {/* Delete */}
                            <button onClick={(e) => { e.stopPropagation(); removeField(originalIndex); }} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors" title="Delete field">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            {/* ─── ADD FIELD BUTTON ───────────────────────────────────── */}
            <button 
              type="button"
              onClick={() => addField('TEXT')} 
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 rounded-2xl text-sm font-semibold text-indigo-600 dark:text-indigo-400 transition-all shadow-xs"
            >
              <Plus className="h-5 w-5" />
              <span>Add question to {pages.find(p => p.id === activePageId)?.title || 'current step'}</span>
            </button>

            {/* ─── SUBMIT BUTTON PREVIEW ──────────────────────────────── */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex items-center justify-between">
              {pages.length > 1 && (
                <span className="text-xs text-zinc-400 font-medium">
                  Page navigation buttons (Back / Next) will be rendered automatically on multi-step forms.
                </span>
              )}
              <button 
                type="button" 
                disabled 
                className="px-8 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm ml-auto"
                style={{ backgroundColor: accentColor, color: settings.buttonTextColor || '#ffffff' }}
              >
                {settings.submitButtonText || 'Submit Form'}
              </button>
            </div>

            {/* ─── FORM FOOTER CARD ──────────────────────────────────── */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              {/* Footer Image */}
              <div className="relative group">
                {settings.footerImage ? (
                  <div className="relative">
                    <img src={settings.footerImage} alt="Form footer" className="w-full h-32 object-cover" draggable={false} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button onClick={() => footerFileRef.current?.click()} className="px-3 py-1.5 bg-white/90 text-zinc-800 text-xs font-semibold rounded-lg shadow-sm hover:bg-white transition-colors">Change</button>
                      <button onClick={() => setSettings(prev => ({ ...prev, footerImage: '' }))} className="px-3 py-1.5 bg-red-500/90 text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-red-600 transition-colors">Remove</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => footerFileRef.current?.click()} className="w-full py-3 flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors border-b border-zinc-100 dark:border-zinc-800">
                    <ImageIcon className="w-4 h-4" />
                    <span>Add footer image</span>
                  </button>
                )}
                <input ref={footerFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleImageUpload(f, 'footer'); }} />
              </div>

              {/* Footer text */}
              <div className="p-4">
                <input
                  value={settings.footerText || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, footerText: e.target.value }))}
                  placeholder="Footer note (e.g. 'We respect your privacy')"
                  className="w-full text-center text-xs text-zinc-400 bg-transparent focus:outline-none focus:border-b focus:border-indigo-500 placeholder:text-zinc-300"
                />
              </div>
            </div>

          </div>

          {/* ─── RIGHT SIDE DESIGN & THEME PANEL ───────────────────────── */}
          {showDesignPanel && (
            <div data-design-panel className="w-full lg:w-80 xl:w-88 shrink-0 lg:sticky lg:top-6 space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 space-y-5">
                {/* Panel Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">Design & Theme</h3>
                      <p className="text-[10px] text-zinc-400">Live styling for form preview</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowDesignPanel(false)}
                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Collapse Panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Theme / Primary Color */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Theme / Accent Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, buttonColor: color }))}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          settings.buttonColor === color ? 'border-zinc-900 dark:border-white scale-110 ring-2 ring-indigo-500/30' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={settings.buttonColor || '#4f46e5'}
                      onChange={(e) => setSettings(prev => ({ ...prev, buttonColor: e.target.value }))}
                      className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-none p-0"
                      title="Custom color"
                    />
                    <span className="text-[11px] font-mono text-zinc-500 ml-1">{settings.buttonColor}</span>
                  </div>
                </div>

                {/* Submit Button Settings */}
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Submit Button</label>
                  <div className="space-y-2">
                    <input
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={settings.submitButtonText || 'Submit Form'}
                      onChange={(e) => setSettings(prev => ({ ...prev, submitButtonText: e.target.value }))}
                      placeholder="e.g. Place Order, Submit"
                    />
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-zinc-500 text-[11px]">Button Text Color</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, buttonTextColor: '#ffffff' }))}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border ${settings.buttonTextColor === '#ffffff' || !settings.buttonTextColor ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}
                        >
                          White
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, buttonTextColor: '#000000' }))}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border ${settings.buttonTextColor === '#000000' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}
                        >
                          Dark
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner Assets (Header & Footer) */}
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Header & Footer Banners</label>
                  
                  {/* Header Banner Row */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center gap-2 truncate">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="text-zinc-700 dark:text-zinc-300 truncate text-[11px] font-medium">
                          {settings.headerImage ? 'Header Banner' : 'No Header Banner'}
                        </span>
                      </div>
                      {settings.headerImage ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button type="button" onClick={() => headerFileRef.current?.click()} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">Change</button>
                          <span className="text-zinc-300">•</span>
                          <button type="button" onClick={() => setSettings(prev => ({ ...prev, headerImage: '' }))} className="text-[10px] text-red-500 hover:underline font-semibold">Remove</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => headerFileRef.current?.click()} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold shrink-0">Upload</button>
                      )}
                    </div>
                    {settings.headerImage && (
                      <div className="relative h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <img src={settings.headerImage} alt="Header Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Footer Banner Row */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center gap-2 truncate">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="text-zinc-700 dark:text-zinc-300 truncate text-[11px] font-medium">
                          {settings.footerImage ? 'Footer Banner' : 'No Footer Banner'}
                        </span>
                      </div>
                      {settings.footerImage ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button type="button" onClick={() => footerFileRef.current?.click()} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">Change</button>
                          <span className="text-zinc-300">•</span>
                          <button type="button" onClick={() => setSettings(prev => ({ ...prev, footerImage: '' }))} className="text-[10px] text-red-500 hover:underline font-semibold">Remove</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => footerFileRef.current?.click()} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold shrink-0">Upload</button>
                      )}
                    </div>
                    {settings.footerImage && (
                      <div className="relative h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <img src={settings.footerImage} alt="Footer Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Hidden inputs for uploads */}
                  <input ref={headerFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleImageUpload(f, 'header'); }} />
                  <input ref={footerFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleImageUpload(f, 'footer'); }} />
                  <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleImageUpload(f, 'background'); }} />
                </div>

                {/* Page Background Styling */}
                <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Page Background</label>
                  
                  {/* Background Type Toggle */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, backgroundType: 'default' }))}
                      className={`py-1 text-[11px] font-semibold rounded-lg transition-all ${
                        settings.backgroundType === 'default' || !settings.backgroundType
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, backgroundType: 'color' }))}
                      className={`py-1 text-[11px] font-semibold rounded-lg transition-all ${
                        settings.backgroundType === 'color'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      Color
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, backgroundType: 'image' }))}
                      className={`py-1 text-[11px] font-semibold rounded-lg transition-all ${
                        settings.backgroundType === 'image'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      Image
                    </button>
                  </div>

                  {/* Color settings */}
                  {settings.backgroundType === 'color' && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="color"
                        value={settings.backgroundColor || '#f8fafc'}
                        onChange={(e) => setSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-none p-0"
                      />
                      <input
                        type="text"
                        value={settings.backgroundColor || '#f8fafc'}
                        onChange={(e) => setSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                  )}

                  {/* Image settings */}
                  {settings.backgroundType === 'image' && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <span className="text-zinc-600 dark:text-zinc-400 text-[11px] truncate">
                          {settings.backgroundImage ? 'Custom image loaded' : 'No image uploaded'}
                        </span>
                        {settings.backgroundImage ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button type="button" onClick={() => bgFileRef.current?.click()} className="text-[10px] text-indigo-600 hover:underline font-semibold">Change</button>
                            <span className="text-zinc-300">•</span>
                            <button type="button" onClick={() => setSettings(prev => ({ ...prev, backgroundImage: '' }))} className="text-[10px] text-red-500 hover:underline font-semibold">Remove</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => bgFileRef.current?.click()} className="text-[10px] text-indigo-600 hover:underline font-semibold shrink-0">Upload</button>
                        )}
                      </div>
                      {settings.backgroundImage && (
                        <div className="relative h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                          <img src={settings.backgroundImage} alt="Background Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Note / Disclaimer */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Footer Note / Disclaimer</label>
                  <input
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={settings.footerText || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, footerText: e.target.value }))}
                    placeholder="e.g. 🔒 We respect your privacy"
                  />
                </div>

                {/* Post-Submission Experience */}
                <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Post-Submission Experience</label>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-0.5">Success Message</span>
                      <input
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={settings.successMessage || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, successMessage: e.target.value }))}
                        placeholder="e.g. Thanks! We'll be in touch."
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-0.5">Redirect URL (Optional)</span>
                      <input
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={settings.redirectUrl || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, redirectUrl: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 3: DEVELOPER API & SALES ENGINE (Hosted Forms Only)
          ══════════════════════════════════════════════════════════════════════════ */}
      {!isHeadless && activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Sales Activity CRM Card */}
          <div className="bg-gradient-to-br from-amber-500/5 via-transparent to-transparent bg-white dark:bg-zinc-900 rounded-2xl border border-amber-500/30 dark:border-amber-500/20 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl"><Zap className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">Sales Activity & CRM Pipeline Engine <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">Live Kanban Sync</span></h3>
                  <p className="text-xs text-zinc-500">Automatically push form respondents into Deals, tag with Form ID, and assign sales reps.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <input
                  type="checkbox"
                  checked={isHeadless ? (settings.isSalesActivity !== false && settings.salesSettings?.isSalesActivity !== false) : (formType === 'SALES_ACTIVITY')}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (isHeadless) {
                      setSettings(prev => ({
                        ...prev,
                        isSalesActivity: checked,
                        salesSettings: {
                          ...(prev.salesSettings || {}),
                          isSalesActivity: checked
                        }
                      }));
                    } else {
                      setFormType(checked ? 'SALES_ACTIVITY' : 'GENERAL_SURVEY');
                      setSettings(prev => ({
                        ...prev,
                        isSalesActivity: checked,
                        salesSettings: {
                          ...(prev.salesSettings || {}),
                          isSalesActivity: checked
                        }
                      }));
                    }
                  }}
                  className="w-4 h-4 text-amber-600 rounded border-zinc-300 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Enable Sales Activity Engine</span>
              </label>
            </div>
            {(isHeadless ? (settings.isSalesActivity !== false && settings.salesSettings?.isSalesActivity !== false) : (formType === 'SALES_ACTIVITY')) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Target CRM Pipeline Stage</label>
                    <CustomSelect
                      searchable={false}
                      className="w-full text-xs"
                      value={settings.salesSettings?.targetStage || 'Lead'}
                      onChange={(val: any) => {
                        const actual = val?.target?.value ?? String(val);
                        setSettings(prev => ({ ...prev, salesSettings: { ...(prev.salesSettings || {}), targetStage: actual } }));
                      }}
                      options={STAGES}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Default Deal Value ($)</label>
                      <div className="relative">
                        <DollarSign className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                        <input type="number" value={settings.salesSettings?.defaultDealValue ?? ''} onChange={(e) => setSettings(prev => ({ ...prev, salesSettings: { ...(prev.salesSettings || {}), defaultDealValue: Number(e.target.value) || 0 } }))} placeholder="e.g. 2500" className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Assign Sales Rep</label>
                      <CustomSelect
                        searchable={true}
                        className="w-full text-xs"
                        value={settings.salesSettings?.assignedSalesRepId || ''}
                        onChange={(val: any) => {
                          const actual = val?.target?.value ?? String(val);
                          setSettings(prev => ({ ...prev, salesSettings: { ...(prev.salesSettings || {}), assignedSalesRepId: actual } }));
                        }}
                        options={[
                          { label: 'Unassigned (Team Pool)', value: '' },
                          ...users.map(u => ({ label: u.name || u.email, value: u.id }))
                        ]}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input type="checkbox" checked={settings.salesSettings?.autoCreateActivity !== false} onChange={(e) => setSettings(prev => ({ ...prev, salesSettings: { ...(prev.salesSettings || {}), autoCreateActivity: e.target.checked } }))} className="w-4 h-4 text-indigo-600 rounded border-zinc-300" />
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">Auto-create <strong>SalesActivity</strong> note in CRM timeline</span>
                  </label>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-4 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">CRM Kanban Lead Card Preview</span><span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Live Tagging</span></div>
                  <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm space-y-2">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-xs font-bold text-zinc-900 dark:text-white">Alex Morgan - Inbound Lead</span></div><span className="text-xs font-black text-zinc-700 dark:text-zinc-300">${settings.salesSettings?.defaultDealValue?.toLocaleString() || '2,500'}</span></div>
                    <div className="text-[11px] text-zinc-500">Acme Corporation • alex@acme.com</div>
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight"><span>📋</span><span className="truncate">Web Form: {title || 'Inquiry Form'}</span><span className="ml-auto bg-emerald-200/70 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 px-1 rounded text-[9px] font-mono">#{effectiveId}</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic py-2">Sales Activity engine is disabled. Submissions are stored as survey responses.</p>
            )}
          </div>

          {/* API Key */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2"><div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl"><Key className="w-5 h-5" /></div><div><h3 className="text-sm font-bold text-zinc-900 dark:text-white">Form REST API Key</h3><p className="text-xs text-zinc-500">Use this key to fetch submissions from external apps.</p></div></div>
              <button onClick={() => setShowRegenerateConfirm(true)} disabled={isRegeneratingKey} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100 transition-colors">
                {isRegeneratingKey ? (
                  <LogoLoader size={14} className="w-3.5 h-3.5 animate-spin text-amber-700 dark:text-amber-400" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Regenerate</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input readOnly value={apiKey || 'Generating key...'} className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-800 dark:text-zinc-200" />
              <button onClick={() => copyToClipboard(apiKey, 'API Key')} className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"><Copy className="w-3.5 h-3.5" /> Copy</button>
            </div>
          </div>

          {/* Code Snippets */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div><h3 className="text-sm font-bold text-zinc-900 dark:text-white">Developer REST API Docs</h3><p className="text-xs text-zinc-500">Query form leads programmatically.</p></div>
              <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">{(['curl', 'javascript', 'python'] as const).map(lang => (<button key={lang} onClick={() => setCodeLang(lang)} className={`px-3 py-1 text-xs font-medium rounded-md uppercase transition-all ${codeLang === lang ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs font-bold' : 'text-zinc-500'}`}>{lang}</button>))}</div>
            </div>
            <div className="relative bg-zinc-950 rounded-xl p-4 border border-zinc-800 text-xs font-mono text-zinc-200 overflow-x-auto">
              {codeLang === 'curl' && <pre className="leading-relaxed">{`curl -X GET "${process.env.NEXT_PUBLIC_API_URL || 'https://api.180workspace.com'}/api/public/forms/${effectiveId}/api/submissions" \\\n  -H "X-API-Key: ${apiKey || 'fkey_YOUR_API_KEY'}"`}</pre>}
              {codeLang === 'javascript' && <pre className="leading-relaxed">{`const response = await fetch('${process.env.NEXT_PUBLIC_API_URL || 'https://api.180workspace.com'}/api/public/forms/${effectiveId}/api/submissions', {\n  headers: { 'X-API-Key': '${apiKey || 'fkey_YOUR_API_KEY'}' }\n});\nconst data = await response.json();\nconsole.log('Submissions:', data.submissions);`}</pre>}
              {codeLang === 'python' && <pre className="leading-relaxed">{`import requests\n\nurl = "${process.env.NEXT_PUBLIC_API_URL || 'https://api.180workspace.com'}/api/public/forms/${effectiveId}/api/submissions"\nheaders = {"X-API-Key": "${apiKey || 'fkey_YOUR_API_KEY'}"}\n\nresponse = requests.get(url, headers=headers)\nprint(response.json())`}</pre>}
            </div>
          </div>

          {/* Webhook & Tracking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2"><Webhook className="w-5 h-5 text-indigo-600" /><h3 className="text-sm font-bold text-zinc-900 dark:text-white">Outbound Webhook</h3></div>
              <p className="text-xs text-zinc-500">Push real-time lead payloads to Zapier, Make.com, n8n.</p>
              <input className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono" value={settings.webhookUrl || ''} onChange={(e) => setSettings(prev => ({ ...prev, webhookUrl: e.target.value }))} placeholder="https://hooks.zapier.com/hooks/catch/..." />
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /><h3 className="text-sm font-bold text-zinc-900 dark:text-white">Ad Tracking & Redirect</h3></div>
              <div className="space-y-3">
                <div><label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Redirect URL on Submit</label><input className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs" value={settings.redirectUrl || ''} onChange={(e) => setSettings(prev => ({ ...prev, redirectUrl: e.target.value }))} placeholder="https://yourwebsite.com/thank-you" /></div>
                <div><label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Meta Pixel Event Name</label><input className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs" value={settings.pixelEventName || 'Lead'} onChange={(e) => setSettings(prev => ({ ...prev, pixelEventName: e.target.value }))} placeholder="Lead, CompleteRegistration, etc." /></div>
              </div>
            </div>
          </div>

          {/* Embed Codes */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Embed Codes</h3>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">JS Widget (Recommended)</label>
              <div className="flex items-center gap-2"><input readOnly value={jsEmbedCode} className="flex-1 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono" /><button onClick={() => copyToClipboard(jsEmbedCode, 'JS Embed')} className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold rounded-xl">Copy</button></div>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Iframe Embed Code</label>
              <div className="flex items-center gap-2"><input readOnly value={iframeEmbedCode} className="flex-1 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono" /><button onClick={() => copyToClipboard(iframeEmbedCode, 'Iframe Code')} className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold rounded-xl">Copy</button></div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 4: SUBMISSIONS
          ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'submissions' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-3">
            <div className="relative"><Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" /><input type="text" placeholder="Search submissions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64" /></div>
            <button onClick={handleExportCsv} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors"><Download className="w-3.5 h-3.5" /> Export CSV</button>
          </div>
          {filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center space-y-2"><p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No submissions yet</p><p className="text-xs text-zinc-400">Responses will appear here.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider text-[10px] border-b border-zinc-100 dark:border-zinc-800"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Lead Summary</th><th className="px-5 py-3">CRM Sync</th><th className="px-5 py-3">IP</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredSubmissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">{new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-5 py-3.5"><div className="flex flex-col gap-0.5">{sub.values?.slice(0, 2).map((v: any, i: number) => (<span key={i} className="text-xs text-zinc-800 dark:text-zinc-200 font-medium truncate max-w-xs">{v.label || v.field?.label}: {v.value}</span>))}</div></td>
                      <td className="px-5 py-3.5 whitespace-nowrap">{sub.leadId ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/20"><Zap className="w-3 h-3 text-emerald-500" /> Pipeline Deal</span> : <span className="text-zinc-400 text-[11px]">—</span>}</td>
                      <td className="px-5 py-3.5 text-zinc-500 font-mono text-[11px] whitespace-nowrap">{sub.ipAddress || '—'}</td>
                      <td className="px-5 py-3.5 text-right"><button onClick={() => setSelectedSubmission(sub)} className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors">View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div><h3 className="text-base font-bold text-zinc-900 dark:text-white">Submission Details</h3><p className="text-xs text-zinc-400">ID: {selectedSubmission.id}</p></div>
              <button onClick={() => setSelectedSubmission(null)} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                <div><span className="text-zinc-400 block text-[10px] uppercase">Submitted At</span><strong className="text-zinc-700 dark:text-zinc-300">{new Date(selectedSubmission.submittedAt).toLocaleString()}</strong></div>
                <div><span className="text-zinc-400 block text-[10px] uppercase">IP Address</span><strong className="text-zinc-700 dark:text-zinc-300 font-mono">{selectedSubmission.ipAddress || 'N/A'}</strong></div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Submitted Values</h4>
                {selectedSubmission.values?.map((val: any, idx: number) => (
                  <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-1">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase">{val.label || val.field?.label || `Field ${idx + 1}`}</span>
                    {val.fileUrl ? <a href={val.fileUrl} target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold text-indigo-600 hover:underline">📎 {val.fileName || 'Download'}</a> : <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium whitespace-pre-wrap">{val.value || '—'}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end"><button onClick={() => setSelectedSubmission(null)} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold rounded-xl text-zinc-700 dark:text-zinc-200">Close</button></div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showRegenerateConfirm}
        title="Regenerate Form API Key"
        message="Are you sure you want to regenerate this Form API Key? Any external system using the existing key will immediately lose access."
        confirmText="Regenerate Secret Key"
        cancelText="Keep Current Key"
        loading={isRegeneratingKey}
        variant="warning"
        onConfirm={handleConfirmRegenerateKey}
        onCancel={() => setShowRegenerateConfirm(false)}
      />
    </div>
  );
}
