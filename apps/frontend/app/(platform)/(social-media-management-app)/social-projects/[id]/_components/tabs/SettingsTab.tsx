'use client';

import React, { useState } from 'react';
import { 
    Sliders, Save, ShieldCheck, Clock, Share2, 
    Trash2, Plus, AlertTriangle, Check
} from 'lucide-react';
import { SocialProject, socialProjectService } from '@/lib/services/social-project.service';
import toast from 'react-hot-toast';

interface SettingsTabProps {
    project: SocialProject;
    onProjectUpdated: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ project, onProjectUpdated }) => {
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description || '');
    const [status, setStatus] = useState(project.status || 'in_progress');
    const [approvalRequired, setApprovalRequired] = useState(
        project.socialSettings?.approvalRequired !== false
    );
    const [defaultTimezone, setDefaultTimezone] = useState(
        project.socialSettings?.defaultTimezone || 'UTC'
    );
    const [storageRetentionDays, setStorageRetentionDays] = useState(
        project.socialSettings?.storageRetentionDays || 30
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await socialProjectService.updateProject(project.id, {
                name,
                description,
                status,
                socialSettings: {
                    approvalRequired,
                    defaultTimezone,
                    storageRetentionDays
                }
            });
            toast.success('Project settings updated successfully!');
            onProjectUpdated();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Header & Save */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Project Settings & Configuration
                    </h3>
                    <p className="text-xs text-slate-500">
                        Workflow rules, client approval policies, and asset retention parameters.
                    </p>
                </div>

                <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
                >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                </button>
            </div>

            {/* General Info */}
            <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">General Information</h4>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                            Project Status
                        </label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 capitalize"
                        >
                            <option value="in_progress">In Progress / Active</option>
                            <option value="in_review">In Review</option>
                            <option value="paused">Paused</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                            Description & Strategy Scope
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                        />
                    </div>
                </div>
            </div>

            {/* Workflow & Policy Rules */}
            <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Workflow & Publishing Policies</h4>

                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                Require Client Approval Before Publishing
                            </h5>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                When enabled, scheduled dispatches remain locked until approved in the review portal.
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={approvalRequired}
                            onChange={e => setApprovalRequired(e.target.checked)}
                            className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                Default Timezone
                            </label>
                            <select
                                value={defaultTimezone}
                                onChange={e => setDefaultTimezone(e.target.value)}
                                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                            >
                                <option value="UTC">UTC (Universal)</option>
                                <option value="America/New_York">Eastern Time (US/Canada)</option>
                                <option value="America/Los_Angeles">Pacific Time (US/Canada)</option>
                                <option value="Europe/London">London (GMT/BST)</option>
                                <option value="Asia/Kolkata">India (IST)</option>
                                <option value="Asia/Tokyo">Tokyo (JST)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                Storage Retention (Days)
                            </label>
                            <input
                                type="number"
                                value={storageRetentionDays}
                                onChange={e => setStorageRetentionDays(parseInt(e.target.value) || 30)}
                                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
