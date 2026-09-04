'use client';

import { useEffect, useState, use } from 'react';
import { 
    Building2, Mail, Phone, ArrowLeft, CheckCircle2, XCircle, 
    AlertCircle, RefreshCw, ShieldCheck, Database as DbIcon, 
    Calendar, CreditCard, HardDrive, Users, Globe, MapPin, 
    Briefcase, Sparkles, Ban, KeyRound, Trash2, ExternalLink, 
    Layers, Cpu, FileText, Check, AlertTriangle, ShieldAlert,
    Clock, Tag, Lock, ChevronRight, Activity, Search, Filter,
    Sliders, Receipt, UserCheck, Smartphone, Send, LifeBuoy
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../../lib/superadmin-api';
import { useModal } from '../../../../lib/modal-context';
import { Skeleton, LogoLoader } from '@workspace/ui';
import clsx from 'clsx';

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
    
    // User filter state
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');

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
                    { id: 'logs', label: 'Audit Logs', icon: Clock }
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
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-5">
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
                            <span className="badge-emerald text-[11px] font-bold">All 8 Apps Operational</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { name: 'CRM & Sales', desc: 'Leads, deals & client pipeline', icon: Briefcase, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                                { name: 'Finance & Invoicing', desc: 'Invoices, expenses & salary', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                                { name: 'Projects & Tasks', desc: 'Agile sprints & work logs', icon: Layers, color: 'text-purple-600 bg-purple-50 border-purple-100' },
                                { name: 'HR & Attendance', desc: 'Employee payroll & timekeeping', icon: Users, color: 'text-sky-600 bg-sky-50 border-sky-100' },
                                { name: 'Social Media Studio', desc: 'Multi-platform content calendar', icon: Sparkles, color: 'text-rose-600 bg-rose-50 border-rose-100' },
                                { name: 'Traffic Director', desc: 'Affiliate smart link routing', icon: Globe, color: 'text-amber-600 bg-amber-50 border-amber-100' },
                                { name: 'Orbit Copilot (AI)', desc: 'Autonomous workspace intelligence', icon: Sparkles, color: 'text-violet-600 bg-violet-50 border-violet-100' },
                                { name: 'Documents & Storage', desc: 'Secure cloud contract storage', icon: HardDrive, color: 'text-cyan-600 bg-cyan-50 border-cyan-100' }
                            ].map((app, idx) => {
                                const Icon = app.icon;
                                return (
                                    <div key={idx} className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-sky-300 transition-all group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className={clsx("p-2 rounded-xl border", app.color)}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        </div>
                                        <h5 className="font-bold text-slate-900 text-sm">{app.name}</h5>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{app.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
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

                    {/* Users Table */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="py-3 px-4">Member Name</th>
                                    <th className="py-3 px-4">Email Address</th>
                                    <th className="py-3 px-4">Phone</th>
                                    <th className="py-3 px-4">Position / Department</th>
                                    <th className="py-3 px-4">Role</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Joined Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-400">
                                            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                            <p className="font-bold text-slate-700">No users found</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search criteria</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u, i) => (
                                        <tr key={u.id || i} className="hover:bg-slate-50/70 transition-colors">
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Current Plan Card */}
                        <div className="lg:col-span-1 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-4">
                            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-sky-600" />
                                Active Plan
                            </h3>

                            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-3 shadow-md">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-400/20">
                                        {company.subscriptionStatus || 'Trial'}
                                    </span>
                                    <span className="font-mono text-xs text-slate-400">Autopay: {company.autopayEnabled ? 'ON' : 'OFF'}</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">{activePlan.planName || 'Free Explorer'}</h2>
                                    <p className="text-xs text-slate-300 mt-0.5">Enterprise Cloud Suite Access</p>
                                </div>
                                <div className="pt-2 border-t border-slate-800 flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-white">${activePlan.price || 0}</span>
                                    <span className="text-xs text-slate-400">/ month</span>
                                </div>
                            </div>

                            <div className="space-y-2.5 text-xs">
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-400">Next Billing Date</span>
                                    <span className="font-bold text-slate-900">
                                        {company.nextChargeDate ? new Date(company.nextChargeDate).toLocaleDateString() : '—'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-400">Trial Period</span>
                                    <span className="font-bold text-slate-900">
                                        {company.trialStartDate ? new Date(company.trialStartDate).toLocaleDateString() : '—'} to {company.trialEndDate ? new Date(company.trialEndDate).toLocaleDateString() : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Ledger */}
                        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-4">
                            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-emerald-600" />
                                Payment & Invoice Ledger
                            </h3>

                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        <tr>
                                            <th className="py-3 px-4">Payment ID</th>
                                            <th className="py-3 px-4">Provider</th>
                                            <th className="py-3 px-4">Amount</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4 text-right">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paymentHistories.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-12 text-slate-400">
                                                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                    <p className="font-bold text-slate-700">No payment records yet</p>
                                                    <p className="text-[11px] text-slate-400">Invoices will automatically appear here once generated</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            paymentHistories.map((p, idx) => (
                                                <tr key={p.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{p.paymentId || p.id?.slice(0, 10)}</td>
                                                    <td className="py-3 px-4 font-semibold text-slate-600 capitalize">{p.provider || 'Stripe'}</td>
                                                    <td className="py-3 px-4 font-bold text-slate-900">${p.amount} {p.currency}</td>
                                                    <td className="py-3 px-4">
                                                        <span className="badge-emerald text-[10px] font-bold uppercase">{p.status || 'Paid'}</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-slate-500 font-medium">
                                                        {new Date(p.createdAt).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
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

            {/* TAB CONTENT 6: AUDIT LOGS */}
            {activeTab === 'logs' && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Clock className="w-4 h-4 text-sky-600" />
                        Security & Activity Trail
                    </h3>

                    {activityLogs.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="font-bold text-slate-700">No activity logs recorded yet</p>
                            <p className="text-[11px] text-slate-400">All administrative events and logins will be tracked here</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {activityLogs.map((log: any, idx: number) => (
                                <div key={log.id || idx} className="py-3 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-sky-500" />
                                        <div>
                                            <span className="font-bold text-slate-800">{log.action || 'Administrative Event'}</span>
                                            <span className="text-slate-400 ml-2 font-mono text-[11px]">by {log.userName || log.userEmail || 'System'}</span>
                                        </div>
                                    </div>
                                    <span className="text-slate-400 font-mono text-[11px]">
                                        {new Date(log.createdAt || log.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
