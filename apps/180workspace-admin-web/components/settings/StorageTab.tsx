'use client';

import { useState, useEffect } from 'react';
import { 
    Server, ShieldCheck, ShieldAlert, Info, Eye, EyeOff, 
    Loader2, Save, Activity, CheckCircle2, Cloud, Globe, Palette, ExternalLink
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useSettings } from '@/lib/settings-context';

function InfoLink({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-700 font-medium ml-2 transition-colors cursor-pointer"
        >
            <Info className="w-3 h-3" />
            <span>{label}</span>
        </a>
    );
}

export default function StorageTab() {
    const { settings, refreshSettings } = useSettings();
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showPw, setShowPw] = useState(false);

    // Form State
    const [storageMode, setStorageMode] = useState<'cloudinary' | 'google_drive' | 'local'>(settings?.storageMode || 'cloudinary');
    const [googleDriveServiceAccount, setGoogleDriveServiceAccount] = useState(settings?.googleDriveServiceAccount || '');
    const [googleDriveFolderId, setGoogleDriveFolderId] = useState(settings?.googleDriveFolderId || '');
    const [cloudinaryCloudName, setCloudinaryCloudName] = useState(settings?.cloudinaryCloudName || '');
    const [cloudinaryApiKey, setCloudinaryApiKey] = useState(settings?.cloudinaryApiKey || '');
    const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState(settings?.cloudinaryApiSecret || '');
    
    // Status State
    const [testStatus, setTestStatus] = useState<'success' | 'failure' | 'none'>(settings?.lastStorageTestStatus || 'none');

    useEffect(() => {
        if (settings) {
            setStorageMode(settings.storageMode || 'cloudinary');
            setGoogleDriveServiceAccount(settings.googleDriveServiceAccount || '');
            setGoogleDriveFolderId(settings.googleDriveFolderId || '');
            setCloudinaryCloudName(settings.cloudinaryCloudName || '');
            setCloudinaryApiKey(settings.cloudinaryApiKey || '');
            setCloudinaryApiSecret(settings.cloudinaryApiSecret || '');
            setTestStatus(settings.lastStorageTestStatus || 'none');
        }
    }, [settings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/api/settings', {
                storageMode, googleDriveServiceAccount, googleDriveFolderId,
                cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret
            });
            toast.success('Storage configuration saved');
            await refreshSettings();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to update storage settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            // First save
            await api.put('/api/settings', {
                storageMode, googleDriveServiceAccount, googleDriveFolderId,
                cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret
            });

            const { data } = await api.post('/api/settings/test-storage');
            setTestStatus('success');
            toast.success(data.message || 'Storage connection verified!');
            await refreshSettings();
        } catch (e: any) {
            setTestStatus('failure');
            toast.error(e?.response?.data?.error || e?.response?.data?.details || 'Storage test failed');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="card max-w-3xl mx-auto overflow-hidden border-gray-100 shadow-xl shadow-blue-50/20 rounded-[32px]">
                <div className="card-header border-b border-gray-50 flex items-center justify-between p-8 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-blue-50 rounded-2xl">
                            <Server className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Storage & Cloud Drive</h2>
                            <p className="text-xs text-gray-500 font-medium">Choose and configure your preferred file storage provider.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {testStatus === 'success' && (
                            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-green-100 animate-in fade-in zoom-in duration-300">
                                <CheckCircle2 className="w-3.5 h-3.5" /> 
                                <span>Configured</span>
                            </div>
                        )}
                        {testStatus === 'failure' && (
                            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-red-100 animate-in fade-in zoom-in duration-300">
                                <ShieldAlert className="w-3.5 h-3.5" /> 
                                <span>Configuration Error</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card-body p-8 space-y-10">
                    {/* Storage Mode Selection */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Select Provider</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { id: 'cloudinary', label: 'Cloudinary', desc: 'Optimized for high-speed images & media.', icon: Palette, color: 'indigo' },
                                { id: 'google_drive', label: 'Google Drive', desc: 'Secure document storage using cloud drive.', icon: Globe, color: 'blue' },
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setStorageMode(m.id as any)}
                                    className={clsx(
                                        "group relative flex flex-col items-start p-6 rounded-[24px] border transition-all duration-300 text-left overflow-hidden",
                                        storageMode === m.id
                                            ? "border-blue-600 bg-blue-50/50 shadow-md ring-1 ring-blue-600/10"
                                            : "border-gray-100 bg-white hover:border-blue-200 hover:bg-gray-50/50"
                                    )}
                                >
                                    <div className={clsx(
                                        "p-3 rounded-xl mb-4 transition-colors",
                                        storageMode === m.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                                    )}>
                                        <m.icon className="w-5 h-5" />
                                    </div>
                                    <span className={clsx("font-black text-sm mb-1 uppercase tracking-tight", storageMode === m.id ? "text-blue-900" : "text-gray-700")}>{m.label}</span>
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed opacity-80">{m.desc}</p>
                                    
                                    {storageMode === m.id && (
                                        <div className="absolute top-4 right-4 animate-in fade-in zoom-in">
                                            <CheckCircle2 className="w-5 h-5 text-blue-600 fill-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Google Drive Configuration */}
                    {storageMode === 'google_drive' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div>
                                <label className="label">
                                    Google Service Account (JSON)
                                    <InfoLink href="https://console.cloud.google.com/iam-admin/serviceaccounts" label="IAM Console" />
                                </label>
                                <textarea
                                    value={googleDriveServiceAccount}
                                    onChange={e => setGoogleDriveServiceAccount(e.target.value)}
                                    placeholder='{ "type": "service_account", ... }'
                                    className="input font-mono text-[10px] h-40 py-4 bg-gray-50/30 border-gray-100 focus:bg-white focus:ring-blue-500"
                                />
                                <div className="mt-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-[10px] text-amber-900 font-medium space-y-1">
                                        <p className="font-black uppercase tracking-widest text-[9px] mb-1">Quick Setup Guide:</p>
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>Create a <b>Service Account</b> in Google Cloud IAM.</li>
                                            <li>Generate a <b>JSON Key</b> and paste its entire content above.</li>
                                            <li>Enable the <b>Google Drive API</b> in your GCP project.</li>
                                            <li>Share your root folder with the service account email.</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="label">Root Folder ID (Optional)</label>
                                <input
                                    value={googleDriveFolderId}
                                    onChange={e => setGoogleDriveFolderId(e.target.value)}
                                    placeholder="1A2B3C4D..."
                                    className="input bg-gray-50/30 border-gray-100 focus:bg-white"
                                />
                                <p className="text-[10px] text-gray-400 mt-1.5 font-medium">The unique identifier from the Google Drive URL of your target folder.</p>
                            </div>
                        </div>
                    )}

                    {/* Cloudinary Configuration */}
                    {storageMode === 'cloudinary' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div>
                                <label className="label">
                                    Cloudinary Cloud Name
                                    <InfoLink href="https://console.cloudinary.com/console/settings/account" label="Cloudinary Settings" />
                                </label>
                                <input
                                    value={cloudinaryCloudName}
                                    onChange={e => setCloudinaryCloudName(e.target.value)}
                                    placeholder="e.g. dxyz123abc"
                                    className="input bg-gray-50/30 border-gray-100 focus:bg-white"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label">API Key</label>
                                    <input
                                        value={cloudinaryApiKey}
                                        onChange={e => setCloudinaryApiKey(e.target.value)}
                                        placeholder="1234567890..."
                                        className="input bg-gray-50/30 border-gray-100 focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="label">API Secret</label>
                                    <div className="relative">
                                        <input
                                            type={showPw ? 'text' : 'password'}
                                            value={cloudinaryApiSecret}
                                            onChange={e => setCloudinaryApiSecret(e.target.value)}
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
                            </div>
                            <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 flex gap-4">
                                <Info className="w-6 h-6 text-indigo-500 flex-shrink-0 mt-0.5" />
                                <div className="space-y-4 flex-1">
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Setup Instructions</h4>
                                        <ol className="text-xs text-indigo-800 space-y-2 list-decimal list-inside opacity-90 font-medium leading-relaxed">
                                            <li>Login to your <a href="https://console.cloudinary.com/" target="_blank" rel="noopener noreferrer" className="underline font-black hover:text-indigo-600 inline-flex items-center gap-1 transition-colors">Cloudinary Console <ExternalLink className="w-3 h-3" /></a></li>
                                            <li>On the <b>Dashboard</b>, find &quot;Account Details&quot; section.</li>
                                            <li>Copy and paste the <b>Cloud Name</b>, <b>API Key</b>, and <b>API Secret</b> above.</li>
                                        </ol>
                                    </div>
                                    <p className="text-[10px] text-indigo-600 font-bold italic border-t border-indigo-100 pt-3">
                                        Pro Tip: Use Cloudinary for lightning-fast image delivery and company branding. Google Drive is better suited for heavy document storage.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-6 flex flex-col md:flex-row gap-4">
                        <button 
                            onClick={handleSave} 
                            disabled={saving} 
                            className="btn-primary flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                        <button
                            onClick={handleTest}
                            disabled={testing || (storageMode === 'google_drive' && !googleDriveServiceAccount) || (storageMode === 'cloudinary' && !cloudinaryCloudName)}
                            className={clsx(
                                "flex-1 h-14 flex items-center justify-center gap-3 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all shadow-sm",
                                testStatus === 'success' 
                                    ? "border-green-200 bg-green-50 text-green-700 font-bold shadow-green-50" 
                                    : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
                            )}
                        >
                            {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                            {testing ? 'Testing...' : 'Verify Connectivity'}
                        </button>
                    </div>

                    {settings?.lastStorageTestDate && (
                        <p className="text-[10px] text-gray-400 text-center font-bold tracking-tight">
                            SYSTEM LAST VERIFIED SUCCESSFUL CONNECTION ON {new Date(settings.lastStorageTestDate).toLocaleString().toUpperCase()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
