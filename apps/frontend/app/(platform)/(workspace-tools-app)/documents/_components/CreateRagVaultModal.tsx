"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  FileText, Sparkles, UploadCloud, Plus, Trash2, X, 
  Check, CheckCircle2, AlertCircle, RefreshCw, Layers, 
  Package, Users, Database, ShieldCheck, Tag, ArrowRight
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { locationService } from '@/lib/location-service';
import clsx from 'clsx';

interface CategoryItem {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

interface OfferingItem {
  name: string;
  startingPrice: string;
  description: string;
  inStock: boolean;
}

interface CustomerItem {
  name: string;
  phone: string;
  status: string;
  lastOutcome: string;
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
  const { company } = useAuth();
  const currencyCode = (company?.currency || 'USD').toUpperCase();
  const currencySymbol = company?.currencySymbol || locationService.getCurrencySymbol(currencyCode);

  const [mode, setMode] = useState<'general' | 'business_driven'>('general');
  const [vaultName, setVaultName] = useState('');
  const [purposeDescription, setPurposeDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Uploaded Files State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mode 2: Business-Driven Structured Fields
  const [offerings, setOfferings] = useState<OfferingItem[]>([
    { name: 'Standard Consultation', startingPrice: '99', description: 'Initial 45-minute assessment and diagnosis', inStock: true }
  ]);
  const [customers, setCustomers] = useState<CustomerItem[]>([
    { name: 'John Doe', phone: '+1 (555) 019-2834', status: 'Active VIP', lastOutcome: 'Requested service proposal' }
  ]);

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
      // Fallback categories
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArr]);
    }
  };

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const addOfferingRow = () => {
    setOfferings(prev => [
      ...prev,
      { name: '', startingPrice: '', description: '', inStock: true }
    ]);
  };

  const updateOffering = (idx: number, field: keyof OfferingItem, val: any) => {
    setOfferings(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const removeOffering = (idx: number) => {
    setOfferings(prev => prev.filter((_, i) => i !== idx));
  };

  const addCustomerRow = () => {
    setCustomers(prev => [
      ...prev,
      { name: '', phone: '', status: 'Lead', lastOutcome: '' }
    ]);
  };

  const updateCustomer = (idx: number, field: keyof CustomerItem, val: any) => {
    setCustomers(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const removeCustomer = (idx: number) => {
    setCustomers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultName.trim()) {
      toast.error('Please provide a name for this RAG Memory Vault');
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

      if (mode === 'business_driven') {
        formData.append('offeringsData', JSON.stringify(offerings.filter(o => o.name.trim())));
        formData.append('customerData', JSON.stringify(customers.filter(c => c.name.trim() || c.phone.trim())));
      }

      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
        
        {/* Header with Mode Switcher */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-indigo-900/30 via-purple-900/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Create RAG Memory Vault
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Build custom 5GB vector memory collections for AI Voice Employees & Orbit Copilot.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 mt-5 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
            <button
              type="button"
              onClick={() => setMode('general')}
              className={clsx(
                "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                mode === 'general'
                  ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-200/60 dark:border-gray-700"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <FileText className="w-4 h-4" />
              <span>Mode 1: General Knowledge Vault</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('business_driven')}
              className={clsx(
                "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                mode === 'business_driven'
                  ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-sm border border-gray-200/60 dark:border-gray-700"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Mode 2: Business-Driven Vault</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Progress Indicator */}
          {isSubmitting && (
            <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  Generating Sliding Chunks & 1536-dim Vector Embeddings...
                </span>
                <span className="text-indigo-300 font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Vault Name *
              </label>
              <input
                type="text"
                required
                placeholder={mode === 'general' ? "e.g. Legal Contracts & SLAs" : "e.g. Auto Repair Customer Desk Vault"}
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Dynamic Custom Category Selector */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Dynamic Category Tag (Zero Hardcoding)
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCreatingCat(!isCreatingCat)}
                  className="px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-all cursor-pointer shrink-0"
                  title="Create custom category"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Inline Custom Category Creator */}
              {isCreatingCat && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="New category name (e.g. Warranty Policies)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-indigo-500/50 text-xs text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Purpose & Context Directive */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
              {mode === 'general' ? 'Purpose & Semantic Context Description' : 'Agent Operational Mission & Conversational Context'}
            </label>
            <textarea
              rows={2}
              placeholder={
                mode === 'general' 
                  ? "e.g. Authoritative source for legal SLAs, payment dispute resolutions, and vendor compliance terms."
                  : "e.g. Handle customer repair inquiries, quote diagnostic prices, and confirm appointment slots."
              }
              value={purposeDescription}
              onChange={(e) => setPurposeDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white leading-relaxed focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* ─── MODE 2 SPECIFIC: Offerings & Customers ────────────────────── */}
          {mode === 'business_driven' && (
            <div className="space-y-6 pt-2 border-t border-gray-100 dark:border-gray-800">
              
              {/* Offerings & Services Catalog */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-indigo-500" />
                      1. Offerings & Services Catalog
                    </h4>
                    <p className="text-[11px] text-gray-400">Strict authoritative pricing and deliverables for phone agents.</p>
                  </div>

                  <button
                    type="button"
                    onClick={addOfferingRow}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {offerings.map((off, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60">
                      <input
                        type="text"
                        placeholder="Offering / Service Name"
                        value={off.name}
                        onChange={(e) => updateOffering(idx, 'name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder={`Price (${currencySymbol})`}
                        value={off.startingPrice}
                        onChange={(e) => updateOffering(idx, 'startingPrice', e.target.value)}
                        className="w-24 px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Description & Scope"
                        value={off.description}
                        onChange={(e) => updateOffering(idx, 'description', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeOffering(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer List & CRM Directory */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-500" />
                      2. Existing Customer List & CRM Directory
                    </h4>
                    <p className="text-[11px] text-gray-400">Caller-ID recognition memory for active clients and VIPs.</p>
                  </div>

                  <button
                    type="button"
                    onClick={addCustomerRow}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Client
                  </button>
                </div>

                <div className="space-y-2">
                  {customers.map((c, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60">
                      <input
                        type="text"
                        placeholder="Customer Name"
                        value={c.name}
                        onChange={(e) => updateCustomer(idx, 'name', e.target.value)}
                        className="w-36 px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Phone Number (+1...)"
                        value={c.phone}
                        onChange={(e) => updateCustomer(idx, 'phone', e.target.value)}
                        className="w-36 px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Status / VIP / Past Call Notes"
                        value={c.lastOutcome}
                        onChange={(e) => updateCustomer(idx, 'lastOutcome', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomer(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Document Dropzone */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                {mode === 'general' ? 'Upload Documents for this Vault' : '3. Extra Knowledge Documents (PDF, DOCX, CSV, TXT, MD)'}
              </label>
              <span className="text-[11px] text-gray-400">Up to 5GB vector capacity</span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-500 rounded-2xl text-center cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
            >
              <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 mx-auto mb-1.5 transition-all" />
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Click or drag & drop files to attach to this RAG Vault
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                PDF manuals, warranty policies, hardware specs, CSV price tables
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.csv,.json,.md"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Selected Files Chips */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="font-semibold truncate max-w-[200px]">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-gray-400 hover:text-red-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isSubmitting ? 'Indexing Vault Chunks...' : 'Create & Index Vault'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
