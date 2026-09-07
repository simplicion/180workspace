"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Sparkles, UploadCloud, Plus, Trash2, X, 
  Check, CheckCircle2, AlertCircle, RefreshCw, Layers, 
  Package, Users, Database, ShieldCheck, Tag, ArrowRight,
  FileSpreadsheet, Paperclip, HardDrive, PhoneCall, Info
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlatformModal } from '@workspace/ui';
import clsx from 'clsx';

interface CategoryItem {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

interface UploadedFileItem {
  file: File;
  category: 'general' | 'catalog' | 'customers';
}

export function CreateRagVaultModal({
  isOpen,
  onClose,
  onVaultCreated
}: {
  isOpen: boolean;
  onClose: () => void;
  onVaultCreated?: (vault: any) => void;
}) {
  const [mode, setMode] = useState<'general' | 'business_driven'>('general');
  const [vaultName, setVaultName] = useState('');
  const [purposeDescription, setPurposeDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Uploaded Files State categorized by intent
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const activeUploadCategoryRef = useRef<'general' | 'catalog' | 'customers'>('general');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission & Progress State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/v1/workspace-tools/vaults/meta/categories');
      if (res.data?.categories) {
        setCategories(res.data.categories);
        if (res.data.categories.length > 0 && selectedCategory === 'General') {
          setSelectedCategory(res.data.categories[0].name);
        }
      }
    } catch {
      setCategories([
        { id: '1', name: 'General', color: '#6366f1' },
        { id: '2', name: 'Contracts & Legal', color: '#ec4899' },
        { id: '3', name: 'Offerings & Catalogs', color: '#10b981' },
        { id: '4', name: 'Customer FAQs', color: '#8b5cf6' }
      ]);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await api.post('/api/v1/workspace-tools/vaults/meta/categories', {
        name: newCatName.trim(),
        color: '#8b5cf6'
      });
      if (res.data?.category) {
        setCategories(prev => [...prev, res.data.category]);
        setSelectedCategory(res.data.category.name);
        setNewCatName('');
        setIsCreatingCat(false);
        toast.success(`Category "${newCatName.trim()}" created`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create category');
    }
  };

  const triggerUpload = (category: 'general' | 'catalog' | 'customers') => {
    activeUploadCategoryRef.current = category;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      const cat = activeUploadCategoryRef.current;
      const newItems: UploadedFileItem[] = filesArr.map(file => ({
        file,
        category: cat
      }));
      setUploadedFiles(prev => [...prev, ...newItems]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, category: 'general' | 'catalog' | 'customers') => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const filesArr = Array.from(e.dataTransfer.files);
      const newItems: UploadedFileItem[] = filesArr.map(file => ({
        file,
        category
      }));
      setUploadedFiles(prev => [...prev, ...newItems]);
    }
  };

  const removeFile = (idx: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const totalBytesUploaded = uploadedFiles.reduce((acc, item) => acc + item.file.size, 0);
  const MAX_BYTES = 50 * 1024 * 1024; // 50MB
  const usedPercent = Math.min(100, Math.round((totalBytesUploaded / MAX_BYTES) * 100));

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultName.trim()) {
      toast.error('Please provide a name for this RAG Memory Vault');
      return;
    }

    if (totalBytesUploaded > MAX_BYTES) {
      toast.error('Total files exceed the 50MB limit per vault');
      return;
    }

    setIsSubmitting(true);
    setProgressPercent(15);

    try {
      const formData = new FormData();
      formData.append('name', vaultName.trim());
      formData.append('purposeDescription', purposeDescription.trim());
      formData.append('mode', mode);
      formData.append('category', selectedCategory);
      formData.append('visibility', 'public_voice');

      // Append all uploaded files
      uploadedFiles.forEach(item => {
        formData.append('files', item.file);
      });

      // Pass file categories metadata
      formData.append('fileMetadata', JSON.stringify(uploadedFiles.map(item => ({
        name: item.file.name,
        category: item.category,
        size: item.file.size
      }))));

      // Simulated progressive percentage bar
      const pTimer = setInterval(() => {
        setProgressPercent(prev => (prev < 85 ? prev + 20 : prev));
      }, 400);

      const res = await api.post('/api/v1/workspace-tools/vaults', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(pTimer);
      setProgressPercent(100);

      toast.success(res.data?.message || `Vault "${vaultName}" created & indexed!`);
      if (onVaultCreated) onVaultCreated(res.data?.vault);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create RAG vault');
    } finally {
      setIsSubmitting(false);
      setProgressPercent(0);
    }
  };

  return (
    <PlatformModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create RAG Memory Vault"
      icon={Database}
      iconBgClass="bg-indigo-500/10 text-indigo-500"
      iconColorClass="text-indigo-600 dark:text-indigo-400"
      maxWidthClass="max-w-3xl"
      bodyClassName="space-y-5"
      subHeader={
        <div className="px-6 pb-4 pt-1 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Build custom 50MB vector memory collections for AI Voice Employees & Orbit Copilot.
          </p>

          {/* Universal Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <button
              type="button"
              onClick={() => setMode('general')}
              className={clsx(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                mode === 'general'
                  ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-gray-200/60 dark:border-gray-700"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Mode 1: General Knowledge Vault</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('business_driven')}
              className={clsx(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                mode === 'business_driven'
                  ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-xs border border-gray-200/60 dark:border-gray-700"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mode 2: Business-Driven Vault</span>
            </button>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          {/* Capacity Usage Indicator */}
          <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
            <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              <b>{formatBytes(totalBytesUploaded)}</b> / 50MB ({usedPercent}%)
            </span>
            <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ml-1">
              <div 
                className={clsx("h-full transition-all", usedPercent > 90 ? "bg-rose-500" : "bg-indigo-600")}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !vaultName.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Indexing ({progressPercent}%)...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Create Vault</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      {/* Hidden Multi-Type File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Vault Meta Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
            Vault Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Acme Tech Support, Pricing & Customer History"
            value={vaultName}
            onChange={(e) => setVaultName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Category Tag
            </label>
            {!isCreatingCat && (
              <button
                type="button"
                onClick={() => setIsCreatingCat(true)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> New Tag
              </button>
            )}
          </div>

          {isCreatingCat ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New Category Tag..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingCat(false)}
                className="px-2 py-2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Purpose / Scope Directive */}
      <div>
        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
          Agent Operational Mission & Context
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Handle customer repair inquiries, quote diagnostic prices, and recognize returning clients by phone number to recall their previous service logs."
          value={purposeDescription}
          onChange={(e) => setPurposeDescription(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Mode-Specific Direct Document Upload Options (No manual line-by-line entry) */}
      {mode === 'business_driven' ? (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
              <b>Fast Automated Ingestion:</b> Upload your catalogs and customer spreadsheets directly. The RAG vector engine automatically chunks records and matches incoming caller phone numbers against past interaction notes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Upload 1: Offerings & Pricing Catalog */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 'catalog')}
              className="p-4 rounded-2xl border-2 border-dashed border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/20 hover:border-purple-400 transition-all flex flex-col justify-between gap-3 text-left"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Package className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                    Products & Pricing Catalog
                  </h4>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Upload CSV, Excel, PDF, JSON, or TXT pricing sheets. AI Voice Employees quote these exact rates.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerUpload('catalog')}
                className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Catalog File</span>
              </button>
            </div>

            {/* Upload 2: Customer Directory & Caller-ID History */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 'customers')}
              className="p-4 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-emerald-400 transition-all flex flex-col justify-between gap-3 text-left"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                    Customer Records & Interaction History
                  </h4>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Upload CSV, Excel, vCard, or TXT with names, phone numbers, & past notes for automatic caller recognition.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerUpload('customers')}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Customer Records</span>
              </button>
            </div>
          </div>

          {/* Upload 3: Extra Knowledge Documents */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'general')}
            className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between gap-4 flex-wrap"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  Extra Knowledge Documents & SOPs
                </h4>
                <p className="text-[11px] text-gray-400">
                  Attach warranty terms, technical manuals, or company policies (PDF, DOCX, MD).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => triggerUpload('general')}
              className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
              <span>Attach Documents</span>
            </button>
          </div>
        </div>
      ) : (
        /* Mode 1: General Knowledge Vault Dropzone */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'general')}
          className="p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-center space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white">
              Drop documents here or click to browse
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Supports PDF manuals, technical specs, warranty policies, CSV tables, Word (.docx), and Markdown (up to 50MB).
            </p>
          </div>
          <button
            type="button"
            onClick={() => triggerUpload('general')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Select Files</span>
          </button>
        </div>
      )}

      {/* Selected Files List Display */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
            <span>Attached Files ({uploadedFiles.length})</span>
            <span className="text-[11px] text-gray-400 font-normal">
              Ready for 1536d FastPath vector indexing
            </span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {uploadedFiles.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-850 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {item.category === 'catalog' ? (
                    <Package className="w-4 h-4 text-purple-500 shrink-0" />
                  ) : item.category === 'customers' ? (
                    <PhoneCall className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                  )}

                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {item.file.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span>{formatBytes(item.file.size)}</span>
                      <span>•</span>
                      <span className={clsx(
                        "font-bold uppercase tracking-wider",
                        item.category === 'catalog' ? "text-purple-500" :
                        item.category === 'customers' ? "text-emerald-500" : "text-indigo-500"
                      )}>
                        {item.category === 'catalog' ? 'Catalog & Pricing' :
                         item.category === 'customers' ? 'Customer Records' : 'Knowledge Doc'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-1 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </PlatformModal>
  );
}
