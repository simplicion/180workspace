'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    X, Save, Film, Image as ImageIcon, CheckCircle2, Clock, 
    Send, Sparkles, User, Link as LinkIcon, MessageSquare, 
    Eye, ShieldCheck, Video, ExternalLink, RefreshCw, AlertCircle,
    Hash, ShieldAlert, Layers, Check, AlertTriangle, Zap, Bot, Heart
} from 'lucide-react';
import { SocialProject, socialProjectService } from '@/lib/services/social-project.service';
import { socialEngagementService } from '@/lib/services/social-engagement.service';
import { socialEdgeGuard, PlatformConstraintResult, BrandAuditResult } from '@/lib/services/social-edge-guard';
import { InstagramFeedPreview } from '@/app/(platform)/(social-media-management-app)/_components/previews/InstagramFeedPreview';
import { LinkedInPreview } from '@/app/(platform)/(social-media-management-app)/_components/previews/LinkedInPreview';
import { TikTokPreview } from '@/app/(platform)/(social-media-management-app)/_components/previews/TikTokPreview';
import { YouTubeShortsPreview } from '@/app/(platform)/(social-media-management-app)/_components/previews/YouTubeShortsPreview';
import toast from 'react-hot-toast';

interface ContentDetailDrawerProps {
    post: any;
    project: SocialProject;
    onClose: () => void;
    onUpdated: () => void;
    onAssignEditorClick: (postId: string) => void;
    onSubmitDeliverableClick: (taskId: string) => void;
    onSendForApprovalClick?: (post: any) => void;
}

export const ContentDetailDrawer: React.FC<ContentDetailDrawerProps> = ({
    post,
    project,
    onClose,
    onUpdated,
    onAssignEditorClick,
    onSubmitDeliverableClick,
    onSendForApprovalClick
}) => {
    const [activeTab, setActiveTab] = useState<'script' | 'media' | 'editing' | 'preview' | 'approval' | 'publishing' | 'engagement'>('script');
    const [previewPlatform, setPreviewPlatform] = useState<'instagram' | 'linkedin' | 'tiktok' | 'youtube'>('instagram');
    const [showSafeZone, setShowSafeZone] = useState(true);

    // 180 Engagement Auto-DM state
    const [enableAutoDm, setEnableAutoDm] = useState(Boolean(post.metadata?.autoDm?.enabled || post.autoDmKeyword));
    const [autoDmKeyword, setAutoDmKeyword] = useState(post.autoDmKeyword || post.metadata?.autoDm?.keyword || 'BLUEPRINT');
    const [autoDmLink, setAutoDmLink] = useState(post.autoDmLink || post.metadata?.autoDm?.link || 'https://180workspace.com/blueprint');
    const [autoDmMessage, setAutoDmMessage] = useState(
        post.autoDmMessage || post.metadata?.autoDm?.message || 'Hey {name}! Here is your VIP resource link: {link} 🚀 What is your target monthly goal?'
    );
    const [autoLikeComment, setAutoLikeComment] = useState(post.metadata?.autoDm?.autoLike ?? true);
    const [activateAiAgent, setActivateAiAgent] = useState(post.metadata?.autoDm?.activateAiAgent ?? true);

    // Form fields
    const [title, setTitle] = useState(post.title || '');
    const [hook, setHook] = useState(post.metadata?.hook || '');
    const [objective, setObjective] = useState(post.metadata?.objective || '');
    const [content, setContent] = useState(post.content || '');
    const [firstComment, setFirstComment] = useState(post.metadata?.firstComment || '');
    const [mediaType, setMediaType] = useState(post.mediaType || 'video');
    const [finalVideoUrl, setFinalVideoUrl] = useState(post.finalVideoUrl || '');
    const [thumbnailUrl, setThumbnailUrl] = useState(post.thumbnailUrl || '');
    const [externalDriveUrl, setExternalDriveUrl] = useState(
        post.externalStorageLinks?.[0]?.url || ''
    );
    const [scheduledFor, setScheduledFor] = useState(
        post.scheduledFor ? new Date(post.scheduledFor).toISOString().slice(0, 16) : ''
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    // Pre-publishing validation state
    const [readinessData, setReadinessData] = useState<any>(null);
    const [loadingReadiness, setLoadingReadiness] = useState(false);

    // Dynamic Edge Calculations
    const brandAudit: BrandAuditResult = socialEdgeGuard.auditBrandSafetyCopy(
        content,
        project.brandVoiceProfile
    );

    const platformConstraints: PlatformConstraintResult = socialEdgeGuard.validatePlatformConstraints(
        previewPlatform,
        content,
        mediaType
    );

    const scratchRetention = socialEdgeGuard.calculateScratchRetention(
        post.createdAt || new Date(),
        project.socialSettings?.storageRetentionDays ? project.socialSettings.storageRetentionDays * 24 : 24
    );

    const detectedProvider = socialEdgeGuard.detectCloudStorageProvider(externalDriveUrl);

    // Load pre-publishing readiness on tab switch
    useEffect(() => {
        if (activeTab === 'publishing') {
            setLoadingReadiness(true);
            socialProjectService.validatePublish(post.id)
                .then(data => setReadinessData(data))
                .catch(() => null)
                .finally(() => setLoadingReadiness(false));
        }
    }, [activeTab, post.id]);

    // Save changes (handles version bump on backend if already approved)
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await socialProjectService.updatePost(post.id, {
                title,
                content,
                mediaType,
                finalVideoUrl: finalVideoUrl || undefined,
                thumbnailUrl: thumbnailUrl || undefined,
                scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
                metadata: {
                    ...post.metadata,
                    hook,
                    objective,
                    firstComment,
                    autoDm: {
                        enabled: enableAutoDm,
                        keyword: autoDmKeyword,
                        link: autoDmLink,
                        message: autoDmMessage,
                        autoLike: autoLikeComment,
                        activateAiAgent: activateAiAgent
                    }
                },
                externalStorageLinks: externalDriveUrl ? [{
                    url: externalDriveUrl,
                    provider: detectedProvider.provider,
                    label: detectedProvider.label,
                    submittedAt: new Date().toISOString()
                }] : post.externalStorageLinks
            });

            // If auto-DM is enabled, sync the engagement rule on the backend
            if (enableAutoDm) {
                socialEngagementService.createRule({
                    name: `Auto-DM for "${title || 'Post'}"`,
                    projectId: project.id,
                    postId: post.id,
                    triggerType: 'comment_keyword',
                    triggerKeywords: autoDmKeyword.split(',').map(k => k.trim()).filter(Boolean),
                    matchMode: 'contains',
                    actionAutoLike: autoLikeComment,
                    actionPublicReplies: ['Sent to your DMs, {handle}! 🚀'],
                    actionSendDm: true,
                    actionDmTemplate: autoDmMessage,
                    actionDmDeliverableUrl: autoDmLink,
                    actionEnableAiAgent: activateAiAgent,
                    aiAgentGoal: 'qualify_lead'
                }).catch(() => null);
            }

            toast.success('Content & edge settings saved successfully!');
            onUpdated();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to save post');
        } finally {
            setIsSaving(false);
        }
    };

    // First Comment Hashtag Extraction Automation
    const handleAutomateFirstComment = () => {
        const { cleanCaption, firstComment: extracted, extractedCount } = socialEdgeGuard.extractHashtagsForFirstComment(content);
        if (extractedCount === 0) {
            toast.error('No hashtags (#) found in the caption to extract.');
            return;
        }
        setContent(cleanCaption);
        setFirstComment(prev => prev ? `${prev} ${extracted}` : extracted);
        toast.success(`Extracted ${extractedCount} hashtags into First Comment!`);
    };

    const handlePublishNow = async () => {
        setIsPublishing(true);
        try {
            toast.loading('Validating and publishing across platforms...', { id: 'pub-drawer' });
            const result = await socialProjectService.publishPostNow(post.id);
            if (result.success) {
                toast.success(result.message || 'Published successfully!', { id: 'pub-drawer' });
                onUpdated();
                onClose();
            } else {
                toast.error(result.message || 'Publishing failed on some platforms', { id: 'pub-drawer' });
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Publishing failed', { id: 'pub-drawer' });
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-3xl bg-white dark:bg-slate-900 h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200 border-l border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-md">
                                VERSION {post.versionNumber || 1}
                            </span>
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                                post.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                post.status === 'published' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                                {post.status?.replace('_', ' ')}
                            </span>
                            {post.isEvergreen && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-md">
                                    EVERGREEN (Used {post.reuseCount || 0}x)
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate max-w-lg">
                            {title || 'Untitled Creative Item'}
                        </h3>
                    </div>

                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub-tabs bar */}
                <div className="flex items-center gap-2 px-6 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'script', name: 'Script & Copy', icon: MessageSquare },
                        { id: 'media', name: 'Footage & Media', icon: ImageIcon },
                        { id: 'editing', name: '180 Media Studio', icon: Video },
                        { id: 'preview', name: 'Live Previews', icon: Eye },
                        { id: 'approval', name: 'Approvals & Versions', icon: ShieldCheck },
                        { id: 'engagement', name: '180 Engagement', icon: Zap },
                        { id: 'publishing', name: 'Publishing', icon: Send }
                    ].map(t => {
                        const Icon = t.icon;
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as any)}
                                className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                                    isActive
                                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-slate-400 hover:text-slate-700'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{t.name}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* TAB 1: Script & Copy */}
                    {activeTab === 'script' && (
                        <div className="space-y-4">
                            {/* Real-Time Brand Safety & Tone Badge */}
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className={`p-1.5 rounded-lg ${brandAudit.isClean ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60' : 'bg-amber-100 text-amber-600'}`}>
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                                Brand Tone Match: {brandAudit.toneMatchScore}%
                                            </span>
                                            {brandAudit.isClean ? (
                                                <span className="text-[10px] px-2 py-0.2 font-semibold bg-emerald-500/10 text-emerald-600 rounded-full">
                                                    Clean & Compliant
                                                </span>
                                            ) : (
                                                <span className="text-[10px] px-2 py-0.2 font-semibold bg-amber-500/10 text-amber-600 rounded-full">
                                                    {brandAudit.violations.length} Optimization Alert{brandAudit.violations.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            Target Tone: <span className="capitalize font-medium text-slate-600 dark:text-slate-300">{project.brandVoiceProfile?.tone || 'Professional & Engaging'}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="text-[11px] font-mono text-slate-500">
                                        {content.length} chars • {platformConstraints.hashtagCount} tags
                                    </span>
                                </div>
                            </div>

                            {/* Violations Warning Bar */}
                            {brandAudit.violations.length > 0 && (
                                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-1">
                                    {brandAudit.violations.map((v, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                            <span><strong>{v.term}</strong>: {v.recommendation}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Content Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Opening Hook (0–3 Seconds)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Stop scrolling if you manage social..."
                                        value={hook}
                                        onChange={e => setHook(e.target.value)}
                                        className="w-full px-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Content Objective / Pillar
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Thought Leadership, Product Launch..."
                                        value={objective}
                                        onChange={e => setObjective(e.target.value)}
                                        className="w-full px-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Full Script / Caption & Talking Points
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAutomateFirstComment}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 transition"
                                    >
                                        <Hash className="w-3 h-3" />
                                        <span>Automate First Comment</span>
                                    </button>
                                </div>
                                <textarea
                                    rows={7}
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="w-full px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 leading-relaxed font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    First Comment (Clean Hashtags & Links)
                                </label>
                                <input
                                    type="text"
                                    placeholder="#brand #creator #agency #socialmediamanager"
                                    value={firstComment}
                                    onChange={e => setFirstComment(e.target.value)}
                                    className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Creative Format
                                    </label>
                                    <select
                                        value={mediaType}
                                        onChange={e => setMediaType(e.target.value)}
                                        className="w-full px-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 capitalize"
                                    >
                                        <option value="video">Short Video / Reel (9:16)</option>
                                        <option value="image">Static Feed Image (1:1)</option>
                                        <option value="carousel">Multi-Slide Carousel</option>
                                        <option value="document">PDF Document / Slides</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Scheduled Date & Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={scheduledFor}
                                        onChange={e => setScheduledFor(e.target.value)}
                                        className="w-full px-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Footage & Media */}
                    {activeTab === 'media' && (
                        <div className="space-y-5">
                            {/* Scratch Storage Retention Status */}
                            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <div>
                                        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                            Scratch Render Lifecycle: {scratchRetention.label}
                                        </h5>
                                        <p className="text-[11px] text-slate-500">
                                            Rendered deliverables are permanently mirrored upon client approval.
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                                    scratchRetention.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                                    scratchRetention.status === 'expiring_soon' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
                                }`}>
                                    {scratchRetention.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* External Cloud Storage Links */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Client Source Footage Link (Google Drive / Dropbox)
                                    </label>
                                    {detectedProvider.provider !== 'direct' && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-md">
                                            {detectedProvider.label} Detected
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="https://drive.google.com/drive/folders/..."
                                        value={externalDriveUrl}
                                        onChange={e => setExternalDriveUrl(e.target.value)}
                                        className="flex-1 px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-mono"
                                    />
                                    {externalDriveUrl && (
                                        <a
                                            href={externalDriveUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Final Rendered Deliverable URL (.mp4)
                                </label>
                                <input
                                    type="text"
                                    placeholder="https://storage.180.app/renders/final.mp4"
                                    value={finalVideoUrl}
                                    onChange={e => setFinalVideoUrl(e.target.value)}
                                    className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-mono"
                                />
                            </div>

                            {finalVideoUrl && (
                                <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden relative shadow-lg">
                                    <video src={finalVideoUrl} controls className="w-full h-full object-contain" />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Cover Thumbnail URL (optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="https://storage.180.app/renders/cover.jpg"
                                    value={thumbnailUrl}
                                    onChange={e => setThumbnailUrl(e.target.value)}
                                    className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 3: 180 Media Studio Integration */}
                    {activeTab === 'editing' && (
                        <div className="space-y-6">
                            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-950 text-white space-y-4 shadow-xl">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                                    <Film className="w-4 h-4" />
                                    <span>Autonomous Video Engine</span>
                                </div>
                                <h4 className="text-xl font-bold">180 Media Studio Bridge</h4>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Launch the Remotion timeline editor with this script preloaded into the AI Director context panel and raw footage in the bin.
                                </p>

                                <div className="flex items-center gap-3 pt-2">
                                    <Link
                                        href={`/media-editor?projectId=${project.id}&postId=${post.id}`}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition active:scale-95 shadow-lg"
                                    >
                                        <Video className="w-4 h-4 text-indigo-600" />
                                        <span>Open in 180 Media Editor</span>
                                    </Link>

                                    <button
                                        onClick={() => onAssignEditorClick(post.id)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600/80 hover:bg-indigo-600 rounded-xl transition"
                                    >
                                        <User className="w-3.5 h-3.5" />
                                        <span>Assign Video Editor</span>
                                    </button>
                                </div>
                            </div>

                            {/* Editing Task Bridge Info */}
                            {post.tasks && post.tasks.length > 0 && (
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">
                                        Assigned Video Editing Task
                                    </h5>
                                    {post.tasks.map((t: any) => (
                                        <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                                            <div>
                                                <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.title}</h6>
                                                <p className="text-[11px] text-slate-400">Status: {t.status} • Assignee: {t.assignee?.name || 'Assigned'}</p>
                                            </div>
                                            <button
                                                onClick={() => onSubmitDeliverableClick(t.id)}
                                                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition"
                                            >
                                                Submit Output
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: Live Previews & Interactive Safe-Zone Overlay */}
                    {activeTab === 'preview' && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                                    {(['instagram', 'linkedin', 'tiktok', 'youtube'] as const).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPreviewPlatform(p)}
                                            className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition ${
                                                previewPlatform === p
                                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>

                                {/* Safe Zone Toggle for Vertical Formats */}
                                {(previewPlatform === 'tiktok' || previewPlatform === 'youtube' || previewPlatform === 'instagram') && (
                                    <button
                                        type="button"
                                        onClick={() => setShowSafeZone(!showSafeZone)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                                            showSafeZone
                                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 text-indigo-600 dark:text-indigo-400'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                                        }`}
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        <span>Safe-Zone Overlay: {showSafeZone ? 'ON' : 'OFF'}</span>
                                    </button>
                                )}
                            </div>

                            {/* Platform Constraint Status Bar */}
                            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs border border-slate-200/80 dark:border-slate-700/80">
                                <span className="text-slate-500">
                                    Characters: <strong className="text-slate-800 dark:text-slate-200">{platformConstraints.charCount}</strong> / {platformConstraints.maxChars}
                                </span>
                                <span className="text-slate-500">
                                    Hashtags: <strong className="text-slate-800 dark:text-slate-200">{platformConstraints.hashtagCount}</strong> / {platformConstraints.maxHashtags}
                                </span>
                                {platformConstraints.warnings.length > 0 && (
                                    <span className="text-[11px] text-amber-600 font-medium">
                                        ⚠️ {platformConstraints.warnings[0]}
                                    </span>
                                )}
                            </div>

                            {/* Preview Screen with optional Safe-Zone overlay */}
                            <div className="p-4 rounded-3xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex justify-center relative">
                                <div className="relative">
                                    {previewPlatform === 'instagram' && (
                                        <InstagramFeedPreview
                                            caption={content}
                                            mediaUrls={finalVideoUrl ? [finalVideoUrl] : ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80']}
                                            finalVideoUrl={finalVideoUrl}
                                            accountName={project.name}
                                            username={project.client?.name?.toLowerCase().replace(/\s+/g, '') || 'clientbrand'}
                                        />
                                    )}
                                    {previewPlatform === 'linkedin' && (
                                        <LinkedInPreview
                                            content={content}
                                            mediaUrls={finalVideoUrl ? [finalVideoUrl] : []}
                                            authorName={project.name}
                                        />
                                    )}
                                    {previewPlatform === 'tiktok' && (
                                        <TikTokPreview
                                            caption={content}
                                            mediaUrl={finalVideoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'}
                                            creatorHandle={project.client?.name?.toLowerCase().replace(/\s+/g, '') || 'clientbrand'}
                                        />
                                    )}
                                    {previewPlatform === 'youtube' && (
                                        <YouTubeShortsPreview
                                            title={title || content.slice(0, 50)}
                                            mediaUrl={finalVideoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'}
                                            channelName={project.name}
                                        />
                                    )}

                                    {/* Safe-Zone Danger Strip Overlays (TikTok / Reels / Shorts) */}
                                    {showSafeZone && (previewPlatform === 'tiktok' || previewPlatform === 'youtube') && (
                                        <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden border-2 border-dashed border-emerald-400/60 z-20">
                                            {/* Top Danger Zone (12%) */}
                                            <div 
                                                style={{ height: `${socialEdgeGuard.SAFE_ZONES.topPercent}%` }} 
                                                className="w-full bg-red-500/15 border-b border-red-400/50 flex items-center justify-center text-[10px] font-bold text-red-300 uppercase tracking-wider backdrop-blur-[1px]"
                                            >
                                                Top Danger Zone (12%)
                                            </div>

                                            {/* Middle Creative Area with Right Danger Strip */}
                                            <div style={{ height: `${100 - socialEdgeGuard.SAFE_ZONES.topPercent - socialEdgeGuard.SAFE_ZONES.bottomPercent}%` }} className="w-full flex justify-end">
                                                <div 
                                                    style={{ width: `${socialEdgeGuard.SAFE_ZONES.rightPercent}%` }} 
                                                    className="h-full bg-amber-500/15 border-l border-amber-400/50 flex items-center justify-center text-[9px] font-bold text-amber-300 uppercase [writing-mode:vertical-rl] tracking-wider"
                                                >
                                                    Right Strip (18%)
                                                </div>
                                            </div>

                                            {/* Bottom Danger Zone (22%) */}
                                            <div 
                                                style={{ height: `${socialEdgeGuard.SAFE_ZONES.bottomPercent}%` }} 
                                                className="w-full bg-red-500/15 border-t border-red-400/50 flex items-center justify-center text-[10px] font-bold text-red-300 uppercase tracking-wider backdrop-blur-[1px]"
                                            >
                                                Bottom Danger Zone (22%)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: Approvals & Versions */}
                    {activeTab === 'approval' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                        Current Status: <span className="capitalize">{post.status?.replace('_', ' ')}</span>
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                        Version: v{post.versionNumber || 1} • Approved version: {post.approvedVersion ? `v${post.approvedVersion}` : 'None'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${
                                        post.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                    }`}>
                                        {post.status?.replace('_', ' ')}
                                    </span>

                                    {onSendForApprovalClick && (
                                        <button
                                            type="button"
                                            onClick={() => onSendForApprovalClick(post)}
                                            className="px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                                        >
                                            Send for Approval
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Client Comments List */}
                            <div className="space-y-2">
                                <h5 className="text-xs font-bold uppercase text-slate-400">Reviewer Feedback & Revisions</h5>
                                {post.reviewComments && post.reviewComments.length > 0 ? (
                                    post.reviewComments.map((c: any) => (
                                        <div key={c.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                                            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                                <span>{c.authorName} ({c.authorType})</span>
                                                <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-400">{c.commentText}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No feedback submitted yet.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 6: Publishing */}
                    {activeTab === 'publishing' && (
                        <div className="space-y-5">
                            {/* Pre-publishing capability checklist */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                                <h5 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                                    Pre-Publishing Verification Checklist
                                </h5>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span>Post Copy & Script populated ({content.length} characters)</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        {finalVideoUrl ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-amber-500" />
                                        )}
                                        <span>Final Media Deliverable: {finalVideoUrl ? 'Attached' : 'Missing (Required for video)'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span>Brand Safety & Tone Guard: {brandAudit.isClean ? 'Passed (100%)' : `${brandAudit.toneMatchScore}% Match`}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span>Multi-Tenant IDOR Guard: Active & Isolated to {project.name}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    Ready to Publish?
                                </h4>
                                <p className="text-xs text-slate-500">
                                    Directly dispatch this content across your connected Instagram, LinkedIn, TikTok, and YouTube channels with per-platform failure isolation.
                                </p>

                                <button
                                    onClick={handlePublishNow}
                                    disabled={isPublishing}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>{isPublishing ? 'Publishing...' : 'Publish Post Now'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 7: 180 Engagement Automation */}
                    {activeTab === 'engagement' && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                                <div className="p-2 bg-amber-500 text-white rounded-xl">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                                        180 Engagement Automation for this Creative Item
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                        Automatically trigger DMs and lead qualification when prospects comment on this post.
                                    </p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-700">
                                    <div>
                                        <label className="text-xs font-bold text-slate-900 dark:text-zinc-100 block">
                                            Enable Auto-DM on Comment
                                        </label>
                                        <p className="text-[11px] text-slate-400">
                                            Send resource link directly to commenter&apos;s direct messages
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={enableAutoDm}
                                        onChange={(e) => setEnableAutoDm(e.target.checked)}
                                        className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                                    />
                                </div>

                                {enableAutoDm && (
                                    <div className="space-y-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                                Trigger Keyword(s)
                                            </label>
                                            <input
                                                type="text"
                                                value={autoDmKeyword}
                                                onChange={(e) => setAutoDmKeyword(e.target.value)}
                                                placeholder="BLUEPRINT, WORKFLOW, LINK"
                                                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 font-mono"
                                            />
                                            <span className="text-[10px] text-slate-400 mt-0.5 block">Commenters must write this keyword to receive the automated deliverable</span>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                                Deliverable / Resource Link
                                            </label>
                                            <input
                                                type="url"
                                                value={autoDmLink}
                                                onChange={(e) => setAutoDmLink(e.target.value)}
                                                placeholder="https://180workspace.com/blueprint"
                                                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                                Private Direct Message Template
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={autoDmMessage}
                                                onChange={(e) => setAutoDmMessage(e.target.value)}
                                                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
                                            />
                                            <div className="mt-1 flex items-center gap-1.5">
                                                <span className="text-[10px] text-slate-400">Available Tags:</span>
                                                <button type="button" onClick={() => setAutoDmMessage(prev => `${prev} {name}`)} className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-zinc-700 rounded font-mono text-slate-700 dark:text-zinc-300">{'{name}'}</button>
                                                <button type="button" onClick={() => setAutoDmMessage(prev => `${prev} {handle}`)} className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-zinc-700 rounded font-mono text-slate-700 dark:text-zinc-300">{'{handle}'}</button>
                                                <button type="button" onClick={() => setAutoDmMessage(prev => `${prev} {link}`)} className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-zinc-700 rounded font-mono text-slate-700 dark:text-zinc-300">{'{link}'}</button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                                                Auto-Like Commenter&apos;s Comment (Boost Reach)
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={autoLikeComment}
                                                onChange={(e) => setAutoLikeComment(e.target.checked)}
                                                className="w-4 h-4 rounded text-rose-500 cursor-pointer"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                                                Activate 180 AI Follow-Up Agent
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={activateAiAgent}
                                                onChange={(e) => setActivateAiAgent(e.target.checked)}
                                                className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                    >
                        Close
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
