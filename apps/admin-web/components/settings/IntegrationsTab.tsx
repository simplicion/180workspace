'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { BarChart3, Save, Eye, EyeOff, ShieldCheck, ShieldAlert, Info, Activity, Globe } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function IntegrationsTab() {
    const { settings: globalSettings, platform, refreshSettings: refreshGlobalSettings } = useSettings();
    const [saving, setSaving] = useState(false);
    const [plausibleApiKey, setPlausibleApiKey] = useState(globalSettings?.plausibleApiKey || '');
    const [plausibleSiteId, setPlausibleSiteId] = useState(globalSettings?.plausibleSiteId || '');
    const [testing, setTesting] = useState(false);
    const [testStatus, setTestStatus] = useState<'success' | 'failure' | 'none'>('none');
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        if (globalSettings) {
            setPlausibleApiKey(globalSettings.plausibleApiKey || '');
            setPlausibleSiteId(globalSettings.plausibleSiteId || '');
        }
    }, [globalSettings]);

    const saveSettings = async () => {
        setSaving(true);
        try {
            await api.put('/api/settings', { plausibleApiKey, plausibleSiteId });
            toast.success('Integration settings updated');
            await refreshGlobalSettings(true);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to update integrations');
        } finally {
            setSaving(false);
        }
    };

    const testConnection = async () => {
        setTesting(true);
        try {
            await api.put('/api/settings', { plausibleApiKey, plausibleSiteId });
            const { data } = await api.post('/api/analytics/plausible/test', {
                plausibleApiKey,
                plausibleSiteId
            });
            setTestStatus('success');
            toast.success(data.message || 'Plausible connection verified!');
            await refreshGlobalSettings(true);
        } catch (e: any) {
            setTestStatus('failure');
            toast.error(e?.response?.data?.error || e?.response?.data?.details || 'Connection failed');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-br from-white to-gray-50/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-2xl">
                            <BarChart3 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">External Integrations</h2>
                            <p className="text-sm text-gray-500 font-medium tracking-tight">Connect with third-party analytics & tools.</p>
                        </div>
                    </div>
                    <div>
                        {testStatus === 'success' && (
                            <span className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-black uppercase tracking-widest rounded-full">
                                <ShieldCheck className="w-3.5 h-3.5" /> Connected
                            </span>
                        )}
                        {testStatus === 'failure' && (
                            <span className="flex items-center gap-1.5 px-4 py-1.5 bg-red-50 text-red-600 text-[11px] font-black uppercase tracking-widest rounded-full">
                                <ShieldAlert className="w-3.5 h-3.5" /> Link Failed
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Plausible Highlight Card */}
                    <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-[24px] flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-indigo-100 flex-shrink-0">
                            <BarChart3 className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-indigo-900 mb-1">Plausible Analytics</h4>
                            <p className="text-xs text-indigo-800/80 leading-relaxed font-medium">
                                Lightweight, privacy-focused analytics. Sync your website traffic data directly to the {platform?.platformName}.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Plausible API Token</label>
                                <a 
                                    href="https://plausible.io/settings/api-keys" 
                                    target="_blank" 
                                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                                >
                                    Get Token →
                                </a>
                            </div>
                            <div className="relative">
                                <input 
                                    type={showApiKey ? 'text' : 'password'}
                                    value={plausibleApiKey} 
                                    onChange={e => setPlausibleApiKey(e.target.value)} 
                                    placeholder="pl_xxxxxxxxxxxxxxxxxxxxx" 
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 pr-12 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" 
                                />
                                <button 
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Site ID (Domain)</label>
                            <input 
                                value={plausibleSiteId} 
                                onChange={e => setPlausibleSiteId(e.target.value)} 
                                placeholder="example.com" 
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" 
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button 
                            onClick={saveSettings} 
                            disabled={saving} 
                            className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-[20px] text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                        >
                            {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'SAVING...' : 'SAVE CONFIG'}
                        </button>
                        <button 
                            onClick={testConnection} 
                            disabled={testing || !plausibleApiKey || !plausibleSiteId} 
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 py-4 rounded-[20px] text-sm font-black transition-all border outline-none",
                                testStatus === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-white border-gray-100 text-gray-900 hover:bg-gray-50"
                            )}
                        >
                            {testing ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                            {testing ? 'TESTING...' : 'TEST LINK'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

