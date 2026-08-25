'use client';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Users, Search, Plus, Trash2, Eye, Edit } from 'lucide-react';
import { Skeleton, SkeletonTable } from "@workspace/ui";
import clsx from 'clsx';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import AddEmployeeDrawer from '@/app/(platform)/(hr-management-app)/_components/AddEmployeeDrawer';
import { ConfirmModal } from "@workspace/ui";
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
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [editEmployee, setEditEmployee] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { user } = useAuth();
    const { canRead, canWrite } = useAccess('hr');
    const router = useRouter();

    function loadEmployees() {
        setLoading(true);
        api.get('/api/users', { params: { search, role } })
            .then(({ data }) => {
                setEmployees(data.users);
                if (data.total !== undefined) setTotalUsers(data.total);
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadEmployees(); }, [search, role]);

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

    return (
        <div>
            {showAdd && (
                <AddEmployeeDrawer
                    open={showAdd}
                    nextId={`EMP-${String(totalUsers + 1).padStart(4, '0')}`}
                    onClose={() => setShowAdd(false)}
                    onSuccess={() => { setShowAdd(false); loadEmployees(); }}
                />
            )}

            {editEmployee && (
                <AddEmployeeDrawer
                    open={!!editEmployee}
                    editUser={editEmployee}
                    onClose={() => setEditEmployee(null)}
                    onSuccess={() => { setEditEmployee(null); loadEmployees(); }}
                />
            )}

            <ConfirmModal
                isOpen={!!confirmDelete}
                title="Delete Employee Account"
                message={`Are you sure you want to delete ${confirmDelete?.name}? Their personal data (email, password, login access) will be permanently erased. Company records such as tasks and attendance will be retained.`}
                confirmText="Delete Permanently"
                onConfirm={() => {
                    setIsDeleting(true);
                    api.delete(`/api/users/${confirmDelete.id || confirmDelete.id}`)
                        .then(() => {
                            toast.success('Employee deleted');
                            loadEmployees();
                            setConfirmDelete(null);
                        })
                        .catch(() => toast.error('Failed to delete employee'))
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
                <SkeletonTable rows={8} columns={6} />
            ) : (
                <div className="card">
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
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
                                {employees.map((emp) => (
                                    <tr
                                        key={emp.id || emp.id}
                                         className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                                        onClick={() => {
                                            const id = emp.id || emp.id;
                                            if (!id) {
                                                console.error('Missing employee ID:', emp);
                                                toast.error('Cannot open profile: missing ID');
                                                return;
                                            }
                                            router.push('/profile/${id}');
                                        }}
                                    >
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
                                                                const id = emp.id || emp.id;
                                                                if (!id) {
                                                                    toast.error('Missing ID');
                                                                    return;
                                                                }
                                                                router.push('/profile/${id}');
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
                                ))}
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
        </div>
    );
}

