'use client';

import { useState, useEffect } from 'react';
import { 
    Mail, ShieldCheck, ShieldAlert, Info, Eye, EyeOff, 
    Loader2, Save, Activity, CheckCircle2 
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useSettings } from '@/lib/settings-context';

export default function EmailTab() {
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

    useEffect(() => {
        if (settings) {
            setSmtpHost(settings.smtpHost || '');
            setSmtpPort(settings.smtpPort || 587);
            setSmtpUser(settings.smtpUser || '');
            setSmtpPass(settings.smtpPass || '');
            setSmtpSecure(settings.smtpSecure || false);
            setEmailFrom(settings.emailFrom || '');
            setTestStatus(settings.lastEmailTestStatus || 'none');
        }
    }, [settings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/api/settings', {
                smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, emailFrom
            });
            toast.success('Email settings saved successfully');
            await refreshSettings();
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
            // First save the current settings to ensure we test what's on screen
            await api.put('/api/settings', {
                smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, emailFrom
            });

            const { data } = await api.post('/api/settings/test-email');
            setTestStatus('success');
            toast.success(data.message || 'Test email sent successfully!');
            await refreshSettings();
        } catch (e: any) {
            setTestStatus('failure');
            toast.error(e?.response?.data?.error || e?.response?.data?.details || 'Connection test failed');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="card max-w-2xl mx-auto overflow-hidden border-gray-100 shadow-xl shadow-indigo-50/20 rounded-[32px]">
                <div className="card-header border-b border-gray-50 flex items-center justify-between p-8 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-indigo-50 rounded-2xl">
                            <Mail className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Email Automation (SMTP)</h2>
                            <p className="text-xs text-gray-500 font-medium">Configure your outgoing mail server credentials.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {testStatus === 'success' && (
                            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-green-100 animate-in fade-in zoom-in duration-300">
                                <CheckCircle2 className="w-3.5 h-3.5" /> 
                                <span>Connected</span>
                            </div>
                        )}
                        {testStatus === 'failure' && (
                            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-red-100 animate-in fade-in zoom-in duration-300">
                                <ShieldAlert className="w-3.5 h-3.5" /> 
                                <span>Connection Failed</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card-body p-8 space-y-8">
                    {/* Instructional Alert */}
                    <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 flex gap-3 animate-in fade-in duration-500">
                        <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-indigo-900">Google Users Note</p>
                            <p className="text-xs text-indigo-800 leading-relaxed opacity-90">
                                You <b>must</b> create an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-black hover:text-indigo-600 transition-colors">App Password</a> to allow this system to send emails. Standard account passwords will be blocked by Google.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-3">
                            <label className="label">SMTP Host</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600 text-gray-400">
                                    <Activity className="w-4 h-4" />
                                </div>
                                <input 
                                    value={smtpHost} 
                                    onChange={e => setSmtpHost(e.target.value)} 
                                    placeholder="smtp.gmail.com" 
                                    className="input pl-11 bg-gray-50/30 border-gray-100 focus:bg-white" 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label">Port</label>
                            <input 
                                type="number" 
                                value={smtpPort} 
                                onChange={e => setSmtpPort(parseInt(e.target.value))} 
                                placeholder="587" 
                                className="input bg-gray-50/30 border-gray-100 focus:bg-white" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">SMTP Username (Email Address)</label>
                        <input 
                            value={smtpUser} 
                            onChange={e => setSmtpUser(e.target.value)} 
                            placeholder="your-email@gmail.com" 
                            className="input bg-gray-50/30 border-gray-100 focus:bg-white" 
                        />
                    </div>

                    <div>
                        <label className="label">SMTP Password / App Password</label>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={smtpPass}
                                onChange={e => setSmtpPass(e.target.value)}
                                placeholder="••••••••••••"
                                className="input bg-gray-50/30 border-gray-100 focus:bg-white pr-12"
                            />
                            <button 
                                onClick={() => setShowPw(!showPw)} 
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="label">&quot;From&quot; Name / Display Name</label>
                        <input 
                            value={emailFrom} 
                            onChange={e => setEmailFrom(e.target.value)} 
                            placeholder="Snapshiksha Support" 
                            className="input bg-gray-50/30 border-gray-100 focus:bg-white" 
                        />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setSmtpSecure(!smtpSecure)}>
                        <input
                            type="checkbox"
                            checked={smtpSecure}
                            onChange={() => {}} // Handled by div click
                            className="w-5 h-5 text-indigo-600 border-gray-300 rounded-lg focus:ring-indigo-500"
                        />
                        <div>
                            <p className="text-sm font-bold text-gray-900">Use SSL/TLS Connection</p>
                            <p className="text-[10px] text-gray-500 font-medium">Encrypts communication between platform and mail server.</p>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col md:flex-row gap-4">
                        <button 
                            onClick={handleSave} 
                            disabled={saving} 
                            className="btn-primary flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-indigo-100"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                        
                        <button
                            onClick={handleTest}
                            disabled={testing || !smtpHost || !smtpUser || !smtpPass}
                            className={clsx(
                                "flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all",
                                testStatus === 'success' 
                                    ? "border-green-200 bg-green-50 text-green-700" 
                                    : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
                            )}
                        >
                            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                            {testing ? 'Verifying...' : 'Connect & Test'}
                        </button>
                    </div>

                    {settings?.lastEmailTestDate && (
                        <p className="text-[10px] text-gray-400 text-center font-medium">
                            System verified connectivity {new Date(settings.lastEmailTestDate).toLocaleString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
