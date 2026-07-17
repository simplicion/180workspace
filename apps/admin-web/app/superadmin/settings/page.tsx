'use client';

import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import { Save, AlertTriangle, User, Key, Server, Mail, Settings, Shield, Plus, Building2, Database, Globe, Lock, Info, Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { useSuperAdmin } from '../../../lib/superadmin-context';
import MongoSetupGuide from '../../../components/settings/MongoSetupGuide';
import { useSettings } from '../../../lib/settings-context';

export default function SettingsPage() {
    const { superAdmin, fetchSuperAdmin } = useSuperAdmin();
    const [settings, setSettings] = useState<any>(null);
    const [form, setForm] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingDb, setTestingDb] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    const [profileName, setProfileName] = useState('');
    const [profileEmail, setProfileEmail] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

    const [activeTab, setActiveTab] = useState('platform');
    const [isTesting, setIsTesting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);



    const testEmailConnection = async () => {
        setIsTesting(true);
        try {
            const { data } = await saApi.post('/settings/test-email', form);
            toast.success(data.message || 'Test email sent successfully');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Email connection test failed');
        } finally {
            setIsTesting(false);
        }
    };

    useEffect(() => {
        if (superAdmin) {
            setProfileName(superAdmin.name || '');
            setProfileEmail(superAdmin.email || '');
        }
        saApi.get('/settings').then(({ data }) => {
            setSettings(data.settings);
            setForm(data.settings);
        }).finally(() => setLoading(false));
    }, [superAdmin]);

    // Save Platform Settings
    const saveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await saApi.put('/settings', form);
            toast.success('Platform settings saved successfully');
        } catch {
            toast.error('Failed to save settings');
        }
        setSaving(false);
    };

    // Toggle Maintenance
    const toggleMaintenance = async () => {
        try {
            await saApi.post('/settings/toggle-maintenance');
            const { data } = await saApi.get('/settings');
            setForm(data.settings);
            toast.success(`Maintenance mode ${data.settings.maintenanceMode ? 'ENABLED' : 'DISABLED'}`);
        } catch {
            toast.error('Failed to toggle maintenance mode');
        }
    };

    // Save Profile
    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            await saApi.put('/auth/profile', { name: profileName, email: profileEmail });
            toast.success('Profile updated successfully');
            await fetchSuperAdmin();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to update profile');
        }
        setSavingProfile(false);
    };

    // Save Password
    const savePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
        if (!currentPassword) return toast.error('Current password is required');

        setSavingPassword(true);
        try {
            await saApi.put('/auth/change-password', { currentPassword, newPassword });
            toast.success('Password changed safely');
            setCurrentPassword('');
            setNewPassword('');
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to change password');
        }
        setSavingPassword(false);
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <LogoLoader className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
    );

    const tabs = [
        { id: 'platform', label: 'Platform Configuration', icon: Settings },
        { id: 'database', label: 'Database Infrastructure', icon: Database },
        { id: 'smtp', label: 'Email & SMTP', icon: Mail },
        { id: 'profile', label: 'My Security & Profile', icon: Shield },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <Toaster position="top-center" />

            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Configuration</h1>
                <p className="text-slate-500 font-medium mt-1 uppercase tracking-wider text-[10px]">Master control suite for platform infrastructure and security</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 border-b border-slate-100 pb-px mb-8">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-6 py-4 transition-all font-black text-[11px] uppercase tracking-[0.15em] border-b-2 ${activeTab === tab.id
                            ? 'border-sky-500 text-sky-600 bg-sky-50/50 rounded-t-2xl'
                            : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-t-2xl'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Platform Settings Tab */}
            {activeTab === 'platform' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl pb-12">
                    {/* Maintenance Mode */}
                    <div className="bg-white rounded-[20px] shadow-sm border border-slate-200">
                        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${form.maintenanceMode ? 'bg-rose-50' : 'bg-slate-50'}`}>
                                    <AlertTriangle className={`w-6 h-6 ${form.maintenanceMode ? 'text-rose-600' : 'text-slate-400'}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-slate-900">Platform State</h2>
                                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${form.maintenanceMode ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {form.maintenanceMode ? 'Maintenance' : 'Operational'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">Global traffic control. Enabling maintenance mode redirects all non-admin users.</p>
                                </div>
                            </div>
                            <button type="button" onClick={toggleMaintenance}
                                className={`px-6 py-2.5 text-[13px] font-medium rounded-lg transition-colors flex-shrink-0 ${form.maintenanceMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-100 hover:bg-rose-200 text-rose-700'}`}>
                                {form.maintenanceMode ? 'Resume Operations' : 'Initiate Maintenance'}
                            </button>
                        </div>
                    </div>

                    <form onSubmit={saveSettings} className="space-y-6">
                        {/* System Preferences */}
                        <div className="bg-white rounded-[20px] shadow-sm border border-slate-200">
                            <div className="p-8 border-b border-slate-100 flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                                    <Settings className="w-6 h-6 text-sky-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">System Preferences</h2>
                                    <p className="text-sm text-slate-500 mt-1">Growth parameters, billing settings, and automation policies.</p>
                                </div>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <label htmlFor="trialDays" className="block text-[14px] text-slate-800 mb-2">Standard Trial Duration (Days)</label>
                                            <input id="trialDays" type="number" value={form.trialDays || 0} onChange={e => setForm({ ...form, trialDays: +e.target.value })}
                                                title="Standard Trial Duration"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-300" />
                                        </div>
                                        <div>
                                            <label htmlFor="currency" className="block text-[14px] text-slate-800 mb-2">Default Platform Currency</label>
                                            <select id="currency" value={form.currency || 'INR'} onChange={e => setForm({ ...form, currency: e.target.value })}
                                                title="Default Platform Currency"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-300 cursor-pointer">
                                                <option value="INR">INR (₹) - Indian Rupee</option>
                                                <option value="USD">USD ($) - US Dollar</option>
                                                <option value="EUR">EUR (€) - Euro</option>
                                                <option value="GBP">GBP (£) - British Pound</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <label htmlFor="maxAutopayRetries" className="block text-[14px] text-slate-800 mb-2">Max Pay Recovery Retries</label>
                                            <input id="maxAutopayRetries" type="number" value={form.maxAutopayRetries || 0} onChange={e => setForm({ ...form, maxAutopayRetries: +e.target.value })}
                                                title="Max Pay Recovery Retries"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-300" />
                                        </div>
                                        <div>
                                            <label htmlFor="retryWindow" className="block text-[14px] text-slate-800 mb-2">Recovery Retry Window (Days)</label>
                                            <input id="retryWindow" type="number" value={form.autopayRetryIntervalDays || 0} onChange={e => setForm({ ...form, autopayRetryIntervalDays: +e.target.value })}
                                                title="Recovery Retry Window"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-300" />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-6 mt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[14px] font-medium text-slate-900">Inbound Pipeline Discovery</p>
                                            <p className="text-[13px] text-slate-500 mt-0.5">Permit unauthorized organizations to discover and register new environments.</p>
                                        </div>
                                        <label htmlFor="selfRegistration" className="relative inline-flex items-center cursor-pointer">
                                            <input id="selfRegistration" type="checkbox" checked={form.allowSelfRegistration ?? true} onChange={e => setForm({ ...form, allowSelfRegistration: e.target.checked })} className="sr-only peer" aria-label="Allow Self Registration" title="Allow Self Registration" />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Visial Identity & Corporate Nexus */}
                        <div className="bg-white rounded-[20px] shadow-sm border border-slate-200">
                            <div className="p-8 border-b border-slate-100 flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-6 h-6 text-orange-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Corporate Identity & Visuals</h2>
                                    <p className="text-sm text-slate-500 mt-1">Platform branding and organizational details.</p>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">Visual Settings</h3>
                                        <div>
                                            <label htmlFor="platformName" className="block text-[14px] text-slate-800 mb-2">Platform Name</label>
                                            <input id="platformName" aria-label="Platform Name" title="Platform Name" placeholder="Enter Platform Name" type="text" value={form.platformName || ''} onChange={e => setForm({ ...form, platformName: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-300" />
                                        </div>
                                        <div>
                                            <label htmlFor="platformTagline" className="block text-[14px] text-slate-800 mb-2">Platform Tagline</label>
                                            <input id="platformTagline" aria-label="Platform Tagline" title="Platform Tagline" placeholder="Enter Branding Tagline" type="text" value={form.brandingTagline || ''} onChange={e => setForm({ ...form, brandingTagline: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-300" />
                                        </div>
                                        <div>
                                            <label htmlFor="supportEmail" className="block text-[14px] text-slate-800 mb-2">Support Email</label>
                                            <input id="supportEmail" type="email" value={form.supportEmail || ''} onChange={e => setForm({ ...form, supportEmail: e.target.value })}
                                                placeholder="e.g., support@ims.com" title="Support Email"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-300" />
                                        </div>
                                        <div>
                                            <label htmlFor="themeColor" className="block text-[14px] text-slate-800 mb-2">Theme Color</label>
                                            <div className="flex items-center gap-3">
                                                <input id="themeColor" type="color" value={form.themeColor || '#4f46e5'} onChange={e => setForm({ ...form, themeColor: e.target.value })}
                                                    className="w-12 h-10 bg-white border border-slate-200 rounded-lg p-1 cursor-pointer" title="Pick Theme Color" />
                                                <input id="themeColorText" type="text" value={form.themeColor || ''} onChange={e => setForm({ ...form, themeColor: e.target.value })}
                                                    className="flex-1 px-4 py-2 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all font-mono" placeholder="#HEXCOLOR" aria-label="Theme Color HEX Code" />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="logoUrl" className="block text-[14px] text-slate-800 mb-2">Platform Logo URL</label>
                                            <input id="logoUrl" type="text" value={form.logoUrl || ''} onChange={e => setForm({ ...form, logoUrl: e.target.value })}
                                                placeholder="https://example.com/logo.png" title="Platform Logo URL"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-300" />
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">Corporate Details</h3>
                                        <div>
                                            <label htmlFor="legalName" className="block text-[14px] text-slate-800 mb-2">Legal Entity Name</label>
                                            <input id="legalName" type="text" value={form.companyLegalName || ''} onChange={e => setForm({ ...form, companyLegalName: e.target.value })}
                                                placeholder="Full Legal Company Name" title="Legal Entity Name"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-300" />
                                        </div>
                                        <div>
                                            <label htmlFor="companyPhone" className="block text-[14px] text-slate-800 mb-2">Corporate Contact (Phone)</label>
                                            <input id="companyPhone" type="text" value={form.companyPhone || ''} onChange={e => setForm({ ...form, companyPhone: e.target.value })}
                                                placeholder="+1 (555) 000-0000" title="Corporate Contact Phone"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-300" />
                                        </div>
                                        <div>
                                            <label htmlFor="companyWebsite" className="block text-[14px] text-slate-800 mb-2">Digital Presence (Website)</label>
                                            <input id="companyWebsite" type="text" value={form.companyWebsite || ''} onChange={e => setForm({ ...form, companyWebsite: e.target.value })}
                                                placeholder="https://www.company.com" title="Company Website"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-300" />
                                        </div>
                                        <div>
                                            <label htmlFor="companyAddress" className="block text-[14px] text-slate-800 mb-2">Headquarters Address</label>
                                            <textarea id="companyAddress" value={form.companyAddress || ''} onChange={e => setForm({ ...form, companyAddress: e.target.value })}
                                                rows={3} placeholder="Full Registered Address" title="Headquarters Address"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-300" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Master Save Button */}
                        <div className="flex justify-end pt-4 pb-8">
                            <button type="submit" disabled={saving}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[14px] font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                                {saving ? <LogoLoader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-white" />}
                                Save Global Settings
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Database Infrastructure Tab */}
            {activeTab === 'database' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl pb-12">
                    <div className="bg-white rounded-[20px] shadow-sm border border-slate-200">
                        <div className="p-8 border-b border-slate-100 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                                    <Database className="w-6 h-6 text-sky-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-slate-900">Database Infrastructure</h2>
                                        <span className="px-2.5 py-0.5 bg-sky-100 text-sky-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                            System Core
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">Core system data storage (MongoDB Atlas). This connection powers the entire platform.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowGuide(true)}
                                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-lg border border-slate-200 transition-all flex items-center gap-2"
                            >
                                <Info className="w-4 h-4" />
                                How to Setup?
                            </button>
                        </div>
                        
                        <div className="p-8">
                            <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-5 mb-8 flex gap-4">
                                <div className="text-sky-600 mt-0.5"><Database className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-sm font-semibold text-sky-900 mb-1">Database Mode: System Native</h3>
                                    <p className="text-sm text-sky-700/80 leading-relaxed">
                                        The platform is currently operating on its <strong>Primary System Database</strong>. High-performance native storage is enabled for all platform-level documentation and settings.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="dbConnectionUri" className="block text-[14px] text-slate-800 mb-2">Database Connection URI (MongoDB Atlas)</label>
                                    <input id="dbConnectionUri"
                                        type="text" 
                                        value={form.superAdminDbUri || ''} 
                                        onChange={e => setForm({ ...form, superAdminDbUri: e.target.value })}
                                        placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname" title="Database Connection URI"
                                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono placeholder:text-slate-300" 
                                    />
                                    <p className="mt-2 text-[11px] text-slate-500">Manual URI override takes precedence over individual host/port fields.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                                        <div>
                                            <label htmlFor="dbHostNode" className="block text-[13px] text-slate-600 mb-1.5 uppercase font-bold tracking-wider">Host Node</label>
                                            <input id="dbHostNode" type="text" value={form.dbHost || ''} onChange={e => setForm({ ...form, dbHost: e.target.value })}
                                                placeholder="e.g., node1.mongodb.net" title="Database Host Node"
                                                className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all font-mono" />
                                        </div>
                                        <div>
                                            <label htmlFor="dbNamePlatform" className="block text-[13px] text-slate-600 mb-1.5 uppercase font-bold tracking-wider">Database Name</label>
                                            <input id="dbNamePlatform" type="text" value={form.dbName || ''} onChange={e => setForm({ ...form, dbName: e.target.value })}
                                                placeholder="e.g., ims_platform" title="Database Name"
                                                className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all font-mono" />
                                        </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="dbUserAdmin" className="block text-[13px] text-slate-600 mb-1.5 uppercase font-bold tracking-wider">Username</label>
                                            <input id="dbUserAdmin" type="text" value={form.dbUser || ''} onChange={e => setForm({ ...form, dbUser: e.target.value })}
                                                placeholder="Database username" title="Database Username"
                                                className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all font-mono" />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label htmlFor="dbPassAdmin" className="block text-[13px] text-slate-600 mb-1.5 uppercase font-bold tracking-wider">Password</label>
                                                <input id="dbPassAdmin" type="password" value={form.dbPass || ''} onChange={e => setForm({ ...form, dbPass: e.target.value })}
                                                    placeholder="••••••••" title="Database Password"
                                                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all" />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-[13px] text-slate-600 mb-1.5 uppercase font-bold tracking-wider">SRV</label>
                                                <button 
                                                    type="button"
                                                    onClick={() => setForm({ ...form, dbSrv: !form.dbSrv })}
                                                    className={`w-full py-2.5 rounded-lg border text-xs font-black transition-all ${form.dbSrv ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                                                >
                                                    {form.dbSrv ? 'ENABLED' : 'DISABLED'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-[20px] gap-4">
                            <button 
                                type="button" 
                                disabled={testingDb}
                                onClick={async () => {
                                    setTestingDb(true);
                                    try {
                                        const { data } = await saApi.post('/settings/test-db', form);
                                        toast.success(data.message || 'Connection successful');
                                    } catch (err: any) {
                                        toast.error(err.response?.data?.error || 'Database connection failed');
                                    } finally {
                                        setTestingDb(false);
                                    }
                                }}
                                className="px-5 py-2 text-sm bg-white border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors flex items-center gap-2 font-medium"
                            >
                                {testingDb ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4 text-sky-500" />}
                                Test Connection
                            </button>
                            <button 
                                type="button" 
                                disabled={saving}
                                onClick={saveSettings}
                                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 active:scale-95 shadow-sm"
                            >
                                {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-white" />}
                                Save Infrastructure
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SMTP configuration Tab */}
            {activeTab === 'smtp' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
                    <form onSubmit={saveSettings} className="bg-white rounded-[20px] shadow-sm border border-slate-200">
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <Mail className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Email Automation (SMTP)</h2>
                                <p className="text-sm text-slate-500 mt-1">Configure your outgoing mail server credentials.</p>
                            </div>
                        </div>

                        <div className="p-8">
                            {/* Google Alert */}
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8 flex gap-4">
                                <div className="text-indigo-600 mt-0.5"><Info className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-sm font-semibold text-indigo-900 mb-1">Google Users Note</h3>
                                    <p className="text-sm text-indigo-700/80 leading-relaxed">
                                        You <strong>must</strong> create an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold underline decoration-indigo-300 underline-offset-2">App Password</a> to allow this system to send emails. Standard account passwords will be blocked by Google.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                                    <div className="sm:col-span-3">
                                        <label htmlFor="smtpHost" className="block text-[14px] text-slate-800 mb-2">SMTP Host</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <Server className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input id="smtpHost" type="text" value={form.smtpHost || ''} onChange={e => setForm({ ...form, smtpHost: e.target.value })}
                                                placeholder="smtp.gmail.com" title="SMTP Host"
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-300" />
                                        </div>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <label htmlFor="smtpPort" className="block text-[14px] text-slate-800 mb-2">Port</label>
                                        <input id="smtpPort" type="number" value={form.smtpPort || ''} onChange={e => setForm({ ...form, smtpPort: +e.target.value })}
                                            placeholder="587" title="SMTP Port"
                                            className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-300" />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="smtpUser" className="block text-[14px] text-slate-800 mb-2">SMTP Username (Email Address)</label>
                                    <input id="smtpUser" type="email" value={form.smtpUser || ''} onChange={e => setForm({ ...form, smtpUser: e.target.value })}
                                        placeholder="your-email@gmail.com" title="SMTP Username"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-300" />
                                </div>

                                <div>
                                    <label htmlFor="smtpPass" className="block text-[14px] text-slate-800 mb-2">SMTP Password / App Password</label>
                                    <div className="relative">
                                        <input id="smtpPass" type={showPassword ? 'text' : 'password'} value={form.smtpPass || ''} onChange={e => setForm({ ...form, smtpPass: e.target.value })}
                                            placeholder="•••••••••••" title="SMTP Password"
                                            className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-300" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Hide Password" : "Show Password"} aria-label={showPassword ? "Hide Password" : "Show Password"} className="absolute flex h-full items-center right-0 top-0 px-3 cursor-pointer p-0 m-0 bg-transparent border-none">
                                            {showPassword ? <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600" /> : <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="smtpFrom" className="block text-[14px] text-slate-800 mb-2">&quot;From&quot; Name / Display Name</label>
                                    <div className="flex flex-col gap-4">
                                        <input id="smtpFrom" type="text" value={form.smtpFrom || ''} onChange={e => setForm({ ...form, smtpFrom: e.target.value })}
                                            placeholder="noreply@internal.system" title="SMTP From Name"
                                            className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-300" />
                                        
                                        <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100/50">
                                            <div>
                                                <p className="text-[13px] font-semibold text-slate-900">SSL/TLS Secure Connection</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">Use encrypted connection (Required for Port 465).</p>
                                            </div>
                                            <label htmlFor="smtpSecure" className="relative inline-flex items-center cursor-pointer">
                                                <input id="smtpSecure" type="checkbox" checked={form.smtpSecure || false} onChange={e => setForm({ ...form, smtpSecure: e.target.checked })} className="sr-only peer" aria-label="Use SSL/TLS" title="Use SSL/TLS" />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer (implicit auto-save or standalone save btn if needed) */}
                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-[20px] gap-4">
                            <button type="button" onClick={testEmailConnection} disabled={isTesting}
                                className="px-5 py-2 text-sm bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2 font-medium">
                                {isTesting ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 text-indigo-500" />}
                                Send Test Email
                            </button>
                            <button type="submit" disabled={saving}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 active:scale-95 shadow-sm">
                                {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-white" />}
                                Save Settings
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Profile & Security Tab */}
            {activeTab === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-4xl">
                    {/* Master Profile Identity */}
                    <form onSubmit={saveProfile} className="bg-white rounded-[20px] shadow-sm border border-slate-200 h-fit">
                        <div className="p-8 border-b border-slate-100 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                                <User className="w-6 h-6 text-sky-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Master Profile</h2>
                                <p className="text-sm text-slate-500 mt-1">Primary administrative identity.</p>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label htmlFor="profileNameAdmin" className="block text-[14px] text-slate-800 mb-2">Full Name</label>
                                <input id="profileNameAdmin" type="text" value={profileName} onChange={e => setProfileName(e.target.value)} required
                                    placeholder="Enter full name" title="Full Name"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-300" />
                            </div>
                            <div>
                                <label htmlFor="profileEmailAdmin" className="block text-[14px] text-slate-800 mb-2">Email Address</label>
                                <input id="profileEmailAdmin" type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} required
                                    placeholder="Enter email address" title="Email Address"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-300" />
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end rounded-b-[20px]">
                            <button type="submit" disabled={savingProfile}
                                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                                {savingProfile ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-white" />}
                                Update Profile
                            </button>
                        </div>
                    </form>

                    {/* Access Control */}
                    <form onSubmit={savePassword} className="bg-white rounded-[20px] shadow-sm border border-slate-200 h-fit">
                        <div className="p-8 border-b border-slate-100 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <Shield className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Access Control</h2>
                                <p className="text-sm text-slate-500 mt-1">Update your secure password.</p>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label htmlFor="currentPasswordAdmin" className="block text-[14px] text-slate-800 mb-2">Current Password</label>
                                <input id="currentPasswordAdmin" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
                                    placeholder="••••••••" title="Current Password"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-300" />
                            </div>
                            <div>
                                <label htmlFor="newPasswordAdmin" className="block text-[14px] text-slate-800 mb-2">New Password</label>
                                <input id="newPasswordAdmin" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8}
                                    placeholder="Min 8 characters" title="New Password"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-300" />
                            </div>
                            <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 text-xs text-orange-700 flex items-start gap-3 mt-4">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p>This will immediately log out all existing sessions requiring a prompt re-authentication.</p>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end rounded-b-[20px]">
                            <button type="submit" disabled={savingPassword}
                                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                                {savingPassword ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-white" />}
                                Change Password
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <MongoSetupGuide 
                show={showGuide} 
                onClose={() => setShowGuide(false)} 
                platformName={form.platformName || '180workspace'}
            />
        </div>
    );
}
