'use client';
import clsx from 'clsx';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import {
    Settings as SettingsIcon,
    Sparkles, AlertCircle, Info, CalendarDays
} from 'lucide-react';
import { Skeleton } from "@workspace/ui";
import { useSettings } from '@/lib/settings-context';
import Link from 'next/link';
import EmployeeDashboard from '@/app/dashboard/(dashboard)/_components/EmployeeDashboard';
import RecentProjects from '@/app/dashboard/(dashboard)/_components/RecentProjects';
import FinancialTrajectory from '@/app/dashboard/(dashboard)/_components/FinancialTrajectory';
import CeoOverview from '@/app/dashboard/(dashboard)/_components/CeoOverview';
import FinancialSnapshot from '@/app/dashboard/(dashboard)/_components/FinancialSnapshot';
import OperationsOverview from '@/app/dashboard/(dashboard)/_components/OperationsOverview';
import TeamPulse from '@/app/dashboard/(dashboard)/_components/TeamPulse';
import ActivityAnalytics from '@/app/dashboard/(dashboard)/_components/ActivityAnalytics';
import LiveActivityFeed from '@/app/dashboard/(dashboard)/_components/LiveActivityFeed';
import ClientActivityFeed from '@/app/dashboard/(dashboard)/_components/ClientActivityFeed';
import SalesOverview from '@/app/dashboard/(dashboard)/_components/SalesOverview';

interface DashboardStats {
    employees: { total: number; active: number };
    projects: { total: number; active: number };
    tasks: { total: number; pending: number };
    attendance: { today: number; rate: number };
    clients: { total: number };
    salary: { pendingThisMonth: number };
    expenses: { pending: number };
}



function AIInsightWrapper() {
    const [insight, setInsight] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/ai/dashboard')
            .then(({ data }) => setInsight(data.insight))
            .catch(() => setInsight('Failed to load AI insights. Check your API configuration.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-2 mt-2">
                <Skeleton variant="text" width="100%" height={12} />
                <Skeleton variant="text" width="80%" height={12} />
            </div>
        );
    }

    return (
        <>{insight || "Revenue increased 18% this month. You have 3 overdue invoices totaling ₹2,45,000. It has been 10 days since you followed up with Investor A."}</>
    );
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function getFormattedDate(): string {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

export default function DashboardPage({ isMobileView }: { isMobileView?: boolean }) {
    const { user, company } = useAuth();
    const { settings } = useSettings();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [recentProjects, setRecentProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchingTrends, setFetchingTrends] = useState(false);
    const [fetchingProjects, setFetchingProjects] = useState(true);
    const [error, setError] = useState('');
    const [range, setRange] = useState('7');
    const [grouping, setGrouping] = useState('daily');

    const userRoles = Array.isArray(user?.roles) ? [...user.roles] : [user?.role];
    if (userRoles.includes('ceo') || user?.role === 'ceo' || userRoles.includes('superadmin') || user?.role === 'superadmin' || userRoles.includes('accounting') || user?.role === 'accounting') {
        userRoles.push('admin');
    }
    const isAdmin = ['admin', 'ceo', 'accounting'].some(r => userRoles.includes(r)) || (user?.permissions && user.permissions.includes('can_manage_team')) || (user?.role !== 'employee' && user?.role !== 'USER');

    useEffect(() => {
        if (!isAdmin) return;
        setFetchingProjects(true);
        api.get('/api/projects?limit=5')
            .then((res) => setRecentProjects(res.data.projects || []))
            .catch(() => { })
            .finally(() => setFetchingProjects(false));
    }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin) return;
        setFetchingTrends(true);
        api.get(`/api/hrms/weekly-trends?range=${range}&grouping=${grouping}`)
            .then((res) => setChartData(res.data))
            .catch(() => setError('Failed to load chart data'))
            .finally(() => setFetchingTrends(false));
    }, [range, grouping, isAdmin]);

    useEffect(() => {
        if (!isAdmin) return;
        setLoading(true);
        api.get('/api/hrms/dashboard')
            .then((res) => setStats(res.data))
            .catch((err) => setError(`Failed: ${err.message} - ${err.response?.data?.error || err.response?.data?.message || JSON.stringify(err.response?.data)}`))
            .finally(() => setLoading(false));
    }, [isAdmin]);

    if (!isAdmin) {
        return <EmployeeDashboard userName={user?.name} isMobileView={isMobileView} />;
    }

    const getStatValue = (key: string) => {
        if (!stats) return '—';
        switch (key) {
            case 'employees': return stats.employees?.active ?? '—';
            case 'employees_total': return stats.employees?.total ?? '—';
            case 'projects': return stats.projects?.active ?? '—';
            case 'projects_total': return stats.projects?.total ?? '—';
            case 'tasks': return stats.tasks?.pending ?? '—';
            case 'tasks_total': return stats.tasks?.total ?? '—';
            case 'attendance': return stats.attendance?.today ?? '—';
            case 'expenses_pending': return stats.expenses?.pending ?? '—';
            case 'salary_pending': return stats.salary?.pendingThisMonth ?? '—';
            case 'clients': return stats.clients?.total ?? '—';
            default: return '—';
        }
    };

    const getSubText = (key: string) => {
        if (!stats) return '';
        switch (key) {
            case 'employees': return `of ${stats.employees?.total} total`;
            case 'projects': return `of ${stats.projects?.total} total`;
            case 'tasks': return 'need attention';
            case 'attendance': return `${stats.attendance?.rate ?? 0}% rate`;
            default: return '';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {getGreeting()}, {user?.name?.split(' ')[0] || 'Founder'} <span className="text-xl">👋</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-xs text-gray-400 font-medium">{getFormattedDate()}</p>
                        <span className="text-gray-200">•</span>
                        <span className="text-gray-200">•</span>
                        <p className="text-xs text-gray-500 font-semibold">{company?.name || 'Your Company'}</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error} — showing cached data
                </div>
            )}

            {/* 1. Executive Briefing */}
            <CeoOverview />

            {/* 2. The Engine (Operations & Sales - Urgent & Actionable) */}
            {loading ? (
                <div className={clsx("grid gap-6", isMobileView ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                    <Skeleton variant="rounded" height={400} className="w-full" />
                    <Skeleton variant="rounded" height={400} className="w-full" />
                </div>
            ) : (
                <div className={clsx("grid gap-6", isMobileView ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                    <OperationsOverview stats={stats} getStatValue={getStatValue} />
                    <SalesOverview />
                </div>
            )}

            {/* 3. Execution & Risk (Projects) */}
            {!loading && (
                <RecentProjects projects={recentProjects} loading={fetchingProjects} />
            )}

            {/* 4. Health & Money (Team Pulse & Financials) */}
            {!loading && (
                <div className={clsx("grid gap-6", isMobileView ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                    <TeamPulse stats={stats} getStatValue={getStatValue} getSubText={getSubText} />
                    <FinancialTrajectory />
                </div>
            )}

            {/* 5. Live Awareness (Activity Feeds) */}
            {!loading && (
                <div className={clsx("grid gap-6", isMobileView ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                    <ClientActivityFeed />
                    <LiveActivityFeed />
                </div>
            )}

            {/* 6. Deep Analytics (Historical/Trends - Least Urgent) */}
            <ActivityAnalytics
                chartData={chartData}
                loading={loading}
                fetchingTrends={fetchingTrends}
                range={range}
                setRange={setRange}
                grouping={grouping}
                setGrouping={setGrouping}
            />
        </div>
    );
}

