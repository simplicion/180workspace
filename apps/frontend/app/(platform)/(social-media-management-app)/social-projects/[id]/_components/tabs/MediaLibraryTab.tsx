'use client';

import React, { useState } from 'react';
import { 
    Film, Upload, Link as LinkIcon, Image as ImageIcon, CheckCircle2, 
    Clock, Download, ExternalLink, Trash2, Plus, Play, ShieldAlert, Sparkles,
    FolderGit2, HardDrive, Filter
} from 'lucide-react';
import { SocialProject } from '@/lib/services/social-project.service';
import { socialEdgeGuard } from '@/lib/services/social-edge-guard';
import toast from 'react-hot-toast';

interface MediaLibraryTabProps {
    project: SocialProject;
}

export const MediaLibraryTab: React.FC<MediaLibraryTabProps> = ({ project }) => {
    const [driveUrl, setDriveUrl] = useState('');
    const [driveLabel, setDriveLabel] = useState('');
    const [filterCategory, setFilterCategory] = useState<'all' | 'footage' | 'deliverables'>('all');
    const [externalLinks, setExternalLinks] = useState<Array<{ url: string; label: string; date: string }>>([
        { url: 'https://drive.google.com/drive/folders/sample-client-broll', label: 'Client Q3 Raw A-Roll & B-Roll', date: '2 days ago' },
        { url: 'https://www.dropbox.com/sh/client-brand-assets-2026', label: 'Brand Logos & 4K Stings', date: '5 days ago' }
    ]);

    const deliverables = [
        { id: '1', title: 'Viral Hook Cut #1 - 9:16 Reel', duration: '0:45', size: '24.2 MB', createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), isScratch: true },
        { id: '2', title: 'Case Study Highlights - 16:9 Cut', duration: '1:12', size: '48.6 MB', createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(), isScratch: true },
        { id: '3', title: 'Product Launch Teaser - Permanent Master', duration: '0:30', size: '18.1 MB', createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), isScratch: false },
    ];

    const handleAddDriveLink = (e: React.FormEvent) => {
        e.preventDefault();
        if (!driveUrl.trim()) return toast.error('Please enter a valid external drive URL');
        
        const providerInfo = socialEdgeGuard.detectCloudStorageProvider(driveUrl.trim());
        setExternalLinks(prev => [
            { 
                url: driveUrl.trim(), 
                label: driveLabel.trim() || `${providerInfo.label} Reference`, 
                date: 'Just now' 
            },
            ...prev
        ]);
        setDriveUrl('');
        setDriveLabel('');
        toast.success(`External ${providerInfo.label} reference saved!`);
    };

    const retentionDays = project.socialSettings?.storageRetentionDays || 30;

    return (
        <div className="space-y-8">
            {/* Storage Policy & Retention Banner */}
            <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Non-Destructive Storage & Scratch Retention Policy
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Raw client footage is preserved for {retentionDays} days. Scratch render previews auto-expire after 24h; approved masters are permanently mirrored.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900 whitespace-nowrap">
                        {retentionDays}d Project Retention
                    </span>
                    <span className="px-3 py-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
                        24h Scratch Safeguard
                    </span>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2">
                {[
                    { id: 'all', label: 'All Project Media' },
                    { id: 'footage', label: 'Client Raw Footage' },
                    { id: 'deliverables', label: '180 Studio Deliverables' }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilterCategory(f.id as any)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition ${
                            filterCategory === f.id
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Section 1: Client Raw Footage Intake */}
            {(filterCategory === 'all' || filterCategory === 'footage') && (
                <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            Client Source Footage & External Cloud Storage Links
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Connect client Google Drive, Dropbox, Box, or OneDrive folders directly to the project asset bin.
                        </p>
                    </div>

                    {/* Add External Link Form */}
                    <form onSubmit={handleAddDriveLink} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 space-y-2 sm:space-y-0 sm:flex sm:gap-3">
                            <input
                                type="text"
                                placeholder="Paste Google Drive, Dropbox, or Box link..."
                                value={driveUrl}
                                onChange={e => setDriveUrl(e.target.value)}
                                className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                            />
                            <input
                                type="text"
                                placeholder="Folder / Asset Label (optional)"
                                value={driveLabel}
                                onChange={e => setDriveLabel(e.target.value)}
                                className="w-full sm:w-60 px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl whitespace-nowrap transition shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Link Storage</span>
                        </button>
                    </form>

                    {/* Storage References List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {externalLinks.map((link, idx) => {
                            const providerInfo = socialEdgeGuard.detectCloudStorageProvider(link.url);
                            return (
                                <div
                                    key={idx}
                                    className="p-4 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-sm"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 shrink-0">
                                            <HardDrive className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{link.label}</h5>
                                                <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md shrink-0">
                                                    {providerInfo.label}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 truncate">{link.url}</p>
                                        </div>
                                    </div>

                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition shrink-0"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Section 2: Rendered Deliverables Bin with Scratch Retention Badges */}
            {(filterCategory === 'all' || filterCategory === 'deliverables') && (
                <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            Rendered Deliverables & Master Cuts (180 Media Studio)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Final cuts synced from video editing tasks ready for review and multi-platform publishing with real-time lifecycle tracking.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        {deliverables.map(deliverable => {
                            const retention = socialEdgeGuard.calculateScratchRetention(deliverable.createdAt, 24);
                            return (
                                <div
                                    key={deliverable.id}
                                    className="p-4 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-3 group shadow-sm"
                                >
                                    <div className="aspect-video w-full rounded-xl bg-slate-950 flex items-center justify-center relative overflow-hidden group-hover:shadow-md transition">
                                        <Film className="w-8 h-8 text-slate-600 group-hover:scale-110 transition-transform" />
                                        <span className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-bold bg-black/70 text-white rounded-md">
                                            {deliverable.duration}
                                        </span>

                                        {/* Lifecycle Badge */}
                                        <div className="absolute top-2 left-2">
                                            {deliverable.isScratch ? (
                                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md backdrop-blur-md ${
                                                    retention.status === 'active' ? 'bg-emerald-500/80 text-white' :
                                                    retention.status === 'expiring_soon' ? 'bg-amber-500/80 text-white' : 'bg-red-500/80 text-white'
                                                }`}>
                                                    Scratch: {retention.formattedTimeRemaining}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 text-[9px] font-bold bg-indigo-600/80 text-white rounded-md backdrop-blur-md">
                                                    Permanent Master
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                            {deliverable.title}
                                        </h5>
                                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                                            <span>{deliverable.size}</span>
                                            <span>{new Date(deliverable.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
