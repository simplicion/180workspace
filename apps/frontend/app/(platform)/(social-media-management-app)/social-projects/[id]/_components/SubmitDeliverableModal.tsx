'use client';

import React, { useState } from 'react';
import { X, Film, Upload, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface SubmitDeliverableModalProps {
    taskId: string;
    onClose: () => void;
    onSubmitted: () => void;
}

export const SubmitDeliverableModal: React.FC<SubmitDeliverableModalProps> = ({
    taskId,
    onClose,
    onSubmitted
}) => {
    const [deliverableUrl, setDeliverableUrl] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deliverableUrl.trim()) return toast.error('Please enter the rendered video deliverable URL');

        setIsSubmitting(true);
        try {
            await api.post(`/api/social-media/posts/tasks/${taskId}/submit-deliverable`, {
                deliverableUrl,
                thumbnailUrl: thumbnailUrl || undefined,
                notes: notes || undefined
            });
            toast.success('Deliverable submitted for review!');
            onSubmitted();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to submit deliverable');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Submit Video Deliverable
                            </h3>
                            <p className="text-xs text-slate-500">
                                Attach the final rendered MP4 from 180 Media Studio for client approval.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                            Final Rendered Video URL (.mp4) <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="https://storage.180.app/renders/video-final.mp4"
                            value={deliverableUrl}
                            onChange={e => setDeliverableUrl(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                            Custom Thumbnail URL (optional)
                        </label>
                        <input
                            type="text"
                            placeholder="https://storage.180.app/renders/thumb.jpg"
                            value={thumbnailUrl}
                            onChange={e => setThumbnailUrl(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                            Editor Submission Notes
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Explain what was modified, music choice, or specific aspects to review..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
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
                            className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
