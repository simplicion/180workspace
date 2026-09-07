'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bot, Calendar, Phone, Mail, Clock, CheckCircle2, XCircle, AlertTriangle, 
  RefreshCw, User, Sparkles, ExternalLink, ArrowRight, Check, Search,
  CalendarCheck, CalendarClock, PhoneCall, ShieldAlert, ChevronRight, ArrowLeft
} from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AgentRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
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
  const [reschedulingRequest, setReschedulingRequest] = useState<any | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (activeFilter !== 'all') {
        params.status = activeFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get('/api/v1/ai/requests', { params });
      if (res.data?.success) {
        setRequests(res.data.data || []);
        if (res.data.counts) {
          setCounts(res.data.counts);
        }
      }
    } catch (err: any) {
      console.error('[AgentRequestsPage] Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (item: any) => {
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

  const handleReject = async (item: any) => {
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

  const handleOpenReschedule = (item: any) => {
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/ai')}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
            title="Back to Orbit AI"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Internal Agent Requests</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Live Queue
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Autonomous meeting requests and customer appointment bookings delegated by Voiceforce AI Voice Employees
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 shadow-2xs transition-colors"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5 text-slate-500", loading && "animate-spin")} />
            <span>Refresh Queue</span>
          </button>
          <Link
            href="/calendar"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Open 180 Calendar</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Pending Review</p>
            <h3 className="text-2xl font-bold text-amber-600">{(counts.pending || 0) + (counts.needs_review || 0)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Auto-Scheduled</p>
            <h3 className="text-2xl font-bold text-indigo-600">{counts.auto_scheduled || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Confirmed Bookings</p>
            <h3 className="text-2xl font-bold text-emerald-600">{counts.confirmed || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Requests</p>
            <h3 className="text-2xl font-bold text-slate-900">{counts.all || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: `All Requests (${counts.all || 0})` },
            { id: 'pending', label: `Pending Review (${(counts.pending || 0) + (counts.needs_review || 0)})` },
            { id: 'auto_scheduled', label: `Auto-Scheduled (${counts.auto_scheduled || 0})` },
            { id: 'confirmed', label: `Confirmed (${counts.confirmed || 0})` },
            { id: 'rejected', label: `Rejected (${counts.rejected || 0})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={clsx(
                "px-3.5 py-2 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap",
                activeFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, topic, phone, email, or agent name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {loading && requests.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <span>Loading agent requests...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 flex flex-col items-center gap-3">
            <CalendarClock className="w-12 h-12 text-slate-300" />
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-700 text-base">No Agent Requests in Queue</h3>
              <p className="text-xs text-slate-400 max-w-md">
                Voiceforce AI voice agents automatically record meeting requests from incoming and outbound customer calls and push them here for 180 Calendar synchronization.
              </p>
            </div>
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
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-shadow space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{req.customerName}</h3>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-indigo-600 font-medium">
                          Agent: {req.voiceAgentName || req.voiceAgent?.name || 'Voiceforce Employee'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        {req.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {req.customerPhone}
                          </span>
                        )}
                        {req.customerEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {req.customerEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={clsx(
                    "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 self-start sm:self-center",
                    isConfirmed && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                    isAuto && "bg-indigo-50 text-indigo-700 border border-indigo-200",
                    isNeedsReview && "bg-amber-50 text-amber-700 border border-amber-200",
                    isRejected && "bg-rose-50 text-rose-700 border border-rose-200"
                  )}>
                    {isConfirmed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {isAuto && <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />}
                    {isNeedsReview && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                    {isRejected && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                    {isConfirmed ? 'Confirmed' : isAuto ? 'Auto-Scheduled' : isNeedsReview ? 'Needs Review' : 'Rejected'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5 text-sm">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      {req.topic}
                    </span>
                    <span className="text-xs text-slate-600">
                      Platform: <strong className="text-slate-800">{req.locationOrPlatform === 'phone' ? 'Phone Call' : 'Google Meet'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-slate-700 font-medium">
                    <span className="flex items-center gap-1.5 text-indigo-700">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      {formattedDate} {formattedTime && `at ${formattedTime}`}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {req.metadata?.durationMinutes || 30} mins
                    </span>
                  </div>

                  {req.notes && (
                    <p className="text-slate-600 text-xs italic pt-1 border-t border-slate-200/60">
                      &ldquo;{req.notes}&rdquo;
                    </p>
                  )}

                  {hasConflict && !isRejected && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Calendar conflict detected:</strong> An existing event overlaps with this time slot. Use <strong>Reschedule</strong> or confirm if acceptable.
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-slate-400">
                    Created {new Date(req.createdAt).toLocaleString()}
                  </div>

                  <div className="flex items-center gap-2">
                    {isRejected ? (
                      <span className="text-xs text-rose-500 font-semibold">Rejected / Closed</span>
                    ) : (
                      <>
                        {req.calendarEventId && (
                          <Link
                            href="/calendar"
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                            <span>View in Calendar</span>
                          </Link>
                        )}

                        <button
                          onClick={() => handleOpenReschedule(req)}
                          disabled={processingId === req.id}
                          className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                          <span>Reschedule</span>
                        </button>

                        {!isConfirmed && (
                          <button
                            onClick={() => handleApprove(req)}
                            disabled={processingId === req.id}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            {processingId === req.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Approve & Confirm</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleReject(req)}
                          disabled={processingId === req.id}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Reschedule for {reschedulingRequest.customerName}
                </h3>
              </div>
              <button
                onClick={() => setReschedulingRequest(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Time</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
              <input
                type="text"
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                placeholder="Reason or notes for rescheduling..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReschedulingRequest(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReschedule}
                disabled={processingId === reschedulingRequest.id}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs"
              >
                {processingId === reschedulingRequest.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CalendarCheck className="w-3.5 h-3.5" />
                )}
                <span>Reschedule & Sync</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
