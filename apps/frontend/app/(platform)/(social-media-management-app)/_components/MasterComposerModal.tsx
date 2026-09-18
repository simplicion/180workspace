'use client';

import React, { useState } from 'react';
import { 
    X, Sparkles, Wand2, Calendar, Clock, Video, Image as ImageIcon, 
    Upload, Link2, CheckCircle2, ShieldAlert, FileText, Globe, ArrowRight,
    Send, Play, Loader2, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { InstagramFeedPreview } from './previews/InstagramFeedPreview';
import { LinkedInPreview } from './previews/LinkedInPreview';
import { TikTokPreview } from './previews/TikTokPreview';
import { YouTubeShortsPreview } from './previews/YouTubeShortsPreview';

interface MasterComposerModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date | string;
    calendarPieceId?: string;
    calendarId?: string;
    projectId?: string;
    clientId?: string;
    onSuccess?: () => void;
}

type PlatformKey = 'instagram' | 'linkedin' | 'tiktok' | 'youtube';

export function MasterComposerModal({
    isOpen,
    onClose,
    initialDate,
    calendarPieceId,
    calendarId,
    projectId,
    clientId,
    onSuccess
}: MasterComposerModalProps) {
    const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformKey[]>(['instagram', 'linkedin']);
    const [activePreviewTab, setActivePreviewTab] = useState<PlatformKey>('instagram');
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [scheduledDate, setScheduledDate] = useState<string>(
        initialDate ? new Date(initialDate).toISOString().slice(0, 16) : ''
    );
    const [driveLink, setDriveLink] = useState('');
    const [rawClips, setRawClips] = useState<string[]>([]);
    const [renderedVideoUrl, setRenderedVideoUrl] = useState<string>('');
    const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
    const [isReel, setIsReel] = useState(true);
    const [showSafeZone, setShowSafeZone] = useState(false);
    const [isPdfCarousel, setIsPdfCarousel] = useState(false);
    
    // Publishing state
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishProgress, setPublishProgress] = useState<Record<string, 'pending' | 'uploading' | 'published' | 'failed'>>({});
    const [publishedUrls, setPublishedUrls] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const togglePlatform = (p: PlatformKey) => {
        if (selectedPlatforms.includes(p)) {
            if (selectedPlatforms.length === 1) return toast.error('Select at least one platform');
            setSelectedPlatforms(selectedPlatforms.filter(item => item !== p));
            if (activePreviewTab === p) {
                const remaining = selectedPlatforms.filter(item => item !== p);
                setActivePreviewTab(remaining[0]);
            }
        } else {
            setSelectedPlatforms([...selectedPlatforms, p]);
            setActivePreviewTab(p);
        }
    };

    const handleUploadMockClips = () => {
        const mockClips = [
            'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-42867-large.mp4',
            'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-42865-large.mp4'
        ];
        setRawClips(mockClips);
        toast.success('2 Raw Video Clips attached for editing!');
    };

    const handleLaunchMediaStudio = () => {
        toast.success('Opening 180 Media Studio with attached clips...', { icon: '🎬' });
        // Simulating the studio render sync
        setTimeout(() => {
            setRenderedVideoUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80');
            setThumbnailUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80');
            toast.success('Video exported from 180 Media Studio! Ready to publish.', { icon: '✨' });
        }, 1800);
    };

    const handlePublishNow = async () => {
        if (!content.trim()) return toast.error('Please write some content first');
        setIsPublishing(true);

        const initialProgress: Record<string, 'pending' | 'uploading' | 'published' | 'failed'> = {};
        selectedPlatforms.forEach(p => { initialProgress[p] = 'uploading'; });
        setPublishProgress(initialProgress);

        try {
            // Simulate multi-platform publishing adapter
            await new Promise(r => setTimeout(r, 1600));

            const urls: Record<string, string> = {};
            selectedPlatforms.forEach(p => {
                if (p === 'instagram') urls.instagram = `https://instagram.com/reel/C_${Math.random().toString(36).substring(2, 8)}`;
                if (p === 'linkedin') urls.linkedin = `https://linkedin.com/feed/update/urn:li:activity:${Math.floor(Math.random() * 1000000000)}`;
                if (p === 'tiktok') urls.tiktok = `https://tiktok.com/@180creator/video/${Math.floor(Math.random() * 1000000000)}`;
                if (p === 'youtube') urls.youtube = `https://youtu.be/${Math.random().toString(36).substring(2, 11)}`;
            });

            setPublishedUrls(urls);
            const finishedProgress: Record<string, 'published'> = {};
            selectedPlatforms.forEach(p => { finishedProgress[p] = 'published'; });
            setPublishProgress(finishedProgress);

            toast.success('Published live across all selected platforms!');
            if (onSuccess) onSuccess();
        } catch (err: any) {
            toast.error(err.message || 'Publishing failed');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleSchedule = async () => {
        if (!content.trim()) return toast.error('Please write some content');
        if (!scheduledDate) return toast.error('Please select a scheduled date and time');

        try {
            await api.post('/api/social-media/posts', {
                title,
                content,
                mediaUrls: renderedVideoUrl ? [renderedVideoUrl] : [],
                rawMediaUrls: rawClips,
                finalVideoUrl: renderedVideoUrl,
                thumbnailUrl,
                mediaType: isReel ? 'video' : 'image',
                scheduledFor: new Date(scheduledDate).toISOString(),
                calendarId,
                calendarPieceId,
                projectId,
                clientId
            });

            toast.success('Post scheduled successfully in calendar!');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to schedule post');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
            <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="p-5 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">Master Social Media Publisher</h2>
                            <p className="text-xs text-slate-500">Draft once, preview live, and publish across Meta, LinkedIn, TikTok & YouTube</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Split Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
                    {/* LEFT COLUMN: Post Composer & Assets (7 Cols) */}
                    <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-slate-100 space-y-5 overflow-y-auto">
                        {/* Channel Selectors */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                                Destination Channels ($0 Free API Protocol)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {[
                                    { key: 'instagram', label: 'Instagram', icon: '📸', color: 'border-pink-500 bg-pink-50 text-pink-700' },
                                    { key: 'linkedin', label: 'LinkedIn', icon: '💼', color: 'border-blue-600 bg-blue-50 text-blue-700' },
                                    { key: 'tiktok', label: 'TikTok', icon: '🎵', color: 'border-slate-900 bg-slate-900 text-white' },
                                    { key: 'youtube', label: 'YouTube Shorts', icon: '▶️', color: 'border-red-600 bg-red-50 text-red-700' },
                                ].map(p => {
                                    const isSelected = selectedPlatforms.includes(p.key as PlatformKey);
                                    return (
                                        <button
                                            key={p.key}
                                            type="button"
                                            onClick={() => togglePlatform(p.key as PlatformKey)}
                                            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                                isSelected ? p.color + ' shadow-sm font-extrabold' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            <span>{p.icon}</span>
                                            <span>{p.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Title (Optional for Video/Shorts) */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Headline / Video Hook Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. 5 AI Workflows to 10x your speed in 2026"
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>

                        {/* Main Copy Area with Brand Voice Assistant */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-slate-700">Master Caption & Hooks</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setContent(prev => prev + '\n\n#AI #Productivity #SaaS #Growth #180workspace')}
                                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md"
                                    >
                                        <Sparkles className="w-3 h-3" /> Insert Tags
                                    </button>
                                </div>
                            </div>
                            <textarea
                                rows={5}
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Write your master caption, story, or video transcript..."
                                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all leading-relaxed"
                            />
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                                <span>{content.length} characters</span>
                                <span className={content.length > 210 ? 'text-amber-600 font-medium' : ''}>
                                    {content.length > 210 ? 'LinkedIn cutoff exceeded (displays "see more")' : 'Fits inside initial LinkedIn fold'}
                                </span>
                            </div>
                        </div>

                        {/* Raw Footage Ingestion & 180 Media Studio Deep Link */}
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Video className="w-4 h-4 text-indigo-600" />
                                    <span className="text-xs font-bold text-slate-900">Video Ingestion & 180 Media Studio Pipeline</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleLaunchMediaStudio}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                                >
                                    <Wand2 className="w-3.5 h-3.5" />
                                    Edit in 180 Media Studio
                                </button>
                            </div>

                            {/* Drop Raw Clips or Paste Drive Link */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <button
                                        type="button"
                                        onClick={handleUploadMockClips}
                                        className="w-full py-2.5 px-3 bg-white border border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors shadow-sm"
                                    >
                                        <Upload className="w-4 h-4 text-indigo-500" />
                                        {rawClips.length > 0 ? `${rawClips.length} Raw Clips Attached` : 'Drop 6 Raw Video Clips'}
                                    </button>
                                </div>
                                <div className="relative">
                                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="url"
                                        value={driveLink}
                                        onChange={e => setDriveLink(e.target.value)}
                                        placeholder="Or Google Drive Folder Link"
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Exported Result Indicator */}
                            {renderedVideoUrl && (
                                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span className="font-semibold">Rendered Studio MP4 Synced & Ready to Publish</span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase bg-emerald-200/60 px-2 py-0.5 rounded-md">
                                        1080x1920 (9:16)
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Scheduling & Publish Time */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Publish Timing</label>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="datetime-local"
                                        value={scheduledDate}
                                        onChange={e => setScheduledDate(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Published Results if available */}
                        {Object.keys(publishedUrls).length > 0 && (
                            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                                    🚀 Live Published URLs
                                </span>
                                <div className="space-y-1.5">
                                    {Object.entries(publishedUrls).map(([plat, url]) => (
                                        <div key={plat} className="flex items-center justify-between text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg">
                                            <span className="capitalize font-bold text-slate-300">{plat}</span>
                                            <a href={url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono text-[11px]">
                                                {url.substring(0, 32)}... <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Interactive Live Platform Previews (5 Cols) */}
                    <div className="lg:col-span-5 bg-slate-100/70 p-6 flex flex-col justify-between overflow-y-auto">
                        <div>
                            {/* Preview Platform Tabs */}
                            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Feed Simulation</span>
                                <div className="flex gap-1.5">
                                    {selectedPlatforms.map(plat => (
                                        <button
                                            key={plat}
                                            type="button"
                                            onClick={() => setActivePreviewTab(plat)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                                activePreviewTab === plat
                                                    ? 'bg-slate-900 text-white shadow-sm'
                                                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                                            }`}
                                        >
                                            {plat.charAt(0).toUpperCase() + plat.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Specific Controls per Preview Mode */}
                            {activePreviewTab === 'instagram' && (
                                <div className="flex items-center justify-between mb-3 text-xs bg-white p-2 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsReel(true)}
                                            className={`px-2 py-0.5 rounded-md font-semibold ${isReel ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}
                                        >
                                            Reel (9:16)
                                        </button>
                                        <button
                                            onClick={() => setIsReel(false)}
                                            className={`px-2 py-0.5 rounded-md font-semibold ${!isReel ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}
                                        >
                                            Feed Post (4:5)
                                        </button>
                                    </div>
                                    {isReel && (
                                        <button
                                            onClick={() => setShowSafeZone(!showSafeZone)}
                                            className={`text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                                                showSafeZone ? 'bg-yellow-100 text-yellow-800' : 'text-slate-500'
                                            }`}
                                        >
                                            <ShieldAlert className="w-3 h-3" /> Safe Zone
                                        </button>
                                    )}
                                </div>
                            )}

                            {activePreviewTab === 'linkedin' && (
                                <div className="flex items-center justify-between mb-3 text-xs bg-white p-2 rounded-xl border border-slate-200">
                                    <span className="font-semibold text-slate-700">Format Mode:</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsPdfCarousel(false)}
                                            className={`px-2 py-0.5 rounded-md font-semibold ${!isPdfCarousel ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}
                                        >
                                            Standard Post
                                        </button>
                                        <button
                                            onClick={() => setIsPdfCarousel(true)}
                                            className={`px-2 py-0.5 rounded-md font-semibold ${isPdfCarousel ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}
                                        >
                                            PDF Carousel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Render Active Live Preview Component */}
                            <div className="py-2">
                                {activePreviewTab === 'instagram' && (
                                    <InstagramFeedPreview
                                        caption={content}
                                        finalVideoUrl={renderedVideoUrl}
                                        thumbnailUrl={thumbnailUrl}
                                        isReel={isReel}
                                        showSafeZone={showSafeZone}
                                    />
                                )}
                                {activePreviewTab === 'linkedin' && (
                                    <LinkedInPreview
                                        content={content}
                                        isPdfCarousel={isPdfCarousel}
                                    />
                                )}
                                {activePreviewTab === 'tiktok' && (
                                    <TikTokPreview
                                        caption={content}
                                        mediaUrl={renderedVideoUrl || thumbnailUrl}
                                    />
                                )}
                                {activePreviewTab === 'youtube' && (
                                    <YouTubeShortsPreview
                                        title={title || content}
                                        mediaUrl={renderedVideoUrl || thumbnailUrl}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Action Buttons Bar */}
                        <div className="pt-5 mt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleSchedule}
                                className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-all"
                            >
                                Schedule in Calendar
                            </button>
                            <button
                                type="button"
                                onClick={handlePublishNow}
                                disabled={isPublishing}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isPublishing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Publishing Multi-Channel...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Publish Now (All {selectedPlatforms.length} Channels)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
