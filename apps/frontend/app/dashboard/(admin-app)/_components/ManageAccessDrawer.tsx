'use client';

import { LogoLoader } from "@workspace/ui";
import { useState } from 'react';
import { X, Shield, Save, AlertCircle } from 'lucide-react';
import type { UserRoleData } from './UserRolesTable';
import Drawer from '@/components/ui/Drawer';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface ManageAccessDrawerProps {
    user: UserRoleData;
    onClose: () => void;
    onUpdated: () => void;
}

const ROLES = [
    { id: 'admin', label: 'Admin', desc: 'Full access to all modules and billing.' },
    { id: 'manager', label: 'Manager', desc: 'Can manage teams and view reports.' },
    { id: 'hr', label: 'HR', desc: 'Access to employee data and recruitment.' },
    { id: 'finance', label: 'Finance', desc: 'Access to invoices, expenses, and payroll.' },
    { id: 'sales', label: 'Sales', desc: 'Access to CRM, leads, and pipeline.' },
    { id: 'employee', label: 'Employee', desc: 'Standard access for internal staff.' },
    { id: 'client', label: 'Client', desc: 'Restricted access to specific shared projects.' }
];

const PERMISSIONS = [
    { id: 'can_manage_team', label: 'Manage Team', desc: 'Can add/remove users in their department' },
    { id: 'can_manage_hr', label: 'Manage HR', desc: 'Full HR access regardless of role' },
    { id: 'can_manage_finance', label: 'Manage Finance', desc: 'Full finance access regardless of role' },
    { id: 'can_manage_sales', label: 'Manage Sales', desc: 'Full CRM access regardless of role' },
    { id: 'can_manage_projects', label: 'Manage Projects', desc: 'Can create and delete projects globally' }
];

export function ManageAccessDrawer({ user, onClose, onUpdated }: ManageAccessDrawerProps) {
    const [selectedRole, setSelectedRole] = useState(user.role);
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
        setIsSaving(true);
        try {
            await api.put('/api/roles-access/bulk-update', {
                userId: user.id,
                role: selectedRole,
                permissions: selectedPermissions
            });
            toast.success('Access updated successfully');
            onUpdated();
        } catch (error: any) {
            console.error('Error updating access:', error);
            toast.error(error.response?.data?.error || 'Failed to update access');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Drawer open={true} onClose={onClose} title="Manage Access" position="right">
            <div className="flex flex-col h-full bg-white">
                <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                    <p className="text-sm text-gray-500">Editing access for <span className="font-semibold text-gray-700">{user.name}</span></p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    
                    {/* Role Selection */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Primary Role</h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {ROLES.map(role => (
                                <label 
                                    key={role.id}
                                    className={`relative flex cursor-pointer rounded-xl border p-4 hover:bg-gray-50 transition-all ${
                                        selectedRole === role.id 
                                            ? 'border-indigo-600 bg-indigo-50/30 shadow-sm ring-1 ring-indigo-600' 
                                            : 'border-gray-200'
                                    }`}
                                >
                                    <input 
                                        type="radio"
                                        name="role"
                                        value={role.id}
                                        checked={selectedRole === role.id}
                                        onChange={() => setSelectedRole(role.id)}
                                        className="sr-only"
                                    />
                                    <div className="flex w-full items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-bold ${selectedRole === role.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                {role.label}
                                            </span>
                                            <span className={`text-xs mt-1 ${selectedRole === role.id ? 'text-indigo-700' : 'text-gray-500'}`}>
                                                {role.desc}
                                            </span>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Permissions Selection */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Granular Permissions</h3>
                            <span className="text-[10px] uppercase font-bold tracking-wider bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Optional</span>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-orange-800 leading-relaxed">
                                Permissions override the primary role&apos;s access. For example, assigning <strong>Manage Finance</strong> to an <strong>Employee</strong> will give them access to the finance module.
                            </p>
                        </div>
                        <div className="space-y-3">
                            {PERMISSIONS.map(perm => (
                                <label 
                                    key={perm.id}
                                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex h-5 items-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedPermissions.includes(perm.id)}
                                            onChange={() => togglePermission(perm.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-900">{perm.label}</span>
                                        <span className="text-xs text-gray-500">{perm.desc}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <LogoLoader className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Drawer>
    );
}
