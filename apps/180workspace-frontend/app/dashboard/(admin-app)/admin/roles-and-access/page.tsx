'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Users, ShieldCheck, ShieldAlert, UserCog } from 'lucide-react';
import { Skeleton } from '@workspace/ui';
import { UserRolesTable, UserRoleData } from '@/app/dashboard/(admin-app)/_components/UserRolesTable';
import api from '@/lib/api';

export default function RolesAndAccessPage() {
    const [users, setUsers] = useState<UserRoleData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/api/roles-access/matrix');
            setUsers(res.data.users || []);
        } catch (err: any) {
            console.error('Failed to fetch users:', err);
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const roleCounts = users.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const activeCount = users.filter(u => u.isActive).length;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-600" />
                        Roles & Access
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage user roles and granular permissions across your organization.</p>
                </div>
                <button
                    onClick={fetchUsers}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total Users</p>
                        {loading ? <Skeleton className="h-6 w-10 mt-0.5" /> : (
                            <p className="text-lg font-bold text-gray-900">{users.length}</p>
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Active</p>
                        {loading ? <Skeleton className="h-6 w-10 mt-0.5" /> : (
                            <p className="text-lg font-bold text-gray-900">{activeCount}</p>
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Admins</p>
                        {loading ? <Skeleton className="h-6 w-10 mt-0.5" /> : (
                            <p className="text-lg font-bold text-gray-900">{roleCounts['admin'] || 0}</p>
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <UserCog className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Custom Perms</p>
                        {loading ? <Skeleton className="h-6 w-10 mt-0.5" /> : (
                            <p className="text-lg font-bold text-gray-900">{users.filter(u => u.permissions?.length > 0).length}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="w-9 h-9 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-md" />
                            <Skeleton className="h-6 w-14 rounded-full" />
                        </div>
                    ))}
                </div>
            ) : (
                <UserRolesTable users={users} onUpdated={fetchUsers} />
            )}
        </div>
    );
}

