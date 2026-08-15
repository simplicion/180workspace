'use client';


import { LogoLoader } from "@workspace/ui";
import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Calendar, CheckCheck, X, Clock, Home, Plus, FileText, CheckCircle, XCircle, Palmtree, Pencil, Trash2, Eye, ExternalLink, Settings, Save, Landmark } from 'lucide-react';
import clsx from 'clsx';
import MarkAttendanceDrawer from '@/app/dashboard/(hr-management-app)/_components/MarkAttendanceDrawer';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import toast from 'react-hot-toast';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabType = 'attendance' | 'leaves' | 'holidays' | 'settings';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
    present: { label: 'Present', cls: 'badge-green', icon: CheckCheck },
    absent: { label: 'Absent', cls: 'badge-red', icon: X },
    late: { label: 'Late', cls: 'badge-orange', icon: Clock },
    half_day: { label: 'Half Day', cls: 'badge-orange', icon: Clock },
    work_from_home: { label: 'WFH', cls: 'badge-blue', icon: Home },
    on_leave: { label: 'Leave', cls: 'badge-purple', icon: Calendar },
};

import { LeaveRequestDrawer, ViewLeaveDrawer, LEAVE_TYPE_COLORS } from '@/app/dashboard/(hr-management-app)/_components/LeaveDrawers';
import HolidayDrawer, { HOLIDAY_TYPE_COLORS } from '@/app/dashboard/(hr-management-app)/_components/HolidayDrawer';
import CustomSelect from '@/components/ui/CustomSelect';

function thisMonthStr() { return new Date().toISOString().slice(0, 7); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function thisYear() { return new Date().getFullYear(); }


// ─── Main Page (inner — uses useSearchParams) ─────────────────────────────────
function AttendancePageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { company, refreshSettings } = useSettings();

    const initialTab = (searchParams.get('tab') as TabType) || 'attendance';
    const [tab, setTab] = useState<TabType>(initialTab);

    // Sync tab with URL
    const handleTabChange = (t: TabType) => {
        setTab(t);
        const url = t === 'attendance' ? '/dashboard/attendance' : `/dashboard/attendance?tab=${t}`;
        router.replace(url, { scroll: false });
    };

    // Attendance state
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(thisMonthStr());
    const [showMark, setShowMark] = useState(false);

    // Leave state
    const [leaves, setLeaves] = useState<any[]>([]);
    const [leavesLoading, setLeavesLoading] = useState(true);
    const [showLeave, setShowLeave] = useState(false);

    // Holiday state
    const [holidays, setHolidays] = useState<any[]>([]);
    const [holidaysLoading, setHolidaysLoading] = useState(true);
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<any>(null);
    const [year, setYear] = useState(thisYear());

    // Trend state
    const [trendData, setTrendData] = useState<any[]>([]);
    const [trendLoading, setTrendLoading] = useState(true);

    const [selectedLeave, setSelectedLeave] = useState<any>(null);

    const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
    const [selectedLeaves, setSelectedLeaves] = useState<string[]>([]);
    const [isBulkReviewing, setIsBulkReviewing] = useState(false);

    const isHR = user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_hr'));

    // Settings state
    const [settingsData, setSettingsData] = useState({
        standardStartTime: '09:00',
        standardEndTime: '18:00',
        gracePeriod: 15,
        salaryReleaseDate: 1,
        workingDaysPerMonth: 22,
    });
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        if (company) {
            setSettingsData({
                standardStartTime: company.standardStartTime || '09:00',
                standardEndTime: company.standardEndTime || '18:00',
                gracePeriod: company.gracePeriod || 15,
                salaryReleaseDate: company.salaryReleaseDate || 1,
                workingDaysPerMonth: company.workingDaysPerMonth || 22,
            });
        }
    }, [company]);

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setSettingsData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await api.put('/api/settings/company', settingsData);
            toast.success('Settings saved');
            await refreshSettings();
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSavingSettings(false);
        }
    };

    // ── Data loaders ──
    const loadAttendance = useCallback(() => {
        setLoading(true);
        api.get('/api/attendance', { params: { month } })
            .then(({ data }) => setRecords(data.records || []))
            .catch(() => setRecords([]))
            .finally(() => setLoading(false));
    }, [month]);

    const loadLeaves = useCallback(() => {
        setLeavesLoading(true);
        api.get('/api/leaves', { params: { month } })
            .then(({ data }) => setLeaves(data.leaves || []))
            .catch(() => setLeaves([]))
            .finally(() => setLeavesLoading(false));
    }, [month]);

    const loadHolidays = useCallback(() => {
        setHolidaysLoading(true);
        api.get('/api/holidays', { params: { year } })
            .then(({ data }) => setHolidays(data.holidays || []))
            .catch(() => setHolidays([]))
            .finally(() => setHolidaysLoading(false));
    }, [year]);

    const loadTrend = useCallback(() => {
        setTrendLoading(true);
        api.get('/api/hrms/attendance-trend')
            .then(({ data }) => setTrendData(data || []))
            .catch(() => setTrendData([]))
            .finally(() => setTrendLoading(false));
    }, []);

    useEffect(() => { loadAttendance(); }, [loadAttendance]);
    useEffect(() => { loadLeaves(); }, [loadLeaves]);
    useEffect(() => { loadHolidays(); }, [loadHolidays]);
    useEffect(() => { loadTrend(); }, [loadTrend]);

    // Sync tab if URL param changes externally (e.g. sidebar link)
    useEffect(() => {
        const t = (searchParams.get('tab') as TabType) || 'attendance';
        setTab(t);
    }, [searchParams]);

    async function handleReviewLeave(id: string, status: 'approved' | 'rejected') {
        try {
            await api.put(`/api/leaves/${id}/review`, { status });
            toast.success(`Leave ${status}`);
            setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
        } catch { toast.error('Failed to update leave'); }
    }

    async function handleDeleteHoliday(id: string) {
        if (!confirm('Delete this holiday?')) return;
        try {
            await api.delete(`/api/holidays/${id}`);
            toast.success('Holiday deleted');
            setHolidays(prev => prev.filter(h => h.id !== id));
        } catch { toast.error('Failed to delete'); }
    }

    // ── Bulk Actions ──
    const handleSelectAllRecords = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedRecords(e.target.checked ? records.map(r => r.id) : []);
    };
    const handleSelectRecord = (id: string) => {
        setSelectedRecords(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAllLeaves = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedLeaves(e.target.checked ? leaves.map(l => l.id) : []);
    };
    const handleSelectLeave = (id: string) => {
        setSelectedLeaves(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    async function handleBulkReviewLeaves(status: 'approved' | 'rejected') {
        if (!confirm(`Review ${selectedLeaves.length} leave requests as ${status}?`)) return;
        setIsBulkReviewing(true);
        try {
            await Promise.all(selectedLeaves.map(id => api.put(`/api/leaves/${id}/review`, { status })));
            toast.success(`Selected leaves ${status}`);
            loadLeaves();
            setSelectedLeaves([]);
        } catch { toast.error('Failed to review some leaves'); }
        finally { setIsBulkReviewing(false); }
    }

    const exportToCSV = (type: 'attendance' | 'leaves') => {
        let headers: string[];
        let rows: any[][];
        let filename: string;

        if (type === 'attendance') {
            headers = ['Employee', 'Emp ID', 'Date', 'Status', 'Check In', 'Check Out', 'Work Hours'];
            rows = records.map(r => [
                (r.employee || r.employeeId)?.name, (r.employee || r.employeeId)?.employeeId, r.date, r.status, r.checkIn || '', r.checkOut || '', r.workHours || '0'
            ]);
            filename = `attendance_${month}.csv`;
        } else {
            headers = ['Employee', 'Type', 'Start', 'End', 'Days', 'Status'];
            rows = leaves.map(l => [
                (l.employee || l.employeeId)?.name, l.type, l.startDate, l.endDate, l.days, l.status
            ]);
            filename = `leaves_${month}.csv`;
        }

        const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };

    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;

    return (
        <div>
            {showMark && (
                <MarkAttendanceDrawer
                    open={showMark}
                    onClose={() => setShowMark(false)}
                    onSuccess={() => { setShowMark(false); loadAttendance(); }}
                />
            )}
            {showLeave && (
                <LeaveRequestDrawer
                    open={showLeave}
                    onClose={() => setShowLeave(false)}
                    onSuccess={() => { setShowLeave(false); loadLeaves(); }}
                />
            )}
            {(showHolidayModal || editingHoliday) && (
                <HolidayDrawer
                    open={showHolidayModal || !!editingHoliday}
                    holiday={editingHoliday}
                    onClose={() => { setShowHolidayModal(false); setEditingHoliday(null); }}
                    onSuccess={() => { setShowHolidayModal(false); setEditingHoliday(null); loadHolidays(); }}
                />
            )}
            {selectedLeave && (
                <ViewLeaveDrawer
                    open={!!selectedLeave}
                    leave={selectedLeave}
                    onClose={() => setSelectedLeave(null)}
                />
            )}

            {/* Page Header */}
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Attendance &amp; HR</h1>
                    <p className="page-subtitle">Track attendance, leave requests, and company holidays</p>
                </div>
                <div className="flex items-center gap-2">
                    {tab !== 'holidays' && (
                        <button onClick={() => exportToCSV(tab as 'attendance' | 'leaves')} className="btn-secondary">
                            <ExternalLink className="w-4 h-4" /> Export
                        </button>
                    )}
                    {tab === 'attendance' && (
                        <>
                            <button onClick={() => setShowLeave(true)} className="btn-secondary flex items-center gap-1.5">
                                <FileText className="w-4 h-4" /> Request Leave
                            </button>
                            {isHR && (
                                <button onClick={() => setShowMark(true)} className="btn-primary">
                                    <Plus className="w-4 h-4" />Mark Attendance
                                </button>
                            )}
                        </>
                    )}
                    {tab === 'leaves' && (
                        <button onClick={() => setShowLeave(true)} className="btn-secondary flex items-center gap-1.5">
                            <FileText className="w-4 h-4" /> Request Leave
                        </button>
                    )}
                    {tab === 'holidays' && isHR && (
                        <button onClick={() => setShowHolidayModal(true)} className="btn-primary flex items-center gap-1.5">
                            <Plus className="w-4 h-4" /> Add Holiday
                        </button>
                    )}
                    {tab === 'settings' && isHR && (
                        <button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary flex items-center gap-1.5">
                            {savingSettings ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Settings
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-max">
                <button
                    onClick={() => handleTabChange('attendance')}
                    className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', tab === 'attendance' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
                >
                    Attendance Records
                </button>
                <button
                    onClick={() => handleTabChange('leaves')}
                    className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5', tab === 'leaves' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
                >
                    Leave Requests
                    {pendingLeaves > 0 && <span className="bg-orange-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{pendingLeaves}</span>}
                </button>
                <button
                    onClick={() => handleTabChange('holidays')}
                    className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5', tab === 'holidays' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
                >
                    <Palmtree className="w-3.5 h-3.5" /> Holidays
                </button>
                {isHR && (
                    <button
                        onClick={() => handleTabChange('settings')}
                        className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5', tab === 'settings' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
                    >
                        <Settings className="w-3.5 h-3.5" /> Settings
                    </button>
                )}
            </div>

            {/* ── ATTENDANCE TAB ── */}
            {tab === 'attendance' && (
                <>
                    {/* Attendance Trend Chart */}
                    <div className="card p-5 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-gray-900">Attendance Trend</h3>
                                <p className="text-xs text-gray-500">Daily breakdown for the last 15 days</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-medium">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                                    <span className="text-gray-600">Present</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                                    <span className="text-gray-600">Absent</span>
                                </div>
                            </div>
                        </div>
                        
                        {trendLoading ? (
                            <div className="h-[260px] flex items-center justify-center">
                                <LogoLoader className="w-6 h-6 animate-spin text-indigo-500" />
                            </div>
                        ) : (
                            <div className="h-[260px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="display" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                            dy={10}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                        />
                                        <Legend 
                                            verticalAlign="top" 
                                            align="right" 
                                            iconType="circle" 
                                            wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 500 }} 
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="total" 
                                            name="Total Employees" 
                                            stroke="#6366f1" 
                                            strokeWidth={3} 
                                            dot={{ r: 3, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 5, strokeWidth: 0 }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="present" 
                                            name="Present" 
                                            stroke="#10b981" 
                                            strokeWidth={3} 
                                            dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 5, strokeWidth: 0 }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="absent" 
                                            name="Absent" 
                                            stroke="#ef4444" 
                                            strokeWidth={3} 
                                            dot={{ r: 3, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 5, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 mb-5">
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input w-48" title="Filter by Month" aria-label="Select month and year" />
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center py-20"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>
                    ) : (
                        <div className="card">
                            <div className="table-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th className="w-10">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                                    checked={selectedRecords.length === records.length && records.length > 0}
                                                    onChange={handleSelectAllRecords}
                                                />
                                            </th>
                                            <th>Employee</th><th>Date</th><th>Status</th>
                                            <th>Check In</th><th>Check Out</th><th>Work Hrs</th><th>Shift</th><th>Marked By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((r) => {
                                            const cfg = STATUS_CONFIG[r.status] || { label: r.status, cls: 'badge-gray', icon: Clock };
                                            const Icon = cfg.icon;
                                            return (
                                                <tr key={r.id} className={clsx(selectedRecords.includes(r.id) && "bg-blue-50/30")}>
                                                    <td>
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                                            checked={selectedRecords.includes(r.id)}
                                                            onChange={() => handleSelectRecord(r.id)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                                <span className="text-white text-xs font-bold">{r.employee?.name?.[0]?.toUpperCase() || '?'}</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900 text-sm">{r.employee?.name || 'Unknown Employee'}</p>
                                                                <p className="text-xs text-gray-400">{r.employee?.employeeId || 'ID N/A'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="font-mono text-sm text-gray-600">{r.date}</td>
                                                    <td>
                                                        <span className={clsx('badge gap-1', cfg.cls)}>
                                                            <Icon className="w-3 h-3" />{cfg.label}
                                                        </span>
                                                    </td>
                                                    <td className="text-gray-600 text-sm">{r.checkIn || '—'}</td>
                                                    <td className="text-gray-600 text-sm">{r.checkOut || '—'}</td>
                                                    <td className="text-gray-700 font-bold text-sm">{r.workHours || '0.00'}</td>
                                                    <td>
                                                        <span className={clsx(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold capitalize",
                                                            r.shiftStatus === 'on_time' ? "bg-emerald-100 text-emerald-700" : 
                                                            r.shiftStatus === 'late' ? "bg-rose-100 text-rose-700" : 
                                                            r.shiftStatus === 'before_start' ? "bg-blue-100 text-blue-700" : 
                                                            r.shiftStatus === 'early_exit' ? "bg-amber-100 text-amber-700" : 
                                                            "bg-gray-100 text-gray-700"
                                                        )}>
                                                            {(r.shiftStatus || 'N/A').replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="text-gray-500 text-xs">{r.markedBy?.name || '—'}</td>
                                                </tr>
                                            );
                                        })}
                                        {records.length === 0 && (
                                            <tr><td colSpan={9} className="text-center py-12 text-gray-400">No attendance records for {month}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── LEAVES TAB ── */}
            {tab === 'leaves' && (
                <>
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input w-48" title="Filter Leaves by Month" aria-label="Select month for leave requests" />
                        
                        {selectedLeaves.length > 0 && isHR && (
                            <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 px-4 py-2 rounded-xl animate-in fade-in slide-in-from-top-1">
                                <span className="text-sm font-bold text-orange-700">{selectedLeaves.length} leaves selected</span>
                                <div className="w-px h-4 bg-orange-200 mx-1"></div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleBulkReviewLeaves('approved')}
                                        disabled={isBulkReviewing}
                                        className="btn-primary py-1 px-3 text-xs bg-green-600 hover:bg-green-700 border-none"
                                    >
                                        Approve
                                    </button>
                                    <button 
                                        onClick={() => handleBulkReviewLeaves('rejected')}
                                        disabled={isBulkReviewing}
                                        className="btn-secondary py-1 px-3 text-xs text-red-600 hover:bg-shadow-sm border-red-100"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {leavesLoading ? (
                        <div className="flex items-center justify-center py-20"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>
                    ) : (
                        <div className="card">
                            <div className="table-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            {isHR && (
                                                <th className="w-10">
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                                        checked={selectedLeaves.length === leaves.length && leaves.length > 0}
                                                        onChange={handleSelectAllLeaves}
                                                    />
                                                </th>
                                            )}
                                            <th>Employee</th><th>Type</th><th>From</th><th>To</th>
                                            <th>Days</th><th>Reason</th><th>Status</th>
                                            {isHR && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaves.map((l: any) => (
                                            <tr key={l.id} className={clsx(selectedLeaves.includes(l.id) && "bg-orange-50/30")}>
                                                {isHR && (
                                                    <td>
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                                            checked={selectedLeaves.includes(l.id)}
                                                            onChange={() => handleSelectLeave(l.id)}
                                                        />
                                                    </td>
                                                )}
                                                <td>
                                                    <p className="font-medium text-gray-900 text-sm">{(l.employee || l.employeeId)?.name}</p>
                                                    <p className="text-xs text-gray-400">{(l.employee || l.employeeId)?.department}</p>
                                                </td>
                                                <td><span className={clsx('badge', LEAVE_TYPE_COLORS[l.type] || 'badge-gray')}>{l.type}</span></td>
                                                <td className="text-sm text-gray-600">{l.startDate}</td>
                                                <td className="text-sm text-gray-600">{l.endDate}</td>
                                                <td className="text-sm font-medium text-gray-800">{l.days}d</td>
                                                <td className="text-sm text-gray-500 max-w-[150px] truncate">{l.reason || '—'}</td>
                                                <td>
                                                    <span className={clsx('badge', l.status === 'approved' ? 'badge-green' : l.status === 'rejected' ? 'badge-red' : 'badge-orange')}>
                                                        {l.status}
                                                    </span>
                                                </td>
                                                {isHR && (
                                                    <td>
                                                        <div className="flex items-center gap-1.5">
                                                            <button onClick={() => setSelectedLeave(l)} className="w-6 h-6 rounded-md bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors" title="View Details">
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            {l.status === 'pending' ? (
                                                                <>
                                                                    <button onClick={() => handleReviewLeave(l.id, 'approved')} className="w-6 h-6 rounded-md bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors" title="Approve">
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => handleReviewLeave(l.id, 'rejected')} className="w-6 h-6 rounded-md bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors" title="Reject">
                                                                        <XCircle className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-tighter">Reviewed</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        {leaves.length === 0 && (
                                            <tr><td colSpan={8} className="text-center py-12 text-gray-400">No leave requests for {month}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── HOLIDAYS TAB ── */}
            {tab === 'holidays' && (
                <>
                    <div className="flex gap-3 mb-5">
                        <CustomSelect value={year} onChange={e => setYear(Number(e.target.value))} className="select w-36" title="Select Year" aria-label="Filter holidays by year">
                            {[thisYear() - 1, thisYear(), thisYear() + 1].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </CustomSelect>
                        <p className="text-sm text-gray-500 self-center">{holidays.length} holiday{holidays.length !== 1 ? 's' : ''} this year</p>
                    </div>
                    {holidaysLoading ? (
                        <div className="flex items-center justify-center py-20"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>
                    ) : (
                        <div className="card">
                            <div className="table-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Name</th><th>Date</th><th>Type</th><th>Description</th>
                                            {isHR && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {holidays.map((h: any) => (
                                            <tr key={h.id}>
                                                <td className="font-medium text-gray-900 flex items-center gap-2">
                                                    <Palmtree className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                    {h.name}
                                                </td>
                                                <td className="font-mono text-sm text-gray-600">{String(h.date).slice(0, 10)}</td>
                                                <td>
                                                    <span className={clsx('badge capitalize', HOLIDAY_TYPE_COLORS[h.type] || 'badge-gray')}>
                                                        {h.type}
                                                    </span>
                                                </td>
                                                <td className="text-sm text-gray-500 max-w-[200px] truncate">{h.description || '—'}</td>
                                                {isHR && (
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => setEditingHoliday(h)}
                                                                className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteHoliday(h.id)}
                                                                className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        {holidays.length === 0 && (
                                            <tr>
                                                <td colSpan={isHR ? 5 : 4} className="text-center py-12 text-gray-400">
                                                    No holidays found for {year}.
                                                    {isHR && <span className="text-indigo-500 cursor-pointer ml-1" onClick={() => setShowHolidayModal(true)}>Add one now →</span>}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── SETTINGS TAB ── */}
            {tab === 'settings' && isHR && (
                <div className="card max-w-4xl p-6">
                    {/* ── Attendance & Timing Settings ── */}
                    <div className="col-span-full mb-2 border-b border-gray-100 pb-3 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Clock className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-gray-900">Attendance & Shift Settings</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Standard Login Time (HH:MM)</label>
                            <input type="time" name="standardStartTime" value={settingsData.standardStartTime} onChange={handleSettingsChange} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm" title="Standard login time" />
                            <p className="text-[10px] text-gray-400 font-medium mt-1">Daily check-in goal. Late marks after grace period.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Standard Logout Time (HH:MM)</label>
                            <input type="time" name="standardEndTime" value={settingsData.standardEndTime} onChange={handleSettingsChange} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm" title="Standard logout time" />
                            <p className="text-[10px] text-gray-400 font-medium mt-1">Daily check-out time. Used for auto-checkout calculation.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Late Grace Period (Minutes)</label>
                            <input type="number" min="0" name="gracePeriod" value={settingsData.gracePeriod} onChange={handleSettingsChange} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm" placeholder="15" />
                        </div>
                    </div>

                    {/* ── Payroll Settings ── */}
                    <div className="col-span-full mb-2 border-b border-gray-100 pb-3 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Landmark className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-gray-900">Payroll Settings</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Salary Release Date (1–28)</label>
                            <input type="number" min="1" max="28" name="salaryReleaseDate" value={settingsData.salaryReleaseDate} onChange={handleSettingsChange} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm" placeholder="1" />
                            <p className="text-[10px] text-gray-400 font-medium mt-1">The day of the month when salaries are released.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Working Days Per Month</label>
                            <input type="number" min="1" max="31" name="workingDaysPerMonth" value={settingsData.workingDaysPerMonth} onChange={handleSettingsChange} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm" placeholder="22" />
                            <p className="text-[10px] text-gray-400 font-medium mt-1">Used to calculate daily salary deductions for absences.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Wrapper with Suspense (required for useSearchParams) ─────────────────────
export default function AttendancePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
            <AttendancePageInner />
        </Suspense>
    );
}

