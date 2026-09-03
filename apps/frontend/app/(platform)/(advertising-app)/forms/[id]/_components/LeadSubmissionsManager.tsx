"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, Calendar, Filter, Trash2, Eye, Download, Zap, 
  ChevronDown, Check, TrendingUp, Users, PhoneCall, Sparkles, 
  Clock, X, ArrowUpRight, BarChart3, PieChart as PieChartIcon, 
  Activity, Layers, SlidersHorizontal, RefreshCw, FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { 
  ConfirmModal, 
  UniversalDateTimePicker, 
  ExportDropdown, 
  ExportFormat 
} from '@workspace/ui';
import { 
  exportToExcel, 
  exportToPDF, 
  exportToDOCX, 
  exportToCSV, 
  ExportColumn, 
  SummaryMetric 
} from '@/lib/export-service';

export interface LeadSubmission {
  id: string;
  formId: string;
  companyId: string;
  submittedAt: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  leadId?: string;
  clientId?: string;
  status?: string; // 'new' | 'Contacted' | 'Qualified' | 'Demo' | 'Proposal' | 'ClosedWon' | 'ClosedLost' | etc.
  values: {
    fieldId?: string;
    label?: string;
    value?: string;
    fileUrl?: string;
    fileName?: string;
    field?: {
      id: string;
      label: string;
      type: string;
    };
  }[];
  lead?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    status?: string;
  } | null;
}

export interface LeadSubmissionsManagerProps {
  formId: string;
  formTitle: string;
  formCode?: string;
  viewsCount?: number;
  conversionRate?: number;
  submissions: LeadSubmission[];
  onSubmissionsChange: (updated: LeadSubmission[]) => void;
  onRefresh?: () => void;
  accentColor?: string;
}

export type DateFilterPreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'custom';

export interface PipelineStage {
  value: string;
  label: string;
  color: string;
  dot: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { value: 'new', label: 'New Lead', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50', dot: 'bg-indigo-500' },
  { value: 'Contacted', label: 'Contacted', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900/50', dot: 'bg-amber-500' },
  { value: 'Qualified', label: 'Qualified', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50', dot: 'bg-emerald-500' },
  { value: 'Demo', label: 'Demo / Meeting', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-900/50', dot: 'bg-blue-500' },
  { value: 'Proposal', label: 'Proposal', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-900/50', dot: 'bg-purple-500' },
  { value: 'ClosedWon', label: 'Won (Closed)', color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border-teal-200 dark:border-teal-900/50', dot: 'bg-teal-500' },
  { value: 'ClosedLost', label: 'Lost / Closed', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900/50', dot: 'bg-rose-500' }
];

const PIE_COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e'];

export function LeadSubmissionsManager({
  formId,
  formTitle,
  formCode,
  viewsCount = 0,
  conversionRate = 0,
  submissions,
  onSubmissionsChange,
  onRefresh,
  accentColor = '#4f46e5'
}: LeadSubmissionsManagerProps) {
  // ── Search & Filter State ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string | null>(null);
  const [customEndDate, setCustomEndDate] = useState<string | null>(null);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  // ── UI / Graph State ───────────────────────────────────────────────────────
  const [chartView, setChartView] = useState<'daily' | 'status' | 'both'>('both');
  const [isChartsCollapsed, setIsChartsCollapsed] = useState(false);

  // ── Selection & Modals ─────────────────────────────────────────────────────
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [activeDetailSubmission, setActiveDetailSubmission] = useState<LeadSubmission | null>(null);
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // ── Delete Modal State ─────────────────────────────────────────────────────
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    idsToDelete: string[];
  }>({
    open: false,
    title: '',
    description: '',
    idsToDelete: []
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Close status dropdown on outside click
  const statusMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setActiveStatusDropdownId(null);
      }
    };
    if (activeStatusDropdownId) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [activeStatusDropdownId]);

  // ── Date Range Filtering Logic ─────────────────────────────────────────────
  const filteredSubmissions = useMemo(() => {
    const now = new Date();

    // Start & End of Today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Start & End of Yesterday
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    // Start of Current Week (Last 7 Days)
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    // Start & End of Current Month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Start & End of Last Month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return submissions.filter(sub => {
      const subTime = new Date(sub.submittedAt).getTime();

      // 1. Date Filter
      if (dateFilter === 'today') {
        if (subTime < todayStart.getTime() || subTime > todayEnd.getTime()) return false;
      } else if (dateFilter === 'yesterday') {
        if (subTime < yesterdayStart.getTime() || subTime > yesterdayEnd.getTime()) return false;
      } else if (dateFilter === 'week') {
        if (subTime < weekStart.getTime()) return false;
      } else if (dateFilter === 'month') {
        if (subTime < thisMonthStart.getTime()) return false;
      } else if (dateFilter === 'last_month') {
        if (subTime < lastMonthStart.getTime() || subTime > lastMonthEnd.getTime()) return false;
      } else if (dateFilter === 'custom') {
        if (customStartDate) {
          const cStart = new Date(customStartDate).getTime();
          if (subTime < cStart) return false;
        }
        if (customEndDate) {
          const cEnd = new Date(customEndDate).getTime();
          if (subTime > cEnd) return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        const normSubStatus = (sub.status || 'new').toLowerCase();
        const normTarget = statusFilter.toLowerCase();
        if (normTarget === 'new') {
          if (normSubStatus !== 'new' && normSubStatus !== 'lead') return false;
        } else if (normTarget === 'contacted') {
          if (!normSubStatus.includes('contact')) return false;
        } else {
          if (normSubStatus !== normTarget) return false;
        }
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesValues = sub.values?.some(v => 
          String(v.value || '').toLowerCase().includes(q) ||
          String(v.label || '').toLowerCase().includes(q)
        );
        const matchesLead = 
          String(sub.lead?.name || '').toLowerCase().includes(q) ||
          String(sub.lead?.email || '').toLowerCase().includes(q) ||
          String(sub.lead?.phone || '').toLowerCase().includes(q) ||
          String(sub.lead?.company || '').toLowerCase().includes(q);
        const matchesIp = String(sub.ipAddress || '').toLowerCase().includes(q);

        if (!matchesValues && !matchesLead && !matchesIp) return false;
      }

      return true;
    });
  }, [submissions, dateFilter, statusFilter, searchQuery, customStartDate, customEndDate]);

  // ── Metric Counters ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let newCount = 0;
    let contactedCount = 0;
    let qualifiedCount = 0;

    submissions.forEach(sub => {
      const t = new Date(sub.submittedAt).getTime();
      const st = (sub.status || 'new').toLowerCase();

      if (t >= todayStart) todayCount++;
      if (t >= weekStart) weekCount++;
      if (t >= monthStart) monthCount++;

      if (st === 'new' || st === 'lead') newCount++;
      else if (st.includes('contact')) contactedCount++;
      else if (st.includes('qualif') || st === 'demo' || st === 'proposal' || st === 'closedwon') qualifiedCount++;
    });

    const calculatedCvr = viewsCount > 0 
      ? Math.round((submissions.length / viewsCount) * 1000) / 10 
      : conversionRate;

    return {
      total: submissions.length,
      filteredTotal: filteredSubmissions.length,
      today: todayCount,
      week: weekCount,
      month: monthCount,
      newLeads: newCount,
      contacted: contactedCount,
      qualified: qualifiedCount,
      cvr: calculatedCvr
    };
  }, [submissions, filteredSubmissions, viewsCount, conversionRate]);

  // ── Graph Data: Daily Trends for Current Month ─────────────────────────────
  const dailyChartData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Initialize days map for month
    const dayMap: Record<number, { day: string; dateStr: string; total: number; newLeads: number; contacted: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dayMap[d] = {
        day: `${month + 1}/${d}`,
        dateStr: new Date(year, month, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        total: 0,
        newLeads: 0,
        contacted: 0
      };
    }

    filteredSubmissions.forEach(sub => {
      const subDate = new Date(sub.submittedAt);
      if (subDate.getFullYear() === year && subDate.getMonth() === month) {
        const day = subDate.getDate();
        if (dayMap[day]) {
          dayMap[day].total += 1;
          const st = (sub.status || 'new').toLowerCase();
          if (st.includes('contact')) {
            dayMap[day].contacted += 1;
          } else {
            dayMap[day].newLeads += 1;
          }
        }
      }
    });

    return Object.values(dayMap);
  }, [filteredSubmissions]);

  // ── Graph Data: Status Distribution Pie Chart ──────────────────────────────
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredSubmissions.forEach(sub => {
      const rawStatus = sub.status || 'new';
      // Match with known stage or fallback
      const stage = PIPELINE_STAGES.find(s => s.value.toLowerCase() === rawStatus.toLowerCase()) || {
        value: rawStatus,
        label: rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)
      };
      counts[stage.label] = (counts[stage.label] || 0) + 1;
    });

    const data = Object.entries(counts).map(([name, value]) => ({
      name,
      value
    }));

    // If no submissions, show placeholder
    if (data.length === 0) {
      return [{ name: 'No Data', value: 1 }];
    }

    return data;
  }, [filteredSubmissions]);

  // ── Status Update Handler ──────────────────────────────────────────────────
  const handleUpdateStatus = async (submissionId: string, newStatus: string) => {
    setIsUpdatingStatus(submissionId);
    setActiveStatusDropdownId(null);

    // Optimistic Update
    const prevSubmissions = [...submissions];
    const updated = submissions.map(s => {
      if (s.id === submissionId) {
        return {
          ...s,
          status: newStatus,
          lead: s.lead ? { ...s.lead, status: newStatus } : { id: 'temp', status: newStatus }
        };
      }
      return s;
    });
    onSubmissionsChange(updated);

    try {
      const res = await api.patch(`/api/forms/submissions/${submissionId}/status`, { status: newStatus });
      const stageObj = PIPELINE_STAGES.find(s => s.value.toLowerCase() === newStatus.toLowerCase());
      toast.success(`Lead status updated to ${stageObj?.label || newStatus}`);
    } catch (err: any) {
      console.error('Failed to update submission status:', err);
      toast.error(err.response?.data?.error || 'Failed to update status');
      onSubmissionsChange(prevSubmissions); // Revert
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // ── Delete Handlers ────────────────────────────────────────────────────────
  const promptDeleteSubmissions = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const isSingle = ids.length === 1;
    const linkedCount = submissions.filter(s => ids.includes(s.id) && Boolean(s.leadId)).length;

    let warning = '';
    if (linkedCount > 0) {
      warning = ` (${linkedCount} linked CRM lead records will also be removed).`;
    }

    setConfirmDeleteModal({
      open: true,
      title: isSingle ? 'Delete Form Submission' : `Delete ${ids.length} Selected Submissions`,
      description: isSingle
        ? `Are you sure you want to permanently delete this submission?${warning}`
        : `Are you sure you want to delete ${ids.length} selected submissions?${warning}`,
      idsToDelete: ids
    });
  };

  const executeDeleteSubmissions = async () => {
    const ids = confirmDeleteModal.idsToDelete;
    if (!ids || ids.length === 0) return;

    setIsDeleting(true);
    try {
      if (ids.length === 1) {
        await api.delete(`/api/forms/submissions/${ids[0]}`);
      } else {
        await api.post(`/api/forms/${formId}/submissions/bulk-delete`, { submissionIds: ids });
      }

      toast.success(`Deleted ${ids.length} submission(s) successfully.`);
      const remaining = submissions.filter(s => !ids.includes(s.id));
      onSubmissionsChange(remaining);
      setSelectedSubIds(prev => prev.filter(id => !ids.includes(id)));
      if (activeDetailSubmission && ids.includes(activeDetailSubmission.id)) {
        setActiveDetailSubmission(null);
      }
      setConfirmDeleteModal({ open: false, title: '', description: '', idsToDelete: [] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete submissions');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Centralized Export Action ──────────────────────────────────────────────
  const handleExport = async (format: ExportFormat) => {
    const columns: ExportColumn[] = [
      { header: 'Submission ID', key: 'id' },
      { 
        header: 'Date & Time', 
        key: 'submittedAt',
        render: (val) => `${new Date(val).toLocaleDateString()} ${new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      },
      { 
        header: 'Lead Status', 
        key: 'status',
        render: (val) => {
          const stage = PIPELINE_STAGES.find(s => s.value.toLowerCase() === String(val || 'new').toLowerCase());
          return stage?.label || val || 'New';
        }
      },
      { 
        header: 'Lead Name', 
        key: 'name',
        render: (_, row) => {
          if (row.lead?.name) return row.lead.name;
          const nameVal = row.values?.find((v: any) => (v.label || v.field?.label || '').toLowerCase().includes('name'));
          return nameVal?.value || '—';
        }
      },
      { 
        header: 'Contact Email', 
        key: 'email',
        render: (_, row) => {
          if (row.lead?.email) return row.lead.email;
          const emailVal = row.values?.find((v: any) => (v.label || v.field?.label || '').toLowerCase().includes('email'));
          return emailVal?.value || '—';
        }
      },
      { 
        header: 'Phone Number', 
        key: 'phone',
        render: (_, row) => {
          if (row.lead?.phone) return row.lead.phone;
          const phoneVal = row.values?.find((v: any) => (v.label || v.field?.label || '').toLowerCase().includes('phone'));
          return phoneVal?.value || '—';
        }
      },
      { 
        header: 'Responses & Answers', 
        key: 'responses',
        render: (_, row) => {
          return (row.values || [])
            .map((v: any) => `${v.label || v.field?.label || 'Field'}: ${v.value || (v.fileUrl ? 'Attachment' : '—')}`)
            .join(' | ');
        }
      },
      { header: 'IP Address', key: 'ipAddress' }
    ];

    const summaryCards: SummaryMetric[] = [
      { label: "Today's Leads", value: metrics.today, highlight: true },
      { label: "This Week", value: metrics.week },
      { label: "This Month", value: metrics.month },
      { label: "New Leads", value: metrics.newLeads },
      { label: "Contacted", value: metrics.contacted },
      { label: "Total Leads", value: filteredSubmissions.length }
    ];

    const dateFilterLabel = {
      all: 'All Time',
      today: 'Today',
      yesterday: 'Yesterday',
      week: 'Past 7 Days',
      month: 'This Month',
      last_month: 'Last Month',
      custom: `Custom Range (${customStartDate ? new Date(customStartDate).toLocaleDateString() : 'Start'} to ${customEndDate ? new Date(customEndDate).toLocaleDateString() : 'Now'})`
    }[dateFilter];

    const exportOptions = {
      title: `${formTitle} — Lead Submissions Report`,
      subtitle: `Form ID: #${formCode || formId} • Date Filter: ${dateFilterLabel} • Total Records: ${filteredSubmissions.length}`,
      companyName: '180workspace Enterprise',
      metadata: {
        'Form Name': formTitle,
        'Form Code': `#${formCode || formId}`,
        'Applied Date Filter': dateFilterLabel,
        'Applied Status Filter': statusFilter === 'all' ? 'All Stages' : statusFilter,
        'Conversion Rate': `${metrics.cvr}%`
      },
      summaryMetrics: summaryCards,
      chartData: {
        dailyTrend: dailyChartData,
        statusDistribution: statusPieData
      },
      columns,
      data: filteredSubmissions,
      filename: `${formTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_leads_${dateFilter}`
    };

    if (format === 'excel') {
      await exportToExcel(exportOptions);
      toast.success('Excel workbook exported successfully!');
    } else if (format === 'pdf') {
      toast.loading('Generating executive PDF report...', { duration: 1500 });
      await exportToPDF(exportOptions);
      toast.success('PDF report exported successfully!');
    } else if (format === 'docx') {
      await exportToDOCX(exportOptions);
      toast.success('Word document (.docx) exported successfully!');
    } else if (format === 'csv') {
      await exportToCSV(exportOptions);
      toast.success('CSV dataset exported successfully!');
    }
  };

  const activeFilterCount = (dateFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (searchQuery.trim() ? 1 : 0);

  return (
    <div className="space-y-5">
      {/* ══════════════════════════════════════════════════════════════════════════
          1. COMPACT EXECUTIVE KPI METRICS BAR
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        {/* Metric 1: Today's Leads */}
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
            <span>Today's Leads</span>
            <span className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <Sparkles className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{metrics.today}</span>
            <span className="text-[10px] text-zinc-400 font-medium">today</span>
          </div>
        </div>

        {/* Metric 2: This Week */}
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
            <span>This Week</span>
            <span className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <Calendar className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{metrics.week}</span>
            <span className="text-[10px] text-zinc-400 font-medium">7 days</span>
          </div>
        </div>

        {/* Metric 3: This Month */}
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
            <span>This Month</span>
            <span className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <Activity className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{metrics.month}</span>
            <span className="text-[10px] text-zinc-400 font-medium">month</span>
          </div>
        </div>

        {/* Metric 4: New Leads */}
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
            <span>New Leads</span>
            <span className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <Users className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">{metrics.newLeads}</span>
            <span className="text-[10px] text-zinc-400 font-medium">inbound</span>
          </div>
        </div>

        {/* Metric 5: Contacted Leads */}
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
            <span>Contacted</span>
            <span className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <PhoneCall className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">{metrics.contacted}</span>
            <span className="text-[10px] text-zinc-400 font-medium">in progress</span>
          </div>
        </div>

        {/* Metric 6: Qualified / Pipeline */}
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
            <span>Qualified / Won</span>
            <span className="p-1 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-600">
              <Zap className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-teal-600 dark:text-teal-400 tracking-tight">{metrics.qualified}</span>
            <span className="text-[10px] text-zinc-400 font-medium">pipeline</span>
          </div>
        </div>

        {/* Metric 7: Total & Conversion */}
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
            <span>Total / CVR</span>
            <span className="p-1 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{metrics.total}</span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">({metrics.cvr}%)</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          2. COMPACT ANALYTICS & INTERACTIVE GRAPHS CARD
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Lead Volume & Stage Intelligence</h3>
              <p className="text-[10px] text-zinc-400">Daily trajectory and Contacted vs. New lead distribution</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl flex items-center gap-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setChartView('both')}
                className={clsx(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  chartView === 'both' ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-xs font-bold" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                Split View
              </button>
              <button
                type="button"
                onClick={() => setChartView('daily')}
                className={clsx(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  chartView === 'daily' ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-xs font-bold" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                Daily Trend
              </button>
              <button
                type="button"
                onClick={() => setChartView('status')}
                className={clsx(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  chartView === 'status' ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-xs font-bold" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                Status Pie
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsChartsCollapsed(!isChartsCollapsed)}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={isChartsCollapsed ? "Expand Graphs" : "Collapse Graphs"}
            >
              <ChevronDown className={clsx("w-4 h-4 transition-transform", isChartsCollapsed ? "-rotate-90" : "")} />
            </button>
          </div>
        </div>

        {!isChartsCollapsed && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1 animate-in fade-in duration-200">
            {/* Daily Trend Area/Bar Graph (Left Column) */}
            {(chartView === 'both' || chartView === 'daily') && (
              <div className={clsx("flex flex-col justify-between", chartView === 'both' ? "lg:col-span-7" : "lg:col-span-12")}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-indigo-500" /> Daily Lead Volume (Current Month)
                  </span>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span> New Leads
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> Contacted
                    </span>
                  </div>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="newLeadGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="contactedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.12)" />
                      <XAxis dataKey="dateStr" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(17, 24, 39, 0.95)',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: '11px',
                          color: '#fff',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                        }}
                      />
                      <Area type="monotone" dataKey="newLeads" name="New Leads" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#newLeadGradient)" />
                      <Area type="monotone" dataKey="contacted" name="Contacted" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#contactedGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Status Breakdown Donut/Pie Chart (Right Column) */}
            {(chartView === 'both' || chartView === 'status') && (
              <div className={clsx("flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-zinc-100 dark:border-zinc-800/80 pt-3 lg:pt-0 lg:pl-4", chartView === 'both' ? "lg:col-span-5" : "lg:col-span-12")}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                    <PieChartIcon className="w-3 h-3 text-indigo-500" /> Contacted vs. New Breakdown
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {filteredSubmissions.length} leads
                  </span>
                </div>

                <div className="h-44 w-full flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={62}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(17, 24, 39, 0.95)',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: '11px',
                          color: '#fff'
                        }}
                      />
                      <Legend 
                        layout="vertical" 
                        align="right" 
                        verticalAlign="middle" 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '10px', paddingLeft: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          3. ADVANCED FILTER TOOLBAR & DATE SELECTOR
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search leads by name, email, phone, responses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Preset Date Pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[11px] font-semibold text-zinc-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Filter:
            </span>

            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' }
            ].map((p) => {
              const isActive = dateFilter === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setDateFilter(p.id as DateFilterPreset);
                    if (p.id !== 'custom') {
                      setCustomStartDate(null);
                      setCustomEndDate(null);
                    }
                  }}
                  className={clsx(
                    "px-2.5 py-1 text-xs font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap",
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs font-semibold"
                      : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                  )}
                >
                  {p.label}
                </button>
              );
            })}

            {/* Custom Date Range Trigger */}
            <button
              type="button"
              onClick={() => setShowCustomDateModal(true)}
              className={clsx(
                "px-2.5 py-1 text-xs font-medium rounded-xl transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap",
                dateFilter === 'custom'
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-dashed border-zinc-300 dark:border-zinc-700"
              )}
            >
              <Clock className="w-3 h-3" />
              <span>
                {dateFilter === 'custom' && customStartDate
                  ? `${new Date(customStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${customEndDate ? ` - ${new Date(customEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}`
                  : 'Custom Range...'}
              </span>
            </button>
          </div>

          {/* Export Action & Bulk Delete Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {selectedSubIds.length > 0 ? (
              <>
                <button
                  onClick={() => setSelectedSubIds([])}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                >
                  Deselect All ({selectedSubIds.length})
                </button>
                <button
                  onClick={() => promptDeleteSubmissions(selectedSubIds)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedSubIds.length})
                </button>
              </>
            ) : (
              <>
                {/* Centralized Export Dropdown */}
                <ExportDropdown
                  buttonLabel="Export Leads"
                  onExport={handleExport}
                  variant="primary"
                  size="sm"
                  formats={['excel', 'pdf', 'docx', 'csv']}
                />

                {filteredSubmissions.length > 0 && (
                  <button
                    onClick={() => promptDeleteSubmissions(filteredSubmissions.map(s => s.id))}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    title="Delete all currently filtered leads"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Secondary Filter Bar: Status Pipeline Tabs & Reset */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
            <span className="text-[11px] font-semibold text-zinc-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Stage:
            </span>

            <button
              onClick={() => setStatusFilter('all')}
              className={clsx(
                "px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer",
                statusFilter === 'all'
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              All Stages ({submissions.length})
            </button>

            {PIPELINE_STAGES.map(s => {
              const count = submissions.filter(sub => (sub.status || 'new').toLowerCase() === s.value.toLowerCase()).length;
              const isSelected = statusFilter === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setStatusFilter(s.value)}
                  className={clsx(
                    "px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1",
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <span className={clsx("w-1.5 h-1.5 rounded-full", s.dot || "bg-indigo-500")}></span>
                  <span>{s.label}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                  setCustomStartDate(null);
                  setCustomEndDate(null);
                }}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" /> Reset Filters ({activeFilterCount})
              </button>
            )}
            <span className="text-[11px] text-zinc-400">
              Showing <strong>{filteredSubmissions.length}</strong> of {submissions.length} leads
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          4. LEADS SUBMISSIONS TABLE WITH INLINE STATUS ADJUSTMENT DROPDOWN
          ══════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No leads match the selected filters</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {activeFilterCount > 0 
                  ? 'Try adjusting your date range, status, or search query.'
                  : 'New responses submitted through your form will appear here in real-time.'}
              </p>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setDateFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold rounded-xl text-zinc-700 dark:text-zinc-200 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider text-[10px] border-b border-zinc-100 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredSubmissions.length > 0 && selectedSubIds.length === filteredSubmissions.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedSubIds(filteredSubmissions.map(s => s.id));
                        else setSelectedSubIds([]);
                      }}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3">Lead Status (Adjustable)</th>
                  <th className="px-5 py-3">Lead Summary</th>
                  <th className="px-5 py-3">CRM Sync</th>
                  <th className="px-5 py-3">IP</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredSubmissions.map(sub => {
                  const isSelected = selectedSubIds.includes(sub.id);
                  const currentStatus = sub.status || 'new';
                  const stageObj = PIPELINE_STAGES.find(s => s.value.toLowerCase() === currentStatus.toLowerCase()) || {
                    value: currentStatus,
                    label: currentStatus,
                    color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200',
                    dot: 'bg-zinc-500'
                  };
                  const isDropdownOpen = activeStatusDropdownId === sub.id;

                  return (
                    <tr
                      key={sub.id}
                      className={clsx(
                        "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors",
                        isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedSubIds(prev => 
                              prev.includes(sub.id) ? prev.filter(id => id !== sub.id) : [...prev, sub.id]
                            );
                          }}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Date & Time */}
                      <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {new Date(sub.submittedAt).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Lead Status (Interactive Dropdown Filter/Changer) */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="relative inline-block" ref={isDropdownOpen ? statusMenuRef : undefined}>
                          <button
                            type="button"
                            onClick={() => setActiveStatusDropdownId(isDropdownOpen ? null : sub.id)}
                            disabled={isUpdatingStatus === sub.id}
                            className={clsx(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
                              stageObj.color
                            )}
                            title="Click to adjust lead pipeline stage"
                          >
                            <span className={clsx("w-1.5 h-1.5 rounded-full", stageObj.dot || "bg-indigo-500")}></span>
                            <span>{stageObj.label}</span>
                            <ChevronDown className={clsx("w-3 h-3 opacity-70 transition-transform", isDropdownOpen && "rotate-180")} />
                          </button>

                          {/* Status Picker Menu */}
                          {isDropdownOpen && (
                            <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/10 dark:shadow-black/50 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                              <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 mb-1">
                                Change Lead Stage
                              </div>
                              <div className="space-y-0.5">
                                {PIPELINE_STAGES.map(stage => {
                                  const isCurrent = stage.value.toLowerCase() === currentStatus.toLowerCase();
                                  return (
                                    <button
                                      key={stage.value}
                                      type="button"
                                      onClick={() => handleUpdateStatus(sub.id, stage.value)}
                                      className={clsx(
                                        "w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs font-medium rounded-lg transition-colors cursor-pointer",
                                        isCurrent
                                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                                      )}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={clsx("w-2 h-2 rounded-full", stage.dot)}></span>
                                        <span>{stage.label}</span>
                                      </div>
                                      {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Lead Summary */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5 max-w-xs">
                          {(() => {
                            const validValues = (sub.values || []).filter((v: any) => Boolean(v.value && String(v.value).trim()) || Boolean(v.fileUrl));
                            if (validValues.length > 0) {
                              return validValues.slice(0, 3).map((v: any, i: number) => (
                                <span key={i} className="text-xs text-zinc-800 dark:text-zinc-200 font-medium truncate">
                                  <strong className="text-zinc-500 dark:text-zinc-400 text-[11px]">{v.label || v.field?.label || `Field ${i + 1}`}:</strong> {v.value || (v.fileUrl ? '📎 Attachment' : '—')}
                                </span>
                              ));
                            }
                            return <span className="text-zinc-400 text-[11px] italic">No response data</span>;
                          })()}
                        </div>
                      </td>

                      {/* CRM Sync Indicator */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {sub.leadId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/20">
                            <Zap className="w-3 h-3 text-emerald-500" /> Pipeline Lead
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* IP Address */}
                      <td className="px-5 py-3.5 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                        {sub.ipAddress || '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setActiveDetailSubmission(sub)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => promptDeleteSubmissions([sub.id])}
                            title="Delete submission and linked CRM lead"
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          5. CUSTOM DATE RANGE PICKER MODAL (USING UNIVERSAL COMPONENT)
          ══════════════════════════════════════════════════════════════════════════ */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Select Custom Date Range</h3>
                  <p className="text-[11px] text-zinc-400">Filter lead submissions between dates</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Start Date & Time
                </label>
                <UniversalDateTimePicker
                  value={customStartDate}
                  onChange={(isoStr) => setCustomStartDate(isoStr)}
                  placeholder="Select start date..."
                  mode="datetime"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  End Date & Time
                </label>
                <UniversalDateTimePicker
                  value={customEndDate}
                  onChange={(isoStr) => setCustomEndDate(isoStr)}
                  placeholder="Select end date..."
                  mode="datetime"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate(null);
                  setCustomEndDate(null);
                  setDateFilter('all');
                  setShowCustomDateModal(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Clear Range
              </button>
              <button
                type="button"
                onClick={() => {
                  if (customStartDate || customEndDate) {
                    setDateFilter('custom');
                  }
                  setShowCustomDateModal(false);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Apply Custom Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          6. LEAD SUBMISSION DETAIL MODAL
          ══════════════════════════════════════════════════════════════════════════ */}
      {activeDetailSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Submission & Lead Details</h3>
                <p className="text-xs text-zinc-400">ID: {activeDetailSubmission.id}</p>
              </div>
              <button
                onClick={() => setActiveDetailSubmission(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase">Submitted At</span>
                  <strong className="text-zinc-700 dark:text-zinc-300">
                    {new Date(activeDetailSubmission.submittedAt).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase">Lead Status</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 font-bold capitalize">
                    {activeDetailSubmission.status || 'New'}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase">IP Address</span>
                  <strong className="text-zinc-700 dark:text-zinc-300 font-mono">
                    {activeDetailSubmission.ipAddress || 'N/A'}
                  </strong>
                </div>
              </div>

              {/* Status Adjuster inside Modal */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">Adjust Pipeline Stage</span>
                  <p className="text-[10px] text-zinc-500">Syncs immediately to CRM Lead Pipeline</p>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={activeDetailSubmission.status || 'new'}
                    onChange={(e) => {
                      const newSt = e.target.value;
                      handleUpdateStatus(activeDetailSubmission.id, newSt);
                      setActiveDetailSubmission(prev => prev ? { ...prev, status: newSt } : null);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {PIPELINE_STAGES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submitted Field Values */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Submitted Form Values</h4>
                {(() => {
                  const validModalValues = (activeDetailSubmission.values || []).filter((v: any) => Boolean(v.value && String(v.value).trim()) || Boolean(v.fileUrl));
                  if (validModalValues.length > 0) {
                    return validModalValues.map((val: any, idx: number) => (
                      <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-1">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase">{val.label || val.field?.label || `Field ${idx + 1}`}</span>
                        {val.fileUrl ? (
                          <a href={val.fileUrl} target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold text-indigo-600 hover:underline">
                            📎 {val.fileName || 'Download Attached File'}
                          </a>
                        ) : (
                          <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium whitespace-pre-wrap">{val.value || '—'}</p>
                        )}
                      </div>
                    ));
                  }
                  return <p className="text-xs text-zinc-400 italic p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">No field responses recorded for this submission.</p>;
                })()}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => promptDeleteSubmissions([activeDetailSubmission.id])}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Submission
              </button>
              <button
                onClick={() => setActiveDetailSubmission(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold rounded-xl text-zinc-700 dark:text-zinc-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDeleteModal.open}
        title={confirmDeleteModal.title}
        message={confirmDeleteModal.description}
        confirmText={isDeleting ? "Deleting..." : "Delete Permanently"}
        cancelText="Cancel"
        loading={isDeleting}
        variant="danger"
        onConfirm={executeDeleteSubmissions}
        onCancel={() => setConfirmDeleteModal({ open: false, title: '', description: '', idsToDelete: [] })}
      />
    </div>
  );
}

export default LeadSubmissionsManager;
