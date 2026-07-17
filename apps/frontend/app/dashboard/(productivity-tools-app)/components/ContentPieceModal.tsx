'use client';

import { LogoLoader } from "@workspace/ui";
import { useState } from 'react';
import { ContentPiece, contentCalendarService } from '@/lib/services/content-calendar.service';
import { X, CalendarDays, Target, Image as ImageIcon, Hash, BarChart3, CheckCircle2, Edit3, Circle, MessageSquare, Save, Clock, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

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

export default function ContentPieceModal({ piece, calendarId, onClose, onSave }: ContentPieceModalProps) {
    const [editing, setEditing] = useState<Partial<ContentPiece>>({ ...piece });
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'copy' | 'strategy' | 'metrics'>('copy');

    const handleFieldChange = (field: keyof ContentPiece, value: any) => {
        setEditing(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updated = await contentCalendarService.updateCalendarPiece(calendarId, piece.id, editing);
            toast.success('Content piece saved!');
            onSave(updated.piece);
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const formattedDate = new Date(piece.dateScheduled).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
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
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
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
                <div className="flex border-b border-gray-100 px-6">
                    {[
                        { key: 'copy', label: 'Ad Copy & Script', icon: Megaphone },
                        { key: 'strategy', label: 'Strategy & Visuals', icon: Target },
                        { key: 'metrics', label: 'Metrics', icon: BarChart3 },
                    ].map(tab => {
                        const TabIcon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px",
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
                                    Video Script / Hooks
                                </label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 leading-relaxed resize-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all min-h-[100px]"
                                    value={editing.videoScriptOrHooks || ''}
                                    onChange={e => handleFieldChange('videoScriptOrHooks', e.target.value)}
                                    placeholder="Opening hook, key points, CTA timing for video..."
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

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="btn px-5 py-2 text-sm"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn-primary px-6 py-2 text-sm flex items-center gap-2"
                    >
                        {isSaving ? (
                            <><LogoLoader className="w-4 h-4 animate-spin" /> Saving...</>
                        ) : (
                            <><Save className="w-4 h-4" /> Save Changes</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
