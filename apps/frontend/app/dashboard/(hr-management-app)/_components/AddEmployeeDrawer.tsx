'use client';

import { LogoLoader } from "@workspace/ui";
import { useState } from 'react';
import api from '@/lib/api';
import { User, Mail, Lock, Briefcase, DollarSign, Calendar } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Drawer } from "@/components/ui/Drawer";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: (user: any) => void;
    editUser?: any; // if provided, we're editing
    nextId?: string; // used for auto-populating new employee ID
}

const ROLES = ['employee', 'manager', 'hr', 'admin'];
const DEPARTMENTS = ['Engineering', 'Design', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales', 'Support', 'Management'];

export default function AddEmployeeDrawer({ open, onClose, onSuccess, editUser, nextId }: Props) {
    const isEdit = !!editUser;
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: editUser?.name || '',
        email: editUser?.email || '',
        password: '',
        employeeId: editUser?.employeeId || nextId || '',
        role: editUser?.role || (editUser?.roles?.[0]) || 'employee',
        department: editUser?.department || '',
        position: editUser?.position || '',
        salary: editUser?.salary || '',
        phone: editUser?.phone || '',
        emergencyContact: editUser?.emergencyContact || '',
        leaveBalance: editUser?.leaveBalance || 20,
        joiningDate: editUser?.joiningDate ? editUser.joiningDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    });

    const setRole = (r: string) => {
        setForm(prev => ({ ...prev, role: r }));
    };

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name || !form.email) return toast.error('Name and email are required');
        if (!isEdit && !form.password) return toast.error('Password is required');
        setLoading(true);
        try {
            if (isEdit) {
                const payload: any = { ...form };
                if (!payload.password) delete payload.password;
                const { data } = await api.put(`/api/users/${editUser.id}`, payload);
                toast.success('Employee updated!');
                onSuccess(data.user);
            } else {
                const { data } = await api.post('/api/auth/register', form);
                toast.success(`Employee added with ID: ${data.user.employeeId}`);
                onSuccess(data.user);
            }
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to save employee');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit Employee' : 'Add Employee'} icon={<User className="w-5 h-5 text-indigo-600" />}>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                {/* Name + Email */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="employeeName" className="label">Full Name *</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="employeeName" value={form.name} onChange={set('name')} placeholder="John Doe" className="input pl-9" required />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="employeeEmail" className="label">Email *</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="employeeEmail" value={form.email} onChange={set('email')} type="email" placeholder="john@company.com" className="input pl-9" required disabled={isEdit} />
                        </div>
                    </div>
                </div>

                {/* Employee ID */}
                <div>
                    <label htmlFor="employeeId" className="label">Employee ID</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                        <input id="employeeId" value={form.employeeId} onChange={set('employeeId')} placeholder="EMP-0001" className="input pl-9 bg-gray-50 text-gray-500 cursor-not-allowed" disabled />
                    </div>
                </div>

                {/* Password */}
                {!isEdit && (
                    <div>
                        <label htmlFor="employeePassword" className="label">Password *</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="employeePassword" value={form.password} onChange={set('password')} type="password" placeholder="Minimum 8 characters" className="input pl-9" />
                        </div>
                    </div>
                )}

                {/* Role + Department */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="label">Role *</label>
                        <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Employee role">
                            {['admin', 'manager', 'hr', 'employee'].map(r => (
                                <label key={r} className={clsx(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all uppercase',
                                    form.role === r
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                )}>
                                    <input
                                        type="radio"
                                        name="employeeRole"
                                        checked={form.role === r}
                                        onChange={() => setRole(r)}
                                        className="sr-only"
                                    />
                                    {r}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="employeeDept" className="label">Department</label>
                        <select id="employeeDept" value={form.department} onChange={set('department')} className="select">
                            <option value="">Select department</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>

                {/* Position + Phone */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="employeePosition" className="label">Position / Title</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="employeePosition" value={form.position} onChange={set('position')} placeholder="Software Engineer" className="input pl-9" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="employeePhone" className="label">Phone</label>
                        <input id="employeePhone" value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" className="input" />
                    </div>
                </div>

                {/* Emergency Contact + Leave Balance */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="employeeEmergency" className="label">Emergency Contact</label>
                        <input id="employeeEmergency" value={form.emergencyContact} onChange={set('emergencyContact')} placeholder="Name - Phone" className="input" />
                    </div>
                    <div>
                        <label htmlFor="employeeLeave" className="label">Leave Balance (Days)</label>
                        <input id="employeeLeave" value={form.leaveBalance} onChange={set('leaveBalance')} type="number" className="input" />
                    </div>
                </div>

                {/* Salary + Joining */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="employeeSalary" className="label">Monthly Salary (₹)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="employeeSalary" value={form.salary} onChange={set('salary')} type="number" placeholder="50000" className="input pl-9" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="employeeJoining" className="label">Joining Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="employeeJoining" value={form.joiningDate} onChange={set('joiningDate')} type="date" className="input pl-9" />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} type="button" className="btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading} className="btn-primary">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Add Employee'}
                    </button>
                </div>
            </form>
        </Drawer>
    );
}
