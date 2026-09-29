'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { Mail, ShieldCheck, ShieldAlert, Info, Eye, EyeOff, Save, Activity, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useSettings } from '@/lib/settings-context';

export default function EmailTab({ 
    title = 'Platform Email Services',
    description = 'Configure SMTP credentials used for system-wide emails.'
}: { 
    title?: string, 
    description?: string 
}) {
    const { settings, refreshSettings } = useSettings();
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showPw, setShowPw] = useState(false);

    // Form State
    const [smtpHost, setSmtpHost] = useState(settings?.smtpHost || '');
    const [smtpPort, setSmtpPort] = useState(settings?.smtpPort || 587);
    const [smtpUser, setSmtpUser] = useState(settings?.smtpUser || '');
    const [smtpPass, setSmtpPass] = useState(settings?.smtpPass || '');
    const [smtpSecure, setSmtpSecure] = useState(settings?.smtpSecure || false);
    const [emailFrom, setEmailFrom] = useState(settings?.emailFrom || '');
    
    // Status State
    const [testStatus, setTestStatus] = useState<'success' | 'failure' | 'none'>(settings?.lastEmailTestStatus || 'none');
    const [testError, setTestError] = useState<string>(settings?.lastEmailTestError || '');

    useEffect(() => {
        if (settings) {
            setSmtpHost(settings.smtpHost || '');
            setSmtpPort(settings.smtpPort || 587);
            setSmtpUser(settings.smtpUser || '');
            setSmtpPass(settings.smtpPass || '');
            setSmtpSecure(settings.smtpSecure || false);
            setEmailFrom(settings.emailFrom || '');
            setTestStatus(settings.lastEmailTestStatus || 'none');
            setTestError(settings.lastEmailTestError || '');
        }
    }, [settings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: any = {};
            if (smtpHost) payload.smtpHost = smtpHost;
            if (smtpPort) payload.smtpPort = smtpPort;
            if (smtpUser) payload.smtpUser = smtpUser;
            if (smtpPass) payload.smtpPass = smtpPass;
            if (emailFrom) payload.emailFrom = emailFrom;
            payload.smtpSecure = smtpSecure;

            await api.put('/api/settings', payload);
            toast.success('Email settings saved successfully');
            await refreshSettings(true);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to update email settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!smtpHost || !smtpUser || !smtpPass) {
            toast.error('Please fill in all SMTP fields before testing');
            return;
        }

        setTesting(true);
        try {
            const payload: any = {};
            if (smtpHost) payload.smtpHost = smtpHost;
            if (smtpPort) payload.smtpPort = smtpPort;
            if (smtpUser) payload.smtpUser = smtpUser;
            if (smtpPass) payload.smtpPass = smtpPass;
            if (emailFrom) payload.emailFrom = emailFrom;
            payload.smtpSecure = smtpSecure;

            await api.put('/api/settings', payload);

            const { data } = await api.post('/api/settings/test-email');
            setTestStatus('success');
            setTestError('');
            toast.success(data.message || 'Test email sent successfully!');
            await refreshSettings(true);
        } catch (e: any) {
            setTestStatus('failure');
            const errMsg = e?.response?.data?.error || e?.response?.data?.details || 'Connection test failed';
            setTestError(errMsg);
            toast.error(errMsg);
            await refreshSettings(true);
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm transition-all">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-primary" />
                            {title}
                        </h2>
                        <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">
                            {description}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {testStatus === 'success' && (
                            <span className="badge badge-green flex items-center gap-1.5 py-1 px-3">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Connected
                            </span>
                        )}
                        {testStatus === 'failure' && (
                            <span className="badge badge-red flex items-center gap-1.5 py-1 px-3 text-xs">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Connection Failed
                            </span>
                        )}
                        {testStatus === 'none' && (
                            <span className="badge badge-gray flex items-center gap-1.5 py-1 px-3 text-xs">
                                Untested
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Instructional Alert */}
                    <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/40 flex gap-3.5 animate-in fade-in duration-300">
                        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-indigo-950 dark:text-indigo-200">Google Workspace & Gmail Users Note</p>
                            <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed opacity-95">
                                If using Gmail, you <b>must</b> create an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors">App Password</a> (requires 2-Step Verification) to allow this system to send emails. Standard account passwords will be blocked by Google.
                            </p>
                        </div>
                    </div>

                    {/* Test Error Display */}
                    {testStatus === 'failure' && (
                        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3">
                            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                            <div className="space-y-1 flex-1">
                                <p className="font-bold text-sm">SMTP Setup Error</p>
                                <p className="font-mono bg-rose-100/70 dark:bg-rose-900/50 p-2 rounded-lg text-rose-950 dark:text-rose-100 text-[11px] break-all">
                                    {testError || settings?.lastEmailTestError || 'Could not connect to SMTP server. Verify your host, port, credentials, and app password.'}
                                </p>
                                <p className="text-gray-500 dark:text-zinc-400 text-[11px] mt-1">
                                    Please verify that your SMTP Host is reachable, the port is open (e.g. 587 with TLS or 465 with SSL), and the password is valid.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Test Success Display */}
                    {testStatus === 'success' && (
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5 flex-1">
                                <p className="font-bold text-sm">SMTP Connected Successfully</p>
                                <p className="text-xs opacity-90">
                                    Outgoing email service is active and tested. Automated reports and campaign emails will be delivered from <span className="font-semibold">{smtpUser}</span>.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3">
                            <label className="label text-gray-700 dark:text-zinc-300">SMTP Host</label>
                            <input 
                                value={smtpHost} 
                                onChange={e => setSmtpHost(e.target.value)} 
                                placeholder="smtp.gmail.com" 
                                className="input bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100" 
                            />
                        </div>
                        <div>
                            <label className="label text-gray-700 dark:text-zinc-300">Port</label>
                            <input 
                                type="number" 
                                value={smtpPort} 
                                onChange={e => setSmtpPort(parseInt(e.target.value) || 587)} 
                                placeholder="587" 
                                className="input bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label text-gray-700 dark:text-zinc-300">SMTP Username (Email Address)</label>
                        <input 
                            value={smtpUser} 
                            onChange={e => setSmtpUser(e.target.value)} 
                            placeholder="your-email@company.com" 
                            className="input bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100" 
                        />
                    </div>

                    <div>
                        <label className="label text-gray-700 dark:text-zinc-300">SMTP Password / App Password</label>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={smtpPass}
                                onChange={e => setSmtpPass(e.target.value)}
                                placeholder="••••••••••••"
                                className="input bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 pr-12 font-mono"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPw(!showPw)} 
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors"
                                title={showPw ? "Hide password" : "Show password"}
                            >
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="label text-gray-700 dark:text-zinc-300">&quot;From&quot; Name / Display Name</label>
                        <input 
                            value={emailFrom} 
                            onChange={e => setEmailFrom(e.target.value)} 
                            placeholder="Simplicion Private Limited" 
                            className="input bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100" 
                        />
                    </div>

                    <div 
                        className="flex items-center gap-3 p-4 bg-gray-50/70 dark:bg-zinc-800/40 rounded-2xl border border-gray-100 dark:border-zinc-800 cursor-pointer hover:bg-gray-100/70 dark:hover:bg-zinc-800 transition-colors" 
                        onClick={() => setSmtpSecure(!smtpSecure)}
                    >
                        <input
                            type="checkbox"
                            checked={smtpSecure}
                            onChange={() => {}} // Handled by div click
                            className="w-5 h-5 text-primary border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-primary"
                        />
                        <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">Use SSL/TLS Secure Connection</p>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Encrypts communication between the platform and mail server (recommended for port 465 or implicit TLS).</p>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3 mt-4 border-t border-gray-100 dark:border-zinc-800">
                        <button 
                            type="button"
                            onClick={handleSave} 
                            disabled={saving} 
                            className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
                        >
                            {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                        
                        <button
                            type="button"
                            onClick={handleTest}
                            disabled={testing || !smtpHost || !smtpUser || !smtpPass}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all",
                                testStatus === 'success' 
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 font-bold" 
                                    : "border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
                            )}
                        >
                            {testing ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                            {testing ? 'Validating Connection...' : 'Connect & Test Email'}
                        </button>
                    </div>

                    {settings?.lastEmailTestDate && (
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center">
                            Last verified: {new Date(settings.lastEmailTestDate).toLocaleString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
