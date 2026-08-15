import { Drawer } from "@/components/ui/Drawer";
'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Video, MapPin, Link2, Users, Sparkles, Trash2, RefreshCw, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { LogoLoader } from "@workspace/ui";
import { format } from 'date-fns';
import clsx from 'clsx';

function PlatformBadge({ platform, PLATFORMS }: { platform: string; PLATFORMS: any[] }) {
    const p = PLATFORMS.find(x => x.key === platform);
    return p ? <span className="text-sm flex items-center gap-1">{p.icon} {p.label}</span> : null;
}

export default function EventDetailsDrawer({
    date,
    events,
    initialEventId,
    onClose,
    onAddEvent,
    onDelete,
    onResend,
    resendingId,
    isAdmin,
    onShowSummary,
    PLATFORMS
}: {
    date: Date;
    events: any[];
    initialEventId?: string;
    onClose: () => void;
    onAddEvent: () => void;
    onDelete: (id: string) => void;
    onResend: (id: string) => void;
    resendingId: string | null;
    isAdmin: boolean;
    onShowSummary: (roomId: string) => void;
    PLATFORMS: any[];
}) {
    const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId || (events.length > 0 ? events[0].id : null));

    // Update selection if events change or initialEventId changes
    useEffect(() => {
        if (initialEventId && events.some(e => e.id === initialEventId)) {
            setSelectedEventId(initialEventId);
        } else if (events.length > 0 && (!selectedEventId || !events.some(e => e.id === selectedEventId))) {
            setSelectedEventId(events[0].id);
        } else if (events.length === 0) {
            setSelectedEventId(null);
        }
    }, [events, initialEventId, selectedEventId]);

    const selectedEvent = events.find(e => e.id === selectedEventId);

    return (
        <Drawer open={true} onClose={onClose} title={format(date, 'MMM d, yyyy')}>
            <div className="flex bg-white rounded-2xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl">
                {/* Sidebar: List of events */}
                <div className="w-80 border-r border-gray-100 bg-gray-50/50 flex flex-col flex-shrink-0">
                    <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{format(date, 'MMM d, yyyy')}</h2>
                            <p className="text-xs text-gray-500">{events.length} event{events.length !== 1 ? 's' : ''}</p>
                        </div>
                        {isAdmin && (
                            <button onClick={onAddEvent} className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {events.length === 0 ? (
                            <div className="text-center py-10">
                                <CalendarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No events for this day.</p>
                            </div>
                        ) : (
                            events.map(ev => (
                                <button
                                    key={ev.id}
                                    onClick={() => setSelectedEventId(ev.id)}
                                    className={clsx(
                                        "w-full text-left p-3 rounded-xl border transition-all duration-200",
                                        selectedEventId === ev.id 
                                            ? "bg-white border-transparent shadow-md ring-1 ring-black/5" 
                                            : "bg-transparent border-gray-200 hover:border-gray-300 hover:bg-white/50"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
                                        <p className="text-sm font-semibold text-gray-900 truncate">{ev.title}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: `${ev.color}15`, color: ev.color }}>
                                            {ev.type}
                                        </span>
                                        {ev.type === 'meeting' && ev.meeting && (ev.meeting.startTime || ev.meeting.endTime) && (
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {ev.meeting.startTime}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content: Event Details */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden relative">

                    {selectedEvent ? (
                        <div className="flex-1 overflow-y-auto">
                            {/* Header */}
                            <div className="px-8 py-8 border-b border-gray-100 flex-shrink-0" style={{ borderTop: `6px solid ${selectedEvent.color}` }}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedEvent.color }} />
                                    <span className="badge text-xs capitalize" style={{ backgroundColor: `${selectedEvent.color}15`, color: selectedEvent.color, borderColor: `${selectedEvent.color}30` }}>
                                        {selectedEvent.type}
                                    </span>
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 leading-tight pr-12">{selectedEvent.title}</h2>
                            </div>

                            {/* Body */}
                            <div className="px-8 py-8 space-y-8">
                                {/* Basic details */}
                                <div>
                                    <p className="text-sm text-gray-500 font-medium mb-1 flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> Date</p>
                                    <p className="text-base font-medium text-gray-900">
                                        {format(new Date(selectedEvent.startDate), 'MMMM d, yyyy')}
                                        {selectedEvent.endDate && selectedEvent.endDate !== selectedEvent.startDate && ` - ${format(new Date(selectedEvent.endDate), 'MMMM d, yyyy')}`}
                                    </p>
                                </div>

                                {selectedEvent.description && (
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium mb-2">Description</p>
                                        <p className="text-base text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-xl p-5 border border-gray-100/50">{selectedEvent.description}</p>
                                    </div>
                                )}

                                {/* Meeting-specific Details */}
                                {selectedEvent.type === 'meeting' && selectedEvent.meeting && (
                                    <div className="space-y-8 pt-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-px bg-sky-100 flex-1" />
                                            <h3 className="text-sm font-bold text-sky-600 uppercase tracking-widest flex items-center gap-2">
                                                <Video className="w-4 h-4" /> Meeting Details
                                            </h3>
                                            <div className="h-px bg-sky-100 flex-1" />
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {(selectedEvent.meeting.startTime || selectedEvent.meeting.endTime) && (
                                                <div>
                                                    <p className="text-sm text-gray-500 font-medium mb-1.5 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Time</p>
                                                    <p className="text-base font-medium text-gray-900">
                                                        {selectedEvent.meeting.startTime}{selectedEvent.meeting.endTime ? ` – ${selectedEvent.meeting.endTime}` : ''}
                                                    </p>
                                                </div>
                                            )}

                                            <div>
                                                <p className="text-sm text-gray-500 font-medium mb-1.5 flex items-center gap-1.5"><Video className="w-4 h-4" /> Platform</p>
                                                <div className="mt-0.5">
                                                    <PlatformBadge platform={selectedEvent.meeting.platform} PLATFORMS={PLATFORMS} />
                                                </div>
                                            </div>

                                            {selectedEvent.meeting.meetingLink && (
                                                <div className="md:col-span-2">
                                                    <p className="text-sm text-gray-500 font-medium mb-2 flex items-center gap-1.5"><Link2 className="w-4 h-4" /> Join Link</p>
                                                    <a href={selectedEvent.meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 hover:shadow-sm font-semibold transition-all">
                                                        <Video className="w-4 h-4" /> Join Meeting Now
                                                    </a>
                                                </div>
                                            )}

                                            {selectedEvent.meeting.location && (
                                                <div className="md:col-span-2">
                                                    <p className="text-sm text-gray-500 font-medium mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Location</p>
                                                    <p className="text-base text-gray-900 bg-gray-50 rounded-xl p-4 border border-gray-100">{selectedEvent.meeting.location}</p>
                                                </div>
                                            )}
                                        </div>

                                        {selectedEvent.meeting.agenda && (
                                            <div>
                                                <p className="text-sm text-gray-500 font-medium mb-2">Agenda</p>
                                                <pre className="text-sm text-gray-800 font-sans whitespace-pre-wrap bg-amber-50/50 rounded-xl p-5 border border-amber-100/50">{selectedEvent.meeting.agenda}</pre>
                                            </div>
                                        )}

                                        {selectedEvent.meeting.attendees?.length > 0 && (
                                            <div>
                                                <p className="text-sm text-gray-500 font-medium mb-3 flex items-center gap-1.5"><Users className="w-4 h-4" /> Attendees ({selectedEvent.meeting.attendees.length})</p>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {selectedEvent.meeting.attendees.map((a: any) => (
                                                        <div key={a.id} title={a.email} className="flex items-center gap-2.5 bg-gray-50 rounded-full py-1.5 pr-4 pl-1.5 border border-gray-200">
                                                            <div className="w-7 h-7 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-sm">
                                                                {a.name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                            <span className="text-sm text-gray-800 font-medium">{a.name || a.email}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30">
                            <CalendarIcon className="w-16 h-16 text-gray-200 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Event Selected</h3>
                            <p className="text-gray-500 max-w-sm mx-auto">Select an event from the sidebar to view its details, or click the + button to add a new one.</p>
                            {isAdmin && (
                                <button onClick={onAddEvent} className="mt-6 btn-primary">
                                    <Plus className="w-4 h-4" /> Add Event for {format(date, 'MMM d')}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Footer Actions for selected event */}
                    {selectedEvent && (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                            <div className="flex gap-3">
                                {isAdmin && (
                                    <button onClick={() => onDelete(selectedEvent.id)} className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200 shadow-sm bg-white">
                                        <Trash2 className="w-4 h-4" /> Delete
                                    </button>
                                )}
                                {isAdmin && selectedEvent.type === 'meeting' && (
                                    <button
                                        onClick={() => onResend(selectedEvent.id)}
                                        disabled={resendingId === selectedEvent.id}
                                        className="btn-secondary text-sky-600 hover:bg-sky-50 hover:border-sky-200 shadow-sm bg-white"
                                    >
                                        {resendingId === selectedEvent.id ? <LogoLoader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} 
                                        Resend Invites
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-3">
                                {selectedEvent.type === 'meeting' && selectedEvent.meeting?.roomId && (
                                    <button
                                        onClick={() => onShowSummary(selectedEvent.meeting.roomId)}
                                        className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md shadow-indigo-200 transform hover:-translate-y-0.5"
                                    >
                                        <Sparkles className="w-4 h-4" /> View AI Summary
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Drawer>
    );
}
