'use client';

import React, { useState, useEffect } from 'react';
import { X, Film, Clock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AssignEditorModalProps {
    projectId: string;
    postId?: string;
    contentPieceId?: string;
    onClose: () => void;
    onAssigned: () => void;
}

export const AssignEditorModal: React.FC<AssignEditorModalProps> = ({
    projectId,
    postId,
    contentPieceId,
    onClose,
    onAssigned
}) => {
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [assigneeId, setAssigneeId] = useState('');
    const [priority, setPriority] = useState('high');
    const [deadline, setDeadline] = useState('');
    const [instructions, setInstructions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const { data } = await api.get('/api/users').catch(() => ({ data: { users: [] } }));
                setTeamMembers(data.users || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assigneeId) return toast.error('Please select an editor to assign');

        setIsSubmitting(true);
        try {
            if (postId) {
                await api.post(`/api/social-media/posts/${postId}/assign-editor`, {
                    projectId,
                    assigneeId,
                    priority,
                    deadline: deadline || undefined,
                    editingInstructions: instructions
                });
            } else {
                await api.post('/api/tasks', {
                    projectId,
                    assigneeId,
                    title: 'Social Video Edit Task',
                    description: instructions,
                    priority,
                    dueDate: deadline || undefined,
                    contentPieceId
                });
            }
            toast.success('Editor task assigned successfully!');
            onAssigned();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to assign editor task');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                            <Film className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Assign Video Editor
                            </h3>
                            <p className="text-xs text-slate-500">
                                Connect this script to an editor task with 180 Media Studio pre-integration.
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
                            Assignee (Editor) <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={assigneeId}
                            onChange={e => setAssigneeId(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                        >
                            <option value="">-- Select Team Member --</option>
                            {teamMembers.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                Priority
                            </label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value)}
                                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 capitalize"
                            >
                                <option value="urgent">Urgent</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                Target Deliverable Date
                            </label>
                            <input
                                type="date"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                            Editing Instructions & Cut Notes
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Add pacing notes, B-roll timestamps, music vibe, or caption styling instructions..."
                            value={instructions}
                            onChange={e => setInstructions(e.target.value)}
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
                            {isSubmitting ? 'Assigning...' : 'Assign Editor Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
