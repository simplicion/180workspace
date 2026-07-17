'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { Cloud, ShieldCheck, ShieldAlert, Info, Eye, EyeOff, Save, Activity, Globe, Palette, ExternalLink, FileSpreadsheet } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'cloudinary' | 'google_drive' | 'google_sheets'>(
        settings?.storageMode === 'google_drive' ? 'google_drive' : 'cloudinary'
    );
    
    const [googleDriveServiceAccount, setGoogleDriveServiceAccount] = useState(settings?.googleDriveServiceAccount || '');
    const [googleDriveFolderId, setGoogleDriveFolderId] = useState(settings?.googleDriveFolderId || '');
    const [cloudinaryCloudName, setCloudinaryCloudName] = useState(settings?.cloudinaryCloudName || '');
    const [cloudinaryApiKey, setCloudinaryApiKey] = useState(settings?.cloudinaryApiKey || '');
    const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState(settings?.cloudinaryApiSecret || '');
    const [googleSheetsId, setGoogleSheetsId] = useState(settings?.googleSheetsId || '');
    
    // Status State
    const [testStatus, setTestStatus] = useState<'success' | 'failure' | 'none'>(settings?.lastStorageTestStatus || 'none');

    useEffect(() => {
        if (settings) {
            setStorageMode(settings.storageMode || 'cloudinary');
            setActiveTab((settings.storageMode as any) === 'google_drive' ? 'google_drive' : 'cloudinary');
            setGoogleDriveServiceAccount(settings.googleDriveServiceAccount || '');
            setGoogleDriveFolderId(settings.googleDriveFolderId || '');
            setCloudinaryCloudName(settings.cloudinaryCloudName || '');
            setCloudinaryApiKey(settings.cloudinaryApiKey || '');
            setCloudinaryApiSecret(settings.cloudinaryApiSecret || '');
            setTestStatus(settings.lastStorageTestStatus || 'none');
            setGoogleSheetsId(settings.googleSheetsId || '');
        }
    }, [settings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/api/settings', {
                storageMode, googleDriveServiceAccount, googleDriveFolderId,
                cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret,
                googleSheetsId
            });
            toast.success('Storage configuration saved');
            await refreshSettings(true);
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
                cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret,
                googleSheetsId
            });

            const { data } = await api.post('/api/settings/test-storage');
            setTestStatus('success');
            toast.success(data.message || 'Storage connection verified!');
            await refreshSettings(true);
        } catch (e: any) {
            setTestStatus('failure');
            toast.error(e?.response?.data?.error || e?.response?.data?.details || 'Storage test failed');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="max-w-xl space-y-6">
            <div className="card">
                <div className="card-header flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-blue-600" />
                        <h2 className="font-semibold text-gray-900">Storage & Cloud Drive</h2>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {testStatus === 'success' && (
                            <span className="badge badge-green flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Connected
                            </span>
                        )}
                        {testStatus === 'failure' && (
                            <span className="badge badge-red flex items-center gap-1 text-[10px]">
                                <ShieldAlert className="w-3 h-3" /> Connection Failed
                            </span>
                        )}
                    </div>
                </div>

                <div className="card-body space-y-4">
                    <p className="text-xs text-gray-500 mb-4">
                        Choose and configure your preferred file storage provider for documents, assets, and system media securely.
                    </p>

                    {/* Storage Mode Selection */}
                    <div>
                        <label className="label">Configure Services</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'cloudinary', label: 'Cloudinary', icon: Palette },
                                { id: 'google_drive', label: 'Google Drive', icon: Globe },
                                { id: 'google_sheets', label: 'Google Sheets', icon: FileSpreadsheet },
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(m.id as any);
                                        if (m.id === 'cloudinary' || m.id === 'google_drive') {
                                            setStorageMode(m.id as any);
                                        }
                                    }}
                                    className={clsx(
                                        "flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all gap-2",
                                        activeTab === m.id
                                            ? "border-blue-600 bg-blue-50 text-blue-600 ring-2 ring-blue-100"
                                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    <m.icon className="w-4 h-4" />
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Google Drive Configuration */}
                    {activeTab === 'google_drive' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                            <div>
                                <label className="label">
                                    Google Service Account (JSON)
                                    <InfoLink href="https://console.cloud.google.com/iam-admin/serviceaccounts" label="IAM Console" />
                                </label>
                                <textarea
                                    value={googleDriveServiceAccount}
                                    onChange={e => setGoogleDriveServiceAccount(e.target.value)}
                                    placeholder='{ "type": "service_account", ... }'
                                    className="input font-mono text-[10px] h-32 bg-white resize-none"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Create a Service Account in Google Cloud IAM, generate a JSON Key, and paste its entire content above.
                                </p>
                            </div>
                            <div>
                                <label className="label">Root Folder ID (Optional)</label>
                                <input
                                    value={googleDriveFolderId}
                                    onChange={e => setGoogleDriveFolderId(e.target.value)}
                                    placeholder="1A2B3C4D..."
                                    className="input bg-white"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    The unique identifier from the Google Drive URL of your target folder.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Cloudinary Configuration */}
                    {activeTab === 'cloudinary' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                            <div>
                                <label className="label">
                                    Cloudinary Cloud Name
                                    <InfoLink href="https://console.cloudinary.com/console/settings/account" label="Settings" />
                                </label>
                                <input
                                    value={cloudinaryCloudName}
                                    onChange={e => setCloudinaryCloudName(e.target.value)}
                                    placeholder="e.g. dxyz123abc"
                                    className="input bg-white"
                                />
                            </div>
                            <div>
                                <label className="label">API Key</label>
                                <input
                                    value={cloudinaryApiKey}
                                    onChange={e => setCloudinaryApiKey(e.target.value)}
                                    placeholder="1234567890..."
                                    className="input bg-white"
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
                                        className="input bg-white pr-10"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPw(!showPw)} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 cursor-pointer"
                                    >
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Get these from your Cloudinary Console Dashboard.
                            </p>
                        </div>
                    )}

                    {/* Google Sheets Configuration */}
                    {activeTab === 'google_sheets' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                            <div>
                                <label className="label">
                                    Google Service Account (JSON)
                                    <InfoLink href="https://console.cloud.google.com/iam-admin/serviceaccounts" label="IAM Console" />
                                </label>
                                <textarea
                                    value={googleDriveServiceAccount}
                                    onChange={e => setGoogleDriveServiceAccount(e.target.value)}
                                    placeholder='{ "type": "service_account", ... }'
                                    className="input font-mono text-[10px] h-32 bg-white resize-none"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Create a Service Account in Google Cloud IAM, generate a JSON Key, and paste its entire content above. This service account is shared with Google Drive.
                                </p>
                            </div>
                            <div>
                                <label className="label">
                                    Google Sheets ID (for Meeting Notes)
                                    <InfoLink href="https://docs.google.com/spreadsheets/u/0/" label="Open Sheets" />
                                </label>
                                <input
                                    value={googleSheetsId}
                                    onChange={e => setGoogleSheetsId(e.target.value)}
                                    placeholder="1x2y3z... (ID from the URL)"
                                    className="input bg-white"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    The ID of the spreadsheet where AI meeting summaries and action items will be stored. Ensure the service account defined above has <b>Editor</b> access to this sheet.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                            {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                        {activeTab !== 'google_sheets' && (
                            <button
                                onClick={handleTest}
                                disabled={testing || (activeTab === 'google_drive' && !googleDriveServiceAccount) || (activeTab === 'cloudinary' && !cloudinaryCloudName)}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl border text-sm font-medium transition-all",
                                    testStatus === 'success' ? "border-green-200 bg-green-50 text-green-700 font-bold" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                {testing ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                                {testing ? 'Testing...' : 'Connect & Test'}
                            </button>
                        )}
                    </div>

                    {settings?.lastStorageTestDate && (
                        <p className="text-[10px] text-gray-400 text-center">
                            Last tested: {new Date(settings.lastStorageTestDate).toLocaleString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

