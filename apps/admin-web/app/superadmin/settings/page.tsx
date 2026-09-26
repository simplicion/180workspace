'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
    Settings, AlertTriangle, User, Shield, Lock, 
    Eye, EyeOff, Save, KeyRound, CheckCircle2, ShieldAlert,
    Sparkles, ArrowRight, Cpu
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { useSuperAdmin } from '../../../lib/superadmin-context';
import { Skeleton, LogoLoader } from '@workspace/ui';
import clsx from 'clsx';

export default function SettingsPage() {
    const { superAdmin, fetchSuperAdmin } = useSuperAdmin();
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [togglingMaintenance, setTogglingMaintenance] = useState(false);

    // Profile Form
    const [profileName, setProfileName] = useState('');
    const [profileEmail, setProfileEmail] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    // Password Form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const loadSettings = async () => {
        try {
            const { data } = await saApi.get('/settings');
            setMaintenanceMode(Boolean(data?.settings?.maintenanceMode));
        } catch {
            // fallback
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (superAdmin) {
            setProfileName(superAdmin.name || '');
            setProfileEmail(superAdmin.email || '');
        }
        loadSettings();
    }, [superAdmin]);

    // Toggle Maintenance
    const toggleMaintenance = async () => {
        setTogglingMaintenance(true);
        try {
            await saApi.post('/settings/toggle-maintenance');
            const { data } = await saApi.get('/settings');
            const isNowActive = Boolean(data?.settings?.maintenanceMode);
            setMaintenanceMode(isNowActive);
            toast.success(
                isNowActive
                    ? 'Maintenance mode enabled. Non-admin users are restricted.'
                    : 'Maintenance mode disabled. All systems operational.'
            );
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to toggle maintenance mode');
        } finally {
            setTogglingMaintenance(false);
        }
    };

    // Save Profile
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profileName.trim() || !profileEmail.trim()) {
            return toast.error('Name and Email are required');
        }
        setSavingProfile(true);
        try {
            await saApi.put('/auth/profile', { name: profileName.trim(), email: profileEmail.trim() });
            toast.success('Super Admin profile updated successfully');
            await fetchSuperAdmin();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    // Save Password
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPassword) {
            return toast.error('Please enter your current password');
        }
        if (newPassword.length < 8) {
            return toast.error('New password must be at least 8 characters');
        }
        setSavingPassword(true);
        try {
            await saApi.put('/auth/change-password', { currentPassword, newPassword });
            toast.success('Super Admin password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to change password');
        } finally {
            setSavingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 pb-12">
                <Skeleton className="h-8 w-64 rounded-xl" />
                <Skeleton className="h-4 w-96 rounded-lg" />
                <Skeleton className="h-32 w-full rounded-3xl mt-4" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-80 rounded-3xl" />
                    <Skeleton className="h-80 rounded-3xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16 font-sans">
            <Toaster position="top-center" />

            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <Settings className="w-5 h-5" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Configuration</h1>
                </div>
                <p className="text-sm text-slate-500 font-medium">
                    Master control suite for platform operational status and administrative security.
                </p>
            </div>

            {/* 1. Platform Operational State Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className={clsx(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                            maintenanceMode
                                ? "bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-500/10"
                                : "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-500/10"
                        )}>
                            {maintenanceMode ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <h2 className="text-lg font-black text-slate-900">Platform Operational State</h2>
                                <span className={clsx(
                                    "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs",
                                    maintenanceMode
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                )}>
                                    {maintenanceMode ? 'Maintenance Mode Active' : 'All Systems Operational'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">
                                Global traffic control. When maintenance mode is active, non-admin users will see an operational pause screen.
                            </p>
                        </div>
                    </div>

                    <button 
                        type="button" 
                        onClick={toggleMaintenance}
                        disabled={togglingMaintenance}
                        className={clsx(
                            "px-5 py-2.5 text-xs font-bold rounded-xl transition-all shrink-0 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95",
                            maintenanceMode 
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20" 
                                : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                        )}
                    >
                        {togglingMaintenance ? (
                            <LogoLoader className="w-3.5 h-3.5 animate-spin" />
                        ) : maintenanceMode ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        <span>{maintenanceMode ? 'Resume Operations' : 'Initiate Maintenance'}</span>
                    </button>
                </div>
            </div>

            {/* 2. Platform AI Key Vault & LLM Engine Banner Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 shadow-2xs">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h2 className="text-lg font-black text-slate-900">Platform AI Engine & Key Vault</h2>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs">
                                AES-256-GCM Encrypted
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">
                            Configure platform-wide OpenAI, Google Gemini, Anthropic Claude, and Groq credentials. Stored securely in database instead of static environment variables.
                        </p>
                    </div>
                </div>

                <Link
                    href="/superadmin/ai"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shrink-0 flex items-center gap-2 shadow-sm shadow-indigo-600/20 cursor-pointer active:scale-95"
                >
                    <span>Manage AI Keys</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* 3. Super Admin Profile & Security Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card 1: Super Admin Profile */}
                <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6 flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex items-start gap-3 pb-5 border-b border-slate-100">
                            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-slate-900 tracking-tight">Super Admin Profile</h2>
                                <p className="text-xs text-slate-500 font-medium">Primary administrative credentials.</p>
                            </div>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Full Name
                                </label>
                                <input 
                                    id="profileNameAdmin" 
                                    type="text" 
                                    value={profileName} 
                                    onChange={e => setProfileName(e.target.value)} 
                                    required
                                    placeholder="Simplicion Admin"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Email Address
                                </label>
                                <input 
                                    id="profileEmailAdmin" 
                                    type="email" 
                                    value={profileEmail} 
                                    onChange={e => setProfileEmail(e.target.value)} 
                                    required
                                    placeholder="simplicion.com@gmail.com"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={savingProfile}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                            {savingProfile ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>Update Profile</span>
                        </button>
                    </div>
                </form>

                {/* Card 2: Security & Password */}
                <form onSubmit={handleChangePassword} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6 flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex items-start gap-3 pb-5 border-b border-slate-100">
                            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-slate-900 tracking-tight">Security & Password</h2>
                                <p className="text-xs text-slate-500 font-medium">Update Super Admin login password.</p>
                            </div>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <input 
                                        id="currentPasswordAdmin" 
                                        type={showCurrentPassword ? 'text' : 'password'} 
                                        value={currentPassword} 
                                        onChange={e => setCurrentPassword(e.target.value)} 
                                        required
                                        placeholder="••••••••" 
                                        className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input 
                                        id="newPasswordAdmin" 
                                        type={showNewPassword ? 'text' : 'password'} 
                                        value={newPassword} 
                                        onChange={e => setNewPassword(e.target.value)} 
                                        required 
                                        minLength={8}
                                        placeholder="Minimum 8 characters" 
                                        className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={savingPassword}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                            {savingPassword ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                            <span>Change Password</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
