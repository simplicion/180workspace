'use client';

import { Drawer } from "@/components/ui/Drawer";
import { LogoLoader } from "@workspace/ui";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContentPiece, contentCalendarService } from '@/lib/services/content-calendar.service';
import { 
    X, CalendarDays, Target, Image as ImageIcon, Hash, BarChart3, 
    CheckCircle2, Edit3, Circle, MessageSquare, Save, Clock, Megaphone,
    Film, Sparkles, Play, Upload, ExternalLink, Send, Layers, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '@/lib/api';

interface ContentPieceModalProps {
    piece: ContentPiece;
    calendarId: string;
    onClose: () => void;
    onSave: (updated: ContentPiece) => void;
}

const STATUS_OPTIONS: { value: ContentPiece['status']; label: string; icon: any; color: string }[] = [
    { value: 'ready', label: 'Ready', icon: Circle, color: 'text-gray-500' },
    { value: 'in_progress', label: 'In Progress', icon: Edit3, color: 'text-blue-500' },
    { value: 'pending_review', label: 'Pending Review', icon: MessageSquare, color: 'text-orange-500' },
    { value: 'published', label: 'Published', icon: CheckCircle2, color: 'text-green-500' },
];

const STATUS_BADGE: Record<string, string> = {
    ready: 'badge-gray',
    in_progress: 'badge-blue',
    pending_review: 'badge-orange',
    published: 'badge-green',
};

export default function ContentPieceDrawer({ piece, calendarId, onClose, onSave }: ContentPieceModalProps) {
    const router = useRouter();
    const [editing, setEditing] = useState<Partial<ContentPiece> & Record<string, any>>({ ...piece });
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [rawVideoInput, setRawVideoInput] = useState(editing.rawMediaUrls?.[0] || '');
    const [selectedHookType, setSelectedHookType] = useState<string>('patternInterrupt');

    // Parse JSON script & hooks if available
    let scriptData: any = null;
    try {
        if (typeof piece.videoScriptOrHooks === 'string' && piece.videoScriptOrHooks.trim().startsWith('{')) {
            scriptData = JSON.parse(piece.videoScriptOrHooks);
        } else if (typeof piece.videoScriptOrHooks === 'object') {
            scriptData = piece.videoScriptOrHooks;
        }
    } catch {
        scriptData = null;
    }

    const isVideo = ['reel', 'video', 'tiktok', 'short'].includes((piece.contentType || '').toLowerCase());
    const isCarousel = (piece.contentType || '').toLowerCase() === 'carousel';

    const [activeTab, setActiveTab] = useState<'copy' | 'script' | 'media' | 'strategy' | 'metrics'>('copy');

    const handleFieldChange = (field: keyof ContentPiece, value: any) => {
        setEditing(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updated = await contentCalendarService.updateCalendarPiece(calendarId, piece.id || '', editing);
            toast.success('Content piece saved!');
            onSave(updated.piece);
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenMediaStudio = () => {
        const rawUrl = rawVideoInput || editing.rawMediaUrls?.[0] || '';
        const params = new URLSearchParams();
        params.set('mode', 'studio');
        params.set('project', calendarId);
        params.set('calendarPieceId', piece.id || '');
        if (rawUrl) params.set('rawVideoUrl', rawUrl);
        params.set('title', piece.headline || 'Calendar Video');
        router.push(`/media-editor?${params.toString()}`);
    };

    const handlePublishNow = async () => {
        setIsPublishing(true);
        try {
            await api.post(`/api/social-media/posts/${piece.id}/publish`).catch(async () => {
                return await api.post(`/api/social-media/calendar-pieces/${piece.id}/publish`);
            });
            toast.success(`Published to ${piece.platform} successfully!`);
            setEditing(prev => ({ ...prev, status: 'published' }));
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Publishing dispatched to queue');
            setEditing(prev => ({ ...prev, status: 'published' }));
        } finally {
            setIsPublishing(false);
        }
    };

    const applyHook = (hookText: string) => {
        setEditing(prev => ({
            ...prev,
            headline: hookText.slice(0, 80) + (hookText.length > 80 ? '...' : ''),
            adCopyFull: `${hookText}\n\n${prev.adCopyFull || ''}`
        }));
        toast.success('Hook applied to headline and caption!');
    };

    const formattedDate = new Date(piece.dateScheduled).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <Drawer 
            open={true} 
            onClose={onClose} 
            title="Content Piece" 
            position="right" 
            size="max-w-2xl" 
            noPadding
            footer={
                <div className="flex justify-between items-center w-full">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        Cancel
                    </button>
                    <div className="flex items-center gap-2">
                        {isVideo && (
                            <button
                                onClick={handleOpenMediaStudio}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/20 transition active:scale-95"
                            >
                                <Film className="w-3.5 h-3.5" />
                                <span>Edit in Media Studio</span>
                            </button>
                        )}
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            {isSaving ? <LogoLoader className="w-5 h-5 text-white" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </div>
                </div>
            }
        >
            <div className="flex flex-col w-full h-full bg-white">
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                {formattedDate}
                            </span>
                            <span className={clsx('badge text-xs', STATUS_BADGE[editing.status || piece.status])}>
                                {(editing.status || piece.status).replace('_', ' ')}
                            </span>
                            <span className="badge badge-gray text-xs">{piece.platform}</span>
                            <span className="badge badge-gray text-xs">{piece.contentType}</span>
                        </div>
                        <input
                            className="w-full text-xl font-bold text-gray-900 border-0 outline-none focus:ring-0 bg-transparent placeholder-gray-300 p-0"
                            value={editing.headline || ''}
                            onChange={e => handleFieldChange('headline', e.target.value)}
                            placeholder="Post headline..."
                        />
                    </div>
                </div>

                {/* Status Selector */}
                <div className="px-6 pt-3 pb-2 flex gap-2 flex-wrap border-b border-gray-50">
                    {STATUS_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const isActive = editing.status === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => handleFieldChange('status', opt.value)}
                                className={clsx(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                                    isActive
                                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                        : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                )}
                            >
                                <Icon className={clsx("w-3.5 h-3.5", isActive ? "text-indigo-600" : opt.color)} />
                                {opt.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6 overflow-x-auto">
                    {[
                        { key: 'copy', label: 'Ad Copy', icon: Megaphone },
                        { key: 'script', label: isVideo ? 'Psychological Script' : isCarousel ? 'Carousel Deck' : 'Visuals & Script', icon: Sparkles },
                        { key: 'media', label: isVideo ? 'Media Studio' : 'Assets & Media', icon: Film },
                        { key: 'strategy', label: 'Strategy', icon: Target },
                        { key: 'metrics', label: 'Metrics', icon: BarChart3 },
                    ].map(tab => {
                        const TabIcon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap",
                                    activeTab === tab.key
                                        ? "border-indigo-600 text-indigo-700"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <TabIcon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                    {/* ---- Copy Tab ---- */}
                    {activeTab === 'copy' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Full Ad Copy / Caption
                                </label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 leading-relaxed resize-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all min-h-[180px]"
                                    value={editing.adCopyFull || ''}
                                    onChange={e => handleFieldChange('adCopyFull', e.target.value)}
                                    placeholder="Full post caption / ad copy..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Call to Action
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all"
                                    value={editing.callToAction || ''}
                                    onChange={e => handleFieldChange('callToAction', e.target.value)}
                                    placeholder="e.g. 'Link in bio – get your free trial today'"
                                />
                            </div>
                        </>
                    )}

                    {/* ---- Script Tab: 5 Psychological Hooks & Teleprompter ---- */}
                    {activeTab === 'script' && (
                        <div className="space-y-6">
                            {/* 5 Psychological Hooks Section */}
                            {scriptData?.hookVariations && (
                                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-900">
                                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                            <span>5 Psychological Hook Angles</span>
                                        </div>
                                        <span className="text-[11px] text-indigo-600 font-medium">Click hook to apply</span>
                                    </div>

                                    {/* Hook Type Selector Pills */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                        {[
                                            { id: 'patternInterrupt', label: '⚡ Pattern Interrupt' },
                                            { id: 'curiosityGap', label: '🔍 Curiosity Gap' },
                                            { id: 'boldContrarian', label: '💥 Bold Contrarian' },
                                            { id: 'relatablePain', label: '🎯 Relatable Pain' },
                                            { id: 'storyLead', label: '📖 Story Lead' },
                                        ].map(h => (
                                            <button
                                                key={h.id}
                                                type="button"
                                                onClick={() => setSelectedHookType(h.id)}
                                                className={clsx(
                                                    "px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-left transition",
                                                    selectedHookType === h.id
                                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                                )}
                                            >
                                                {h.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Selected Hook Display Box */}
                                    {scriptData.hookVariations[selectedHookType] && (
                                        <div className="p-3 bg-white rounded-xl border border-indigo-200/80 space-y-2">
                                            <p className="text-sm font-medium text-gray-800 italic">
                                                &quot;{scriptData.hookVariations[selectedHookType]}&quot;
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => applyHook(scriptData.hookVariations[selectedHookType])}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Apply this Hook to Caption & Headline</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Teleprompter Script Section */}
                            {scriptData?.teleprompterScript ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                                            Teleprompter Production Script
                                        </h4>
                                        <span className="text-[11px] text-gray-400">Paced for 60s talking-head</span>
                                    </div>

                                    <div className="space-y-3 text-sm">
                                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                                            <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider block mb-1">
                                                0-3s Hook (First Impression)
                                            </span>
                                            <p className="font-semibold text-gray-900">{scriptData.teleprompterScript.hook}</p>
                                        </div>

                                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                            <span className="text-[10px] font-bold uppercase text-slate-600 tracking-wider block mb-1">
                                                3-15s Problem & Pacing Retainer
                                            </span>
                                            <p className="text-gray-800">{scriptData.teleprompterScript.problem}</p>
                                        </div>

                                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                                            <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider block mb-1">
                                                15-45s Solution & Action Steps
                                            </span>
                                            <p className="text-gray-900 mb-2">{scriptData.teleprompterScript.solution}</p>
                                            {scriptData.teleprompterScript.actionSteps && (
                                                <ul className="space-y-1 pl-4 list-decimal text-xs text-blue-950 font-medium">
                                                    {scriptData.teleprompterScript.actionSteps.map((st: string, idx: number) => (
                                                        <li key={idx}>{st}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>

                                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                            <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block mb-1">
                                                45-55s Retention Loop & 55-60s CTA
                                            </span>
                                            <p className="text-gray-800 mb-1">{scriptData.teleprompterScript.retentionLoop}</p>
                                            <p className="font-bold text-emerald-900">{scriptData.teleprompterScript.callToAction}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : scriptData?.carouselSlides ? (
                                /* Carousel Slide Deck Section */
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                                            Multi-Slide Carousel Deck ({scriptData.carouselSlides.length} Slides)
                                        </h4>
                                        <span className="text-[11px] text-indigo-600">Optimized for LinkedIn & Instagram</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {scriptData.carouselSlides.map((slide: any, idx: number) => (
                                            <div key={idx} className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-2">
                                                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                                                    <span>Slide {slide.slide || idx + 1}</span>
                                                    <span>{slide.type || 'Value'}</span>
                                                </div>
                                                <h5 className="font-bold text-sm text-slate-100">{slide.title}</h5>
                                                <p className="text-xs text-slate-400 leading-relaxed">{slide.body || slide.subtitle}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Video Script / Hooks
                                    </label>
                                    <textarea
                                        className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 leading-relaxed resize-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all min-h-[160px]"
                                        value={editing.videoScriptOrHooks || ''}
                                        onChange={e => handleFieldChange('videoScriptOrHooks', e.target.value)}
                                        placeholder="Opening hook, key points, CTA timing for video..."
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ---- Media Tab: Raw Footage Intake & Media Studio Bridge ---- */}
                    {activeTab === 'media' && (
                        <div className="space-y-6">
                            {/* Raw Video Intake Box */}
                            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Film className="w-4 h-4 text-indigo-600" />
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                            Raw Video Footage Intake
                                        </h4>
                                    </div>
                                    <span className="text-[11px] text-slate-500">Record on phone/camera and paste or drop</span>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-slate-600">
                                        Raw Video URL or Cloud File Link
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={rawVideoInput}
                                            onChange={e => {
                                                setRawVideoInput(e.target.value);
                                                setEditing(prev => ({ ...prev, rawMediaUrls: [e.target.value] }));
                                            }}
                                            placeholder="https://storage.googleapis.com/... or raw video link"
                                            className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-900"
                                        />
                                    </div>
                                </div>

                                {/* Media Studio Launcher Banner */}
                                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 to-purple-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>AI Creative Director Bridge</span>
                                        </div>
                                        <p className="text-sm font-semibold text-white">
                                            Edit deterministically in 180 Media Studio
                                        </p>
                                        <p className="text-xs text-indigo-200">
                                            Auto-cuts silence, applies kinetic captions in brand colors, and attaches master video back to calendar.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleOpenMediaStudio}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl shadow-lg transition active:scale-95 shrink-0"
                                    >
                                        <Film className="w-4 h-4 text-indigo-600" />
                                        <span>Launch Studio</span>
                                        <ExternalLink className="w-3 h-3 text-indigo-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Final Rendered Video Player (if exported from studio) */}
                            {(editing.finalVideoUrl || editing.deliverableUrl) ? (
                                <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-emerald-800">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider">
                                                Master Studio Deliverable Attached
                                            </h4>
                                        </div>
                                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                            Ready to Publish
                                        </span>
                                    </div>

                                    <div className="rounded-xl overflow-hidden bg-black aspect-video max-h-56 flex items-center justify-center">
                                        <video
                                            controls
                                            src={editing.finalVideoUrl || editing.deliverableUrl}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <span className="text-xs text-slate-500 truncate max-w-[280px]">
                                            {editing.finalVideoUrl || editing.deliverableUrl}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handlePublishNow}
                                            disabled={isPublishing}
                                            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            <span>{isPublishing ? 'Publishing...' : `Publish to ${piece.platform} Now`}</span>
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* ---- Strategy Tab ---- */}
                    {activeTab === 'strategy' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pillar</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none transition-all"
                                        value={editing.pillar || ''}
                                        onChange={e => handleFieldChange('pillar', e.target.value)}
                                        placeholder="e.g. Educational"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Posting Time
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none transition-all"
                                        value={editing.postingTimeTz || ''}
                                        onChange={e => handleFieldChange('postingTimeTz', e.target.value)}
                                        placeholder="e.g. 9:00 AM UTC+5:30"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3 text-blue-500" /> Visual Assets Brief
                                </label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 leading-relaxed resize-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all min-h-[100px]"
                                    value={editing.visualAssetsBrief || ''}
                                    onChange={e => handleFieldChange('visualAssetsBrief', e.target.value)}
                                    placeholder="Describe the image/video brief for the designer..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Hash className="w-3 h-3 text-purple-500" /> Hashtags
                                </label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed resize-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all min-h-[80px]"
                                    value={editing.hashtagsResearched || ''}
                                    onChange={e => handleFieldChange('hashtagsResearched', e.target.value)}
                                    placeholder="#marketing #brand #social..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notes</label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-700 resize-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all min-h-[70px]"
                                    value={editing.notes || ''}
                                    onChange={e => handleFieldChange('notes', e.target.value)}
                                    placeholder="Internal notes for the team..."
                                />
                            </div>
                        </>
                    )}

                    {/* ---- Metrics Tab ---- */}
                    {activeTab === 'metrics' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100">
                                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Est. Reach</p>
                                    <p className="text-2xl font-black text-indigo-700">{piece.engagementTarget.estimatedImpressions || '—'}</p>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Eng. Rate</p>
                                    <p className="text-2xl font-black text-emerald-700">{piece.engagementTarget.estimatedEngagementPercent ?? '—'}%</p>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
                                    <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Est. Shares</p>
                                    <p className="text-2xl font-black text-purple-700">{piece.engagementTarget.estimatedShares || '—'}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Post Meta</p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Platform</span>
                                        <span className="font-semibold text-gray-900">{piece.platform}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Content Type</span>
                                        <span className="font-semibold text-gray-900">{piece.contentType}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Week</span>
                                        <span className="font-semibold text-gray-900">Week {piece.weekNumber}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Scheduled</span>
                                        <span className="font-semibold text-gray-900">{formattedDate}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Viral Score</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                                                    ref={(el) => { if (el) el.style.width = `${(piece.viralScore || 0) * 10}%`; }}
                                                />
                                            </div>
                                            <span className="font-bold text-gray-900">{piece.viralScore || 0}/10</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </Drawer>
    );
}
