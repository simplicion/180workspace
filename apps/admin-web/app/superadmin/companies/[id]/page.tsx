'use client';

import { useEffect, useState, use } from 'react';
import { 
    Building2, Mail, Phone, ArrowLeft, CheckCircle2, XCircle, 
    AlertCircle, RefreshCw, ShieldCheck, Database as DbIcon, 
    Calendar, CreditCard, HardDrive, Users, Globe, MapPin, 
    Briefcase, Sparkles, Ban, KeyRound, Trash2, ExternalLink, 
    Layers, Cpu, FileText, Check, AlertTriangle, ShieldAlert,
    Clock, Tag, Lock, ChevronRight, Activity, Search, Filter,
    Sliders, Receipt, UserCheck, Smartphone, Send, LifeBuoy,
    Megaphone, MessageSquare, BarChart3, CalendarClock, DollarSign,
    History, Zap, CheckCircle, ChevronDown, ChevronUp, Download,
    Code2, Info, FileJson, Terminal
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../../lib/superadmin-api';
import { useModal } from '../../../../lib/modal-context';
import { Skeleton, LogoLoader } from '@workspace/ui';
import clsx from 'clsx';

const formatDateTime = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return '—';
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    } catch {
        return '—';
    }
};

const formatDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return '—';
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return '—';
    }
};

const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'active':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'trial':
            return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'suspended':
            return 'bg-rose-50 text-rose-700 border-rose-200';
        case 'expired':
            return 'bg-orange-50 text-orange-700 border-orange-200';
        default:
            return 'bg-slate-50 text-slate-700 border-slate-200';
    }
};

type ActiveTab = 'profile' | 'telemetry' | 'users' | 'subscription' | 'operations' | 'logs';

export default function CompanyDetailsPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = use(paramsPromise);
    const router = useRouter();
    const modal = useModal();
    
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
    const [actionLoading, setActionLoading] = useState(false);
    
    // User filter and selection state
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // Log filter and search state
    const [logSearch, setLogSearch] = useState('');
    const [logTypeFilter, setLogTypeFilter] = useState('all');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await saApi.get(`/companies/${params.id}`);
            setData(res.data);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to load company details');
            router.push('/superadmin/companies');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [params.id]);

    const company = data?.company;
    const users: any[] = data?.users || [];
    const subscriptions: any[] = data?.subscriptions || [];
    const paymentHistories: any[] = data?.paymentHistories || [];
    const stats = data?.stats || {};
    const activityLogs: any[] = data?.activityLogs || [];

    const isSuspended = company?.accountStatus === 'suspended' || company?.subscriptionStatus === 'suspended';

    // Toggle Suspend / Unsuspend
    const handleToggleSuspend = async () => {
        if (!company) return;
        
        if (!isSuspended) {
            const reason = await modal.prompt({
                title: `Deactivate ${company.companyName}?`,
                message: 'Provide a reason for deactivating this company. All users and employees of this organization will be blocked from accessing the workspace immediately.',
                placeholder: 'e.g. Terms violation, Non-payment, Administrative hold',
                confirmText: 'Deactivate Company',
                variant: 'danger'
            });
            if (!reason) return;
            
            setActionLoading(true);
            try {
                await saApi.put(`/companies/${company.id}/suspend`, { reason });
                toast.success('Company deactivated and suspended');
                await loadData();
            } catch (err: any) {
                toast.error(err?.response?.data?.error || 'Failed to suspend company');
            } finally {
                setActionLoading(false);
            }
        } else {
            const ok = await modal.confirm({
                title: `Reactivate ${company.companyName}?`,
                message: 'Restore full workspace access and features for all users of this organization?',
                confirmText: 'Reactivate Now',
                variant: 'success'
            });
            if (!ok) return;

            setActionLoading(true);
            try {
                await saApi.put(`/companies/${company.id}/unsuspend`);
                toast.success('Company reactivated successfully');
                await loadData();
            } catch (err: any) {
                toast.error(err?.response?.data?.error || 'Failed to reactivate company');
            } finally {
                setActionLoading(false);
            }
        }
    };

    // Reset Admin Password
    const handleResetPassword = async () => {
        if (!company) return;
        const newPassword = await modal.prompt({
            title: `Reset Admin Password for ${company.companyName}`,
            message: `Enter a new password for administrator (${company.adminEmail}). Must be at least 8 characters.`,
            placeholder: 'Enter new secure password',
            confirmText: 'Reset Password',
            variant: 'info'
        });
        if (!newPassword) return;

        setActionLoading(true);
        try {
            await saApi.post(`/companies/${company.id}/reset-password`, { newPassword });
            toast.success(`Password reset successfully for ${company.adminEmail}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to reset password');
        } finally {
            setActionLoading(false);
        }
    };

    // Delete Company
    const handleDeleteCompany = async () => {
        if (!company) return;
        const confirmText = await modal.prompt({
            title: `Permanently Delete ${company.companyName}?`,
            message: 'This will irreversibly wipe all data, projects, databases, documents, and employees belonging to this organization. Type DELETE to confirm.',
            placeholder: 'Type DELETE',
            confirmText: 'Permanently Delete',
            variant: 'danger'
        });
        if (confirmText !== 'DELETE') {
            if (confirmText !== null) toast.error('Incorrect confirmation text');
            return;
        }

        setActionLoading(true);
        try {
            await saApi.delete(`/companies/${company.id}`, { data: { confirm: 'DELETE' } });
            toast.success('Company permanently deleted');
            router.push('/superadmin/companies');
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to delete company');
            setActionLoading(false);
        }
    };

    // Filtered users
    const filteredUsers = users.filter(u => {
        const matchesSearch = !userSearch || 
            u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
            u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.position?.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.phone?.includes(userSearch);
        const matchesRole = userRoleFilter === 'all' || u.role?.toLowerCase() === userRoleFilter.toLowerCase();
        return matchesSearch && matchesRole;
    });

    // User Selection Handlers
    const handleToggleSelectUser = (id: string) => {
        setSelectedUserIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAllUsers = () => {
        if (selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(filteredUsers.map(u => u.id));
        }
    };

    // Single User Delete
    const handleDeleteSingleUser = async (id: string, name: string) => {
        const confirmed = await modal.confirm({
            title: 'Delete User Account?',
            message: `Are you sure you want to permanently delete user "${name || 'Team Member'}" from this company workspace?`,
            confirmText: 'Delete User',
            variant: 'danger'
        });
        if (!confirmed) return;

        setActionLoading(true);
        try {
            await saApi.delete(`/users/${id}`, { params: { companyId: params.id } });
            toast.success(`User "${name || 'User'}" deleted successfully`);
            setSelectedUserIds(prev => prev.filter(x => x !== id));
            await loadData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to delete user');
        } finally {
            setActionLoading(false);
        }
    };

    // Bulk Delete Users
    const handleBulkDeleteUsers = async () => {
        if (selectedUserIds.length === 0) return;
        const count = selectedUserIds.length;
        const confirmed = await modal.confirm({
            title: `Delete ${count} Selected User${count > 1 ? 's' : ''}?`,
            message: `Are you sure you want to permanently delete the selected ${count} user accounts from this company workspace? This action cannot be undone.`,
            confirmText: `Delete ${count} Users`,
            variant: 'danger'
        });
        if (!confirmed) return;

        setActionLoading(true);
        try {
            await saApi.post('/users/bulk-delete', { userIds: selectedUserIds });
            toast.success(`Successfully deleted ${count} user${count > 1 ? 's' : ''}`);
            setSelectedUserIds([]);
            await loadData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to delete selected users');
        } finally {
            setActionLoading(false);
        }
    };

    // Filtered Logs
    const filteredLogs = activityLogs.filter((log: any) => {
        const matchesSearch = !logSearch || 
            (log.action?.toLowerCase() || '').includes(logSearch.toLowerCase()) ||
            (log.userName?.toLowerCase() || '').includes(logSearch.toLowerCase()) ||
            (log.userEmail?.toLowerCase() || '').includes(logSearch.toLowerCase()) ||
            (log.resourceType?.toLowerCase() || '').includes(logSearch.toLowerCase()) ||
            (log.ipAddress?.toLowerCase() || '').includes(logSearch.toLowerCase());
        
        const matchesType = logTypeFilter === 'all' || 
            (log.logType?.toLowerCase() === logTypeFilter.toLowerCase());

        return matchesSearch && matchesType;
    });

    // Export Logs as JSON
    const handleExportLogs = () => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activityLogs, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `audit-logs-${company?.slug || company?.id || 'company'}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            toast.success('Audit logs exported successfully');
        } catch {
            toast.error('Failed to export logs');
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto space-y-6 pb-16">
                <Skeleton className="h-6 w-40 rounded-xl" />
                <Skeleton className="h-44 w-full rounded-3xl" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Skeleton className="h-28 rounded-2xl" />
                    <Skeleton className="h-28 rounded-2xl" />
                    <Skeleton className="h-28 rounded-2xl" />
                    <Skeleton className="h-28 rounded-2xl" />
                </div>
                <Skeleton className="h-96 w-full rounded-3xl" />
            </div>
        );
    }

    if (!company) return null;

    const currentSubscription = subscriptions[0] || {};
    const activePlan = currentSubscription.plan || company.subscriptionPlan || {};

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-16 font-sans">
            <Toaster position="top-center" />

            {/* Back Navigation & Breadcrumb */}
            <div className="flex items-center justify-between">
                <Link
                    href="/superadmin/companies" 
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-600 transition-colors font-bold text-xs uppercase tracking-widest group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                    Back to Organizations Directory
                </Link>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        disabled={loading || actionLoading}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-sky-600 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:bg-slate-50"
                        title="Refresh company data"
                    >
                        <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin text-sky-600")} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Top Identity Hero Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
                {/* Background Decorator */}
                <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-sky-500/5 blur-3xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    {/* Left Brand Identity */}
                    <div className="flex items-start gap-4 sm:gap-5">
                        {company.logoUrl ? (
                            <img 
                                src={company.logoUrl} 
                                alt={company.companyName} 
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-white shadow-xs p-1 border border-slate-200 shrink-0" 
                            />
                        ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-600 to-purple-600 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-md shadow-sky-500/20 shrink-0">
                                {company.companyName ? company.companyName.charAt(0).toUpperCase() : 'C'}
                            </div>
                        )}

                        <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                    {company.companyName}
                                </h1>
                                {company.slug && (
                                    <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                                        @{company.slug}
                                    </span>
                                )}
                            </div>

                            <p className="text-xs sm:text-sm text-slate-500 font-medium line-clamp-1">
                                {company.oneLineDescription || company.tagline || '180workspace Tenant Organization'}
                            </p>

                            <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-500 flex-wrap pt-1 font-medium">
                                <span className="inline-flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    <strong className="text-slate-700">{company.adminEmail}</strong>
                                </span>
                                {company.adminPhone && (
                                    <span className="inline-flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{company.adminPhone}</span>
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                                    Ref: #{company.id.slice(0, 8)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Status & Control Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 shrink-0">
                        {/* Status Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={clsx("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs", getStatusBadge(company.subscriptionStatus))}>
                                {company.subscriptionStatus || 'Trial'}
                            </span>
                            <span className={clsx("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs", isSuspended ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                                {isSuspended ? "Suspended" : "Active"}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
                                {activePlan.planName || 'Free Plan'}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Deactivate / Reactivate */}
                            <button
                                onClick={handleToggleSuspend}
                                disabled={actionLoading}
                                className={clsx(
                                    "px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer",
                                    isSuspended
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                                        : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                                )}
                            >
                                {isSuspended ? (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Reactivate Company</span>
                                    </>
                                ) : (
                                    <>
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>Deactivate Company</span>
                                    </>
                                )}
                            </button>

                            {/* Reset Admin Password */}
                            <button
                                onClick={handleResetPassword}
                                disabled={actionLoading}
                                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                title="Reset Administrator Password"
                            >
                                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                                <span>Reset Password</span>
                            </button>

                            {/* Delete Company */}
                            <button
                                onClick={handleDeleteCompany}
                                disabled={actionLoading}
                                className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-all shadow-xs cursor-pointer"
                                title="Permanently Delete Company"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Suspension Warning Notice if suspended */}
                {isSuspended && (
                    <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/90 flex items-start gap-3 text-xs text-rose-900 animate-in fade-in">
                        <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-bold text-rose-950">Workspace Access Suspended</p>
                            <p className="text-rose-700 mt-0.5">
                                Reason: {(company.metadata as any)?.suspendedReason || 'Administrative suspension or policy hold.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick KPI Telemetry Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {/* KPI 1: Active Users */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Seats</span>
                        <Users className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.usersCount || users.length}</div>
                    <p className="text-[11px] text-slate-400 font-medium truncate">Registered members</p>
                </div>

                {/* KPI 2: Storage Node */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Storage</span>
                        <HardDrive className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.storageUsedMb || 0} <span className="text-xs font-semibold text-slate-400">MB</span></div>
                    <p className="text-[11px] text-slate-400 font-medium truncate">{stats.documentsCount || 0} documents stored</p>
                </div>

                {/* KPI 3: Projects */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Projects</span>
                        <Layers className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.projectsCount || 0}</div>
                    <p className="text-[11px] text-slate-400 font-medium truncate">{stats.tasksCount || 0} active tasks</p>
                </div>

                {/* KPI 4: CRM Clients */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">CRM Clients</span>
                        <Briefcase className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.clientsCount || 0}</div>
                    <p className="text-[11px] text-slate-400 font-medium truncate">Client accounts</p>
                </div>

                {/* KPI 5: Traffic Links */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Traffic Links</span>
                        <Globe className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.trafficLinksCount || 0}</div>
                    <p className="text-[11px] text-slate-400 font-medium truncate">Director rules</p>
                </div>

                {/* KPI 6: Joined */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Joined</span>
                        <Calendar className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-sm sm:text-base font-black text-slate-900 truncate">
                        {new Date(company.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium truncate">Onboarding complete</p>
                </div>
            </div>

            {/* Interactive Tab Headers */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 overflow-x-auto no-scrollbar pt-2">
                {[
                    { id: 'profile', label: 'About & Profile', icon: Building2 },
                    { id: 'telemetry', label: 'OverDrive & Quotas', icon: Cpu, badge: 'Live' },
                    { id: 'users', label: `Users & Directory (${users.length})`, icon: Users },
                    { id: 'subscription', label: 'Subscription & Billing', icon: CreditCard },
                    { id: 'operations', label: 'Operations Snapshot', icon: Activity },
                    { id: 'logs', label: `Audit Logs (${activityLogs.length})`, icon: Clock }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ActiveTab)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                                isActive
                                    ? "border-sky-600 text-sky-600 bg-sky-50/50 rounded-t-xl"
                                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 rounded-t-xl"
                            )}
                        >
                            <Icon className={clsx("w-4 h-4", isActive ? "text-sky-600" : "text-slate-400")} />
                            <span>{tab.label}</span>
                            {tab.badge && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-sky-100 text-sky-700">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* TAB CONTENT 1: ABOUT & PROFILE */}
            {activeTab === 'profile' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
                    {/* Left 2 Cols: Detailed Business Intelligence */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Company Overview & Description */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-5">
                            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-sky-600" />
                                Business Information
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Industry / Sector</span>
                                    <span className="font-bold text-slate-800 text-sm">{company.industry || 'Technology & Services'}</span>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Company Stage</span>
                                    <span className="font-bold text-slate-800 text-sm">{company.startupStage || 'Growth Stage'}</span>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Team Size</span>
                                    <span className="font-bold text-slate-800 text-sm">{company.teamSize || `${users.length} Members`}</span>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Country / Headquarters</span>
                                    <span className="font-bold text-slate-800 text-sm">{company.headquarters || company.country || 'Global'}</span>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Official Website</span>
                                    {company.website ? (
                                        <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="font-bold text-sky-600 hover:underline inline-flex items-center gap-1">
                                            {company.website} <ExternalLink className="w-3 h-3" />
                                        </a>
                                    ) : (
                                        <span className="font-medium text-slate-400">Not provided</span>
                                    )}
                                </div>

                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Operating Currency</span>
                                    <span className="font-bold text-slate-800 text-sm">{company.currency || 'USD'} ({company.currencySymbol || '$'})</span>
                                </div>
                            </div>

                            {/* About Story */}
                            {company.aboutUs && (
                                <div className="pt-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">About Organization</span>
                                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                                        {company.aboutUs}
                                    </p>
                                </div>
                            )}

                            {/* Mission & Vision */}
                            {(company.mission || company.vision) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    {company.mission && (
                                        <div className="p-4 rounded-2xl bg-sky-50/40 border border-sky-100">
                                            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block mb-1">Mission</span>
                                            <p className="text-xs text-slate-700 leading-relaxed">{company.mission}</p>
                                        </div>
                                    )}
                                    {company.vision && (
                                        <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100">
                                            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block mb-1">Vision</span>
                                            <p className="text-xs text-slate-700 leading-relaxed">{company.vision}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right 1 Col: Primary Administrator & System Meta */}
                    <div className="space-y-6">
                        {/* Admin Contact Details */}
                        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-4">
                            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-indigo-600" />
                                Primary Administrator
                            </h3>

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-400 font-medium">Full Name</span>
                                    <span className="font-bold text-slate-900">{company.adminName || 'Admin'}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-400 font-medium">Email Address</span>
                                    <span className="font-bold text-slate-900 font-mono text-[11px]">{company.adminEmail}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-400 font-medium">Phone</span>
                                    <span className="font-bold text-slate-900">{company.adminPhone || '—'}</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-slate-400 font-medium">Role</span>
                                    <span className="badge-indigo font-bold text-[10px] uppercase">Organization Owner</span>
                                </div>
                            </div>
                        </div>

                        {/* System Metadata */}
                        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-4">
                            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                System Governance
                            </h3>

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-400 font-medium">Account Status</span>
                                    <span className={clsx("font-bold text-xs uppercase", isSuspended ? "text-rose-600" : "text-emerald-600")}>
                                        {company.accountStatus || 'Active'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-400 font-medium">Onboarding</span>
                                    <span className="font-bold text-slate-900">
                                        {company.isOnboardingComplete ? 'Completed' : 'Pending'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-400 font-medium">Created Date</span>
                                    <span className="font-bold text-slate-900">{new Date(company.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-slate-400 font-medium">Database Node</span>
                                    <span className="font-mono text-[11px] font-bold text-slate-700">Cluster Multi-Tenant #1</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT 2: OVERDRIVE & QUOTAS (APP USAGE, STORAGE, LIMITS) */}
            {activeTab === 'telemetry' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Usage Progress Gauges */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Seat Quota */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900">User Seats Utilization</h4>
                                        <p className="text-xs text-slate-400">Allocated employee licenses</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-slate-900">
                                    {users.length} / {activePlan.maxUsers || 10}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div 
                                    className="bg-sky-600 h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${Math.min(100, Math.round((users.length / (activePlan.maxUsers || 10)) * 100))}%` }}
                                />
                            </div>

                            <p className="text-[11px] text-slate-500">
                                <strong>{Math.max(0, (activePlan.maxUsers || 10) - users.length)} seats remaining</strong> before organization requires plan expansion.
                            </p>
                        </div>

                        {/* Storage Quota */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                        <HardDrive className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900">Storage Consumption</h4>
                                        <p className="text-xs text-slate-400">Documents, contracts & assets</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-slate-900">
                                    {stats.storageUsedMb || 0} MB / {(activePlan.maxStorageGb || 5) * 1024} MB
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div 
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${Math.min(100, Math.max(2, Math.round(((stats.storageUsedMb || 0) / ((activePlan.maxStorageGb || 5) * 1024)) * 100)))}%` }}
                                />
                            </div>

                            <p className="text-[11px] text-slate-500">
                                Operating on High-Performance CDN storage cluster with automated encryption.
                            </p>
                        </div>
                    </div>

                    {/* Enabled Workspace Apps Matrix */}
                    {/* Enabled Workspace Apps Matrix */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-5">
                        {(() => {
                            const companyMetadata = typeof company?.metadata === 'string'
                                ? (() => { try { return JSON.parse(company.metadata); } catch(e) { return {}; } })()
                                : (company?.metadata || {});

                            const isPaidPlan = Boolean(
                                (activePlan && Number(activePlan.price) > 0) ||
                                (company?.subscriptionStatus?.toUpperCase() === 'ACTIVE' && activePlan && Number(activePlan.price) > 0) ||
                                (activePlan?.planName?.toLowerCase().includes('limitless') || activePlan?.planName?.toLowerCase().includes('momentum'))
                            );

                            const rawEnabledApps: string[] = Array.isArray(companyMetadata?.enabledApps)
                                ? companyMetadata.enabledApps
                                : (Array.isArray(company?.enabledApps) ? company.enabledApps : []);

                            const ALL_SUITE_APPS = [
                                { id: 'crm', name: 'CRM & Sales', desc: 'Leads, deals & client pipeline', icon: Briefcase, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', aliases: ['sales', 'leads', 'pipeline'] },
                                { id: 'finance', name: 'Finance & Invoicing', desc: 'Invoices, expenses & salary', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', aliases: ['invoicing', 'expenses'] },
                                { id: 'projects', name: 'Projects & Tasks', desc: 'Agile sprints & work logs', icon: Layers, color: 'text-purple-600 bg-purple-50 border-purple-100', aliases: ['tasks', 'goals', 'workflow'] },
                                { id: 'hr', name: 'HR & Attendance', desc: 'Employee payroll & timekeeping', icon: Users, color: 'text-sky-600 bg-sky-50 border-sky-100', aliases: ['attendance', 'employees', 'hrms', 'payroll'] },
                                { id: 'social-media', name: 'Social Media Studio', desc: 'Multi-platform content calendar', icon: Sparkles, color: 'text-rose-600 bg-rose-50 border-rose-100', aliases: ['social', 'content-calendar'] },
                                { id: 'traffic-director', name: 'Traffic Director', desc: 'Affiliate smart link routing', icon: Globe, color: 'text-amber-600 bg-amber-50 border-amber-100', aliases: ['traffic', 'links', 'smart-links'] },
                                { id: 'ai', name: 'Orbit Copilot (AI)', desc: 'Autonomous workspace intelligence', icon: Sparkles, color: 'text-violet-600 bg-violet-50 border-violet-100', aliases: ['orbit', 'ai-copilot'] },
                                { id: 'storage', name: 'Documents & Storage', desc: 'Secure cloud contract storage', icon: HardDrive, color: 'text-cyan-600 bg-cyan-50 border-cyan-100', aliases: ['documents', 'workspace-tools', 'tools'] },
                                { id: 'advertising', name: 'Advertising & Builder', desc: 'Funnel & landing page engine', icon: Megaphone, color: 'text-pink-600 bg-pink-50 border-pink-100', aliases: ['ad-websites', 'funnels', 'websites'] },
                                { id: 'communications', name: 'Team Chat & Meet', desc: 'Encrypted messaging & video calls', icon: MessageSquare, color: 'text-blue-600 bg-blue-50 border-blue-100', aliases: ['chat', 'meeting', 'video'] },
                                { id: 'analytics', name: 'Insights & Analytics', desc: 'Real-time telemetry & BI reporting', icon: BarChart3, color: 'text-teal-600 bg-teal-50 border-teal-100', aliases: ['insights', 'reports', 'telemetry'] },
                                { id: 'database', name: 'External Database', desc: 'BYOD Mongo & PostgreSQL connector', icon: DbIcon, color: 'text-slate-600 bg-slate-50 border-slate-100', aliases: ['db', 'custom-db'] }
                            ];

                            const isAppEnabled = (app: typeof ALL_SUITE_APPS[0]) => {
                                if (isPaidPlan) return true;
                                if (rawEnabledApps.length === 0) {
                                    return ['projects', 'storage', 'communications'].includes(app.id);
                                }
                                return rawEnabledApps.some((a: string) => 
                                    a.toLowerCase() === app.id.toLowerCase() || 
                                    (app.aliases && app.aliases.some((alias: string) => a.toLowerCase() === alias.toLowerCase()))
                                );
                            };

                            const activeAppsCount = ALL_SUITE_APPS.filter(isAppEnabled).length;

                            return (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                                <Cpu className="w-4 h-4 text-sky-600" />
                                                Platform Apps & Module Gating
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Active suite entitlements enabled for this organization
                                            </p>
                                        </div>
                                        <span className={clsx(
                                            "text-[11px] font-bold px-2.5 py-1 rounded-full border",
                                            activeAppsCount === ALL_SUITE_APPS.length 
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                                : "bg-sky-50 text-sky-700 border-sky-200"
                                        )}>
                                            {activeAppsCount === ALL_SUITE_APPS.length 
                                                ? `All ${activeAppsCount} Apps Operational` 
                                                : `${activeAppsCount} of ${ALL_SUITE_APPS.length} Apps Active`}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {ALL_SUITE_APPS.map((app) => {
                                            const Icon = app.icon;
                                            const enabled = isAppEnabled(app);
                                            return (
                                                <div 
                                                    key={app.id} 
                                                    className={clsx(
                                                        "p-4 rounded-2xl border transition-all group relative",
                                                        enabled 
                                                            ? "border-slate-200/90 bg-white hover:border-sky-300 hover:shadow-xs" 
                                                            : "border-slate-200/60 border-dashed bg-slate-50/50 opacity-65 hover:opacity-90"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-2.5">
                                                        <div className={clsx(
                                                            "p-2 rounded-xl border transition-transform group-hover:scale-105", 
                                                            enabled ? app.color : "border-slate-200 bg-slate-100 text-slate-400"
                                                        )}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        {enabled ? (
                                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                                                <Lock className="w-2.5 h-2.5" /> Gated
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h5 className={clsx("font-bold text-sm", enabled ? "text-slate-900" : "text-slate-600")}>
                                                        {app.name}
                                                    </h5>
                                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{app.desc}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* TAB CONTENT 3: USERS & DIRECTORY */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <Users className="w-4 h-4 text-sky-600" />
                                Company Users & Employee Directory
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                All registered team members, administrators, and assigned permissions
                            </p>
                        </div>

                        {/* Search & Filter */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    placeholder="Search by name, email, phone..."
                                    className="pl-8.5 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all w-64"
                                />
                            </div>

                            <select
                                value={userRoleFilter}
                                onChange={e => setUserRoleFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-sky-500"
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admins</option>
                                <option value="employee">Employees</option>
                                <option value="member">Members</option>
                            </select>
                        </div>
                    </div>

                    {/* Bulk Actions Banner */}
                    {selectedUserIds.length > 0 && (
                        <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                                    {selectedUserIds.length}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-rose-900">
                                        {selectedUserIds.length} {selectedUserIds.length === 1 ? 'user' : 'users'} selected
                                    </p>
                                    <p className="text-[10px] text-rose-600">
                                        Choose an action to apply across all selected accounts
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSelectedUserIds([])}
                                    className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer"
                                >
                                    Cancel Selection
                                </button>
                                <button
                                    onClick={handleBulkDeleteUsers}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Selected ({selectedUserIds.length})
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Users Table */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="py-3 px-4 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                                            onChange={handleSelectAllUsers}
                                            aria-label="Select all users"
                                            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                                        />
                                    </th>
                                    <th className="py-3 px-4">Member Name</th>
                                    <th className="py-3 px-4">Email Address</th>
                                    <th className="py-3 px-4">Phone</th>
                                    <th className="py-3 px-4">Position / Department</th>
                                    <th className="py-3 px-4">Role</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Joined Date</th>
                                    <th className="py-3 px-4 text-center w-16">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12 text-slate-400">
                                            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                            <p className="font-bold text-slate-700">No users found</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search criteria</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u, i) => (
                                        <tr 
                                            key={u.id || i} 
                                            className={clsx(
                                                "transition-colors",
                                                selectedUserIds.includes(u.id) ? "bg-sky-50/60 hover:bg-sky-50" : "hover:bg-slate-50/70"
                                            )}
                                        >
                                            <td className="py-3.5 px-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUserIds.includes(u.id)}
                                                    onChange={() => handleToggleSelectUser(u.id)}
                                                    aria-label={`Select user ${u.name || u.email}`}
                                                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                                                />
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    {u.photoUrl ? (
                                                        <img src={u.photoUrl} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                                                            {u.name?.[0]?.toUpperCase() || 'U'}
                                                        </div>
                                                    )}
                                                    <span className="font-bold text-slate-900 text-sm">{u.name || 'Team Member'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 font-medium">
                                                {u.email}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                                                {u.phone || '—'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-slate-800">{u.position || 'Employee'}</div>
                                                <div className="text-[10px] text-slate-400">{u.department || 'Operations'}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                                                    u.role === 'admin' ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-100 text-slate-600"
                                                )}>
                                                    {u.role || 'Member'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteSingleUser(u.id, u.name || u.email)}
                                                    title={`Delete ${u.name || u.email}`}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT 4: SUBSCRIPTION & BILLING */}
            {activeTab === 'subscription' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Top Subscription Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-sky-600">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Plan & Status</span>
                                <CreditCard className="w-4 h-4" />
                            </div>
                            <div className="text-xl font-black text-slate-900 truncate">{activePlan.planName || '180 Limitless'}</div>
                            <div className="flex items-center gap-1.5 pt-1">
                                <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", getStatusBadge(company.subscriptionStatus || 'trial'))}>
                                    {company.subscriptionStatus || 'Trial'}
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">${activePlan.price || 0}/{activePlan.billingCycle || 'mo'}</span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-indigo-600">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Workspace Activation</span>
                                <CalendarClock className="w-4 h-4" />
                            </div>
                            <div className="text-sm font-black text-slate-900">{formatDateTime(company.createdAt)}</div>
                            <p className="text-[11px] text-slate-500 font-medium">Initial Workspace Registration & Setup</p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-emerald-600">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Billing Renewal</span>
                                <Clock className="w-4 h-4" />
                            </div>
                            <div className="text-sm font-black text-slate-900">
                                {company.nextChargeDate ? formatDateTime(company.nextChargeDate) : (company.trialEndDate ? formatDateTime(company.trialEndDate) : '—')}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                                {company.autopayEnabled ? 'Autopay Scheduled' : (company.subscriptionStatus === 'trial' ? 'Trial Expiration' : 'Manual Invoicing')}
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-amber-600">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Invoiced to Date</span>
                                <DollarSign className="w-4 h-4" />
                            </div>
                            <div className="text-xl font-black text-slate-900">
                                ${paymentHistories.filter((p: any) => p.status?.toLowerCase() === 'paid' || p.status?.toLowerCase() === 'succeeded').reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0).toFixed(2)}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">{paymentHistories.length} total invoice ledger records</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Current Plan & Billing Config Card */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-5">
                                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-sky-600" />
                                    Active Plan Details
                                </h3>

                                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white space-y-3.5 shadow-md relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
                                    <div className="flex items-center justify-between relative z-10">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 bg-sky-500/15 px-2.5 py-0.5 rounded-full border border-sky-400/20">
                                            {company.subscriptionStatus || 'Trial'}
                                        </span>
                                        <span className="font-mono text-xs text-slate-300 font-semibold bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                                            Autopay: {company.autopayEnabled ? 'ON' : 'OFF'}
                                        </span>
                                    </div>
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black text-white">{activePlan.planName || '180 Limitless'}</h2>
                                        <p className="text-xs text-slate-300 mt-0.5">Enterprise Cloud Suite Access</p>
                                    </div>
                                    <div className="pt-2 border-t border-slate-700/80 flex items-baseline gap-1.5 relative z-10">
                                        <span className="text-3xl font-black text-white">${activePlan.price || 0}</span>
                                        <span className="text-xs text-slate-400 font-medium">/ {activePlan.billingCycle || 'month'}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 text-xs divide-y divide-slate-100">
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-slate-500 flex items-center gap-1.5">
                                            <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                                            Activated At
                                        </span>
                                        <span className="font-bold text-slate-900 font-mono text-[11px]">
                                            {formatDateTime(company.createdAt)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2.5">
                                        <span className="text-slate-500 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            Next Billing Date
                                        </span>
                                        <span className="font-bold text-slate-900 font-mono text-[11px]">
                                            {formatDateTime(company.nextChargeDate)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2.5">
                                        <span className="text-slate-500 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            Trial Window
                                        </span>
                                        <span className="font-bold text-slate-800 text-[11px] text-right">
                                            {company.trialStartDate ? `${formatDate(company.trialStartDate)} – ${formatDate(company.trialEndDate)}` : '—'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2.5">
                                        <span className="text-slate-500 flex items-center gap-1.5">
                                            <Zap className="w-3.5 h-3.5 text-slate-400" />
                                            Billing Gateway
                                        </span>
                                        <span className="font-bold text-slate-900 capitalize">
                                            {currentSubscription.provider || 'Platform Engine'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2.5">
                                        <span className="text-slate-500 flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                                            Mandate Status
                                        </span>
                                        <span className="font-bold text-slate-900 uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                                            {currentSubscription.mandateStatus || company.mandateStatus || 'None'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Plan Allocation & Entitlements */}
                            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-3.5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                    Plan Entitlements
                                </h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-600 font-medium">User Seats</span>
                                        <span className="font-bold text-slate-900">{users.length} / {activePlan.maxUsers || 10} seats</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-600 font-medium">Suite Modules</span>
                                        <span className="font-bold text-slate-900">{activePlan.maxApps || 12} apps enabled</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-600 font-medium">Cloud Storage</span>
                                        <span className="font-bold text-slate-900">{stats.storageUsedMb || 0} MB / {Math.round((activePlan.maxStorageBytes || 1073741824) / (1024 * 1024 * 1024))} GB</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Dual Ledgers */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* SECTION 1: SUBSCRIPTION ACTIVATION & LIFECYCLE LEDGER */}
                            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                            <CalendarClock className="w-4 h-4 text-sky-600" />
                                            Subscription & Activation Lifecycle
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Historical records of when subscriptions were activated, upgraded, or renewed
                                        </p>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full w-fit">
                                        {subscriptions.length > 0 ? subscriptions.length : 1} Record{subscriptions.length > 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            <tr>
                                                <th className="py-3 px-4">Plan & Tier</th>
                                                <th className="py-3 px-4">Activation Date & Time</th>
                                                <th className="py-3 px-4">Billing Rate</th>
                                                <th className="py-3 px-4">Gateway</th>
                                                <th className="py-3 px-4">Status</th>
                                                <th className="py-3 px-4 text-right">Next Charge</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {subscriptions.length > 0 ? (
                                                subscriptions.map((sub: any, idx: number) => (
                                                    <tr key={sub.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="py-3.5 px-4 font-bold text-slate-900">
                                                            <div>{sub.plan?.planName || activePlan.planName || '180 Limitless'}</div>
                                                            <div className="text-[10px] text-slate-400 font-normal">ID: {sub.id?.slice(0, 8)}...</div>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                                                <span>{formatDateTime(sub.subscriptionStartDate || sub.startDate || sub.createdAt || company.createdAt)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-bold text-slate-800">
                                                            ${sub.amount ?? activePlan.price ?? 0} {sub.currency || 'USD'}
                                                            <span className="text-[10px] text-slate-400 font-normal ml-1">/{sub.plan?.billingCycle || 'mo'}</span>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-medium text-slate-600 capitalize">
                                                            {sub.provider || 'Stripe'}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", getStatusBadge(sub.status || company.subscriptionStatus || 'trial'))}>
                                                                {sub.status || company.subscriptionStatus || 'trial'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-600 font-medium">
                                                            {formatDate(sub.nextChargeDate || company.nextChargeDate || sub.trialEndDate || company.trialEndDate)}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                /* Fallback to primary company subscription record */
                                                <tr className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-3.5 px-4 font-bold text-slate-900">
                                                        <div>{activePlan.planName || '180 Limitless'}</div>
                                                        <div className="text-[10px] text-slate-400 font-normal">Primary Onboarding Plan</div>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                                            <span>{formatDateTime(company.createdAt)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-bold text-slate-800">
                                                        ${activePlan.price || 0} {company.currency || 'USD'}
                                                        <span className="text-[10px] text-slate-400 font-normal ml-1">/month</span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-medium text-slate-600 capitalize">
                                                        Platform Core
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", getStatusBadge(company.subscriptionStatus || 'trial'))}>
                                                            {company.subscriptionStatus || 'Trial'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-600 font-medium">
                                                        {formatDate(company.nextChargeDate || company.trialEndDate)}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* SECTION 2: PAYMENT & INVOICE LEDGER */}
                            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                            <Receipt className="w-4 h-4 text-emerald-600" />
                                            Payment & Invoice Ledger
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Real-time transaction receipts, gateway charge IDs, and webhook settlements
                                        </p>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full w-fit">
                                        {paymentHistories.length > 0 ? `${paymentHistories.length} Invoices` : '1 Provisioning Record'}
                                    </span>
                                </div>

                                <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            <tr>
                                                <th className="py-3 px-4">Payment / Invoice ID</th>
                                                <th className="py-3 px-4">Provider</th>
                                                <th className="py-3 px-4">Amount</th>
                                                <th className="py-3 px-4">Status</th>
                                                <th className="py-3 px-4 text-right">Transaction Date & Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paymentHistories.length > 0 ? (
                                                paymentHistories.map((p: any, idx: number) => (
                                                    <tr key={p.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                                                            <div className="text-indigo-700">{p.paymentId || p.id?.slice(0, 14)}</div>
                                                            {p.providerPaymentId && (
                                                                <div className="text-[10px] text-slate-400 font-mono">Ref: {p.providerPaymentId}</div>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-semibold text-slate-600 capitalize">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                {p.provider || 'Stripe'}
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                                                            ${p.amount} <span className="text-[10px] font-bold text-slate-500">{p.currency || 'USD'}</span>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className={clsx(
                                                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                                p.status?.toLowerCase() === 'paid' || p.status?.toLowerCase() === 'succeeded'
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                            )}>
                                                                {p.status || 'Paid'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-600 font-medium">
                                                            {formatDateTime(p.createdAt)}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                /* Show Initial Provisioning / Activation Grant entry */
                                                <tr className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                                                        <div className="text-slate-800">INIT-PROV-{company.id?.slice(0, 8).toUpperCase()}</div>
                                                        <div className="text-[10px] text-slate-400 font-sans">Initial Workspace Activation Grant</div>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                                                            Platform Engine
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                                                        $0.00 <span className="text-[10px] font-bold text-slate-500">{company.currency || 'USD'}</span>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-sky-50 text-sky-700 border-sky-200">
                                                            Activated (Trial)
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-600 font-medium">
                                                        {formatDateTime(company.createdAt)}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {paymentHistories.length === 0 && (
                                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span>Initial workspace provisioning completed. Gateway charges and monthly invoices will auto-populate upon billing cycle renewal.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT 5: OPERATIONS SNAPSHOT */}
            {activeTab === 'operations' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-indigo-600">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Project Operations</span>
                            <Layers className="w-5 h-5" />
                        </div>
                        <div className="text-3xl font-black text-slate-900">{stats.projectsCount || 0}</div>
                        <p className="text-xs text-slate-500">{stats.tasksCount || 0} total tasks tracked</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-emerald-600">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">CRM Relationships</span>
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div className="text-3xl font-black text-slate-900">{stats.clientsCount || 0}</div>
                        <p className="text-xs text-slate-500">Active corporate client records</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-purple-600">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cloud Documents</span>
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="text-3xl font-black text-slate-900">{stats.documentsCount || 0}</div>
                        <p className="text-xs text-slate-500">{stats.storageUsedMb || 0} MB stored</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-rose-600">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Support Inquiries</span>
                            <LifeBuoy className="w-5 h-5" />
                        </div>
                        <div className="text-3xl font-black text-slate-900">{stats.ticketsCount || 0}</div>
                        <p className="text-xs text-slate-500">Tickets submitted to platform</p>
                    </div>
                </div>
            )}

            {/* TAB CONTENT 6: AUDIT LOGS & SECURITY TRAIL */}
            {activeTab === 'logs' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Top Log Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-sky-600">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Log Entries</span>
                                <Clock className="w-4 h-4" />
                            </div>
                            <div className="text-2xl font-black text-slate-900">{activityLogs.length}</div>
                            <p className="text-[11px] text-slate-500 font-medium">All recorded tenant operations</p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-rose-600">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Security & Admin</span>
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div className="text-2xl font-black text-slate-900">
                                {activityLogs.filter((l: any) => l.logType === 'audit' || l.logType === 'security').length}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">Administrative & access events</p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-indigo-600">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Team Operations</span>
                                <Users className="w-4 h-4" />
                            </div>
                            <div className="text-2xl font-black text-slate-900">
                                {activityLogs.filter((l: any) => l.logType === 'activity').length}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">Workspace tasks, docs & CRM</p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-emerald-600">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">System & Lifecycle</span>
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="text-2xl font-black text-slate-900">
                                {activityLogs.filter((l: any) => l.logType === 'lifecycle' || l.logType === 'subscription' || l.logType === 'email').length}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">Tenant lifecycle & communications</p>
                        </div>
                    </div>

                    {/* Main Log Viewer & Filter Card */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6">
                        {/* Header & Action Toolbar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-sky-600" />
                                    Security & Activity Audit Trail
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Chronological live stream of administrative actions, user activity, email communications, and system security events
                                </p>
                            </div>

                            <button
                                onClick={handleExportLogs}
                                disabled={activityLogs.length === 0}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                                title="Export logs as JSON"
                            >
                                <Download className="w-3.5 h-3.5 text-slate-600" />
                                Export JSON
                            </button>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search by action, actor name, email, resource type, IP..."
                                    value={logSearch}
                                    onChange={(e) => setLogSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                />
                                {logSearch && (
                                    <button
                                        onClick={() => setLogSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                                {[
                                    { id: 'all', label: `All (${activityLogs.length})` },
                                    { id: 'audit', label: 'Security & Audit' },
                                    { id: 'activity', label: 'Team Activity' },
                                    { id: 'lifecycle', label: 'Lifecycle' },
                                    { id: 'subscription', label: 'Billing' },
                                    { id: 'email', label: 'Emails' },
                                ].map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setLogTypeFilter(cat.id)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                                            logTypeFilter === cat.id
                                                ? "bg-slate-900 text-white shadow-xs"
                                                : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                                        )}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Logs Stream */}
                        {filteredLogs.length === 0 ? (
                            <div className="text-center py-16 text-slate-400 space-y-3">
                                <Clock className="w-12 h-12 text-slate-300 mx-auto" />
                                <div>
                                    <p className="font-bold text-slate-700">No logs found matching filter</p>
                                    <p className="text-xs text-slate-400">Try adjusting your search criteria or filter options</p>
                                </div>
                                {(logSearch || logTypeFilter !== 'all') && (
                                    <button
                                        onClick={() => { setLogSearch(''); setLogTypeFilter('all'); }}
                                        className="px-3 py-1.5 bg-sky-50 text-sky-600 text-xs font-bold rounded-xl hover:bg-sky-100 transition-colors cursor-pointer"
                                    >
                                        Reset Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredLogs.map((log: any, idx: number) => {
                                    const isExpanded = expandedLogId === (log.id || String(idx));
                                    const hasDetails = log.details && Object.keys(log.details).length > 0;

                                    // Category badge colors and icon
                                    let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                                    let IconComponent = Clock;
                                    let iconColor = "text-slate-500 bg-slate-100";

                                    if (log.logType === 'audit' || log.logType === 'security') {
                                        badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                                        IconComponent = ShieldAlert;
                                        iconColor = "text-rose-600 bg-rose-50";
                                    } else if (log.logType === 'activity') {
                                        badgeColor = "bg-sky-50 text-sky-700 border-sky-200";
                                        IconComponent = Activity;
                                        iconColor = "text-sky-600 bg-sky-50";
                                    } else if (log.logType === 'lifecycle') {
                                        badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                        IconComponent = Sparkles;
                                        iconColor = "text-emerald-600 bg-emerald-50";
                                    } else if (log.logType === 'subscription') {
                                        badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
                                        IconComponent = CreditCard;
                                        iconColor = "text-indigo-600 bg-indigo-50";
                                    } else if (log.logType === 'email') {
                                        badgeColor = "bg-purple-50 text-purple-700 border-purple-200";
                                        IconComponent = Mail;
                                        iconColor = "text-purple-600 bg-purple-50";
                                    }

                                    return (
                                        <div
                                            key={log.id || idx}
                                            className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-3"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                                                {/* Left Icon & Action Info */}
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className={clsx("p-2 rounded-xl shrink-0 border border-slate-200/50 mt-0.5", iconColor)}>
                                                        <IconComponent className="w-4 h-4" />
                                                    </div>

                                                    <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-slate-900 text-sm tracking-tight">
                                                                {log.action}
                                                            </span>
                                                            <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border", badgeColor)}>
                                                                {log.logType || 'audit'}
                                                            </span>
                                                            {log.resourceType && (
                                                                <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase">
                                                                    {log.resourceType}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                                            <span className="font-medium text-slate-700 flex items-center gap-1">
                                                                <Users className="w-3 h-3 text-slate-400" />
                                                                {log.userName || 'System Engine'}
                                                                {log.userEmail && <span className="text-slate-400 font-mono text-[11px]">({log.userEmail})</span>}
                                                            </span>
                                                            {log.userRole && (
                                                                <span className="text-[10px] font-bold uppercase bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                                                    {log.userRole}
                                                                </span>
                                                            )}
                                                            {log.ipAddress && log.ipAddress !== '' && (
                                                                <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                                                                    <Globe className="w-3 h-3 text-slate-400" />
                                                                    {log.ipAddress}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Timestamp & Details Toggle */}
                                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-1 sm:pt-0">
                                                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span>{formatDateTime(log.createdAt)}</span>
                                                    </div>

                                                    {hasDetails && (
                                                        <button
                                                            onClick={() => setExpandedLogId(isExpanded ? null : (log.id || String(idx)))}
                                                            className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer transition-colors"
                                                        >
                                                            <Code2 className="w-3 h-3" />
                                                            <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                                                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expandable JSON Payload Drawer */}
                                            {isExpanded && hasDetails && (
                                                <div className="mt-2 p-3.5 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] space-y-2 relative overflow-hidden border border-slate-800">
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-800">
                                                        <span className="uppercase font-bold tracking-wider text-slate-500">Event Context & Payload</span>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(JSON.stringify(log.details, null, 2));
                                                                toast.success('Payload copied to clipboard');
                                                            }}
                                                            className="text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                                                        >
                                                            Copy JSON
                                                        </button>
                                                    </div>
                                                    <pre className="overflow-x-auto text-[11px] leading-relaxed text-sky-300 font-mono">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
