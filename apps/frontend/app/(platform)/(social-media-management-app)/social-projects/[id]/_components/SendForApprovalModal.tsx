'use client';

import React, { useState } from 'react';
import { X, Send, ShieldCheck, Calendar, Clock, Copy, Check } from 'lucide-react';
import api from '@/lib/api';
import { SocialProject } from '@/lib/services/social-project.service';
import toast from 'react-hot-toast';

interface SendForApprovalModalProps {
    project: SocialProject;
    onClose: () => void;
    onCreated: () => void;
}

export const SendForApprovalModal: React.FC<SendForApprovalModalProps> = ({
    project,
    onClose,
    onCreated
}) => {
    const [name, setName] = useState(`${project.name} – Weekly Review`);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const [endDate, setEndDate] = useState(nextWeek.toISOString().split('T')[0]);
    const [expiresInDays, setExpiresInDays] = useState(14);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const clientId = project.clientIds?.[0] || 'default_client';
            const { data } = await api.post('/api/social-media/reviews/sessions', {
                clientId,
                projectId: project.id,
                name,
                startDate,
                endDate,
                expiresInDays
            });
            const reviewUrl = `${window.location.origin}${data.session.publicReviewUrl}`;
            setGeneratedUrl(reviewUrl);
            toast.success('Client review session created successfully!');
            onCreated();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create review session');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopy = () => {
        if (!generatedUrl) return;
        navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        toast.success('Review link copied!');
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Send for Client Approval
                            </h3>
                            <p className="text-xs text-slate-500">
                                Generate a passwordless, tokenized review link for your client.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {generatedUrl ? (
                    <div className="p-6 space-y-5 text-center">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shadow-inner">
                            <Check className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Review Link Ready!</h4>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                Share this link with your client. They can review live mockups and approve with 1-click.
                            </p>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-left">
                            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                                {generatedUrl}
                            </span>
                            <button
                                onClick={handleCopy}
                                className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shrink-0"
                            >
                                {copied ? 'Copied' : 'Copy Link'}
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                Review Session Title
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Calendar Window Start
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Calendar Window End
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                Link Expiration (Days)
                            </label>
                            <input
                                type="number"
                                value={expiresInDays}
                                onChange={e => setExpiresInDays(parseInt(e.target.value) || 14)}
                                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Generating...' : 'Generate Review Link'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
