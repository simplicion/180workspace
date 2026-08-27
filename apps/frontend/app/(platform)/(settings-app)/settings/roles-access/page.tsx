'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Shield, Users, Search, ArrowLeft, CheckCircle2, XCircle, Save, ChevronDown, Eye, EyeOff, Info, UserCog, ShieldCheck, ShieldAlert, Edit } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import clsx from 'clsx';
import { navigation } from '@/lib/navigation';
import { ManageAccessDrawer, UserRoleData } from '../../_components/ManageAccessDrawer';

// ─── Constants ──────────────────────────────────────────────────────────────

const ALL_ROLES = ['admin', 'employee', 'client'] as const;
type RoleType = typeof ALL_ROLES[number];

const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    hr: 'HR',
    employee: 'Employee',
    finance: 'Finance',
    sales: 'Sales',
    client: 'Client',
};

const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-rose-50 text-rose-700 border-rose-200',
    manager: 'bg-purple-50 text-purple-700 border-purple-200',
    hr: 'bg-blue-50 text-blue-700 border-blue-200',
    employee: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    finance: 'bg-amber-50 text-amber-700 border-amber-200',
    sales: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    client: 'bg-gray-50 text-gray-700 border-gray-200',
};

const PERMISSIONS_LIST = [
    { id: 'can_manage_team', label: 'Team', desc: 'Add/edit employees' },
    { id: 'can_manage_hr', label: 'HR', desc: 'Payroll, leaves, attendance' },
    { id: 'can_manage_finance', label: 'Finance', desc: 'Expenses, invoices' },
    { id: 'can_manage_sales', label: 'Sales', desc: 'CRM, clients' },
    { id: 'can_manage_projects', label: 'Projects', desc: 'Manage all projects' },
];

type ActiveTab = 'overview' | 'permissions';

interface UserRow {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
    isActive: boolean;
    photoUrl?: string;
    image?: string;
    department?: string;
    designation?: { name: string };
    // Local edit state
    _editRole?: string;
    _editPermissions?: string[];
    _dirty?: boolean;
    _saving?: boolean;
}

// ─── Role Matrix Data ───────────────────────────────────────────────────────

function buildRoleMatrix() {
    const modules: { name: string; roles: string[] }[] = [];

    for (const item of navigation) {
        if ('group' in item) {
            modules.push({ name: item.group, roles: item.roles || [] });
        } else {
            modules.push({ name: item.name, roles: item.roles || [] });
        }
    }
    return modules;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function RolesAccessPage() {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

    // Users state
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

    const roleMatrix = useMemo(() => buildRoleMatrix(), []);

    // ─── Data Fetching ──────────────────────────────────────────────────────

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/roles-access/matrix');
            setUsers(
                (data.users || []).map((u: any) => ({
                    ...u,
                    _editRole: u.role,
                    _editPermissions: [...(u.permissions || [])],
                    _dirty: false,
                    _saving: false,
                }))
            );
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'permissions') fetchUsers();
    }, [activeTab, fetchUsers]);

    // ─── Handlers ───────────────────────────────────────────────────────────

    // (Removed inline edit handlers since we now use ManageAccessModal)

    const filteredUsers = useMemo(() => {
        if (!search) return users;
        const q = search.toLowerCase();
        return users.filter(
            u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
        );
    }, [users, search]);

    // ─── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href='/settings/system-configs'
                        title="Back to System Config"
                        className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Roles & Access</h1>
                        <p className="text-gray-500 mt-1">
                            View the role matrix and manage user permissions across the platform
                        </p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1 bg-gray-100 rounded-2xl w-full md:w-max">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={clsx(
                            'flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                            activeTab === 'overview'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                        )}
                    >
                        <Eye className="w-4 h-4" />
                        Role Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('permissions')}
                        className={clsx(
                            'flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                            activeTab === 'permissions'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                        )}
                    >
                        <Users className="w-4 h-4" />
                        User Permissions
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total Users</p>
                        <p className="text-lg font-bold text-gray-900">{users.length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Active</p>
                        <p className="text-lg font-bold text-gray-900">{users.filter(u => u.isActive).length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Admins</p>
                        <p className="text-lg font-bold text-gray-900">{users.filter(u => u.role === 'admin').length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <UserCog className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Custom Perms</p>
                        <p className="text-lg font-bold text-gray-900">{users.filter(u => u.permissions?.length > 0).length}</p>
                    </div>
                </div>
            </div>

            {/* ═══════ Tab 1: Role Overview Matrix ═══════ */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="flex items-start gap-3 p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
                        <Info className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-indigo-700 font-medium">
                            This matrix shows which sidebar modules each role can access.
                            The <span className="font-bold">admin</span> role has full access to everything.
                            Switch to the &quot;User Permissions&quot; tab to customize individual users.
                        </p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-[28px] shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left px-6 py-4 text-sm font-black text-gray-900 bg-gray-50/50 sticky left-0 z-10 min-w-[200px]">
                                            Module / Section
                                        </th>
                                        {ALL_ROLES.map(role => (
                                            <th key={role} className="px-4 py-4 text-center min-w-[90px]">
                                                <span
                                                    className={clsx(
                                                        'inline-block px-3 py-1.5 rounded-full text-xs font-bold border',
                                                        ROLE_COLORS[role]
                                                    )}
                                                >
                                                    {ROLE_LABELS[role]}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {roleMatrix.map((mod, i) => (
                                        <tr
                                            key={mod.name}
                                            className={clsx(
                                                'border-b border-gray-50 transition-colors hover:bg-gray-50/50',
                                                i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                            )}
                                        >
                                            <td className="px-6 py-3.5 text-sm font-semibold text-gray-800 sticky left-0 z-10 bg-inherit">
                                                {mod.name}
                                            </td>
                                            {ALL_ROLES.map(role => {
                                                const hasAccess = mod.roles.includes(role);
                                                return (
                                                    <td key={role} className="px-4 py-3.5 text-center">
                                                        {hasAccess ? (
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-gray-200 mx-auto" />
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ Tab 2: User Permissions ═══════ */}
            {activeTab === 'permissions' && (
                <div className="space-y-6">
                    {/* Search */}
                    <div className="relative group max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-[20px] shadow-sm text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <LogoLoader className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-100 rounded-[28px] shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="text-left px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider sticky left-0 z-10 bg-gray-50/50 min-w-[240px]">
                                                User
                                            </th>
                                            <th className="text-left px-4 py-4 text-xs font-black text-gray-500 uppercase tracking-wider min-w-[130px]">
                                                Role
                                            </th>
                                            {PERMISSIONS_LIST.map(p => (
                                                <th
                                                    key={p.id}
                                                    className="px-3 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider min-w-[85px]"
                                                    title={p.desc}
                                                >
                                                    {p.label}
                                                </th>
                                            ))}
                                            <th className="px-4 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider min-w-[80px]">
                                                Status
                                            </th>
                                            <th className="px-4 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider min-w-[80px]">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((user, i) => {
                                            const isSelf = user.id === currentUser?.id;
                                            const isAdmin = user._editRole === 'admin';
                                            return (
                                                <tr
                                                    key={user.id}
                                                    className={clsx(
                                                        'border-b border-gray-50 transition-colors',
                                                        user._dirty
                                                            ? 'bg-amber-50/40'
                                                            : i % 2 === 0
                                                            ? 'bg-white'
                                                            : 'bg-gray-50/30',
                                                        'hover:bg-gray-50/60'
                                                    )}
                                                >
                                                    {/* User Info */}
                                                    <td className="px-6 py-3.5 sticky left-0 z-10 bg-inherit">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                                {user.photoUrl || user.image ? (
                                                                    <img
                                                                        src={user.photoUrl || user.image}
                                                                        alt={user.name}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <span className="text-white text-xs font-bold">
                                                                        {user.name?.[0]?.toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                                                    {user.name}
                                                                    {isSelf && (
                                                                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                                                                            YOU
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-xs text-gray-400">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Role */}
                                                    <td className="px-4 py-3.5">
                                                        <span className={clsx('inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border', ROLE_COLORS[user.role] || 'bg-gray-50 text-gray-700 border-gray-200')}>
                                                            {ROLE_LABELS[user.role] || user.role}
                                                        </span>
                                                    </td>

                                                    {/* Permission Checks */}
                                                    {PERMISSIONS_LIST.map(p => {
                                                        const hasPerm = isAdmin || (user.permissions || []).includes(p.id);
                                                        return (
                                                            <td key={p.id} className="px-3 py-3.5 text-center">
                                                                {hasPerm ? (
                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                                                                ) : (
                                                                    <span className="text-gray-300">—</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Status */}
                                                    <td className="px-4 py-3.5 text-center">
                                                        <span
                                                            className={clsx(
                                                                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide',
                                                                user.isActive
                                                                    ? 'bg-emerald-50 text-emerald-600'
                                                                    : 'bg-red-50 text-red-600'
                                                            )}
                                                        >
                                                            <span
                                                                className={clsx(
                                                                    'w-1.5 h-1.5 rounded-full',
                                                                    user.isActive ? 'bg-emerald-500' : 'bg-red-500'
                                                                )}
                                                            />
                                                            {user.isActive ? 'Active' : 'Blocked'}
                                                        </span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3.5 text-center">
                                                        <button
                                                            onClick={() => setSelectedUser(user)}
                                                            className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors inline-flex"
                                                            title="Manage Access"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {filteredUsers.length === 0 && !loading && (
                                <div className="text-center py-16">
                                    <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                    <p className="text-gray-400 font-medium">No users found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {selectedUser && (
                <ManageAccessDrawer 
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onUpdated={() => {
                        setSelectedUser(null);
                        fetchUsers();
                    }}
                />
            )}
        </div>
    );
}
