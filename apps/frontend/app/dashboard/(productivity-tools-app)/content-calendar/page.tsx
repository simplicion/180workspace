'use client';


import { useEffect, useState } from 'react';
import { contentCalendarService, ContentCalendar } from '@/lib/services/content-calendar.service';
import { CalendarDays, Plus, Search, Eye, Archive, Trash2, Calendar } from 'lucide-react';
import { Skeleton, SkeletonCard } from "@workspace/ui";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ContextActions from '@/app/dashboard/(dashboard)/_components/ContextActions';
import { ConfirmModal } from "@workspace/ui";
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth-context';

const STATUS_COLORS: Record<string, string> = {
    draft: 'badge-gray',
    processing: 'badge-blue',
    active: 'badge-green',
    archived: 'badge-orange',
    failed: 'badge-red',
};

export default function ContentCalendarPage() {
    const [calendars, setCalendars] = useState<ContentCalendar[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [calendarToArchive, setCalendarToArchive] = useState<ContentCalendar | null>(null);
    const [calendarToDelete, setCalendarToDelete] = useState<ContentCalendar | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const router = useRouter();
    const { user } = useAuth();
    const canCreateCalendar = user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team')); // Adjust permissions as needed

    const fetchCalendars = async () => {
        setLoading(true);
        try {
            const { calendars } = await contentCalendarService.getCalendars(50, 0); // Need to add search/status filters to service if handled by backend
            
            // Basic frontend filtering if backend doesn't support it yet
            let filtered = calendars;
            if (search) {
                filtered = filtered.filter(c => c.brandName.toLowerCase().includes(search.toLowerCase()) || (c.industry || '').toLowerCase().includes(search.toLowerCase()));
            }
            if (status) {
                filtered = filtered.filter(c => c.status === status);
            }
            
            setCalendars(filtered);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to fetch calendars');
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async () => {
        if (!calendarToArchive) return;
        setIsActionLoading(true);
        try {
            await contentCalendarService.updateCalendar(calendarToArchive.id, { status: 'archived' });
            toast.success('Calendar archived');
            fetchCalendars();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to archive calendar');
        } finally {
            setIsActionLoading(false);
            setCalendarToArchive(null);
        }
    };

    const handleDelete = async () => {
        if (!calendarToDelete) return;
        setIsActionLoading(true);
        try {
            await contentCalendarService.deleteCalendar(calendarToDelete.id);
            toast.success('Calendar deleted');
            fetchCalendars();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to delete calendar');
        } finally {
            setIsActionLoading(false);
            setCalendarToDelete(null);
        }
    };

    useEffect(() => { fetchCalendars(); }, [search, status]);

    return (
        <div>
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Content Calendars</h1>
                    <p className="page-subtitle">{calendars.length} calendars found</p>
                </div>
                {canCreateCalendar && (
                    <button className="btn-primary" onClick={() => router.push('/dashboard/content-calendar/create')}>
                        <Plus className="w-4 h-4" />
                        Create AI Calendar
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-5">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search calendars by brand or industry..."
                        className="input pl-9"
                    />
                </div>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="select w-44" title="Filter by status">
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="processing">Processing</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                    <option value="failed">Failed</option>
                </select>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {calendars.map((calendar) => (
                        <div key={calendar.id} className="card p-5 hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between">
                            <div onClick={() => router.push(`/dashboard/content-calendar/${calendar.id}`)} className="cursor-pointer flex-1">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors line-clamp-1">{calendar.brandName}</h3>
                                    <span className={clsx('badge', STATUS_COLORS[calendar.status] || 'badge-gray')}>
                                        {calendar.status?.replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                    {calendar.industry || 'General'} &bull; {calendar.calendarDuration}
                                </p>

                                {/* Platform breakdown */}
                                <div className="mb-4 flex flex-wrap gap-2">
                                    {calendar.platforms?.map(platform => (
                                        <span key={platform} className="badge badge-gray text-[10px] px-2 py-0.5">{platform}</span>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
                                    <div className="flex items-center gap-2 text-xs text-gray-500" title="Start Date">
                                        <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center">
                                            <Calendar className="w-3 h-3 text-blue-500" />
                                        </div>
                                        <span>{calendar.startDate ? new Date(calendar.startDate).toLocaleDateString() : 'Not set'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500" title="Total Pieces">
                                        <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center">
                                            <CalendarDays className="w-3 h-3 text-indigo-500" />
                                        </div>
                                        <span>{calendar.totalPieces} posts</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50 flex justify-end">
                                <ContextActions
                                    actions={[
                                        {
                                            label: 'Open',
                                            icon: Eye,
                                            onClick: () => router.push(`/dashboard/content-calendar/${calendar.id}`),
                                            variant: 'primary'
                                        },
                                        {
                                            label: 'Archive',
                                            icon: Archive,
                                            onClick: () => setCalendarToArchive(calendar)
                                        },
                                        {
                                            label: 'Delete',
                                            icon: Trash2,
                                            onClick: () => setCalendarToDelete(calendar),
                                            variant: 'danger'
                                        }
                                    ]}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {
                !loading && calendars.length === 0 && (
                    <div className="text-center py-20">
                        <CalendarDays className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium">No calendars found</p>
                        <p className="text-gray-300 text-sm mt-1">Try adjusting filters or create a new AI calendar</p>
                    </div>
                )
            }

            <ConfirmModal
                isOpen={!!calendarToArchive}
                title="Archive Calendar"
                message={`Are you sure you want to archive "${calendarToArchive?.brandName}"?`}
                onConfirm={handleArchive}
                onCancel={() => setCalendarToArchive(null)}
                loading={isActionLoading}
            />

            <ConfirmModal
                isOpen={!!calendarToDelete}
                title="Delete Calendar"
                message={`Are you sure you want to delete "${calendarToDelete?.brandName}"? This will also delete all associated content pieces.`}
                confirmText="Delete"
                onConfirm={handleDelete}
                onCancel={() => setCalendarToDelete(null)}
                loading={isActionLoading}
                variant="danger"
            />
        </div>
    );
}

