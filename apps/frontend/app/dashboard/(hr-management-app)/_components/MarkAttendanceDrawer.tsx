'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Calendar, Clock, CheckCheck, Home, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { Drawer } from "@/components/ui/Drawer";

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: (record: any) => void;
}

const STATUSES = [
    { value: 'present', label: 'Present', icon: CheckCheck, color: 'text-green-600 bg-green-50' },
    { value: 'absent', label: 'Absent', icon: X_fake, color: 'text-red-600 bg-red-50' },
    { value: 'late', label: 'Late', icon: Clock, color: 'text-orange-600 bg-orange-50' },
    { value: 'half_day', label: 'Half Day', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
    { value: 'work_from_home', label: 'Work From Home', icon: Home, color: 'text-blue-600 bg-blue-50' },
    { value: 'on_leave', label: 'On Leave', icon: Calendar, color: 'text-purple-600 bg-purple-50' },
];

function X_fake(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    )
}

export default function MarkAttendanceDrawer({ open, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [form, setForm] = useState({
        employeeId: '',
        date: new Date().toISOString().slice(0, 10),
        status: 'present',
        checkIn: '',
        checkOut: '',
        notes: '',
    });

    useEffect(() => {
        api.get('/api/auth/me').then(({ data }) => {
            if (data.user && (data.user.role === 'employee' || data.user.roles?.includes('employee'))) {
                setForm(prev => ({ ...prev, employeeId: data.user.id || data.user.id }));
            }
        });

        api.get('/api/users', { params: { limit: 100, role: 'employee' } })
            .then(({ data }) => setEmployees(data.users || []));
    }, []);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.employeeId) return toast.error('Please select an employee');
        setLoading(true);
        try {
            const { data } = await api.post('/api/attendance/mark', form);
            toast.success('Attendance marked!');
            onSuccess(data.record);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to mark attendance');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Drawer open={open} onClose={onClose} title="Mark Attendance" icon={<Calendar className="w-5 h-5 text-emerald-600" />}>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div>
                    <label htmlFor="employeeId" className="label">Employee *</label>
                    <select id="employeeId" value={form.employeeId} onChange={set('employeeId')} className="select" required>
                        <option value="">Select employee</option>
                        {employees.map(u => <option key={u.id} value={u.id}>{u.name} ({u.employeeId || u.department || 'Employee'})</option>)}
                    </select>
                </div>

                <div>
                    <label htmlFor="attendanceDate" className="label">Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                        <input id="attendanceDate" value={form.date} onChange={set('date')} type="date" className="input pl-9" />
                    </div>
                </div>

                <div>
                    <label className="label">Status</label>
                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Attendance status">
                        {STATUSES.map(({ value, label, icon: Icon, color }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, status: value }))}
                                aria-pressed={form.status === value}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${form.status === value
                                        ? `border-indigo-500 ${color}`
                                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                    }`}
                            >
                                <Icon className="w-4 h-4" aria-hidden="true" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {(form.status === 'present' || form.status === 'late' || form.status === 'half_day') && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="checkIn" className="label">Check In</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                                <input id="checkIn" value={form.checkIn} onChange={set('checkIn')} type="time" className="input pl-9" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="checkOut" className="label">Check Out</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                                <input id="checkOut" value={form.checkOut} onChange={set('checkOut')} type="time" className="input pl-9" />
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <label htmlFor="notes" className="label">Notes</label>
                    <textarea id="notes" value={form.notes} onChange={set('notes')} placeholder="Optional note..." rows={2} className="input resize-none" />
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} type="button" className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Mark Attendance'}
                    </button>
                </div>
            </form>
        </Drawer>
    );
}
