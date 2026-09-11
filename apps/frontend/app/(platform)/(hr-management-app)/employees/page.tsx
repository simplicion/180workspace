'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Users, Search, Plus, Trash2, Eye, Edit } from 'lucide-react';
import { Skeleton, SkeletonTable, BulkActionBar, ConfirmModal } from "@workspace/ui";
import clsx from 'clsx';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import AddEmployeeDrawer from '@/app/(platform)/(hr-management-app)/_components/AddEmployeeDrawer';
import ContextActions from '@/app/(platform)/(dashboard)/_components/ContextActions';
import toast from 'react-hot-toast';
import { useAccess } from '@/hooks/useAccess';
import CustomSelect from '@/components/ui/CustomSelect';

const ROLE_COLORS: Record<string, string> = {
    admin: 'badge-purple',
    manager: 'badge-blue',
    hr: 'badge-green',
    employee: 'badge-gray',
    client: 'badge-orange',
};

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [totalUsers, setTotalUsers] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editEmployee, setEditEmployee] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    const { user } = useAuth();
    const { canRead, canWrite } = useAccess('hr');
    const router = useRouter();

    // Fast In-Memory SWR Cache for 0ms Instant Navigation
    const swrCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

    function loadEmployees(forceFresh = false) {
        const cacheKey = `employees:${search}:${role}`;
        const cached = swrCacheRef.current.get(cacheKey);

        if (!forceFresh && cached) {
            // Instant 0ms Paint
            setEmployees(cached.data.users || []);
            if (cached.data.total !== undefined) setTotalUsers(cached.data.total);
            setLoading(false);
        } else {
            setLoading(true);
        }

        api.get('/api/users', { params: { search, role } })
            .then(({ data }) => {
                const fetched = data.users || [];
                setEmployees(fetched);
                if (data.total !== undefined) setTotalUsers(data.total);
                swrCacheRef.current.set(cacheKey, {
                    data: { users: fetched, total: data.total },
                    timestamp: Date.now()
                });
            })
            .catch(() => {
                if (!cached || forceFresh) setEmployees([]);
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadEmployees(); }, [search, role]);

    const handleSelectAll = () => {
        if (selectedEmployeeIds.length === employees.length) {
            setSelectedEmployeeIds([]);
        } else {
            setSelectedEmployeeIds(employees.map(emp => emp.id).filter(Boolean));
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedEmployeeIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (selectedEmployeeIds.length === 0) return;
        setIsBulkDeleting(true);
        try {
            const { data } = await api.post('/api/users/bulk-delete', { ids: selectedEmployeeIds });
            toast.success(data.message || `Deleted ${selectedEmployeeIds.length} employee(s)`);
            swrCacheRef.current.clear();
            setSelectedEmployeeIds([]);
            loadEmployees(true);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to delete selected employees');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    if (!canRead && !loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900">Access Denied</h2>
                    <p className="mt-2 text-gray-600">You don't have permission to view the Employees page.</p>
                </div>
            </div>
        );
    }

    // Calculate next available employee ID scoped to current employees in this workspace
    const maxEmpNum = (employees || []).reduce((max, u) => {
        const match = u?.employeeId?.match(/EMP-(\d+)/i);
        if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
        }
        return max;
    }, 0);
    const nextEmployeeId = `EMP-${String(Math.max(totalUsers, maxEmpNum) + 1).padStart(4, '0')}`;

    const isAllSelected = employees.length > 0 && selectedEmployeeIds.length === employees.length;
    const isSomeSelected = selectedEmployeeIds.length > 0 && !isAllSelected;

    return (
        <div className="relative pb-20">
            {showAdd && (
                <AddEmployeeDrawer
                    open={showAdd}
                    nextId={nextEmployeeId}
                    onClose={() => setShowAdd(false)}
                    onSuccess={() => { 
                        setShowAdd(false); 
                        swrCacheRef.current.clear();
                        loadEmployees(true); 
                    }}
                />
            )}

            {editEmployee && (
                <AddEmployeeDrawer
                    open={!!editEmployee}
                    editUser={editEmployee}
                    onClose={() => setEditEmployee(null)}
                    onSuccess={() => { 
                        setEditEmployee(null); 
                        swrCacheRef.current.clear();
                        loadEmployees(true); 
                    }}
                />
            )}

            <ConfirmModal
                isOpen={!!confirmDelete}
                title="Delete Employee Account"
                message={`Are you sure you want to delete ${confirmDelete?.name}? Their personal data (email, password, login access) will be permanently erased. Company records such as tasks and attendance will be retained.`}
                confirmText="Delete Permanently"
                variant="danger"
                onConfirm={() => {
                    setIsDeleting(true);
                    const targetId = confirmDelete.id;
                    api.delete(`/api/users/${targetId}`)
                        .then(() => {
                            toast.success('Employee deleted successfully');
                            swrCacheRef.current.clear();
                            setSelectedEmployeeIds(prev => prev.filter(id => id !== targetId));
                            loadEmployees(true);
                            setConfirmDelete(null);
                        })
                        .catch((err: any) => toast.error(err.response?.data?.error || 'Failed to delete employee'))
                        .finally(() => setIsDeleting(false));
                }}
                onCancel={() => setConfirmDelete(null)}
                loading={isDeleting}
            />

            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="page-title">Employees</h1>
                    <p className="page-subtitle">{employees.length} members</p>
                </div>
                {canWrite && (
                    <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" />Add Employee</button>
                )}
            </div>

            <div className="flex gap-3 mb-5">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." className="input pl-9" />
                </div>
                <CustomSelect value={role} onChange={(e) => setRole(e.target.value)} className="select w-40">
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                    <option value="employee">Employee</option>
                </CustomSelect>
            </div>

            {loading ? (
                <SkeletonTable rows={8} columns={7} />
            ) : (
                <div className="card">
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    {canWrite && (
                                        <th className="w-10 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isAllSelected}
                                                ref={(el) => {
                                                    if (el) el.indeterminate = isSomeSelected;
                                                }}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                title="Select all employees"
                                            />
                                        </th>
                                    )}
                                    <th>Employee</th>
                                    <th>ID</th>
                                    <th>Department</th>
                                    <th>Position</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    {canWrite && <th className="text-right">Actions</th>}
                                </tr>
                            </thead>

                            <tbody>
                                {employees.map((emp) => {
                                    const isSelected = selectedEmployeeIds.includes(emp.id);
                                    return (
                                        <tr
                                            key={emp.id}
                                            className={clsx(
                                                "hover:bg-gray-50/80 cursor-pointer transition-colors group",
                                                isSelected && "bg-indigo-50/40 hover:bg-indigo-50/60"
                                            )}
                                            onClick={() => {
                                                const id = emp.id;
                                                if (!id) {
                                                    toast.error('Cannot open profile: missing ID');
                                                    return;
                                                }
                                                router.push(`/profile/${id}`);
                                            }}
                                        >
                                            {canWrite && (
                                                <td className="w-10 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelect(emp.id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </td>
                                            )}
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                        {emp.photoUrl
                                                            ? <img src={emp.photoUrl} alt={emp.name} className="w-full h-full rounded-full object-cover" />
                                                            : <span className="text-white text-xs font-bold">{emp.name?.[0]?.toUpperCase()}</span>
                                                        }
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{emp.name}</p>
                                                        <p className="text-xs text-gray-400">{emp.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="font-mono text-xs text-gray-500">{emp.employeeId || '-'}</td>
                                            <td className="text-gray-600">{emp.department || '-'}</td>
                                            <td className="text-gray-600">{emp.designation?.name || emp.position || '-'}</td>
                                            <td>
                                                <div className="flex flex-wrap gap-1">
                                                    {(emp.roles || [emp.role]).map((r: string) => (
                                                        <span key={r} className={clsx('badge', ROLE_COLORS[r] || 'badge-gray text-[10px]')}>{r}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td><span className={clsx('badge', emp.isActive ? 'badge-green' : 'badge-red')}>{emp.isActive ? 'Active' : 'Inactive'}</span></td>
                                            {canWrite && (
                                                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <ContextActions
                                                        actions={[
                                                            {
                                                                label: 'View',
                                                                icon: Eye,
                                                                onClick: () => {
                                                                    const id = emp.id;
                                                                    if (!id) {
                                                                        toast.error('Missing ID');
                                                                        return;
                                                                    }
                                                                    router.push(`/profile/${id}`);
                                                                },
                                                                variant: 'primary'
                                                            },
                                                            {
                                                                label: 'Edit',
                                                                icon: Edit,
                                                                onClick: () => setEditEmployee(emp),
                                                                variant: 'secondary'
                                                            },
                                                            {
                                                                label: 'Delete',
                                                                icon: Trash2,
                                                                onClick: () => setConfirmDelete(emp),
                                                                variant: 'danger'
                                                            }
                                                        ]}
                                                    />
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!loading && employees.length === 0 && (
                <div className="text-center py-20">
                    <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No employees found</p>
                </div>
            )}

            {canWrite && (
                <BulkActionBar
                    selectedCount={selectedEmployeeIds.length}
                    totalCount={employees.length}
                    itemLabel="employees"
                    onSelectAll={handleSelectAll}
                    onDeselectAll={() => setSelectedEmployeeIds([])}
                    onSelectAmount={(amt) => setSelectedEmployeeIds(employees.slice(0, amt).map(e => e.id))}
                    onDeleteSelected={handleBulkDelete}
                    isDeleting={isBulkDeleting}
                    deleteModalTitle={`Delete ${selectedEmployeeIds.length} Selected Employees`}
                    deleteModalMessage={`Are you sure you want to delete ${selectedEmployeeIds.length} employee account(s)? Their personal data (email, password, login access) will be permanently erased. Company records such as tasks and attendance will be retained.`}
                />
            )}
        </div>
    );
}

