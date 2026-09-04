'use client';


import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { ChevronLeft, ChevronRight, Plus, X, Calendar, Trash2, Circle, Video, MapPin, Link2, Users, Clock, Mail, RefreshCw, ExternalLink, CheckCircle, Phone, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, parseISO } from 'date-fns';
import { useSettings } from '@/lib/settings-context';
import { ConfirmModal , LogoLoader } from "@workspace/ui";
import { MeetingSummaryDrawer } from '@/app/(platform)/(communications-app)/_components/MeetingSummaryDrawer';
import { Drawer } from '@/components/ui/Drawer';
import CustomSelect from '@/components/ui/CustomSelect';
import UserSelectionModal from '@/components/shared/UserSelectionModal';

const EVENT_TYPES = [
    { key: 'holiday', label: 'Holiday', color: '#ef4444' },
    { key: 'event', label: 'Event', color: '#4f46e5' },
    { key: 'meeting', label: 'Meeting', color: '#0ea5e9' },
    { key: 'deadline', label: 'Deadline', color: '#f59e0b' },
    { key: 'leave', label: 'Leave', color: '#10b981' },
    { key: 'other', label: 'Other', color: '#6b7280' },
];

// PLATFORMS moved inside CalendarPage

function getEventColor(type: string) {
    return EVENT_TYPES.find(e => e.key === type)?.color || '#6b7280';
}

function PlatformBadge({ platform, PLATFORMS }: { platform: string; PLATFORMS: any[] }) {
    const p = PLATFORMS.find(x => x.key === platform);
    return p ? <span className="text-xs">{p.icon} {p.label}</span> : null;
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────
function getDuration(start: string, end: string) {
    if (!start || !end) return '';
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
    if (diff < 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0 && m > 0) return `(${h}h ${m}m)`;
    if (h > 0) return `(${h}h)`;
    return `(${m}m)`;
}

function AddEventModal({ date, onClose, onSuccess, user, PLATFORMS, eventToEdit }: { date?: Date; onClose: () => void; onSuccess: () => void; user: any; PLATFORMS: any[]; eventToEdit?: any }) {
    const isEdit = !!eventToEdit;
    const [form, setForm] = useState({
        title: eventToEdit?.title || '',
        description: eventToEdit?.description || '',
        type: eventToEdit?.type || 'event',
        startDateTime: eventToEdit?.startDate ? format(new Date(eventToEdit.startDate + (eventToEdit.meeting?.startTime ? `T${eventToEdit.meeting.startTime}` : 'T10:00:00')), "yyyy-MM-dd'T'HH:mm") : (date ? format(date, "yyyy-MM-dd'T'10:00") : ''),
        endDateTime: eventToEdit?.endDate ? format(new Date(eventToEdit.endDate + (eventToEdit.meeting?.endTime ? `T${eventToEdit.meeting.endTime}` : 'T11:00:00')), "yyyy-MM-dd'T'HH:mm") : (date ? format(date, "yyyy-MM-dd'T'11:00") : ''),
        allDay: eventToEdit?.allDay ?? true,
        color: eventToEdit?.color || '#4f46e5',
        isCompanyWide: eventToEdit?.isCompanyWide ?? true,
    });

    // Meeting-specific
    const [meeting, setMeeting] = useState({
        platform: eventToEdit?.meeting?.platform || 'google_meet',
        meetingLink: eventToEdit?.meeting?.meetingLink || '',
        location: eventToEdit?.meeting?.location || '',
        agenda: eventToEdit?.meeting?.agenda || '',
        attendeeIds: eventToEdit?.meeting?.attendees?.map((a: any) => a.id) || [] as string[],
        clientIds: eventToEdit?.clients?.map((c: any) => c.id) || [] as string[],
        externalAttendees: eventToEdit?.meeting?.externalAttendees?.join(', ') || '',
        reminderMinutes: eventToEdit?.reminderMinutes || 15,
        notes: eventToEdit?.meeting?.notes || '',
    });

    const [users, setUsers] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);

    const isMeeting = form.type === 'meeting';
    const selectedPlatform = PLATFORMS.find(p => p.key === meeting.platform);
    const isNative = meeting.platform === 'platform_meeting';
    const needsLink = ['google_meet', 'zoom', 'teams', 'others'].includes(meeting.platform);
    const needsLocation = meeting.platform === 'in_person';

    useEffect(() => {
        api.get('/api/users', { params: { limit: 200 } })
            .then(r => setUsers(r.data.users || []))
            .catch(() => { });
            
        api.get('/api/clients', { params: { limit: 200 } })
            .then(r => setClients(r.data.clients || []))
            .catch(() => { });
    }, []);

    function changeType(type: string) {
        const col = getEventColor(type);
        setForm(p => ({ ...p, type, color: col }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.title) return toast.error('Title is required');

        setLoading(true);
        setSendingEmail(isMeeting);

        try {
            const startDate = form.startDateTime.split('T')[0];
            const endDate = form.endDateTime.split('T')[0];
            const payload: any = { ...form, startDate, endDate };

            if (isMeeting) {
                const startTime = form.startDateTime.split('T')[1] || "10:00";
                const endTime = form.endDateTime.split('T')[1] || "11:00";
                const roomId = isNative ? `ims-${user?.companyId}-meeting-${Date.now()}` : '';
                payload.meeting = {
                    startTime,
                    endTime,
                    platform: meeting.platform,
                    roomId: roomId || null,
                    meetingLink: isNative ? `${window.location.origin}/dashboard/meeting/${roomId}` : (meeting.meetingLink || null),
                    location: meeting.location || null,
                    agenda: meeting.agenda || null,
                    attendees: meeting.attendeeIds,
                    clientIds: meeting.clientIds,
                    externalAttendees: meeting.externalAttendees
                        .split(/[\n,;]+/)
                        .map(s => s.trim())
                        .filter(Boolean),
                    reminderMinutes: Number(meeting.reminderMinutes),
                    notes: meeting.notes || null,
                };
                payload.allDay = false;
            }

            let response;
            if (isEdit) {
                response = await api.put(`/api/calendar/${eventToEdit.id}`, payload);
            } else {
                response = await api.post('/api/calendar', payload);
            }
            
            if (response.data.warning) {
                toast.success(isEdit ? 'Event updated!' : (isMeeting ? 'Meeting created!' : 'Event created!'));
                toast.error(response.data.warning, { duration: 6000, icon: '⚠️' });
            } else {
                toast.success(isEdit ? 'Event updated!' : (isMeeting ? 'Meeting created! Invite emails sent.' : 'Event created!'));
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to create event');
        } finally {
            setLoading(false);
            setSendingEmail(false);
        }
    }

    return (
        <>
            <Drawer
                isOpen={true}
                onClose={onClose}
                maxWidth="max-w-xl"
                title={
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Event' : 'Add Event'} — {date ? format(date, 'MMM d, yyyy') : ''}</h2>
                        {isMeeting && !isEdit && (
                            <p className="text-xs text-sky-500 mt-0.5 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Invite emails will be sent automatically
                            </p>
                        )}
                    </div>
                }
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button
                            type="submit"
                            form="event-form"
                            disabled={loading}
                            className="btn-primary min-w-[140px]"
                        >
                            {loading ? (
                                <><LogoLoader className="w-4 h-4 animate-spin" /> {sendingEmail ? 'Sending Invites...' : 'Creating...'}</>
                            ) : isMeeting ? (
                                <><Video className="w-4 h-4" /> Create Meeting</>
                            ) : (
                                <><Plus className="w-4 h-4" /> Create Event</>
                            )}
                        </button>
                    </div>
                }
            >
                <div className="px-1 py-2">
                    <form id="event-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Base Fields */}
                        <div>
                            <label className="label">Event Title *</label>
                            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input" placeholder={isMeeting ? 'e.g. Q1 Strategy Meeting' : 'e.g. Company All Hands'} required />
                        </div>

                        <div>
                            <label className="label">Type</label>
                            <CustomSelect value={form.type} onChange={e => changeType(e.target.value)} className="select">
                                {EVENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                            </CustomSelect>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="label">Start Date & Time</label>
                                <input type="datetime-local" value={form.startDateTime} onChange={e => setForm(p => ({ ...p, startDateTime: e.target.value }))} className="input" />
                            </div>
                            <div>
                                <label className="label">End Date & Time</label>
                                <input type="datetime-local" value={form.endDateTime} onChange={e => setForm(p => ({ ...p, endDateTime: e.target.value }))} className="input" />
                            </div>
                        </div>

                        <div>
                            <label className="label">Description</label>
                            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input resize-none" rows={2} placeholder="Brief description..." />
                        </div>

                        {/* ──────────────── MEETING FIELDS ──────────────── */}
                        {isMeeting && (
                            <div className="space-y-6 pt-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-px bg-sky-100" />
                                    <span className="text-xs font-bold text-sky-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <Video className="w-3.5 h-3.5" /> Meeting Details
                                    </span>
                                    <div className="flex-1 h-px bg-sky-100" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Platform */}
                                    <div>
                                        <label className="label flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Platform</label>
                                        <CustomSelect value={meeting.platform} onChange={e => setMeeting(m => ({ ...m, platform: e.target.value, meetingLink: '' }))} className="select">
                                            {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                                        </CustomSelect>
                                    </div>

                                    {/* Reminder */}
                                    <div>
                                        <label className="label flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Reminder (minutes before)</label>
                                        <CustomSelect value={meeting.reminderMinutes} onChange={e => setMeeting(m => ({ ...m, reminderMinutes: Number(e.target.value) }))} className="select w-full">
                                            {[5, 10, 15, 30, 60, 120].map(v => <option key={v} value={v}>{v} min before</option>)}
                                        </CustomSelect>
                                    </div>
                                </div>

                                {/* Meeting link (for online platforms) */}
                                {needsLink && (
                                    <div>
                                        <label className="label flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Meeting Link</label>
                                        <div className="relative">
                                            <input
                                                type="url"
                                                value={meeting.meetingLink}
                                                onChange={e => setMeeting(m => ({ ...m, meetingLink: e.target.value }))}
                                                className="input pl-4 pr-10"
                                                placeholder={selectedPlatform?.placeholder || 'https://...'}
                                            />
                                            {meeting.meetingLink && (
                                                <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sky-500">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Location (for in-person) */}
                                {needsLocation && (
                                    <div>
                                        <label className="label flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Location *</label>
                                        <input
                                            required={needsLocation}
                                            type="text"
                                            value={meeting.location}
                                            onChange={e => setMeeting(m => ({ ...m, location: e.target.value }))}
                                            className="input"
                                            placeholder="e.g. Conference Room A, Floor 3"
                                        />
                                    </div>
                                )}

                                {/* Internal Attendees and Clients */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Team Members */}
                                    <div>
                                        <label className="label flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Team Members</label>
                                        <button type="button" onClick={() => setShowTeamModal(true)} className="btn-secondary w-full text-sm py-2">
                                            <Plus className="w-4 h-4 mr-1" /> Select Team Members
                                        </button>
                                        {meeting.attendeeIds.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {meeting.attendeeIds.map(id => {
                                                    const u = users.find(x => x.id === id);
                                                    if (!u) return null;
                                                    return (
                                                        <div key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                                                            <div className="w-4 h-4 rounded-full bg-indigo-200 text-[9px] flex items-center justify-center text-indigo-700">{u.name?.[0]?.toUpperCase()}</div>
                                                            {u.name}
                                                            <button type="button" onClick={() => setMeeting(m => ({ ...m, attendeeIds: m.attendeeIds.filter(x => x !== id) }))} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Clients */}
                                    <div>
                                        <label className="label flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Clients</label>
                                        <button type="button" onClick={() => setShowClientModal(true)} className="btn-secondary w-full text-sm py-2">
                                            <Plus className="w-4 h-4 mr-1" /> Select Clients
                                        </button>
                                        {meeting.clientIds.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {meeting.clientIds.map(id => {
                                                    const c = clients.find(x => x.id === id);
                                                    if (!c) return null;
                                                    return (
                                                        <div key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-xs font-medium text-sky-700 border border-sky-100">
                                                            <div className="w-4 h-4 rounded-full bg-sky-200 text-[9px] flex items-center justify-center text-sky-700">{c.name?.[0]?.toUpperCase()}</div>
                                                            {c.name}
                                                            <button type="button" onClick={() => setMeeting(m => ({ ...m, clientIds: m.clientIds.filter(x => x !== id) }))} className="text-sky-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* External Attendees */}
                                <div>
                                    <label className="label flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> External Attendees <span className="text-gray-400 font-normal">(email addresses)</span></label>
                                    <textarea
                                        value={meeting.externalAttendees}
                                        onChange={e => setMeeting(m => ({ ...m, externalAttendees: e.target.value }))}
                                        className="input resize-none"
                                        rows={2}
                                        placeholder={"client@example.com, partner@agency.com"}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Separate multiple emails with commas or new lines</p>
                                </div>

                                {/* Agenda & Notes */}
                                <div>
                                    <label className="label">Agenda <span className="text-gray-400 font-normal">(optional)</span></label>
                                    <textarea
                                        value={meeting.agenda}
                                        onChange={e => setMeeting(m => ({ ...m, agenda: e.target.value }))}
                                        className="input resize-none font-mono text-sm"
                                        rows={3}
                                        placeholder={"1. Project status update\n2. Q&A\n3. Next steps"}
                                    />
                                </div>
                                <div>
                                    <label className="label">Notes / Additional Info</label>
                                    <textarea value={meeting.notes} onChange={e => setMeeting(m => ({ ...m, notes: e.target.value }))} className="input resize-none" rows={4} placeholder="Detailed notes about this meeting..." />
                                </div>



                                {/* Email notice */}
                                <div className="flex items-start gap-2.5 p-3 bg-sky-50 rounded-xl border border-sky-100">
                                    <Mail className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-sky-700">
                                        <strong>Auto-email enabled:</strong> A full meeting invite (with date, time, platform, link & agenda) will be sent to all {meeting.attendeeIds.length + meeting.clientIds.length + meeting.externalAttendees.split(/[\n,;]+/).filter(Boolean).length} attendee{(meeting.attendeeIds.length + meeting.clientIds.length + meeting.externalAttendees.split(/[\n,;]+/).filter(Boolean).length) !== 1 ? 's' : ''} upon creation.
                                    </p>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </Drawer>

            <UserSelectionModal
                isOpen={showTeamModal}
                onClose={() => setShowTeamModal(false)}
                type="employee"
                title="Select Team Members"
                currentIds={meeting.attendeeIds}
                onSelect={(ids) => setMeeting(m => ({ ...m, attendeeIds: ids }))}
            />

            <UserSelectionModal
                isOpen={showClientModal}
                onClose={() => setShowClientModal(false)}
                type="client"
                title="Select Clients"
                currentIds={meeting.clientIds}
                onSelect={(ids) => setMeeting(m => ({ ...m, clientIds: ids }))}
            />
        </>
    );
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
    const { platform } = useSettings();
    const { user } = useAuth();

    const PLATFORMS = [
        { key: 'google_meet', label: 'Google Meet', icon: <Video className="w-3.5 h-3.5 text-emerald-500" />, placeholder: 'https://meet.google.com/...' },
        { key: 'zoom', label: 'Zoom', icon: <Video className="w-3.5 h-3.5 text-blue-500" />, placeholder: 'https://zoom.us/j/...' },
        { key: 'teams', label: 'Microsoft Teams', icon: <Video className="w-3.5 h-3.5 text-purple-500" />, placeholder: 'https://teams.microsoft.com/...' },
        { key: 'platform_meeting', label: `Platform Meeting (${platform?.platformName || 'Native'})`, icon: <Video className="w-3.5 h-3.5 text-indigo-500" />, placeholder: 'Auto-generated room' },
        { key: 'in_person', label: 'In Person', icon: <MapPin className="w-3.5 h-3.5 text-amber-500" />, placeholder: '' },
        { key: 'phone', label: 'Phone Call', icon: <Phone className="w-3.5 h-3.5 text-indigo-500" />, placeholder: '' },
        { key: 'others', label: 'Others', icon: <Calendar className="w-3.5 h-3.5 text-gray-500" />, placeholder: '' },
    ];

    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Default to today so events display immediately
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [resendingId, setResendingId] = useState<string | null>(null);
    const [showSummaryRoomId, setShowSummaryRoomId] = useState<string | null>(null);
    const isAdmin = user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team'));

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    // Fast In-Memory SWR Cache for 0ms Instant Navigation (Slack/Notion Gold Standard)
    const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

    function loadEvents() {
        const cacheKey = `calendar:${year}:${month}`;
        const cached = swrCacheRef.current.get(cacheKey);

        if (cached) {
            setEvents(cached.data || []);
            setLoading(false);
        } else {
            setLoading(true);
        }

        api.get('/api/calendar', { params: { year, month } })
            .then(({ data }) => {
                const fetched = data.events || [];
                setEvents(fetched);
                swrCacheRef.current.set(cacheKey, { data: fetched, timestamp: Date.now() });
            })
            .catch(() => {
                if (!cached) setEvents([]);
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadEvents(); }, [year, month]);

    function prevMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
    function nextMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }

    async function handleDeleteEvent() {
        if (!showDeleteConfirm) return;
        setDeleting(true);
        try {
            await api.delete(`/api/calendar/${showDeleteConfirm}`);
            toast.success('Event deleted');
            setEvents(prev => prev.filter(e => e.id !== showDeleteConfirm));
        } catch {
            toast.error('Failed to delete');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(null);
        }
    }

    async function resendInvite(id: string) {
        setResendingId(id);
        try {
            await api.post(`/api/calendar/${id}/resend-invite`);
            toast.success('Meeting invites resent!');
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to resend');
        } finally { setResendingId(null); }
    }

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startOffset = getDay(monthStart);

    // Compare only date part (YYYY-MM-DD) to avoid UTC vs local timezone issues
    function toDateStr(d: Date) {
        return format(d, 'yyyy-MM-dd');
    }
    function toEventDateStr(dateStr: string) {
        // Handle both ISO strings and date-only strings
        return dateStr.slice(0, 10);
    }
    function getEventsForDay(day: Date) {
        const dayStr = toDateStr(day);
        return events.filter(ev => {
            const startStr = toEventDateStr(ev.startDate);
            const endStr = ev.endDate ? toEventDateStr(ev.endDate) : startStr;
            return dayStr >= startStr && dayStr <= endStr;
        });
    }

    const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

    return (
        <div>
            {(showAddModal || eventToEdit) && (
                <AddEventModal
                    date={selectedDate}
                    user={user}
                    onClose={() => { setShowAddModal(false); setEventToEdit(null); }}
                    onSuccess={loadEvents}
                    PLATFORMS={PLATFORMS}
                    eventToEdit={eventToEdit}
                />
            )}

            {showSummaryRoomId && (
                <MeetingSummaryDrawer
                    isOpen={!!showSummaryRoomId}
                    roomId={showSummaryRoomId}
                    onClose={() => setShowSummaryRoomId(null)}
                />
            )}

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Company Calendar</h1>
                    <p className="page-subtitle">Holidays, events, meetings, and deadlines</p>
                </div>
                {isAdmin && (
                    <button onClick={() => { if (!selectedDate) setSelectedDate(new Date()); setShowAddModal(true); }} className="btn-primary">
                        <Plus className="w-4 h-4" /> Add Event
                    </button>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-5">
                {EVENT_TYPES.map(t => (
                    <div key={t.key} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Circle className="w-3 h-3" style={{ fill: t.color, color: t.color }} />
                        {t.label}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Grid */}
                <div className="lg:col-span-2 card p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-xl font-bold text-gray-900">{format(currentDate, 'MMMM yyyy')}</h2>
                        <div className="flex gap-2">
                            <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => setCurrentDate(new Date())} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium">Today</button>
                            <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase py-1">{d}</div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-0.5">
                            {Array.from({ length: startOffset }).map((_, i) => (
                                <div key={`off-${i}`} className="h-20 rounded-lg" />
                            ))}
                            {days.map(day => {
                                const dayEvents = getEventsForDay(day);
                                const selected = selectedDate && isSameDay(day, selectedDate);
                                const today = isToday(day);
                                return (
                                    <div
                                        key={day.toISOString()}
                                        onClick={() => setSelectedDate(day)}
                                        className={clsx(
                                            'h-20 rounded-lg p-1.5 cursor-pointer border transition-all',
                                            selected ? 'border-indigo-400 bg-indigo-50' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                                        )}
                                    >
                                        <div className={clsx(
                                            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1',
                                            today ? 'bg-indigo-600 text-white' : 'text-gray-700'
                                        )}>
                                            {format(day, 'd')}
                                        </div>
                                        <div className="space-y-0.5">
                                            {dayEvents.slice(0, 2).map(ev => (
                                                <div key={ev.id} className="w-full truncate text-[10px] font-medium px-1 py-0.5 rounded flex items-center gap-0.5"
                                                    style={{ backgroundColor: `${ev.color}20`, color: ev.color }}>
                                                    {ev.type === 'meeting' && <Video className="w-2.5 h-2.5 flex-shrink-0" />}
                                                    {ev.title}
                                                </div>
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <div className="text-[9px] text-gray-400 font-medium pl-1">+{dayEvents.length - 2} more</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Selected Day Events */}
                <div className="card p-5 overflow-y-auto max-h-[600px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-900">
                            {format(selectedDate, 'MMMM d, yyyy')}
                        </h3>
                    </div>
                    {selectedDayEvents.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">No events on this day</p>
                            {isAdmin && (
                                <button onClick={() => setShowAddModal(true)} className="btn-secondary text-xs mt-3">
                                    <Plus className="w-3.5 h-3.5" /> Add Event
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {selectedDayEvents.map(ev => (
                                <div key={ev.id} className="p-4 rounded-xl border border-gray-100 hover:shadow-sm transition-all group">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-2 flex-1 min-w-0">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: ev.color }} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-900">{ev.title}</p>
                                                <p className="text-xs text-gray-400 capitalize mt-0.5">{ev.type}</p>

                                                {/* Meeting-specific display */}
                                                {ev.type === 'meeting' && ev.meeting && (
                                                    <div className="mt-2 space-y-1.5">
                                                        <div className="flex flex-col gap-0.5 mb-2 border-b border-gray-100 pb-2">
                                                            <p className="text-[10px] text-gray-400">Created by <span className="font-medium text-gray-700">{ev.createdBy?.name || 'Unknown'}</span></p>
                                                            {ev.createdAt && <p className="text-[10px] text-gray-400">on {format(new Date(ev.createdAt), 'MMM d, yyyy h:mm a')}</p>}
                                                        </div>
                                                        {(ev.meeting.startTime || ev.meeting.endTime) && (
                                                            <p className="text-xs text-gray-600 flex items-center gap-1">
                                                                <Clock className="w-3 h-3 text-sky-400" />
                                                                {ev.meeting.startTime}{ev.meeting.endTime ? ` – ${ev.meeting.endTime}` : ''} <span className="font-medium">{getDuration(ev.meeting.startTime, ev.meeting.endTime)}</span>
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-600 flex items-center gap-1">
                                                            <PlatformBadge platform={ev.meeting.platform} PLATFORMS={PLATFORMS} />
                                                        </p>
                                                        {ev.meeting.meetingLink && (
                                                            <a href={ev.meeting.meetingLink} target="_blank" rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-[11px] font-semibold transition-colors mt-1">
                                                                <Link2 className="w-3.5 h-3.5" /> Join Meeting Link
                                                            </a>
                                                        )}
                                                        {ev.meeting.location && (
                                                            <p className="text-xs text-gray-600 flex items-center gap-1">
                                                                <MapPin className="w-3 h-3 text-gray-400" /> {ev.meeting.location}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-3 mt-1">
                                                            {ev.meeting.attendees?.length > 0 && (
                                                                <div className="flex items-center gap-1">
                                                                    <Users className="w-3 h-3 text-gray-400" />
                                                                    <div className="flex -space-x-1">
                                                                        {ev.meeting.attendees.slice(0, 5).map((a: any) => (
                                                                            <div key={a.id} title={a.name} className="w-5 h-5 rounded-full bg-indigo-200 border border-white flex items-center justify-center text-[9px] font-bold text-indigo-700">
                                                                                {a.name?.[0]?.toUpperCase()}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-xs text-gray-400">{ev.meeting.attendees.length} attendee{ev.meeting.attendees.length !== 1 ? 's' : ''}</span>
                                                                </div>
                                                            )}
                                                            {ev.clients?.length > 0 && (
                                                                <div className="flex items-center gap-1">
                                                                    <div className="flex -space-x-1">
                                                                        {ev.clients.slice(0, 5).map((c: any) => (
                                                                            <div key={c.id} title={c.name} className="w-5 h-5 rounded-full bg-sky-200 border border-white flex items-center justify-center text-[9px] font-bold text-sky-700">
                                                                                {c.name?.[0]?.toUpperCase()}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-xs text-gray-400">{ev.clients.length} client{ev.clients.length !== 1 ? 's' : ''}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {ev.meeting.roomId && (
                                                            <button
                                                                onClick={() => setShowSummaryRoomId(ev.meeting.roomId)}
                                                                className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white hover:shadow-md transition-all duration-300 transform active:scale-95"
                                                            >
                                                                <Sparkles className="w-3.5 h-3.5" />
                                                                View AI Summary
                                                            </button>
                                                        )}

                                                        {ev.meeting.agenda && (
                                                            <details className="text-xs">
                                                                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">View Agenda</summary>
                                                                <pre className="mt-1 text-gray-600 font-sans whitespace-pre-wrap bg-gray-50 rounded p-2 text-[11px]">{ev.meeting.agenda}</pre>
                                                            </details>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                                {ev.type === 'meeting' && (
                                                    <button
                                                        onClick={() => resendInvite(ev.id)}
                                                        disabled={resendingId === ev.id}
                                                        title="Resend invite emails"
                                                        className="p-1.5 hover:bg-sky-50 rounded text-sky-400 hover:text-sky-600"
                                                    >
                                                        {resendingId === ev.id ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                                    </button>
                                                )}
                                                <button onClick={() => setEventToEdit(ev)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                                </button>
                                                <button onClick={() => setShowDeleteConfirm(ev.id)} className="p-1.5 hover:bg-red-50 rounded text-red-300 hover:text-red-500">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {ev.description && (
                                        <p className="text-xs text-gray-500 mt-2 pl-5">{ev.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={!!showDeleteConfirm}
                title="Delete Event"
                message="Are you sure you want to delete this event? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
                loading={deleting}
                onConfirm={handleDeleteEvent}
                onCancel={() => setShowDeleteConfirm(null)}
            />
        </div>
    );
}

