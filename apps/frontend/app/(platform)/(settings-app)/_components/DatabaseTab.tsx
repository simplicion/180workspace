'use client';

import { useState, useEffect } from 'react';
import { Database, ShieldCheck, ShieldAlert, Info, Save, Check, ExternalLink, Activity, Eye, EyeOff, Trash2, AlertTriangle, Key, Terminal, Globe, Server, Hash, UserCircle, Lock, Database as DbIcon, Radio } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSettings } from '@/lib/settings-context';
import clsx from 'clsx';

import MigrationProgressBar from './MigrationProgressBar';
import MongoSetupGuide from './MongoSetupGuide';
import { ConfirmModal , LogoLoader, FeatureLock } from "@workspace/ui";

export default function DatabaseTab() {
    const { settings: globalSettings, refreshSettings: refreshGlobalSettings, platform } = useSettings();
    const [saving, setSaving] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    
    // Database Config State
    const [dbHost, setDbHost] = useState('');
    const [dbPort, setDbPort] = useState(27017);
    const [dbUser, setDbUser] = useState('');
    const [dbPass, setDbPass] = useState('');
    const [dbName, setDbName] = useState('');
    const [dbSrv, setDbSrv] = useState(true);
    const [showPw, setShowPw] = useState(false);

    // Test Connection State
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ status: 'success' | 'failure' | 'none', error?: string } | null>(null);

    // Migration State
    const [migrating, setMigrating] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState<{
        status: 'none' | 'in-progress' | 'completed' | 'failed';
        currentModel: string;
        progress: number;
        error: string | null;
        completedModels: number;
        totalModels: number;
    }>({
        status: 'none',
        currentModel: '',
        progress: 0,
        error: null,
        completedModels: 0,
        totalModels: 0
    });

    // Data Management State
    const [clearAll, setClearAll] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [isClearing, setIsClearing] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [showMigrationConfirm, setShowMigrationConfirm] = useState(false);

    useEffect(() => {
        if (globalSettings) {
            const isManual = !!globalSettings.useManualUri;
            setDbHost(isManual ? globalSettings.manualUri : globalSettings.dbHost || '');
            setDbPort(globalSettings.dbPort || 27017);
            setDbUser(globalSettings.dbUser || '');
            setDbPass(globalSettings.dbPass || '');
            setDbName(globalSettings.dbName || '');
            setDbSrv(globalSettings.dbSrv ?? true);
            
            if (globalSettings.lastDbTestStatus) {
                setTestResult({
                    status: globalSettings.lastDbTestStatus,
                    error: globalSettings.lastDbTestError
                });
            }
        }
    }, [globalSettings]);

    // Check for active migration on mount
    useEffect(() => {
        const checkActiveMigration = async () => {
            try {
                const { data } = await api.get('/api/settings/migration-status');
                if (data.status === 'in-progress') {
                    setMigrating(true);
                    setMigrationStatus(data);
                    startPolling();
                }
            } catch (err) {
                console.error('Failed to check migration status');
            }
        };
        checkActiveMigration();
    }, []);

    let pollInterval: NodeJS.Timeout | null = null;

    const startPolling = () => {
        if (pollInterval) clearInterval(pollInterval);
        
        pollInterval = setInterval(async () => {
            try {
                const { data } = await api.get('/api/settings/migration-status');
                setMigrationStatus(data);
                
                if (data.status === 'completed' || data.status === 'failed') {
                    if (pollInterval) clearInterval(pollInterval);
                    setMigrating(false);
                    if (data.status === 'completed') {
                        toast.success('Migration Completed Successfully!');
                        await refreshGlobalSettings(true);
                    }
                }
            } catch (err) {
                console.error('Migration polling error:', err);
            }
        }, 2000);
    };

    const saveDatabaseSettings = async () => {
        // Smart Auto-Correction Logic
        let correctedHost = dbHost;
        if (dbHost.includes('<db_password>') || dbHost.includes('<password>')) {
            if (dbPass) {
                correctedHost = correctedHost.replace(/<db_password>/g, dbPass).replace(/<password>/g, dbPass);
                setDbHost(correctedHost);
                toast.success('🪄 Seeded your password into the connection string!');
            }
        }
        
        if (correctedHost.includes('<username>') || correctedHost.includes('<db_username>')) {
            if (dbUser) {
                correctedHost = correctedHost.replace(/<username>/g, dbUser).replace(/<db_username>/g, dbUser);
                setDbHost(correctedHost);
            }
        }

        // Validation: Detect if placeholders remain after attempt to fix
        if (correctedHost.includes('<db_password>') || correctedHost.includes('<password>')) {
            toast.error('❌ Your connection string still has "<db_password>". Please replace it or enter a password above so we can fix it for you!');
            return;
        }

        const isUri = correctedHost.startsWith('mongodb+srv://') || correctedHost.startsWith('mongodb://');

        setSaving(true);
        try {
            await api.put('/api/settings', {
                dbHost: isUri ? '' : correctedHost,
                dbPort,
                dbUser,
                dbPass,
                dbName,
                dbSrv: true,
                useManualUri: isUri,
                manualUri: isUri ? correctedHost : ''
            });

            toast.success('Database configuration updated');
            await refreshGlobalSettings(true);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to update database settings');
        } finally {
            setSaving(false);
        }
    };

    const startMigration = async () => {
        setShowMigrationConfirm(true);
    };

    const handleConfirmMigration = async () => {
        setShowMigrationConfirm(false);

        // Smart Auto-Correction Logic
        let correctedHost = dbHost;
        if (dbHost.includes('<db_password>') || dbHost.includes('<password>')) {
            if (dbPass) {
                correctedHost = correctedHost.replace(/<db_password>/g, dbPass).replace(/<password>/g, dbPass);
                setDbHost(correctedHost);
            }
        }
        
        if (correctedHost.includes('<username>') || correctedHost.includes('<db_username>')) {
            if (dbUser) {
                correctedHost = correctedHost.replace(/<username>/g, dbUser).replace(/<db_username>/g, dbUser);
                setDbHost(correctedHost);
            }
        }

        const isUri = correctedHost.startsWith('mongodb+srv://') || correctedHost.startsWith('mongodb://');
        
        setMigrating(true);
        try {
            const { data } = await api.post('/api/settings/migrate-db', {
                dbHost: isUri ? '' : correctedHost,
                dbPort,
                dbUser,
                dbPass,
                dbName,
                dbSrv: true,
                useManualUri: isUri,
                manualUri: isUri ? correctedHost : ''
            });
            
            setMigrationStatus(data.status);
            startPolling();
            toast.success('Data migration started...');
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to start migration');
            setMigrating(false);
        }
    };

    const testConnection = async () => {
        // Smart Auto-Correction Logic
        let correctedHost = dbHost;
        if (dbHost.includes('<db_password>') || dbHost.includes('<password>')) {
            if (dbPass) {
                correctedHost = correctedHost.replace(/<db_password>/g, dbPass).replace(/<password>/g, dbPass);
                setDbHost(correctedHost);
            }
        }
        
        if (correctedHost.includes('<username>') || correctedHost.includes('<db_username>')) {
            if (dbUser) {
                correctedHost = correctedHost.replace(/<username>/g, dbUser).replace(/<db_username>/g, dbUser);
                setDbHost(correctedHost);
            }
        }

        // Validation: Detect if placeholders remain after attempt to fix
        if (correctedHost.includes('<db_password>') || correctedHost.includes('<password>')) {
            toast.error('❌ Your connection string still has "<db_password>". Please replace it or enter a password above so we can fix it for you!');
            return;
        }

        const isUri = correctedHost.startsWith('mongodb+srv://') || correctedHost.startsWith('mongodb://');

        setTesting(true);
        setTestResult(null);
        try {
            const { data } = await api.post('/api/settings/test-db', {
                dbHost: isUri ? '' : correctedHost,
                dbPort,
                dbUser,
                dbPass,
                dbName,
                dbSrv: true,
                useManualUri: isUri,
                manualUri: isUri ? correctedHost : ''
            });

            setTestResult({ status: 'success' });
            toast.success(data.message || 'Database connection successful!');
            await refreshGlobalSettings(true);
        } catch (e: any) {
            const errorMsg = e?.response?.data?.details || e?.response?.data?.error || 'Connection failed';
            setTestResult({ status: 'failure', error: errorMsg });
            toast.error('Database connection failed');
        } finally {
            setTesting(false);
        }
    };

    const handleClearData = async () => {
        if (!adminPass) return toast.error('Admin password is required');
        setIsClearing(true);
        try {
            const { data } = await api.post('/api/settings/clear-data', {
                password: adminPass,
                startDate,
                endDate,
                clearAll
            });
            toast.success(data.message || 'Data cleared successfully');
            setShowClearModal(false);
            setAdminPass('');
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to clear data');
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl pb-12">
            {(!globalSettings || Object.keys(globalSettings).length === 0) ? (
                <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 p-8 flex items-center justify-center min-h-[400px]">
                    <LogoLoader className="w-8 h-8 animate-spin" />
                </div>
            ) : (globalSettings as any).planLocked ? (
                <FeatureLock 
                    title="Premium Feature Locked"
                    description="Advanced configuration requires an active subscription. Upgrade your workspace to unlock this capability."
                    actionText="Upgrade Plan"
                    actionHref='/settings/platform-billing'
                />
            ) : (
                <>
            {/* Database Connection Card */}
            <div className="bg-white rounded-[20px] shadow-sm border border-slate-200">
                <div className="p-8 border-b border-slate-100 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Database className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-slate-900">Database Infrastructure</h2>
                        <p className="text-sm text-slate-500 mt-1">Core system data storage (MongoDB Atlas)</p>
                        
                        {/* Current Usage Status Banner */}
                        <div className="mt-4 flex items-center gap-2">
                            {globalSettings?.useManualUri || globalSettings?.dbHost ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold tracking-wide">
                                    <Server className="w-3.5 h-3.5" />
                                    Active Database Node: Custom Private Cluster
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold tracking-wide">
                                    <Globe className="w-3.5 h-3.5" />
                                    Active Database Node: 180workspace Core Shared Hub
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {testResult?.status === 'success' ? (
                            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-2 border border-emerald-100">
                                <ShieldCheck className="w-3.5 h-3.5" /> 
                                <span>Connected</span>
                            </div>
                        ) : testResult?.status === 'failure' ? (
                            <div className="px-3 py-1.5 bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-2 border border-rose-100">
                                <ShieldAlert className="w-3.5 h-3.5" /> 
                                <span>Connection Failed</span>
                            </div>
                        ) : (
                            <div className="px-3 py-1.5 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-2 border border-slate-200">
                                <Info className="w-3.5 h-3.5" /> 
                                <span>Not Tested</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        {/* Host / URI */}
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                                <label htmlFor="dbUri" className="block text-[14px] text-slate-800">Database Connection URI</label>
                                <div className="flex items-center gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setShowGuide(true)}
                                        className="text-[10px] text-amber-600 hover:text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                                    >
                                        <Info className="w-3 h-3" /> How to Setup
                                    </button>
                                    <a 
                                        href="https://www.mongodb.com/cloud/atlas" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                                    >
                                        Atlas Console <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                            <input
                                id="dbUri"
                                type="text"
                                value={dbHost}
                                onChange={(e) => setDbHost(e.target.value)}
                                aria-describedby="dbUri-help"
                                placeholder="mongodb+srv://username:<password>@cluster0.abcde.mongodb.net/my_database"
                                className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono placeholder:text-slate-300"
                            />
                            <p id="dbUri-help" className="text-[11px] text-slate-500 mt-2">
                                Paste your full connection string from Atlas. If navigating from the Shared DB, ensure it contains the target database name.
                            </p>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="dbPass" className="block text-[14px] text-slate-800 mb-2">Secure Passkey</label>
                            <div className="relative">
                                <input
                                    id="dbPass"
                                    type={showPw ? 'text' : 'password'}
                                    value={dbPass}
                                    onChange={(e) => setDbPass(e.target.value)}
                                    aria-describedby="dbPass-help"
                                    placeholder="Enter to auto-replace <password> in the URI"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono placeholder:text-slate-300"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute flex h-full items-center right-0 top-0 px-3 cursor-pointer bg-transparent border-none"
                                    title={showPw ? "Hide password" : "Show password"}
                                >
                                    {showPw ? <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600" /> : <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600" />}
                                </button>
                            </div>
                            <p id="dbPass-help" className="text-[11px] text-slate-500 mt-2">
                                We will automatically replace elements like <code>{"<password>"}</code> or <code>{"<db_password>"}</code> in your connection URI.
                            </p>
                        </div>
                    </div>

                    {/* Test Results Display */}
                    {testResult?.error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg flex gap-3 mt-4">
                            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-rose-900 uppercase tracking-wider">Test Failed</p>
                                <p className="text-xs text-rose-700 font-mono break-all">{testResult.error}</p>
                            </div>
                        </div>
                    )}

                    {/* Migration Progress Bar */}
                    <MigrationProgressBar 
                        status={migrationStatus.status}
                        currentModel={migrationStatus.currentModel}
                        progress={migrationStatus.progress}
                        error={migrationStatus.error}
                        completedModels={migrationStatus.completedModels}
                        totalModels={migrationStatus.totalModels}
                    />
                </div>
                
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center rounded-b-[20px] gap-4">
                    <button 
                        type="button"
                        onClick={testConnection}
                        disabled={testing || migrating || !dbHost}
                        className="px-5 py-2.5 text-[13px] bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                        {testing ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        {testing ? 'Verifying Path...' : 'Test Connection'}
                    </button>

                    {testResult?.status === 'success' && !migrating ? (
                        <button 
                            type="button"
                            onClick={startMigration}
                            disabled={migrating}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            <Database className="w-4 h-4 text-white" />
                            Save & Migrate Data
                        </button>
                    ) : (
                        <button 
                            type="button"
                            onClick={saveDatabaseSettings}
                            disabled={saving || migrating}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            {saving ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-white" />}
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Data Management Card */}
            <div className="bg-white rounded-[20px] border border-rose-200 shadow-sm overflow-hidden transition-all">
                <div className="p-8 border-b border-rose-100 bg-rose-50 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 text-rose-600 border border-rose-200">
                        <Trash2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-rose-900">Bulk Data Management</h2>
                        <p className="text-sm text-rose-700 mt-1">Irreversible system cleanup actions</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-5 flex gap-4">
                        <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-rose-900 mb-1">Critical Warning</h3>
                            <p className="text-sm text-rose-700/80 leading-relaxed">
                                Clearing data will permanently delete all transactional records (Attendance, Tasks, Projects, Expenses, etc.) 
                                within the selected range. Admin accounts and system configurations will NOT be deleted.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-6">
                            <label htmlFor="clearAll" className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        id="clearAll"
                                        type="radio"
                                        name="clearRange"
                                        checked={clearAll}
                                        onChange={() => setClearAll(true)}
                                        className="sr-only"
                                    />
                                    <div className={clsx(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                        clearAll ? "border-rose-600 bg-rose-600" : "border-slate-300 bg-white group-hover:border-slate-400"
                                    )}>
                                        {clearAll && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in-50" />}
                                    </div>
                                </div>
                                <span className={clsx("text-[14px]", clearAll ? "font-bold text-rose-900" : "text-slate-600")}>
                                    Delete All Records
                                </span>
                            </label>

                            <label htmlFor="clearCustom" className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        id="clearCustom"
                                        type="radio"
                                        name="clearRange"
                                        title="Clear custom date range"
                                        checked={!clearAll}
                                        onChange={() => setClearAll(false)}
                                        className="sr-only"
                                    />
                                    <div className={clsx(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                        !clearAll ? "border-rose-600 bg-rose-600" : "border-slate-300 bg-white group-hover:border-slate-400"
                                    )}>
                                        {!clearAll && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in-50" />}
                                    </div>
                                </div>
                                <span className={clsx("text-[14px]", !clearAll ? "font-bold text-rose-900" : "text-slate-600")}>
                                    Custom Date Range
                                </span>
                            </label>
                        </div>

                        {!clearAll && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                                <div>
                                    <label htmlFor="clearStartDate" className="block text-[14px] text-slate-800 mb-2">Start Date</label>
                                    <input
                                        id="clearStartDate"
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="clearEndDate" className="block text-[14px] text-slate-800 mb-2">End Date</label>
                                    <input
                                        id="clearEndDate"
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all font-mono"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 border-t border-rose-100 bg-rose-50/50 flex justify-end">
                    <button
                        type="button"
                        onClick={() => setShowClearModal(true)}
                        className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Trash2 className="w-4 h-4 text-white" />
                        Clear System Data
                    </button>
                </div>
            </div>

            {/* Modal */}
            {showClearModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-8 space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto border border-rose-100">
                                <ShieldAlert className="w-8 h-8 text-rose-600" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold text-slate-900">Confirm Deletion</h3>
                                <p className="text-sm text-slate-500">
                                    You are about to delete {clearAll ? 'all system data' : `data between ${startDate} and ${endDate}`}. 
                                    This action is permanent and requires authorization.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[14px] text-slate-800 mb-2">Admin Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPw ? 'text' : 'password'}
                                            value={adminPass}
                                            onChange={e => setAdminPass(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all font-mono"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPw(!showPw)}
                                            className="absolute flex items-center h-full right-0 top-0 px-3 cursor-pointer bg-transparent border-none"
                                            title={showPw ? "Hide password" : "Show password"}
                                        >
                                            {showPw ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setShowClearModal(false); setAdminPass(''); }}
                                        disabled={isClearing}
                                        className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClearData}
                                        disabled={isClearing || !adminPass}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-rose-700 transition-all disabled:opacity-50"
                                    >
                                        {isClearing ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Proceed
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Migration Confirmation Modal */}
            <ConfirmModal 
                isOpen={showMigrationConfirm}
                title="Critical: Database Migration"
                message="This will migrate ALL existing data to the new database. During this time, the system will be in read-only mode for some operations. Current data in the TARGET database (if any) will be EXTERMINATED. Do you want to proceed?"
                confirmText="Yes, Start Migration"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleConfirmMigration}
                onCancel={() => setShowMigrationConfirm(false)}
            />

            {/* Setup Guide Modal */}
            <MongoSetupGuide 
                show={showGuide} 
                onClose={() => setShowGuide(false)} 
                platformName={platform?.name || platform?.platformName}
            />
            </>
            )}
        </div>
    );
}
