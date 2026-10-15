'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { User, Mail, Phone, MapPin, Building2, Briefcase, Calendar, Lock, Shield, ChevronRight, Pencil, Trash2, CheckCircle2, Clock, AlertCircle, DollarSign, Heart, Hash, FileText, FolderKanban, Star, Settings, CheckSquare, MessageSquare, Key, Code, Copy, RefreshCw, XCircle, ChevronDown, ChevronUp, CreditCard, FileCheck, History, Download, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import AddEmployeeDrawer from '@/app/(platform)/(hr-management-app)/_components/AddEmployeeDrawer';
import EmployeeBankDetails from '@/app/(platform)/(settings-app)/_components/EmployeeBankDetails';
import { FavoriteButton , LogoLoader } from "@workspace/ui";

export default function UnifiedProfilePage() {
    const params = useParams();
    const id = params?.id;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user: currentUser, company } = useAuth();
    const [profileUser, setProfileUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showEdit, setShowEdit] = useState(false);

    useEffect(() => {
        const tab = searchParams?.get('tab');
        if (tab) setActiveTab(tab);
        
        const edit = searchParams?.get('edit');
        if (edit === 'true') setShowEdit(true);
    }, [searchParams]);

    // Related data states
    const [tasks, setTasks] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any>(null);
    const [salary, setSalary] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [stats, setStats] = useState<any>(null);
    const [apiKeyData, setApiKeyData] = useState<any>(null);
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(false);
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [notes, setNotes] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [photoUploading, setPhotoUploading] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    async function fetchData() {
        const targetId = id === 'me' ? (currentUser?.id || currentUser?.id) : id as string;

        if (!targetId || targetId === 'undefined') {
            setLoading(false);
            return; // Silent wait for hydration
        }

        setLoading(true);
        try {

            let userData: any;
            try {
                const { data } = await api.get(`/api/users/${targetId}`);
                userData = data.user;
            } catch (err: any) {
                // If fetching user fails (not found or invalid ID format), try as a client
                // A 400 error often happens if targetId is a valid format for Client but not for User (rare in Mongo but possible if collections differ in logic)
                // or if the backend throws CastError (400) for a malformed ID.
                if (err.response?.status === 404 || err.response?.status === 400) {
                    try {
                        const { data } = await api.get(`/api/clients/${targetId}`);
                        const client = data.client;
                        userData = {
                            _id: client.id,
                            name: client.name,
                            email: client.email,
                            phone: client.phone,
                            company: client.company,
                            address: client.address,
                            website: client.website,
                            role: 'client',
                            status: client.status || 'active',
                            photoUrl: client.logoUrl,
                            industry: client.industry,
                            category: client.category,
                            taxId: client.taxId,
                            billingAddress: client.billingAddress,
                            joinDate: client.createdAt,
                            projects: client.projectIds || [],
                            notes: client.notes || '',
                            employeeId: client.clientId // Map clientId to employeeId for the UI box
                        };
                    } catch (clientErr: any) {
                        // If both fail, then truly not found or error
                        console.error('Profile fetch failed for both user and client:', err, clientErr);
                        throw err;
                    }
                } else {
                    throw err;
                }
            }

            setProfileUser(userData);
            if (userData.role === 'client') setNotes(userData.notes || '');

            // Fetch related data based on role
            const isEmployeeOrAdmin = userData.role !== 'client';
            const isClient = userData.role === 'client';
            const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'ceo' || (currentUser?.permissions && currentUser.permissions.includes('can_manage_team')); // Use local check to avoid closure ref error

            const promises: Promise<any>[] = [];

            if (isEmployeeOrAdmin) {
                // Tasks
                promises.push(api.get(`/api/tasks?assigneeId=${targetId}`).then(res => setTasks(res.data.tasks || [])).catch(() => { }));

                // Salary / Financials
                const salaryUrl = (id === 'me' || currentUser?.id === targetId) ? '/api/salary/my' : `/api/salary?employeeId=${targetId}`;
                promises.push(api.get(salaryUrl).then(res => setSalary(res.data.salaries || [])).catch(() => { }));

                // Attendance
                const attUrl = (id === 'me' || currentUser?.id === targetId) ? '/api/attendance/my' : `/api/attendance?employeeId=${targetId}`;
                promises.push(api.get(attUrl).then(res => {
                    const records = res.data.records || [];
                    const presentCount = records.filter((r: any) => r.status === 'present').length;
                    const attendancePercentage = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;
                    setAttendance({ summary: { attendancePercentage }, records });
                }).catch(() => { }));

                // Stats (Only for Users)
                promises.push(api.get(`/api/users/${targetId}/stats`).then(res => setStats(res.data)).catch(() => { }));
            }

            if (isClient || isAdmin) {
                // Projects
                promises.push(api.get(`/api/projects`).then(res => {
                    const projectsList = res.data.projects || [];
                    if (isClient) {
                        setProjects(projectsList.filter((p: any) =>
                            p.clientIds?.some((c: any) => (typeof c === 'object' ? c.id : c) === targetId) || currentUser?.id === targetId
                        ));
                    } else {
                        setProjects(projectsList.slice(0, 5));
                    }
                }).catch(() => { }));

                if (isClient) {
                    // Billing / Documents (Only for Clients)
                    promises.push(api.get(`/api/invoices?clientId=${targetId}`).then(res => setInvoices(res.data.invoices || [])).catch(() => { }));
                    promises.push(api.get(`/api/files?clientId=${targetId}`).then(res => setDocuments(res.data.files || [])).catch(() => { }));
                }
            }

            // API Key Info (Only for Users/Admins)
            if (!isClient && (currentUser?.id === targetId || id === 'me' || isAdmin)) {
                const statusUrl = (currentUser?.id === targetId || id === 'me') ? '/api/apikey/status' : `/api/apikey/status?userId=${targetId}`;
                promises.push(api.get(statusUrl).then(res => setApiKeyData(res.data)).catch(() => { }));
            }

            await Promise.all(promises);

            // Track Visit (Phase 6)
            api.post('/api/user-preferences/recent', {
                recordId: targetId,
                type: userData.role === 'client' ? 'Client' : 'User',
                label: userData.name,
                href: `/profile/${id}`
            }).then(() => {
                window.dispatchEvent(new CustomEvent('recentItemsUpdated'));
            }).catch(err => console.error('Recent tracking error:', err));
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Failed to load profile');
            if (id !== 'me') router.push('/');
        } finally {
            setLoading(false);
        }
    }

    const handleSaveNotes = async () => {
        if (!profileUser || profileUser.role !== 'client') return;
        setIsSavingNotes(true);
        try {
            await api.put(`/api/clients/${profileUser.id}`, { notes });
            toast.success('Notes saved');
        } catch (error) {
            toast.error('Failed to save notes');
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordData.currentPassword || !passwordData.newPassword) {
            return toast.error('Please fill in all password fields');
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return toast.error('New passwords do not match');
        }
        if (passwordData.newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        setPasswordLoading(true);
        try {
            await api.put('/api/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            toast.success('Password changed successfully');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size check (2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image size must be less than 2MB');
            return;
        }

        setPhotoUploading(true);
        const toastId = toast.loading('Uploading photo...');

        try {
            const formData = new FormData();
            
            if (profileUser.role === 'client') {
                formData.append('logo', file);
                const { data } = await api.put(`/api/clients/${profileUser.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setProfileUser((prev: any) => ({ ...prev, photoUrl: data.client.logoUrl }));
            } else {
                formData.append('photo', file);
                const { data } = await api.put(`/api/users/${profileUser.id}/photo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setProfileUser((prev: any) => ({ ...prev, photoUrl: data.photoUrl }));
            }

            toast.success('Profile photo updated!', { id: toastId });
            // Refresh auth context if it's our own profile
            if (currentUser?.id === profileUser.id) {
                // If there's a mechanism in AuthContext to refresh, we'd call it here
                // For now, local state update is enough for this page.
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to upload photo', { id: toastId });
        } finally {
            setPhotoUploading(false);
            if (photoInputRef.current) photoInputRef.current.value = '';
        }
    };

    useEffect(() => {
        if (currentUser) fetchData();
    }, [id, currentUser]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <LogoLoader className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!profileUser) return null;

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'ceo' || (currentUser?.permissions && currentUser.permissions.includes('can_manage_team'));
    const isOwnProfile = currentUser?.id === profileUser.id;
    const canEdit = isAdmin || isOwnProfile;
    const canChat = !isOwnProfile && (isAdmin || profileUser.role !== 'client');

    const tabs = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'tasks', label: 'Tasks', icon: CheckCircle2, roles: ['admin', 'employee', 'ceo'] },
        { id: 'projects', label: 'Projects', icon: FolderKanban, roles: ['admin', 'client', 'ceo'] },
        { id: 'attendance', label: 'Attendance', icon: Calendar, roles: ['admin', 'employee', 'ceo'] },
        { id: 'salary', label: profileUser.role === 'client' ? 'Billing' : 'Financials', icon: CreditCard, roles: ['admin', 'employee', 'client', 'ceo'] },
        { id: 'documents', label: 'Documents', icon: FileText, roles: ['admin', 'client'] },
        ...((isOwnProfile || isAdmin) ? [
            { id: 'developer', label: 'Developer & Stats', icon: Code },
            { id: 'settings', label: 'Settings', icon: Settings }
        ] : []),
    ].filter(tab => !tab.roles || tab.roles.includes(profileUser.role));

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {showEdit && (
                <AddEmployeeDrawer
                    open={showEdit}
                    editUser={profileUser}
                    onClose={() => setShowEdit(false)}
                    onSuccess={() => { setShowEdit(false); fetchData(); }}
                />
            )}



            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Info & Actions */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Unified Profile Card */}
                    <div className="card overflow-hidden">
                        {/* Cover & Profile Pic */}
                        <div className="h-28 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 relative">
                            {canEdit && (
                                <div className="absolute top-3 right-3 z-10">
                                    <button
                                        onClick={() => setShowEdit(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white rounded-xl text-xs font-semibold border border-white/20 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                        title="Edit Profile Details"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        <span>Edit Profile</span>
                                    </button>
                                </div>
                            )}
                            <div className="absolute -bottom-12 left-6">
                                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border-4 border-white dark:border-zinc-900 shadow-xl flex items-center justify-center relative z-10 group/avatar">
                                    {(profileUser.photoUrl || (profileUser.role === 'admin' || (profileUser.permissions && profileUser.permissions.includes('can_manage_team')) ? (company?.companyLogo || company?.logoUrl) : null)) ? (
                                        <img src={profileUser.photoUrl || company?.companyLogo || company?.logoUrl} alt={profileUser.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                            {profileUser.name?.[0]?.toUpperCase()}
                                        </span>
                                    )}

                                    {canEdit && (
                                        <label 
                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[10px] font-bold z-20 backdrop-blur-xs"
                                            title="Change Profile Photo"
                                        >
                                            <Pencil className="w-4 h-4 mb-0.5" />
                                            <span>{photoUploading ? 'Uploading...' : 'Change'}</span>
                                            <input
                                                type="file"
                                                ref={photoInputRef}
                                                onChange={handlePhotoFileChange}
                                                accept="image/*"
                                                disabled={photoUploading}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Name & Title */}
                        <div className="px-6 pt-16 pb-6 border-b border-gray-100 dark:border-zinc-800/80">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100">{profileUser.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium mt-1">
                                        {profileUser.role === 'client'
                                            ? (profileUser.category || 'Client') + ' • ' + (profileUser.industry || profileUser.company || 'General')
                                            : (profileUser.position || 'Member') + ' • ' + (profileUser.department || 'General')
                                        }
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={clsx(
                                        "px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                        profileUser.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50" : 
                                        profileUser.status === 'inactive' ? "bg-gray-50 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700" : 
                                        "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50"
                                    )}>
                                        {profileUser.status || 'Active'}
                                    </span>
                                    <span className={clsx(
                                        "px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                        profileUser.role === 'admin' || (profileUser.permissions && profileUser.permissions.includes('can_manage_team')) ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50" :
                                            profileUser.role === 'client' ? "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50" :
                                                "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/50"
                                    )}>
                                        {profileUser.role}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-6 space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-4">
                                {profileUser.role === 'client' ? 'Client & Company Details' : 'Personal & Work Details'}
                            </h4>

                            {profileUser.role !== 'client' && (
                                <div className="flex items-center gap-3 group">
                                    <div className="p-2 bg-slate-50 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 rounded-lg group-hover:scale-110 transition-transform">
                                        <Hash className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">Employee ID</p>
                                        <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">{profileUser.employeeId || 'N/A'}</p>
                                    </div>
                                </div>
                            )}

                            {profileUser.role !== 'client' && (
                                <div className="flex items-center gap-3 group">
                                    <div className="p-2 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-lg group-hover:scale-110 transition-transform">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">Leave Balance</p>
                                        <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">{profileUser.leaveBalance || 20} Days</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 group">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">Joining Date</p>
                                    <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                                        {profileUser.joiningDate || profileUser.createdAt 
                                            ? format(new Date(profileUser.joiningDate || profileUser.createdAt), 'dd MMM yyyy') 
                                            : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 group">
                                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">Email Address</p>
                                    <p className="text-sm font-medium text-gray-700 dark:text-zinc-200 truncate" title={profileUser.email}>{profileUser.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 group">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">Phone Number</p>
                                    <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">{profileUser.phone || 'Not provided'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 group">
                                <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg group-hover:scale-110 transition-transform">
                                    <Heart className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">Emergency Contact</p>
                                    <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">{profileUser.emergencyContact || 'Not provided'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 group">
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">{profileUser.role === 'client' ? 'Billing Address' : 'Home Address'}</p>
                                    <p className="text-sm font-medium text-gray-700 dark:text-zinc-200 leading-relaxed truncate">{profileUser.role === 'client' ? (profileUser.billingAddress || profileUser.address || 'No address saved') : (profileUser.address || 'No address saved')}</p>
                                </div>
                            </div>

                            {profileUser.role === 'client' && (
                                <>
                                    <div className="flex items-center gap-3 group">
                                        <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">Company</p>
                                            <p className="text-sm font-medium text-gray-700 dark:text-zinc-200 leading-relaxed">{profileUser.company || 'Not provided'}</p>
                                        </div>
                                    </div>
                                    {profileUser.taxId && (
                                        <div className="flex items-center gap-3 group">
                                            <div className="p-2 bg-slate-50 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 rounded-lg group-hover:scale-110 transition-transform">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">Tax ID / VAT No.</p>
                                                <p className="text-sm font-medium text-gray-700 dark:text-zinc-200 leading-relaxed">{profileUser.taxId}</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                </div>

                {/* Right Column: Tabs & Dynamic Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Navigation Tabs */}
                    <div className="flex p-1 bg-gray-50/50 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-x-auto no-scrollbar scroll-smooth">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap min-w-fit shrink-0",
                                        isActive
                                            ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-100 dark:border-zinc-700/80"
                                            : "text-gray-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/50"
                                    )}
                                >
                                    <Icon className={clsx("w-4 h-4", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-zinc-500")} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Panels */}
                    <div className="min-h-[400px]">
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className="card p-6">
                                    <h3 className="font-bold text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-indigo-500" />
                                        {profileUser.role === 'client' ? 'Recent Projects' : 'Recent Activity'}
                                    </h3>
                                    <div className="space-y-4">
                                        {profileUser.role === 'client' ? (
                                            projects.slice(0, 3).map((project: any) => (
                                                <div key={project.id} className="flex gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-700 dark:text-zinc-200">{project.name}</p>
                                                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Status: {project.status}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            tasks.slice(0, 3).map((task: any) => (
                                                <div key={task.id} className="flex gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">{task.title}</p>
                                                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">{format(new Date(task.updatedAt), 'MMM dd, HH:mm')}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {(profileUser.role === 'client' ? projects.length : tasks.length) === 0 && (
                                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                                <Clock className="w-8 h-8 text-gray-300 dark:text-zinc-700 mb-2" />
                                                <p className="text-sm text-gray-400 dark:text-zinc-500 italic">No recent activity</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="card p-6">
                                    <h3 className="font-bold text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                                        <Star className="w-4 h-4 text-rose-500" />
                                        Key Metrics
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {profileUser.role === 'client' ? (
                                            <>
                                                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/40">
                                                    <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Total Projects</p>
                                                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{projects.length}</p>
                                                </div>
                                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/40">
                                                    <p className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Active</p>
                                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                                        {projects.filter(p => !['completed', 'on_hold', 'cancelled'].includes(p.status)).length}
                                                    </p>
                                                </div>
                                                <div className="col-span-2 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                                                    <div className="flex justify-between items-end mb-2">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Business Relationship</p>
                                                            <p className="text-sm font-black text-amber-900 dark:text-amber-200">Premium Partner</p>
                                                        </div>
                                                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-amber-400" style={{ width: '85%' } as React.CSSProperties} />
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/40">
                                                    <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Comp Tasks</p>
                                                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                                                        {tasks.filter(t => t.status === 'completed').length}
                                                    </p>
                                                </div>
                                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/40">
                                                    <p className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Attend Rate</p>
                                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                                        {attendance?.summary?.attendancePercentage || '0'}%
                                                    </p>
                                                </div>
                                                {(() => {
                                                    const score = profileUser.performanceScore ?? 100;
                                                    const TIERS = [
                                                        { min: 0, max: 100, tag: 'Rookie', emoji: '🌱', color: '#94A3B8', bg: 'bg-slate-50 dark:bg-slate-900/40', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-800' },
                                                        { min: 100, max: 200, tag: 'Consistent Contributor', emoji: '🔥', color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/60' },
                                                        { min: 200, max: 300, tag: 'Rising Star', emoji: '⭐', color: '#06B6D4', bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800/60' },
                                                        { min: 300, max: 400, tag: 'High Achiever', emoji: '🚀', color: '#F97316', bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800/60' },
                                                        { min: 400, max: 500, tag: 'Elite Performer', emoji: '💎', color: '#8B5CF6', bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800/60' },
                                                        { min: 500, max: 500, tag: 'Legendary Executor', emoji: '🏆', color: '#FFD700', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800/60' },
                                                    ];
                                                    const tier = score >= 500 ? TIERS[5] : TIERS.find(t => score >= t.min && score < t.max) || TIERS[0];
                                                    const nextTier = TIERS.find(t => t.min > (tier?.min || 0));
                                                    const progressInTier = score >= 500 ? 100 : Math.round(((score - tier.min) / (tier.max - tier.min)) * 100);
                                                    const circumference = 2 * Math.PI * 28;
                                                    const dashOffset = circumference - (score / 500) * circumference;

                                                    return (
                                                        <div className={`col-span-2 p-4 rounded-2xl border ${tier.border} ${tier.bg}`}>
                                                            <div className="flex items-center gap-4">
                                                                <div className="relative w-16 h-16 flex-shrink-0">
                                                                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
                                                                        <circle cx="36" cy="36" r="28" className="stroke-slate-200 dark:stroke-zinc-800" strokeWidth="6" fill="none" />
                                                                        <circle cx="36" cy="36" r="28" stroke={tier.color} strokeWidth="6" fill="none" strokeLinecap="round"
                                                                            strokeDasharray="175.93"
                                                                            strokeDashoffset={175.93 - (175.93 * progressInTier) / 100}
                                                                            style={{ transition: 'stroke-dashoffset 1s ease' } as React.CSSProperties} />
                                                                    </svg>
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <span className="text-xl">{tier.emoji}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${tier.text}`}>Achievement</p>
                                                                    <p className={`font-black text-sm leading-tight ${tier.text}`}>{tier.tag}</p>
                                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                                        <p className={`text-lg font-black ${tier.text}`}>{score}</p>
                                                                        <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">/ 500 pts</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {nextTier && (
                                                                <div className="mt-3 space-y-1">
                                                                    <div className="flex justify-between text-[10px] font-semibold text-gray-400 dark:text-zinc-500">
                                                                        <span>Progress to {nextTier.emoji} {nextTier.tag}</span>
                                                                        <span>{progressInTier}%</span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-gray-200/70 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressInTier}%`, backgroundColor: tier.color } as React.CSSProperties} />
                                                                    </div>
                                                                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">{nextTier.min - score} pts needed</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {profileUser.role === 'client' && (
                                    <div className="card p-6 md:col-span-2">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4 text-indigo-500" />
                                                Client Administrative Notes
                                            </h3>
                                            {isSavingNotes && <LogoLoader className="w-4 h-4 animate-spin text-indigo-500" />}
                                        </div>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            onBlur={handleSaveNotes}
                                            placeholder="Add private notes about this client (only visible to admins)..."
                                            className="w-full h-32 p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-zinc-800 transition-all resize-none placeholder-gray-400 dark:placeholder-zinc-500"
                                        />
                                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-2 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Notes are automatically saved when you click outside the box.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                            <div className="card overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                                <div className="p-6 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 dark:text-zinc-100">Task List</h3>
                                    <span className="badge badge-indigo">{tasks.length} Total</span>
                                </div>
                                <div className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                    {tasks.map((task: any) => (
                                        <div key={task.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                                                    task.status === 'completed' || task.status === 'done' ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" : 
                                                    task.status === 'in_progress' ? "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400" :
                                                    "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                                                )}>
                                                    {task.status === 'completed' || task.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{task.title}</h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-1">{task.description}</p>
                                                        {task.dueDate && (
                                                             <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-500 font-medium">
                                                                <Calendar className="w-3 h-3" />
                                                                {format(new Date(task.dueDate), 'MMM dd')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={clsx(
                                                    "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                                    task.status === 'completed' || task.status === 'done' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" :
                                                    task.status === 'in_progress' ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400" :
                                                    "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                                                )}>
                                                    {task.status.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {tasks.length === 0 && (
                                        <div className="p-12 text-center">
                                            <CheckSquare className="w-12 h-12 text-gray-200 dark:text-zinc-800 mx-auto mb-3" />
                                            <p className="text-gray-400 dark:text-zinc-500">No tasks assigned</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'projects' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {projects.map((project: any) => (
                                        <div
                                            key={project.id}
                                            onClick={() => router.push(`/projects?id=${project.id}`)}
                                            className="card p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-600 dark:group-hover:text-white transition-colors">
                                                    <FolderKanban className="w-6 h-6" />
                                                </div>
                                                <span className={clsx(
                                                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                    project.status === 'completed' ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" :
                                                    project.status === 'in_progress' ? "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400" :
                                                    "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                                                )}>
                                                    {project.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1">{project.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-zinc-400 line-clamp-2 mb-4">{project.description || 'No description provided'}</p>

                                            <div className="space-y-3">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Progress</span>
                                                    <span className="text-indigo-600 dark:text-indigo-400">{project.progress || 0}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                                                        style={{ width: `${project.progress || 0}%` } as React.CSSProperties}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between pt-2">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                                                        <Calendar className="w-3 h-3" />
                                                        {project.deadline ? format(new Date(project.deadline), 'MMM dd, yyyy') : 'No deadline'}
                                                    </div>
                                                    <div className="flex -space-x-2">
                                                        {project.members?.slice(0, 3).map((member: any, i: number) => (
                                                            <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-800 bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase">
                                                                {member.name?.[0] || 'U'}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {projects.length === 0 && (
                                        <div className="col-span-full py-20 text-center card bg-gray-50/50 dark:bg-zinc-900/40 border-dashed border-2 border-gray-200 dark:border-zinc-800">
                                            <FolderKanban className="w-16 h-16 text-gray-200 dark:text-zinc-800 mx-auto mb-4" />
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100">No Projects Found</h3>
                                            <p className="text-gray-500 dark:text-zinc-400 mt-2">This client is not associated with any projects yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'attendance' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="card p-3 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-md">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Attendance Rate</span>
                                        </div>
                                        <p className="text-xl font-black text-emerald-900 dark:text-emerald-200">{attendance?.summary?.attendancePercentage || 0}%</p>
                                        <p className="text-[9px] text-emerald-500 dark:text-emerald-400/80 font-bold uppercase tracking-wide mt-0.5">Based on records</p>
                                    </div>
                                    <div className="card p-3 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md">
                                                <Clock className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Records</span>
                                        </div>
                                        <p className="text-xl font-black text-indigo-900 dark:text-indigo-200">{attendance?.records?.length || 0}</p>
                                        <p className="text-[9px] text-indigo-500 dark:text-indigo-400/80 font-bold uppercase tracking-wide mt-0.5">Total entries found</p>
                                    </div>
                                    <div className="card p-3 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-md">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Leaves Taken</span>
                                        </div>
                                        <p className="text-xl font-black text-amber-900 dark:text-amber-200">{attendance?.records?.filter((r: any) => r.status === 'leave').length || 0}</p>
                                        <p className="text-[9px] text-amber-500 dark:text-amber-400/80 font-bold uppercase tracking-wide mt-0.5">Approved leaves</p>
                                    </div>
                                    <div className="card p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md">
                                                <Calendar className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Leave Bal</span>
                                        </div>
                                        <p className="text-xl font-black text-blue-900 dark:text-blue-200">{profileUser?.leaveBalance || 20}</p>
                                        <p className="text-[9px] text-blue-500 dark:text-blue-400/80 font-bold uppercase tracking-wide mt-0.5">Days remaining</p>
                                    </div>
                                </div>
                                <div className="card overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
                                        <h3 className="font-bold text-gray-900 dark:text-zinc-100">Attendance Log</h3>
                                        <div className="flex gap-2">
                                            <span className="badge bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">Present: {attendance?.records?.filter((r: any) => r.status === 'present').length || 0}</span>
                                            <span className="badge bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400">Absent: {attendance?.records?.filter((r: any) => r.status === 'absent').length || 0}</span>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-zinc-800/60 overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50/50 dark:bg-zinc-800/40">
                                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-wider">Date</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-wider">In/Out</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-wider">Work Hrs</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-wider">Shift</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                                                {attendance?.records?.map((record: any) => (
                                                    <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">{format(new Date(record.date), 'MMM dd, yyyy')}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">In: {record.checkIn || '--:--'}</span>
                                                                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Out: {record.checkOut || '--:--'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">{record.workHours || '0'} hrs</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={clsx(
                                                                "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                                                record.status === 'present' ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : 
                                                                record.status === 'absent' ? "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400" : "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                                                            )}>
                                                                {record.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={clsx(
                                                                "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                                                record.shiftStatus === 'on_time' ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : 
                                                                record.shiftStatus === 'late' ? "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400" : 
                                                                record.shiftStatus === 'before_start' ? "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400" : 
                                                                record.shiftStatus === 'early_exit' ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400" : 
                                                                "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300"
                                                            )}>
                                                                {(record.shiftStatus || 'N/A').replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(!attendance?.records || attendance.records.length === 0) && (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400 dark:text-zinc-500 italic">
                                                            No attendance records found.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'developer' && (isOwnProfile || isAdmin) && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                {/* Task & Performance Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="card p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md">
                                                <CheckSquare className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Tasks</span>
                                        </div>
                                        <p className="text-xl font-black text-indigo-900 dark:text-indigo-200">{stats?.taskStats?.total || 0}</p>
                                        <p className="text-[9px] text-indigo-500 dark:text-indigo-400/80 font-bold uppercase tracking-wide mt-0.5">All time assigned</p>
                                    </div>
                                    <div className="card p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-md">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">On-Time Master</span>
                                        </div>
                                        <p className="text-xl font-black text-emerald-900 dark:text-emerald-200">{stats?.taskStats?.completedOnTime || 0}</p>
                                        <p className="text-[9px] text-emerald-500 dark:text-emerald-400/80 font-bold uppercase tracking-wide mt-0.5">Completed before deadline</p>
                                    </div>
                                    <div className="card p-3 bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="p-1.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-md">
                                                <XCircle className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Missed Deadlines</span>
                                        </div>
                                        <p className="text-xl font-black text-rose-900 dark:text-rose-200">{stats?.taskStats?.completedLate || (stats?.taskStats?.overdue || 0)}</p>
                                        <p className="text-[9px] text-rose-500 dark:text-rose-400/80 font-bold uppercase tracking-wide mt-0.5">Late or currently overdue</p>
                                    </div>
                                </div>

                                {/* Project Involvement */}
                                <div className="card overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
                                        <h3 className="font-bold text-gray-900 dark:text-zinc-100">Project Involvement</h3>
                                        <span className="badge badge-indigo">{stats?.projects?.length || 0} Projects</span>
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-zinc-800/60 overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50/50 dark:bg-zinc-800/40">
                                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-wider">Project Name</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-wider">Role</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-wider">Progress</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                                                {stats?.projects?.map((p: any) => (
                                                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                                                                    {p.name[0]}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">{p.name}</p>
                                                                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">Created {format(new Date(p.startDate), 'MMM dd, yyyy')}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={clsx(
                                                                "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                                                                p.role === 'owner' ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50" : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50"
                                                            )}>
                                                                {p.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2 max-w-[100px]">
                                                                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.progress}%` } as React.CSSProperties} />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400">{p.progress}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={clsx(
                                                                "px-2 py-0.5 rounded-full text-[10px] font-bold capitalize",
                                                                p.status === 'completed' ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400"
                                                            )}>
                                                                {p.status?.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(!stats?.projects || stats.projects.length === 0) && (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400 dark:text-zinc-500 italic">
                                                            No project involvement recorded.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Personal API Key Section */}
                                <div className="card p-6 bg-slate-900 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <Key className="w-32 h-32" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-lg font-bold flex items-center gap-2">
                                                    <Shield className="w-5 h-5 text-indigo-400" />
                                                    Personal API Access
                                                </h3>
                                                <p className="text-xs text-slate-400 mt-1">Generate a key to access your profile data from external apps.</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!apiKeyData?.hasKey ? (
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const payload = (isAdmin && !isOwnProfile) ? { userId: profileUser.id } : {};
                                                                const { data } = await api.post('/api/apikey/generate', payload);
                                                                setGeneratedKey(data.apiKey);
                                                                setApiKeyData({ hasKey: true, enabled: true });
                                                                toast.success('API Key Generated!');
                                                            } catch (err) { toast.error('Failed to generate key'); }
                                                        }}
                                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                                    >
                                                        <Key className="w-4 h-4" />
                                                        Generate Key
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Are you sure? This will break any existing integrations.')) {
                                                                try {
                                                                    const revokeUrl = (isAdmin && !isOwnProfile) ? `/api/apikey/revoke?userId=${profileUser.id}` : '/api/apikey/revoke';
                                                                    await api.delete(revokeUrl);
                                                                    setApiKeyData({ hasKey: false, enabled: false });
                                                                    setGeneratedKey(null);
                                                                    toast.success('API Key Revoked');
                                                                } catch (err) { toast.error('Failed to revoke key'); }
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-rose-500 hover:bg-rose-600 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Revoke Key
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {generatedKey && (
                                            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-in zoom-in-95">
                                                <div className="flex items-start gap-3">
                                                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-amber-200 uppercase tracking-widest">Important: Copy your secret key</p>
                                                        <p className="text-[10px] text-amber-200/70 mt-0.5">We only show this key once. If you lose it, you&apos;ll need to generate a new one.</p>
                                                        <div className="mt-3 flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/10 font-mono text-sm group">
                                                            <span className="flex-1 truncate text-indigo-300">{generatedKey}</span>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(generatedKey);
                                                                    toast.success('Copied to clipboard');
                                                                }}
                                                                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                                title="Copy API Key"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {!generatedKey && apiKeyData?.hasKey && (
                                            <div className="mb-6 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-300">Your API key is currently active and protecting your endpoints.</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Usage Guide Accordion */}
                                        <div className="border border-white/5 bg-white/5 rounded-2xl">
                                            <button
                                                onClick={() => setShowGuide(!showGuide)}
                                                className="w-full h-12 px-6 flex items-center justify-between text-sm font-bold hover:bg-white/5 transition-colors rounded-2xl"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Code className="w-4 h-4 text-indigo-400" />
                                                    API Usage Guide
                                                </span>
                                                {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                            {showGuide && (
                                                <div className="p-6 pt-0 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2">
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base Endpoint</p>
                                                        <code className="block bg-black/40 p-3 rounded-xl border border-white/10 text-[10px] text-indigo-300 break-all">
                                                            {origin || 'https://your-domain.com'}/api/apikey/public/profile?key=YOUR_API_KEY
                                                        </code>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">cURL Example</p>
                                                        <pre className="bg-black/40 p-4 rounded-xl border border-white/10 text-[10px] text-emerald-300 overflow-x-auto no-scrollbar font-mono">
                                                            {`curl -X GET "${origin || 'https://your-domain.com'}/api/apikey/public/profile?key=YOUR_API_KEY"`}
                                                        </pre>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">JavaScript Example</p>
                                                        <pre className="bg-black/40 p-4 rounded-xl border border-white/10 text-[10px] text-indigo-300 overflow-x-auto no-scrollbar font-mono leading-relaxed">
                                                            {`const fetchProfile = async () => {
  const url = "${origin || 'https://your-domain.com'}/api/apikey/public/profile?key=YOUR_KEY";
  const response = await fetch(url);
  const data = await response.json();
  console.log("My Performance Stats:", data.taskStats);
};`}
                                                        </pre>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'salary' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                {profileUser.role === 'client' ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="card p-5 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                                        <DollarSign className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Billed</span>
                                                </div>
                                                <p className="text-3xl font-black text-indigo-900 dark:text-indigo-200">
                                                    ₹{invoices.reduce((s, i) => s + (i.totalAmount || 0), 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="card p-5 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg">
                                                        <Clock className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Outstanding</span>
                                                </div>
                                                <p className="text-3xl font-black text-rose-900 dark:text-rose-200">
                                                    ₹{invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.totalAmount || 0), 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="card p-5 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Paid Invoices</span>
                                                </div>
                                                <p className="text-3xl font-black text-emerald-900 dark:text-emerald-200">
                                                    {invoices.filter(i => i.status === 'paid').length}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="card p-6">
                                            <h3 className="font-bold text-gray-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-indigo-500" />
                                                Recent Invoices
                                            </h3>
                                            <div className="space-y-4">
                                                {invoices.map((inv: any) => (
                                                    <div key={inv.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl hover:bg-white dark:hover:bg-zinc-800/70 hover:shadow-md transition-all border border-gray-100 dark:border-zinc-800 group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={clsx(
                                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                                inv.status === 'paid' ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                                                            )}>
                                                                <FileText className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">{inv.invoiceNumber || 'INV-####'}</p>
                                                                <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest">{format(new Date(inv.issueDate), 'MMM dd, yyyy')}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-gray-900 dark:text-zinc-100">₹{inv.totalAmount?.toLocaleString()}</p>
                                                                <span className={clsx(
                                                                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                                    inv.status === 'paid' ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                                                                )}>
                                                                    {inv.status}
                                                                </span>
                                                            </div>
                                                            <button 
                                                                className="p-2 hover:bg-indigo-50 dark:hover:bg-zinc-700 text-gray-400 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
                                                                title="Download Invoice"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {invoices.length === 0 && (
                                                    <div className="py-12 text-center text-gray-400 dark:text-zinc-500">
                                                        <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20 dark:opacity-40" />
                                                        <p className="italic">No billing history found</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="card p-6 bg-gradient-to-br from-gray-900 to-indigo-900 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none">
                                                <DollarSign className="w-40 h-40" />
                                            </div>
                                            <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-1">Base Salary</p>
                                            <h3 className="text-4xl font-black mb-4 text-white">₹{profileUser.salary?.toLocaleString() || '0'}<span className="text-sm font-normal text-indigo-300">/month</span></h3>
                                            <div className="flex gap-4">
                                                <div className="px-3 py-1 bg-white/10 rounded-lg text-xs font-semibold">Net Pay</div>
                                                <div className="px-3 py-1 bg-white/10 rounded-lg text-xs font-semibold">CTC Optimized</div>
                                            </div>
                                        </div>

                                        <div className="card p-6">
                                            <h3 className="font-bold text-gray-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-indigo-500" />
                                                Payment History
                                            </h3>
                                            <div className="space-y-4">
                                                {salary.slice(0, 5).map((pay: any) => (
                                                    <div key={pay.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl hover:bg-white dark:hover:bg-zinc-800/70 hover:shadow-md transition-all border border-gray-100 dark:border-zinc-800">
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">{pay.month} {pay.year}</p>
                                                            <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest">{pay.status || 'Paid'}</p>
                                                        </div>
                                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{pay.amount?.toLocaleString()}</p>
                                                    </div>
                                                ))}
                                                {salary.length === 0 && (
                                                    <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-4 italic">No payment records found</p>
                                                )}
                                            </div>
                                        </div>

                                        <EmployeeBankDetails
                                            profileUser={profileUser}
                                            currentUser={currentUser}
                                            onUpdate={fetchData}
                                        />
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'documents' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {documents.map((doc: any) => (
                                        <div key={doc.id} className="card p-4 hover:shadow-lg transition-all border border-gray-100 dark:border-zinc-800 group flex items-start gap-4">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">{doc.name}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{doc.type || 'Document'}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                                                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{format(new Date(doc.createdAt), 'MMM dd, yyyy')}</span>
                                                </div>
                                            </div>
                                            <button 
                                                className="p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-colors"
                                                title="Download Document"
                                                aria-label="Download Document"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                    {documents.length === 0 && (
                                        <div className="col-span-full py-20 text-center card bg-gray-50/50 dark:bg-zinc-900/40 border-dashed border-2 border-gray-200 dark:border-zinc-800">
                                            <FileText className="w-16 h-16 text-gray-200 dark:text-zinc-800 mx-auto mb-4" />
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100">No Documents Found</h3>
                                            <p className="text-gray-500 dark:text-zinc-400 mt-2">There are no shared documents for this client yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (isOwnProfile || isAdmin) && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className="card p-8">
                                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100 dark:border-zinc-800/80">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 dark:text-zinc-100">Security Settings</h3>
                                            <p className="text-sm text-gray-500 dark:text-zinc-400">Manage your account password and security preferences</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handlePasswordChange} className="max-w-md space-y-6">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">Current Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                                                <input
                                                    type="password"
                                                    value={passwordData.currentPassword}
                                                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700/80 rounded-2xl text-sm font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
                                                    placeholder="********"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">New Password</label>
                                            <div className="relative">
                                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                                                <input
                                                    type="password"
                                                    value={passwordData.newPassword}
                                                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700/80 rounded-2xl text-sm font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
                                                    placeholder="Minimum 6 characters"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">Confirm New Password</label>
                                            <div className="relative">
                                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                                                <input
                                                    type="password"
                                                    value={passwordData.confirmPassword}
                                                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700/80 rounded-2xl text-sm font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
                                                    placeholder="Repeat new password"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={passwordLoading}
                                            className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                                        >
                                            {passwordLoading ? <LogoLoader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            {passwordLoading ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
