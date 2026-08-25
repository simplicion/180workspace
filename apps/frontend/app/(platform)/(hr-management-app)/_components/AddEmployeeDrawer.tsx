'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { User, Mail, Lock, Briefcase, Building2, DollarSign, Calendar, Shield, ChevronDown, ChevronUp, Eye, EyeOff, Camera, UploadCloud } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import { Drawer } from "@/components/ui/Drawer";
import { navigation } from '@/lib/navigation';
import { useSettings } from '@/lib/settings-context';

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: (user: any) => void;
    editUser?: any; // if provided, we're editing
    nextId?: string; // used for auto-populating new employee ID
}

const DEPARTMENTS = [
    'Engineering / IT', 'Product Management', 'Design / Creative', 'Quality Assurance (QA)',
    'Data & Analytics', 'Research & Development (R&D)', 'Marketing & Communications',
    'Sales & Business Development', 'Human Resources (HR)', 'Finance & Accounting',
    'Operations & Logistics', 'Customer Support / Success', 'Legal & Compliance',
    'Administration & Facilities'
];

const DESIGNATIONS = [
    'Software Engineer', 'Senior Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Tech Lead', 'Engineering Manager', 'DevOps Engineer', 'Cloud Architect', 'Systems Administrator', 'Security Engineer',
    'Data Scientist', 'Data Analyst', 'Data Engineer', 'Machine Learning Engineer',
    'Product Manager', 'Associate Product Manager', 'UI/UX Designer', 'Product Designer', 'Graphic Designer', 'UX Researcher',
    'Sales Executive', 'Account Executive', 'Account Manager', 'Sales Director', 'Marketing Specialist', 'Marketing Manager', 'Content Strategist', 'SEO Specialist', 'Growth Manager',
    'HR Generalist', 'HR Manager', 'Talent Acquisition Specialist', 'Recruiter', 'Admin Assistant', 'Office Manager', 'Facilities Coordinator',
    'Financial Analyst', 'Accountant', 'Finance Manager', 'Payroll Specialist', 'Controller',
    'Support Specialist', 'Customer Success Manager', 'Technical Support Engineer', 'Implementation Specialist',
    'Operations Manager', 'Project Manager', 'Program Manager', 'Business Analyst', 'Logistics Coordinator',
    'CEO', 'CTO', 'COO', 'CFO', 'CMO', 'VP of Engineering', 'VP of Sales', 'VP of Product'
];

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern'];
const WORK_LOCATIONS = ['Remote', 'Hybrid', 'On-site'];

const MODULE_GROUPS = navigation.filter((n: any) => 'group' in n);

export default function AddEmployeeDrawer({ open, onClose, onSuccess, editUser, nextId }: Props) {
    const { company } = useSettings();
    const currency = company?.currency || 'USD';
    const currencySymbol = company?.currencySymbol || '$';
    
    const isEdit = !!editUser;
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [collapsedGroups, setCollapsedGroups] = useState<string[]>(MODULE_GROUPS.map((g: any) => g.group as string));
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(editUser?.photo || null);

    useEffect(() => {
        api.get('/api/users').then(({ data }) => {
            if (data?.users) {
                setUsers(data.users.filter((u: any) => (u.id || u.id) !== (editUser?.id || editUser?.id)));
            }
        }).catch(console.error);
    }, [editUser]);
    
    // Convert legacy roles array to new standard (if editing legacy user without migration)
    let initialRole = editUser?.role || 'employee';
    let initialPermissions = editUser?.permissions || [];
    
    if (isEdit && (!editUser.permissions || editUser.permissions.length === 0)) {
        if (editUser.role === 'admin' || editUser.role === 'ceo' || editUser.role === 'superadmin') initialRole = 'admin';
        else if (editUser.role === 'manager') { initialRole = 'employee'; initialPermissions = ['can_manage_team']; }
        else if (editUser.role === 'hr') { initialRole = 'employee'; initialPermissions = ['can_manage_hr', 'can_manage_team']; }
    }

    const [form, setForm] = useState({
        name: editUser?.name || '',
        email: editUser?.email || '',
        photo: editUser?.photo || '',
        password: '',
        employeeId: editUser?.employeeId || nextId || Math.floor(1000000000 + Math.random() * 9000000000).toString(),
        role: initialRole,
        permissions: initialPermissions as string[],
        designationId: editUser?.designation?.name || editUser?.designationId || '',
        department: editUser?.department || '',
        position: editUser?.position || '', // legacy field, using designation going forward but kept for compat
        salary: editUser?.salary || '',
        phone: editUser?.phone || '',
        address: editUser?.address || '',
        emergencyContact: editUser?.emergencyContact || '',
        leaveBalance: editUser?.leaveBalance || 20,
        joinDate: editUser?.joinDate ? new Date(editUser.joinDate).toISOString().slice(0, 10) : editUser?.joiningDate ? editUser.joiningDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        employmentType: editUser?.employmentType || '',
        workLocation: editUser?.workLocation || '',
        managerId: editUser?.managerId || '',
    });

    const togglePermission = (p: string) => {
        setForm(prev => {
            const perms = prev.permissions.includes(p)
                ? prev.permissions.filter(x => x !== p)
                : [...prev.permissions, p];
            return { ...prev, permissions: perms };
        });
    };

    const set = (k: string) => (e: any) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name || !form.email) return toast.error('Name and email are required');
        if (!isEdit && !form.password) return toast.error('Password is required');
        setLoading(true);
        try {
            let uploadedPhotoUrl = form.photo;
            if (photoFile) {
                const formData = new FormData();
                formData.append('file', photoFile);
                const uploadRes = await api.post('/api/branding/logo', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedPhotoUrl = uploadRes.data.url;
            }

            const payload: any = { ...form, photo: uploadedPhotoUrl };
            if (isEdit) {
                if (!payload.password) delete payload.password;
                const { data } = await api.put(`/api/users/${editUser.id || editUser.id}`, payload);
                toast.success('Employee updated!');
                onSuccess(data.user);
            } else {
                const { data } = await api.post('/api/auth/register-user', payload);
                toast.success(`Employee added with ID: ${data.user.employeeId}`);
                onSuccess(data.user);
            }
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to save employee');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit Employee' : 'Add Employee'} icon={<User className="w-5 h-5 text-indigo-600" />}>
            <form onSubmit={handleSubmit} className="p-3 md:p-4 space-y-6">
                {/* Profile Picture Upload */}
                <div className="flex flex-col items-center justify-center pb-2">
                    <div className="relative group cursor-pointer">
                        <input 
                            type="file" 
                            accept="image/*"
                            className="hidden" 
                            id="avatar-upload"
                            onChange={handleFileChange}
                        />
                        <label htmlFor="avatar-upload" className="cursor-pointer block relative">
                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center transition-all group-hover:border-indigo-500 group-hover:bg-indigo-50/50">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 text-gray-400 group-hover:text-indigo-500" />
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                                <Camera className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] font-medium">Upload</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <div>
                                <label htmlFor="employeePhone" className="label">Phone</label>
                                <input id="employeePhone" value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" className="input" />
                            </div>
                            <div>
                                <label htmlFor="employeeAddress" className="label">Address</label>
                                <input id="employeeAddress" value={form.address} onChange={set('address')} placeholder="123 Main St, City" className="input" />
                            </div>
                        </div>
                    </div>

                    {/* Employment Details */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Employment Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="employeeId" className="label">Employee ID (Auto Generated)</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                                    <input id="employeeId" value={form.employeeId} readOnly className="input pl-9 bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed" />
                                </div>
                            </div>
                            <div>
                                <CustomSelect 
                                    label="Designation *"
                                    placeholder="Select or type..."
                                    value={form.designationId} 
                                    onChange={(val) => setForm(prev => ({ ...prev, designationId: val }))}
                                    options={DESIGNATIONS}
                                    searchable={true}
                                    creatable={true}
                                />
                            </div>
                            <div>
                                <CustomSelect 
                                    label="Department"
                                    placeholder="Select or type..."
                                    value={form.department} 
                                    onChange={(val) => setForm(prev => ({ ...prev, department: val }))}
                                    options={DEPARTMENTS}
                                    searchable={true}
                                    creatable={true}
                                />
                            </div>
                            <div>
                                <label className="label">Reporting To (Manager)</label>
                                <CustomSelect value={form.managerId} onChange={set('managerId')} className="select mt-1">
                                    <option value="">Select manager</option>
                                    {users.map(u => <option key={u.id || u.id} value={u.id || u.id}>{u.name}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="label">Employment Type</label>
                                <CustomSelect value={form.employmentType} onChange={set('employmentType')} className="select mt-1">
                                    <option value="">Select type</option>
                                    {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="label">Work Location</label>
                                <CustomSelect value={form.workLocation} onChange={set('workLocation')} className="select mt-1">
                                    <option value="">Select location</option>
                                    {WORK_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label htmlFor="employeeJoining" className="label">Joining Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                                    <input id="employeeJoining" value={form.joinDate} onChange={set('joinDate')} type="date" className="input pl-9" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="employeeSalary" className="label">Monthly Salary ({currency})</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 flex items-center justify-center text-sm font-medium" aria-hidden="true">
                                        {currencySymbol}
                                    </div>
                                    <input id="employeeSalary" value={form.salary} onChange={set('salary')} type="number" placeholder="50000" className="input pl-9" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="employeeLeave" className="label">Leave Balance (Days)</label>
                                <input id="employeeLeave" value={form.leaveBalance} onChange={set('leaveBalance')} type="number" className="input" />
                            </div>
                            <div>
                                <label htmlFor="employeeEmergency" className="label">Emergency Contact</label>
                                <input id="employeeEmergency" value={form.emergencyContact} onChange={set('emergencyContact')} placeholder="Name - Phone" className="input" />
                            </div>
                        </div>
                    </div>

                    {/* System Access */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">System Access</h3>
                        
                        {!isEdit && (
                            <div className="mb-4">
                                <label htmlFor="employeePassword" className="label">Password *</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                                    <input 
                                        id="employeePassword" 
                                        value={form.password} 
                                        onChange={set('password')} 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="Minimum 8 characters" 
                                        className="input pl-9 pr-10" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="label">System Role *</label>
                            <div className="flex gap-4 mt-2">
                                <label className={clsx(
                                    "flex-1 flex flex-col items-center gap-2 p-4 border rounded-xl cursor-pointer transition-all duration-300",
                                    form.role === 'admin' ? "border-indigo-600 bg-indigo-50/50 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                )}>
                                    <input type="radio" name="role" className="sr-only" checked={form.role === 'admin'} onChange={() => setForm(prev => ({ ...prev, role: 'admin' }))} />
                                    <div className={clsx("w-5 h-5 rounded-full border flex items-center justify-center transition-colors", form.role === 'admin' ? "border-indigo-600" : "border-gray-300")}>
                                        {form.role === 'admin' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-gray-900">Admin</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Full system access</p>
                                    </div>
                                </label>
                                
                                <label className={clsx(
                                    "flex-1 flex flex-col items-center gap-2 p-4 border rounded-xl cursor-pointer transition-all duration-300",
                                    form.role === 'employee' ? "border-indigo-600 bg-indigo-50/50 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                )}>
                                    <input type="radio" name="role" className="sr-only" checked={form.role === 'employee'} onChange={() => setForm(prev => ({ ...prev, role: 'employee' }))} />
                                    <div className={clsx("w-5 h-5 rounded-full border flex items-center justify-center transition-colors", form.role === 'employee' ? "border-indigo-600" : "border-gray-300")}>
                                        {form.role === 'employee' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-gray-900">Employee</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Customizable access</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {form.role === 'employee' && (
                            <div className="mt-4">
                                <label className="label flex items-center gap-2 mb-3">
                                    <Shield className="w-4 h-4 text-indigo-600" /> Granular Permissions
                                </label>
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                    {MODULE_GROUPS.map((g: any) => (
                                        <div key={g.group} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                                            <div 
                                                className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                                                onClick={() => setCollapsedGroups(prev => prev.includes(g.group) ? prev.filter(c => c !== g.group) : [...prev, g.group])}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <g.icon className="w-4 h-4 text-indigo-500" />
                                                    <span className="text-sm font-semibold text-gray-900">{g.group}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const allIds = g.items.map((i: any) => i.id).filter(Boolean);
                                                            const allSelected = allIds.every((id: string) => form.permissions.includes(id));
                                                            setForm(prev => {
                                                                let newPerms = [...prev.permissions];
                                                                if (allSelected) {
                                                                    newPerms = newPerms.filter(p => !allIds.includes(p));
                                                                } else {
                                                                    allIds.forEach((id: string) => {
                                                                        if (!newPerms.includes(id)) newPerms.push(id);
                                                                    });
                                                                }
                                                                return { ...prev, permissions: newPerms };
                                                            });
                                                        }}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors"
                                                    >
                                                        Toggle All
                                                    </button>
                                                    {collapsedGroups.includes(g.group) ? (
                                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                                    ) : (
                                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {!collapsedGroups.includes(g.group) && (
                                                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                    {g.items.map((item: any) => item.id ? (
                                                    <label key={item.id} className={clsx(
                                                        "flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-colors bg-white hover:border-indigo-200",
                                                        form.permissions.includes(item.id) ? "border-indigo-600 shadow-sm bg-indigo-50/10" : "border-gray-100"
                                                    )}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={form.permissions.includes(item.id)} 
                                                            onChange={() => togglePermission(item.id)} 
                                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4"
                                                        />
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            {item.icon && <item.icon className={clsx("w-4 h-4 flex-shrink-0", form.permissions.includes(item.id) ? "text-indigo-600" : "text-gray-400")} />}
                                                            <span className={clsx("text-xs font-medium truncate", form.permissions.includes(item.id) ? "text-indigo-900" : "text-gray-700")}>{item.name}</span>
                                                        </div>
                                                    </label>
                                                ) : null)}
                                            </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} type="button" className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Add Employee'}
                    </button>
                </div>
            </form>
        </Drawer>
    );
}
