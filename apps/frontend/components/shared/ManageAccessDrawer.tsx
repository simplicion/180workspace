'use client';

import React, { useState } from 'react';
import { LogoLoader } from "@workspace/ui";
import { Shield, Save, AlertCircle, X, Check } from 'lucide-react';
import { Drawer } from "@/components/ui/Drawer";
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

export interface UserRoleData {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
    isActive?: boolean;
    photoUrl?: string | null;
    image?: string | null;
    designation?: { name: string } | string | null;
}

interface ManageAccessDrawerProps {
    user: UserRoleData;
    onClose: () => void;
    onUpdated?: () => void;
}

const ROLES = [
    { id: 'admin', label: 'Admin', desc: 'Full access to all modules, platform settings, and billing.' },
    { id: 'manager', label: 'Manager', desc: 'Can manage department teams and view analytics reports.' },
    { id: 'hr', label: 'HR', desc: 'Access to employee directory, recruitment, attendance, and leaves.' },
    { id: 'finance', label: 'Finance', desc: 'Access to invoices, expenses, financial accounts, and payroll.' },
    { id: 'sales', label: 'Sales', desc: 'Access to CRM, leads, pipelines, and client accounts.' },
    { id: 'employee', label: 'Employee', desc: 'Standard workspace access for internal staff.' },
    { id: 'client', label: 'Client', desc: 'Restricted portal access to assigned shared projects.' }
];

const PERMISSIONS = [
    { id: 'can_manage_team', label: 'Manage Team', desc: 'Can add/remove users in their department' },
    { id: 'can_manage_hr', label: 'Manage HR', desc: 'Full HR access regardless of primary role' },
    { id: 'can_manage_finance', label: 'Manage Finance', desc: 'Full finance access regardless of primary role' },
    { id: 'can_manage_sales', label: 'Manage Sales', desc: 'Full CRM access regardless of primary role' },
    { id: 'can_manage_projects', label: 'Manage Projects', desc: 'Can create and manage projects globally' }
];

export function ManageAccessDrawer({ user, onClose, onUpdated }: ManageAccessDrawerProps) {
    const targetUserId = user.id || (user as any)._id;
    const initialRole = user.role || (user as any).roles?.[0] || 'employee';
    const [selectedRole, setSelectedRole] = useState(initialRole);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(user.permissions || []);
    const [isSaving, setIsSaving] = useState(false);

    const togglePermission = (permId: string) => {
        setSelectedPermissions(prev => 
            prev.includes(permId) 
                ? prev.filter(p => p !== permId)
                : [...prev, permId]
        );
    };

    const handleSave = async () => {
        if (!targetUserId) {
            toast.error('Unable to update access: missing user ID');
            return;
        }
        setIsSaving(true);
        try {
            await api.put('/api/roles-access/bulk-update', {
                userId: targetUserId,
                role: selectedRole,
                permissions: selectedPermissions
            });
            toast.success('Access updated successfully');
            if (onUpdated) {
                onUpdated();
            }
            onClose();
        } catch (error: any) {
            console.error('Error updating access:', error);
            toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update access');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Drawer 
            open={true} 
            onClose={onClose} 
            title="Role & Access" 
            position="right"
            icon={<Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            maxWidth="max-w-lg"
            zIndex="z-[100000]"
        >
            <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">
                {/* User Info Header Banner */}
                <div className="p-4 mb-6 rounded-2xl bg-indigo-50/60 dark:bg-zinc-900 border border-indigo-100/80 dark:border-zinc-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{user.email}</p>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 shrink-0">
                        {selectedRole}
                    </span>
                </div>

                {/* Body */}
                <div className="space-y-6">
                    {/* Role Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                                Primary Role
                            </h3>
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500">Select one core role</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {ROLES.map(role => {
                                const isSelected = selectedRole === role.id;
                                return (
                                    <label 
                                        key={role.id}
                                        className={clsx(
                                            "relative flex cursor-pointer rounded-2xl border p-3.5 transition-all select-none",
                                            isSelected 
                                                ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-600 dark:ring-indigo-500" 
                                                : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 hover:bg-gray-50/60 dark:hover:bg-zinc-900"
                                        )}
                                    >
                                        <input 
                                            type="radio"
                                            name="role"
                                            value={role.id}
                                            checked={isSelected}
                                            onChange={() => setSelectedRole(role.id)}
                                            className="sr-only"
                                        />
                                        <div className="flex flex-col justify-between w-full gap-1">
                                            <div className="flex items-center justify-between">
                                                <span className={clsx(
                                                    "text-sm font-bold",
                                                    isSelected ? "text-indigo-900 dark:text-indigo-300" : "text-gray-900 dark:text-zinc-200"
                                                )}>
                                                    {role.label}
                                                </span>
                                                {isSelected && (
                                                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                                        <Check className="w-2.5 h-2.5" />
                                                    </span>
                                                )}
                                            </div>
                                            <span className={clsx(
                                                "text-[11px] leading-tight",
                                                isSelected ? "text-indigo-700/80 dark:text-indigo-300/80" : "text-gray-500 dark:text-zinc-400"
                                            )}>
                                                {role.desc}
                                            </span>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Permissions Selection */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                                Granular Permissions
                            </h3>
                            <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md">
                                Optional Overrides
                            </span>
                        </div>
                        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50 rounded-2xl p-3.5 mb-3 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                                Permissions override the primary role&apos;s defaults. For example, granting <strong>Manage Finance</strong> to an <strong>Employee</strong> opens the finance portal for them.
                            </p>
                        </div>
                        <div className="space-y-2">
                            {PERMISSIONS.map(perm => {
                                const isChecked = selectedPermissions.includes(perm.id);
                                return (
                                    <label 
                                        key={perm.id}
                                        className={clsx(
                                            "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors select-none",
                                            isChecked 
                                                ? "bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60" 
                                                : "bg-transparent border-gray-100 dark:border-zinc-800/80 hover:bg-gray-50 dark:hover:bg-zinc-900"
                                        )}
                                    >
                                        <div className="flex h-5 items-center">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => togglePermission(perm.id)}
                                                className="h-4 w-4 rounded border-gray-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-600 dark:bg-zinc-900 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-900 dark:text-zinc-200">{perm.label}</span>
                                            <span className="text-[11px] text-gray-500 dark:text-zinc-400">{perm.desc}</span>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-xl transition-colors cursor-pointer"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                        {isSaving ? (
                            <>
                                <LogoLoader className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-3.5 h-3.5" />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Drawer>
    );
}

export default ManageAccessDrawer;
