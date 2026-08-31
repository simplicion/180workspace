'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Bot, FileText, User, Building, X, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { setBlocks, setDocumentDetails } from '@/redux/slices/documentSlice';

interface CreateWithAIModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DOCUMENT_PRESETS = [
    { type: 'INVOICE', label: 'Tax Invoice / Bill', icon: '💳', prompt: 'Create a professional tax invoice for web development services with 18% GST and 15-day payment terms.' },
    { type: 'QUOTATION', label: 'Commercial Proposal & Quote', icon: '📄', prompt: 'Create a comprehensive digital transformation proposal with milestone breakdown and client sign-off.' },
    { type: 'WARNING_LETTER', label: 'Disciplinary Warning Notice', icon: '⚠️', prompt: 'Create an official employee performance warning letter regarding missed sprint deadlines with a 30-day review period.' },
    { type: 'OFFER_LETTER', label: 'Full-Time Offer Letter', icon: '🎉', prompt: 'Create a formal software engineer job offer letter with CTC compensation structure, benefits, and start date.' },
    { type: 'NDA', label: 'Mutual Non-Disclosure Agreement', icon: '🔒', prompt: 'Create a bilateral NDA protecting proprietary code, customer lists, and financial information.' },
    { type: 'COMPANY_POLICY', label: 'Remote Work & Security Policy', icon: '📋', prompt: 'Create a remote work and information security policy covering VPN usage and hardware protection.' },
];

export default function CreateWithAIModal({ isOpen, onClose }: CreateWithAIModalProps) {
    const router = useRouter();
    const dispatch = useDispatch();

    const [prompt, setPrompt] = useState('');
    const [documentType, setDocumentType] = useState('INVOICE');
    const [clientId, setClientId] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [clients, setClients] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        // Fetch clients
        api.get('/api/clients').then(res => {
            setClients(res.data.clients || res.data || []);
        }).catch(() => {});

        // Fetch employees
        api.get('/api/users').then(res => {
            setEmployees(res.data.users || res.data || []);
        }).catch(() => {});
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSelectPreset = (preset: typeof DOCUMENT_PRESETS[0]) => {
        setDocumentType(preset.type);
        setPrompt(preset.prompt);
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) {
            toast.error('Please enter a description or prompt for the AI');
            return;
        }

        try {
            setIsGenerating(true);
            const response = await api.post('/api/180documents/generate-ai', {
                prompt,
                documentType,
                clientId: clientId || undefined,
                employeeId: employeeId || undefined
            });

            if (response.data && response.data.success) {
                toast.success('Document drafted with AI!');
                const { blocks, documentDetails, title, designSettings } = response.data;

                // Create the draft document in backend
                const createRes = await api.post('/api/180documents', {
                    title: title || 'AI Generated Document',
                    name: title || 'AI Generated Document',
                    documentType,
                    blocks,
                    clientId: clientId || null,
                    employeeId: employeeId || null,
                    subtotal: documentDetails?.subtotal || 0,
                    grandTotal: Number(documentDetails?.grandTotal || 0),
                    designSettings
                });

                const createdId = createRes.data?.document?.id || createRes.data?.article?.id || createRes.data?.data?.id;

                if (createdId) {
                    onClose();
                    router.push(`/document-editor?id=${createdId}`);
                } else {
                    // Fallback to local Redux state
                    if (blocks) dispatch(setBlocks(blocks));
                    if (documentDetails) dispatch(setDocumentDetails(documentDetails));
                    onClose();
                    router.push('/document-editor');
                }
            } else {
                toast.error('Failed to generate document');
            }
        } catch (err: any) {
            console.error('AI Generation error:', err);
            toast.error(err.response?.data?.message || 'Error generating document with AI');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Create with AI
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    Smart Agent
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Describe any document, invoice, or agreement in plain English</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleGenerate} className="p-6 overflow-y-auto space-y-5">
                    {/* Prompt Presets */}
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                            Quick Templates & Presets
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {DOCUMENT_PRESETS.map(preset => (
                                <button
                                    key={preset.type}
                                    type="button"
                                    onClick={() => handleSelectPreset(preset)}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                                        documentType === preset.type
                                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
                                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <span className="text-base">{preset.icon}</span>
                                    <span className="truncate">{preset.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Natural Language Prompt */}
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                            <span>Your Instructions / Context</span>
                            <span className="text-xs font-normal text-slate-400">Be as specific as you like</span>
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={4}
                            placeholder="e.g. Create a milestone invoice for $5,000 for building a Next.js app for Acme Corp with 18% GST and Net 15 days payment terms..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                        />
                    </div>

                    {/* Metadata Context Linkages */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-indigo-500" />
                                Target Client (Optional)
                            </label>
                            <select
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                                <option value="">-- No Client Linked --</option>
                                {clients.map((c: any) => (
                                    <option key={c.id || c._id} value={c.id || c._id}>
                                        {c.name || c.companyName} ({c.email || 'No email'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-purple-500" />
                                Target Employee (Optional)
                            </label>
                            <select
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                                <option value="">-- No Employee Linked --</option>
                                {employees.map((u: any) => (
                                    <option key={u.id || u._id} value={u.id || u._id}>
                                        {u.name} ({u.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isGenerating}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isGenerating || !prompt.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Generating Document...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    <span>Generate Document</span>
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
