'use client';

import { useState } from 'react';
import { 
    Search, User as UserIcon, Shield, ChevronDown, Check,
    MoreHorizontal, Edit, Mail, Calendar
} from 'lucide-react';
import clsx from 'clsx';
import { ManageAccessDrawer } from './ManageAccessDrawer';

export interface UserRoleData {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
    isActive: boolean;
    photoUrl?: string | null;
    image?: string | null;
    designation?: { name: string } | null;
}

interface UserRolesTableProps {
    users: UserRoleData[];
    onUpdated: () => void;
}

export function UserRolesTable({ users, onUpdated }: UserRolesTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserRoleData | null>(null);

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleColor = (role: string) => {
        switch(role) {
            case 'admin': return 'bg-red-50 text-red-700 border-red-200';
            case 'manager': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'hr': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'finance': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'sales': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'client': return 'bg-slate-50 text-slate-700 border-slate-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                <div className="relative max-w-sm w-full">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Shield className="w-4 h-4" />
                    <span>Total Users: <strong>{users.length}</strong></span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-medium">
                        <tr>
                            <th className="px-5 py-3 rounded-tl-xl">User</th>
                            <th className="px-5 py-3">Role</th>
                            <th className="px-5 py-3">Permissions</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 rounded-tr-xl">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center text-gray-500">
                                    No users found matching your search.
                                </td>
                            </tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                                            {(user.photoUrl || user.image) ? (
                                                <img src={user.photoUrl || user.image || ''} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                user.name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{user.name}</p>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                                <Mail className="w-3 h-3" /> {user.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={clsx('inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border uppercase tracking-wider', getRoleColor(user.role))}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                                        {user.permissions?.length > 0 ? (
                                            <span className="text-gray-600 text-xs">{user.permissions.length} custom config(s)</span>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">Default access</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    {user.isActive ? (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Inactive
                                        </span>
                                    )}
                                </td>
                                <td className="px-5 py-4">
                                    <button 
                                        onClick={() => setSelectedUser(user)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100"
                                        title="Manage Access"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedUser && (
                <ManageAccessDrawer 
                    user={selectedUser} 
                    onClose={() => setSelectedUser(null)} 
                    onUpdated={() => {
                        setSelectedUser(null);
                        onUpdated();
                    }}
                />
            )}
        </div>
    );
}
