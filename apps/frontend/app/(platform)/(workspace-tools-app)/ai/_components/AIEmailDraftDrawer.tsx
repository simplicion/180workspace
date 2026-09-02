'use client';

import { useState } from 'react';
import { Mail, Sparkles, Send, Copy, Check, X, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AIEmailDraftDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    recipientName?: string;
    recipientEmail?: string;
    dealValue?: string;
    defaultPurpose?: string;
    onInsertDraft?: (subject: string, body: string) => void;
}

export function AIEmailDraftDrawer({
    isOpen,
    onClose,
    recipientName = '',
    recipientEmail = '',
    dealValue = '',
    defaultPurpose = '',
    onInsertDraft
}: AIEmailDraftDrawerProps) {
    const [name, setName] = useState(recipientName);
    const [email, setEmail] = useState(recipientEmail);
    const [purpose, setPurpose] = useState(defaultPurpose || 'Follow up on proposal discussion');
    const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!purpose.trim()) {
            toast.error('Please specify the email purpose.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/api/v1/ai/crm/email-draft', {
                recipientName: name || 'Valued Client',
                recipientEmail: email,
                dealValue,
                purpose
            });

            if (res.data && res.data.success) {
                setDraft(res.data.draft);
                toast.success('Email draft synthesized!');
            } else {
                throw new Error(res.data?.message || 'Failed to generate draft.');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error generating email draft.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!draft) return;
        const text = `Subject: ${draft.subject}\n\n${draft.body}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Mail className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900">AI Sales & Proposal Drafter</h3>
                            <p className="text-xs text-slate-500">Synthesize context-aware emails with 180 Workspace AI</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Inputs */}
                <div className="space-y-4 my-6">
                    <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Recipient Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Sarah Jenkins"
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Email Purpose / Goal</label>
                        <textarea
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            rows={3}
                            placeholder="e.g. Follow up on the Q3 SLA proposal and propose a 15-minute alignment call"
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
                    >
                        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>{loading ? 'Synthesizing Draft...' : 'Generate AI Email Draft'}</span>
                    </button>
                </div>

                {/* Generated Draft Output */}
                {draft && (
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                            <span className="text-xs font-bold text-slate-700">Synthesized Email</span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={copyToClipboard}
                                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 text-xs flex items-center gap-1"
                                >
                                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                                {onInsertDraft && (
                                    <button
                                        onClick={() => onInsertDraft(draft.subject, draft.body)}
                                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-[10px] font-semibold flex items-center gap-1"
                                    >
                                        <Send className="w-3 h-3" />
                                        <span>Use Draft</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Subject</span>
                            <p className="text-xs font-semibold text-slate-900">{draft.subject}</p>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Body</span>
                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{draft.body}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
