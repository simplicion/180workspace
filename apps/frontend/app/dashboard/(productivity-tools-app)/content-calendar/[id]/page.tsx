'use client';


import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { contentCalendarService, ContentCalendar, ContentPiece } from '@/lib/services/content-calendar.service';
import { CalendarDays, ArrowLeft, Calendar, Target, Hash, Info, CheckCircle2, Circle, Edit3, Image as ImageIcon, MessageSquare, Download, Bookmark, Sparkles } from 'lucide-react';

import toast from 'react-hot-toast';
import clsx from 'clsx';
import ContextActions from '@/app/dashboard/(dashboard)/_components/ContextActions';
import ContentPieceModal from '@/app/dashboard/(productivity-tools-app)/_components/ContentPieceModal';

const STATUS_COLORS: Record<string, string> = {
    ready: 'badge-gray',
    in_progress: 'badge-blue',
    pending_review: 'badge-orange',
    published: 'badge-green',
};

export default function CalendarDetailView() {
    const params = useParams();
    const router = useRouter();
    const [calendar, setCalendar] = useState<ContentCalendar | null>(null);
    const [pieces, setPieces] = useState<ContentPiece[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPiece, setSelectedPiece] = useState<ContentPiece | null>(null);
    const [exporting, setExporting] = useState(false);
    const [savingTemplate, setSavingTemplate] = useState(false);

    const fetchDetails = async () => {
        try {
            const { calendar: calData, pieces: pieceData } = await contentCalendarService.getCalendar(params.id as string);
            setCalendar(calData);
            setPieces(pieceData);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to load calendar details');
            router.push('/dashboard/content-calendar');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (params.id) fetchDetails();
    }, [params.id]);

    const handleUpdatePieceStatus = async (pieceId: string, status: ContentPiece['status']) => {
        try {
            await contentCalendarService.updateCalendarPiece(calendar!.id, pieceId, { status });
            toast.success('Status updated');
            fetchDetails(); // Refresh
        } catch (err: any) {
            toast.error('Failed to update status');
        }
    };

    const handleSaveAsTemplate = async () => {
        const name = prompt('Enter a name for this template:', `${calendar?.brandName} Strategy`);
        if (!name) return;

        setSavingTemplate(true);
        try {
            await contentCalendarService.saveAsTemplate(calendar!.id, name);
            toast.success('Strategy saved as template!');
            fetchDetails();
        } catch (err: any) {
            toast.error('Failed to save template');
        } finally {
            setSavingTemplate(false);
        }
    };

    const exportToCSV = () => {
        setExporting(true);
        try {
            const headers = ['Date', 'Platform', 'Type', 'Pillar', 'Headline', 'Copy', 'CTA', 'Hashtags', 'Reach'];
            const rows = pieces.map(p => [
                new Date(p.dateScheduled).toLocaleDateString(),
                `"${p.platform}"`,
                `"${p.contentType}"`,
                `"${p.pillar}"`,
                `"${p.headline.replace(/"/g, '""')}"`,
                `"${p.adCopyFull.replace(/"/g, '""')}"`,
                `"${p.callToAction.replace(/"/g, '""')}"`,
                `"${p.hashtagsResearched.replace(/"/g, '""')}"`,
                p.engagementTarget.estimatedImpressions
            ]);

            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `${calendar?.brandName}_Content_Calendar.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Calendar exported to CSV');
        } catch (err) {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <LogoLoader className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading calendar details...</p>
            </div>
        );
    }

    if (!calendar) return null;

    // Group pieces by week
    const weeksList = Array.from(new Set(pieces.map(p => p.weekNumber))).sort((a, b) => a - b);

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center mb-6">
                <button 
                    onClick={() => router.push('/dashboard/content-calendar')} 
                    className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Calendars
                </button>
                <div className="flex gap-2">
                    <button 
                        onClick={() => router.push(`/dashboard/content-calendar/create?extendFrom=${calendar.id}`)}
                        className="btn flex items-center gap-2 text-sm bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-200"
                    >
                        <Sparkles className="w-4 h-4" />
                        Extend for Next Month
                    </button>
                    <button 
                        onClick={handleSaveAsTemplate}
                        disabled={savingTemplate}
                        className="btn flex items-center gap-2 text-sm"
                    >
                        {savingTemplate ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
                        Save as Template
                    </button>
                    <button 
                        onClick={exportToCSV}
                        disabled={exporting}
                        className="btn-primary flex items-center gap-2 text-sm shadow-sm"
                    >
                        {exporting ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{calendar.brandName}</h1>
                            {calendar.isTemplate && <span className="badge badge-purple">Template: {calendar.templateName}</span>}
                            <span className={clsx('badge text-sm', calendar.status === 'active' ? 'badge-green' : 'badge-gray')}>
                                {calendar.status.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-gray-500 text-lg mb-4">
                            {calendar.calendarType === 'company' ? calendar.industry : `${calendar.industry} (Expertise)`} &bull; 
                            {calendar.calendarType === 'company' ? calendar.targetAudience : `Community: ${calendar.targetAudience}`}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mb-6">
                            {calendar.platforms.map(p => (
                                <span key={p} className="px-3 py-1 bg-gray-50 text-gray-700 text-sm font-medium rounded-full border border-gray-200">{p}</span>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Duration</p>
                                    <p className="font-semibold text-gray-900">{calendar.calendarDuration}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Pieces</p>
                                    <p className="font-semibold text-gray-900">{calendar.totalPieces}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <Info className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Frequency</p>
                                    <p className="font-semibold text-gray-900">{calendar.frequency.replace(/([A-Z])/g, ' $1').trim()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                    <Hash className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Posts Breakdown</p>
                                    <p className="font-semibold text-gray-900 text-sm">
                                        {calendar.postsCount} Posts, {calendar.reelsCount} Reels, {calendar.carouselsCount} Carousels
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-shrink-0 bg-gray-50 p-4 rounded-xl border border-gray-100 w-full md:w-72">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Goal Focus</h3>
                        <p className="text-sm text-gray-600 mb-4 italic">&quot;{calendar.engagementGoal}&quot;</p>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Pillars</h3>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                            {calendar.contentPillars.map(pillar => <li key={pillar}>{pillar}</li>)}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Content Pipeline View */}
            <div className="space-y-12">
                {weeksList.map(week => {
                    const weekPieces = pieces.filter(p => p.weekNumber === week).sort((a, b) => new Date(a.dateScheduled).getTime() - new Date(b.dateScheduled).getTime());
                    
                    return (
                        <div key={week} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                                    <CalendarDays className="w-5 h-5 mr-2 text-indigo-600" />
                                    Week {week} Schedule
                                </h2>
                                <span className="badge badge-gray">{weekPieces.length} pieces</span>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {weekPieces.map(piece => (
                                        <div 
                                            key={piece.id} 
                                            onClick={() => setSelectedPiece(piece)}
                                            className="border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col items-start bg-white cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-start w-full mb-3" onClick={e => e.stopPropagation()}>
                                                <div>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md mb-2 inline-block">
                                                        {new Date(piece.dateScheduled).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <span className="badge badge-gray bg-gray-100 text-[10px]">{piece.platform}</span>
                                                        <span className="badge badge-gray bg-gray-100 text-[10px]">{piece.contentType}</span>
                                                    </div>
                                                </div>
                                                <ContextActions 
                                                    actions={[
                                                        { label: 'Mark Ready', icon: Circle, onClick: () => handleUpdatePieceStatus(piece.id, 'ready') },
                                                        { label: 'In Progress', icon: Edit3, onClick: () => handleUpdatePieceStatus(piece.id, 'in_progress') },
                                                        { label: 'Pending Review', icon: MessageSquare, onClick: () => handleUpdatePieceStatus(piece.id, 'pending_review') },
                                                        { label: 'Publish', icon: CheckCircle2, onClick: () => handleUpdatePieceStatus(piece.id, 'published'), variant: 'primary' },
                                                    ]}
                                                />
                                            </div>

                                            <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{piece.headline}</h3>
                                            
                                            <div className="flex items-center gap-2 mb-4">
                                                <Target className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600 line-clamp-1">{piece.pillar}</span>
                                            </div>

                                            <div className="bg-gray-50 rounded-lg p-3 w-full mb-4 border border-gray-100 flex-1">
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4 leading-relaxed font-medium">
                                                    {piece.adCopyFull}
                                                </p>
                                                {piece.videoScriptOrHooks && piece.contentType.includes('Video') && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                                        <span className="text-xs font-bold text-gray-500 uppercase">Tags/Notes</span>
                                                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">{piece.videoScriptOrHooks}</p>
                                                    </div>
                                                )}
                                                <div className="mt-3 flex items-start gap-2">
                                                    <ImageIcon className="w-4 h-4 mt-0.5 text-blue-500" />
                                                    <p className="text-xs text-blue-800 line-clamp-2 italic">{piece.visualAssetsBrief || 'No visual notes'}</p>
                                                </div>
                                            </div>

                                            <div className="w-full flex justify-between items-center mt-auto pb-1">
                                                <span className={clsx('badge text-xs', STATUS_COLORS[piece.status] || 'badge-gray')}>
                                                    {piece.status.replace('_', ' ')}
                                                </span>
                                                <div className="text-right">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Est. Reach</span>
                                                    <span className="text-sm font-semibold text-gray-700">{piece.engagementTarget.estimatedImpressions}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {pieces.length === 0 && (
                <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                    <CalendarDays className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No pieces generated yet.</p>
                </div>
            )}

            {/* Content Detail Modal */}
            {selectedPiece && (
                <ContentPieceModal 
                    piece={selectedPiece}
                    calendarId={calendar.id}
                    onClose={() => setSelectedPiece(null)}
                    onSave={() => {
                        fetchDetails();
                        setSelectedPiece(null);
                    }}
                />
            )}
        </div>
    );
}

