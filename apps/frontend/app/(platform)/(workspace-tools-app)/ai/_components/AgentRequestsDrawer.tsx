'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Calendar, Phone, Mail, Clock, CheckCircle2, XCircle, AlertTriangle, 
  RefreshCw, User, Sparkles, ExternalLink, Bot, ArrowRight, Check, Search,
  CalendarCheck, CalendarClock, PhoneCall, ShieldAlert, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface AgentRequestItem {
  id: string;
  companyId: string;
  voiceAgentId?: string;
  voiceAgentName?: string;
  voiceAgent?: { id: string; name: string; language?: string };
  callSessionId?: string;
  type: string;
  priority: string;
  status: 'pending' | 'auto_scheduled' | 'confirmed' | 'rejected' | 'needs_review';
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  topic: string;
  requestedTimeRaw?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  locationOrPlatform?: string;
  notes?: string;
  calendarEventId?: string;
  calendarEvent?: { id: string; title: string; startDate: string; endDate: string; location?: string };
  resolvedBy?: { id: string; name: string; email: string };
  resolvedAt?: string;
  resolutionNotes?: string;
  metadata?: any;
  createdAt: string;
}

interface AgentRequestsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCountChange?: (count: number) => void;
}

export function AgentRequestsDrawer({ isOpen, onClose, onRequestCountChange }: AgentRequestsDrawerProps) {
  const [requests, setRequests] = useState<AgentRequestItem[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    auto_scheduled: 0,
    confirmed: 0,
    needs_review: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'auto_scheduled' | 'confirmed' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reschedule state
  const [reschedulingRequest, setReschedulingRequest] = useState<AgentRequestItem | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (activeFilter !== 'all') {
        if (activeFilter === 'pending') {
          params.status = 'pending';
        } else {
          params.status = activeFilter;
        }
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get('/api/v1/ai/requests', { params });
      if (res.data?.success) {
        setRequests(res.data.data || []);
        if (res.data.counts) {
          setCounts(res.data.counts);
          const activePending = (res.data.counts.pending || 0) + (res.data.counts.needs_review || 0) + (res.data.counts.auto_scheduled || 0);
          onRequestCountChange?.(activePending);
        }
      }
    } catch (err: any) {
      console.error('[AgentRequestsDrawer] Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery, onRequestCountChange]);

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen, fetchRequests]);

  // Periodic refresh when drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      fetchRequests();
    }, 15000);
    return () => clearInterval(interval);
  }, [isOpen, fetchRequests]);

  const handleApprove = async (item: AgentRequestItem) => {
    try {
      setProcessingId(item.id);
      const res = await api.post(`/api/v1/ai/requests/${item.id}/approve`, {});
      if (res.data?.success) {
        toast.success(`Meeting for ${item.customerName} confirmed and synced in 180 Calendar!`);
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (item: AgentRequestItem) => {
    if (!confirm(`Are you sure you want to reject the booking request for ${item.customerName}?`)) return;
    try {
      setProcessingId(item.id);
      const res = await api.post(`/api/v1/ai/requests/${item.id}/reject`, {
        reason: 'Declined by workspace administrator'
      });
      if (res.data?.success) {
        toast.success(`Request for ${item.customerName} rejected.`);
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReschedule = (item: AgentRequestItem) => {
    setReschedulingRequest(item);
    if (item.scheduledStart) {
      const d = new Date(item.scheduledStart);
      setNewDate(d.toISOString().split('T')[0]);
      setNewTime(d.toTimeString().slice(0, 5));
    } else {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setNewDate(tomorrow.toISOString().split('T')[0]);
      setNewTime('14:00');
    }
    setRescheduleNotes('');
  };

  const handleSubmitReschedule = async () => {
    if (!reschedulingRequest || !newDate || !newTime) {
      toast.error('Please pick a valid date and time');
      return;
    }

    try {
      setProcessingId(reschedulingRequest.id);
      const combinedDateTime = new Date(`${newDate}T${newTime}:00`);
      const res = await api.post(`/api/v1/ai/requests/${reschedulingRequest.id}/reschedule`, {
        newStart: combinedDateTime.toISOString(),
        notes: rescheduleNotes || `Rescheduled by team admin to ${combinedDateTime.toLocaleString()}`
      });

      if (res.data?.success) {
        toast.success(`Meeting for ${reschedulingRequest.customerName} rescheduled to ${combinedDateTime.toLocaleString()}!`);
        setReschedulingRequest(null);
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reschedule');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight">Internal Agent Requests Queue</h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Orbit Inter-Agent
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Meeting bookings & delegation tickets from Voiceforce AI Voice Employees
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchRequests}
                disabled={loading}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
                title="Refresh queue"
              >
                <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">Pending Review</div>
              <div className="text-sm font-bold text-amber-600">{(counts.pending || 0) + (counts.needs_review || 0)}</div>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">Auto-Scheduled</div>
              <div className="text-sm font-bold text-indigo-600">{counts.auto_scheduled || 0}</div>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">Confirmed</div>
              <div className="text-sm font-bold text-emerald-600">{counts.confirmed || 0}</div>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">Total Tickets</div>
              <div className="text-sm font-bold text-slate-800">{counts.all || 0}</div>
            </div>
          </div>

          {/* Filter Tabs & Search */}
          <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: `All (${counts.all || 0})` },
                { id: 'pending', label: `Pending / Review (${(counts.pending || 0) + (counts.needs_review || 0)})` },
                { id: 'auto_scheduled', label: `Auto-Scheduled (${counts.auto_scheduled || 0})` },
                { id: 'confirmed', label: `Confirmed (${counts.confirmed || 0})` },
                { id: 'rejected', label: `Rejected (${counts.rejected || 0})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer",
                    activeFilter === tab.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, topic, phone, email, or agent..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Request List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50">
            {loading && requests.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                <span>Loading agent request queue...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 flex flex-col items-center gap-3">
                <CalendarClock className="w-10 h-10 text-slate-300" />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700 text-sm">No Agent Requests Found</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    When callers ask your Voiceforce Voice Agents to book meetings or consultations, tickets and appointments appear here in real time.
                  </p>
                </div>
                <Link
                  href="/voiceforce"
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
                >
                  <span>Go to Voiceforce Telephony</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              requests.map((req) => {
                const isAuto = req.status === 'auto_scheduled';
                const isConfirmed = req.status === 'confirmed';
                const isRejected = req.status === 'rejected';
                const isNeedsReview = req.status === 'needs_review' || req.status === 'pending';
                const hasConflict = req.metadata?.conflictDetected || req.status === 'needs_review';

                const scheduledDateObj = req.scheduledStart ? new Date(req.scheduledStart) : null;
                const formattedDate = scheduledDateObj 
                  ? scheduledDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                  : (req.requestedTimeRaw || 'Time TBD');
                const formattedTime = scheduledDateObj 
                  ? scheduledDateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                  : '';

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3"
                  >
                    {/* Top Meta Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 font-bold text-xs">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{req.customerName}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            {req.customerPhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {req.customerPhone}
                              </span>
                            )}
                            {req.customerEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {req.customerEmail}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0",
                        isConfirmed && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                        isAuto && "bg-indigo-50 text-indigo-700 border border-indigo-200",
                        isNeedsReview && "bg-amber-50 text-amber-700 border border-amber-200",
                        isRejected && "bg-rose-50 text-rose-700 border border-rose-200"
                      )}>
                        {isConfirmed && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isAuto && <CalendarCheck className="w-3 h-3 text-indigo-600" />}
                        {isNeedsReview && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        {isRejected && <XCircle className="w-3 h-3 text-rose-600" />}
                        {isConfirmed ? 'Confirmed' : isAuto ? 'Auto-Scheduled' : isNeedsReview ? 'Needs Review' : 'Rejected'}
                      </span>
                    </div>

                    {/* Booking Details Box */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          Topic: {req.topic}
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          Agent: <strong className="text-slate-700">{req.voiceAgentName || req.voiceAgent?.name || 'Voice AI Employee'}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-slate-600">
                        <span className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          {formattedDate} {formattedTime && `at ${formattedTime}`}
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {req.metadata?.durationMinutes || 30} mins
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="text-indigo-600 font-medium">
                          {req.locationOrPlatform === 'phone' ? 'Phone Call' : 'Google Meet'}
                        </span>
                      </div>

                      {req.notes && (
                        <p className="text-slate-500 italic text-[11px] pt-1 border-t border-slate-200/60">
                          &ldquo;{req.notes}&rdquo;
                        </p>
                      )}

                      {/* Conflict Alert */}
                      {hasConflict && !isRejected && (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            <strong>Calendar conflict detected</strong> for this time slot. Please review or reschedule with 1 click.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px] text-slate-400">
                        Logged {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      <div className="flex items-center gap-2">
                        {isRejected ? (
                          <span className="text-xs text-rose-500 font-medium">Ticket Closed</span>
                        ) : (
                          <>
                            {req.calendarEventId && (
                              <Link
                                href="/calendar"
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3 text-slate-500" />
                                <span>Calendar</span>
                              </Link>
                            )}

                            <button
                              onClick={() => handleOpenReschedule(req)}
                              disabled={processingId === req.id}
                              className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                              <span>Reschedule</span>
                            </button>

                            {!isConfirmed && (
                              <button
                                onClick={() => handleApprove(req)}
                                disabled={processingId === req.id}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              >
                                {processingId === req.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Confirm Booking</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleReject(req)}
                              disabled={processingId === req.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Reject request"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reschedule Modal Popover */}
          {reschedulingRequest && (
            <div className="p-4 bg-white border-t border-slate-200 shadow-lg space-y-3 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-xs text-slate-900">
                    Reschedule Meeting for {reschedulingRequest.customerName}
                  </h3>
                </div>
                <button
                  onClick={() => setReschedulingRequest(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reschedule Notes (Optional)</label>
                <input
                  type="text"
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="Reason for rescheduling or additional instructions..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setReschedulingRequest(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReschedule}
                  disabled={processingId === reschedulingRequest.id}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs"
                >
                  {processingId === reschedulingRequest.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <CalendarCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Save & Sync Calendar</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Connected to 180 Calendar & Voiceforce
            </span>
            <Link
              href="/calendar"
              className="font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Open 180 Calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
