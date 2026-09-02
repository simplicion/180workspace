"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, FileText, BarChart, Trash2, Edit, ExternalLink, X, 
  Copy, Download, TrendingUp, Eye, Check, Sparkles, Layers, Zap, Tag, Clock
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal, LogoLoader } from "@workspace/ui";

export default function FormsListPage() {
  const router = useRouter();
  const [forms, setForms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Form / Capture Data Modal
  const [createModalMode, setCreateModalMode] = useState<'FORM' | 'CAPTURE' | null>(null);
  const [newCaptureMode, setNewCaptureMode] = useState<'SALES' | 'GENERAL'>('SALES');
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');
  const [newFormType, setNewFormType] = useState<'GENERAL_SURVEY' | 'SALES_ACTIVITY' | 'HEADLESS_ENDPOINT'>('SALES_ACTIVITY');
  const [isCreating, setIsCreating] = useState(false);

  // Universal Delete Modal State
  const [deleteFormTarget, setDeleteFormTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchForms = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const response = await api.get('/api/forms');
      setForms(response.data.data.forms || []);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
      toast.error('Failed to load forms');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleCreateForm = async () => {
    if (!newFormTitle.trim()) {
      toast.error('Please provide a title or name');
      return;
    }
    
    setIsCreating(true);
    try {
      const isHeadless = createModalMode === 'CAPTURE';
      const isSales = isHeadless ? (newCaptureMode === 'SALES') : (newFormType === 'SALES_ACTIVITY');
      const effectiveType = isHeadless ? 'HEADLESS_ENDPOINT' : newFormType;

      const starterFields = isHeadless ? [] : [
        { label: 'Full Name', type: 'TEXT', required: true, placeholder: 'Jane Doe', mapping: 'name' },
        { label: 'Work Email', type: 'EMAIL', required: true, placeholder: 'jane@company.com', mapping: 'email' },
        { label: 'Phone Number', type: 'PHONE', required: isSales ? true : false, placeholder: '+1 (555) 000-0000', mapping: 'phone' },
        { label: 'Company Name', type: 'TEXT', required: false, placeholder: 'Acme Inc.', mapping: 'company' },
        { label: 'Estimated Budget ($)', type: 'NUMBER', required: false, placeholder: '5000', mapping: 'budget' },
        { label: 'Project Details / Inquiry', type: 'TEXTAREA', required: false, placeholder: 'How can we help your business?' }
      ];

      const response = await api.post('/api/forms', {
        title: newFormTitle.trim(),
        description: newFormDescription.trim(),
        formType: effectiveType,
        settings: {
          isHeadless,
          isSalesActivity: isSales,
          salesSettings: {
            isSalesActivity: isSales,
            targetStage: 'Lead',
            defaultDealValue: isSales ? 2500 : 0,
            autoCreateActivity: isSales
          }
        },
        fields: starterFields
      });
      
      const newForm = response.data.data.form;
      setForms(prev => [newForm, ...prev.filter(f => f.id !== newForm.id)]);
      setCreateModalMode(null);
      setNewFormTitle('');
      setNewFormDescription('');
      setIsCreating(false);
      toast.success(isHeadless ? 'Website Data Capture link created!' : 'Form created successfully!');
      fetchForms(false);
    } catch (error) {
      console.error('Failed to create form:', error);
      toast.error('Failed to create form');
      setIsCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteFormTarget) return;
    
    const idToDelete = deleteFormTarget.id;
    setForms(prev => prev.filter(f => f.id !== idToDelete));
    setDeleteFormTarget(null);
    setIsDeleting(true);
    try {
      await api.delete(`/api/forms/${idToDelete}`);
      toast.success('Form deleted successfully');
    } catch (error) {
      console.error('Failed to delete form:', error);
      toast.error('Failed to delete form');
      fetchForms(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleExportCsv = (formId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/forms/${formId}/export/csv`;
    window.open(downloadUrl, '_blank');
    toast.success('Downloading submissions CSV...');
  };

  const filteredForms = forms.filter(form => 
    form.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (form.description && form.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (form.formCode && form.formCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      {/* Top Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Form Builder</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-500/20">
              Enterprise Lead & Survey Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Build high-converting forms with live CRM lead routing, Form ID attribution tags, and REST API access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setNewFormType('HEADLESS_ENDPOINT');
              setNewFormTitle('');
              setNewFormDescription('');
              setCreateModalMode('CAPTURE');
            }} 
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all shadow-xs"
          >
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span>Capture Website Form Data</span>
          </button>

          <button 
            onClick={() => {
              setNewFormType('SALES_ACTIVITY');
              setNewFormTitle('');
              setNewFormDescription('');
              setCreateModalMode('FORM');
            }} 
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Form</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search forms by title, description, or FORM-ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        <div className="text-xs text-zinc-500">
          Showing <strong>{filteredForms.length}</strong> of {forms.length} forms
        </div>
      </div>

      {/* Forms Grid or Universal Loader */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 py-16">
          <LogoLoader size={48} className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Loading forms...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No forms created yet</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Create a hosted visual form or connect your external website form to capture leads automatically.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setNewFormType('HEADLESS_ENDPOINT');
                setNewFormTitle('');
                setNewFormDescription('');
                setCreateModalMode('CAPTURE');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-colors border border-zinc-200 dark:border-zinc-700 shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" /> Capture Website Form Data
            </button>
            <button
              onClick={() => {
                setNewFormType('SALES_ACTIVITY');
                setNewFormTitle('');
                setNewFormDescription('');
                setCreateModalMode('FORM');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create New Form
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form) => {
            const effectiveCode = form.formCode || form.slug;
            const isHeadless = form.formType === 'HEADLESS_ENDPOINT' || form.settings?.isHeadless;
            const isSales = form.formType === 'SALES_ACTIVITY' || form.settings?.isSalesActivity;
            const captureUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/public/capture/${effectiveCode}` : `/api/public/capture/${effectiveCode}`;
            const publicUrl = isHeadless ? captureUrl : (typeof window !== 'undefined' ? `${window.location.origin}/f/${effectiveCode}` : `/f/${effectiveCode}`);
            const submissionsCount = form._count?.submissions || 0;
            const viewsCount = form.viewsCount || 0;
            const cvr = viewsCount > 0 ? ((submissionsCount / viewsCount) * 100).toFixed(1) : (submissionsCount > 0 ? '100' : '0.0');

            return (
              <div 
                key={form.id} 
                onClick={() => router.push(`/forms/${form.id}`)}
                className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer group"
              >
                {/* Card Header & Body */}
                <div className="p-5 pb-4 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        form.isActive 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-500/20' 
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                      }`}>
                        {form.isActive ? 'Live' : 'Draft'}
                      </span>

                      {/* Form Type Badge */}
                      {isHeadless ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isSales
                            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-500/30'
                            : 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-500/30'
                        }`}>
                          {isSales ? <Zap className="w-2.5 h-2.5 text-amber-500" /> : <FileText className="w-2.5 h-2.5 text-blue-500" />}
                          <span>{isSales ? 'Sales Form' : 'Form'}</span>
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isSales 
                            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-500/30' 
                            : 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-500/30'
                        }`}>
                          {isSales ? <Zap className="w-2.5 h-2.5 text-amber-500" /> : <FileText className="w-2.5 h-2.5 text-blue-500" />}
                          <span>{isSales ? 'Sales Form' : 'Form'}</span>
                        </span>
                      )}

                      {/* Form Code */}
                      {effectiveCode && (
                        <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
                          #{effectiveCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <a 
                        href={isHeadless ? '#' : `/f/${effectiveCode}`} 
                        target={isHeadless ? '_self' : '_blank'} 
                        rel="noopener noreferrer" 
                        onClick={(e) => {
                          if (isHeadless) {
                            e.stopPropagation();
                            e.preventDefault();
                            copyToClipboard(captureUrl, 'Submission URL', e);
                          } else {
                            e.stopPropagation();
                          }
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title={isHeadless ? "Copy Submission URL" : "Open Public Link"}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button 
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteFormTarget(form);
                        }}
                        title="Delete Form"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={form.title}>
                      {form.title}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[32px]">
                      {form.description || (isHeadless ? 'Captures incoming leads and submissions from your external website.' : 'Hosted visual form ready for sharing or website embedding.')}
                    </p>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    {/* Metric 1: Submissions */}
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Download className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold truncate">Submissions</div>
                        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{submissionsCount}</div>
                      </div>
                    </div>

                    {/* Metric 2: CRM Leads or Fields */}
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isSales ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                      }`}>
                        {isSales ? <Zap className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold truncate">{isSales ? 'CRM Leads' : 'Fields'}</div>
                        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{isSales ? `${submissionsCount} Deals` : `${form.fields?.length || 0} Fields`}</div>
                      </div>
                    </div>

                    {/* Metric 3: Views */}
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                      <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold truncate">Views</div>
                        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{viewsCount}</div>
                      </div>
                    </div>

                    {/* Metric 4: Conversion Rate (CVR) */}
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold truncate">CVR %</div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{cvr}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Analytics & Action Footer */}
                <div className="px-5 py-3 bg-zinc-50/90 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Clock className="w-3 h-3" />
                    <span>{form.updatedAt ? new Date(form.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {submissionsCount > 0 && (
                      <button
                        onClick={(e) => handleExportCsv(form.id, e)}
                        className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 rounded-lg transition-colors"
                        title="Export submissions as CSV"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(isHeadless ? captureUrl : publicUrl, isHeadless ? 'Submission URL' : 'Form link', e);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 rounded-lg transition-colors"
                      title={isHeadless ? "Copy Submission URL" : "Copy Form link"}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>

                    {/* Direct Edit Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/forms/${form.id}`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl transition-all shadow-2xs active:scale-95"
                      title="Open Form Studio"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── DEDICATED MODAL 1: CAPTURE WEBSITE FORM DATA ─── */}
      {createModalMode === 'CAPTURE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Capture Website Form Data
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Connect your existing website, Webflow, WordPress, Framer, or custom app form.
                  </p>
                </div>
              </div>
              <button onClick={() => setCreateModalMode(null)} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Form or Website Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Website Contact Form (or Landing Page Leads)"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newFormTitle}
                  onChange={(e) => setNewFormTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Website URL / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Embedded on acme.com/contact or my landing page..."
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={newFormDescription}
                  onChange={(e) => setNewFormDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Capture Purpose & Pipeline Routing</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewCaptureMode('SALES')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newCaptureMode === 'SALES'
                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs mb-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Sales Lead Capture</span>
                    </div>
                    <p className="text-[10px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
                      Auto-route website leads into your live CRM Deal & Lead pipeline.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewCaptureMode('GENERAL')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newCaptureMode === 'GENERAL'
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs mb-1">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>General Data Capture</span>
                    </div>
                    <p className="text-[10px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
                      Collect website submissions & CSV export without CRM Deals.
                    </p>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Zero Configuration Required
                </p>
                <p className="text-indigo-700/80 dark:text-indigo-300/80">
                  {newCaptureMode === 'SALES'
                    ? 'When visitors submit your website form, 180workspace automatically discovers all fields and routes leads directly into your CRM pipeline.'
                    : 'When visitors submit your website form, 180workspace automatically discovers all fields and stores submissions for CSV export and viewing.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setCreateModalMode(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateForm}
                disabled={isCreating}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-500/20 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Start Capturing Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DEDICATED MODAL 2: CREATE NEW HOSTED FORM ─── */}
      {createModalMode === 'FORM' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Create New Form
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Build a hosted visual form with drag-and-drop fields or website embed.
                  </p>
                </div>
              </div>
              <button onClick={() => setCreateModalMode(null)} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 py-1">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Form Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Discovery Call Booking"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newFormTitle}
                  onChange={(e) => setNewFormTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Form Type & Purpose</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewFormType('SALES_ACTIVITY')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newFormType === 'SALES_ACTIVITY'
                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs mb-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Sales Form</span>
                    </div>
                    <p className="text-[10px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
                      Visual form with live CRM Deal & Lead pipeline sync.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewFormType('GENERAL_SURVEY')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newFormType === 'GENERAL_SURVEY'
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs mb-1">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>Form</span>
                    </div>
                    <p className="text-[10px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
                      Collect responses & CSV export without CRM.
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Tell visitors what this form is for..."
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={newFormDescription}
                  onChange={(e) => setNewFormDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setCreateModalMode(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateForm}
                disabled={isCreating}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteFormTarget}
        title="Delete Form"
        message={`Are you sure you want to delete "${deleteFormTarget?.title}"? All submitted responses and tracking data will be permanently removed.`}
        confirmText="Delete Form"
        cancelText="Cancel"
        loading={isDeleting}
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteFormTarget(null)}
      />
    </div>
  );
}
