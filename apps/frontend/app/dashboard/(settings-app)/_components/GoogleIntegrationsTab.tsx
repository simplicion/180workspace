'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { useSettings } from '@/lib/settings-context';
import { Globe, ShieldCheck, HardDrive, FileText, Database, ChevronRight, Calendar, Users } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
    { id: 'drive', label: 'Google Drive', icon: HardDrive, desc: 'Sync files & folders' },
    { id: 'docs', label: 'Google Docs', icon: FileText, desc: 'Sync with Knowledge Base' },
    { id: 'sheets', label: 'Google Sheets', icon: Database, desc: 'Sync analytics & CRM' },
    { id: 'calendar', label: 'Google Calendar', icon: Calendar, desc: 'Sync your schedule and meetings' },
    { id: 'contacts', label: 'Google Contacts', icon: Users, desc: 'Sync customer and team contacts' },
];

export default function GoogleIntegrationsTab() {
    const { settings: globalSettings, refreshSettings: refreshGlobalSettings } = useSettings();
    const [activeGoogleTab, setActiveGoogleTab] = useState<'drive' | 'docs' | 'sheets' | 'calendar' | 'contacts'>('drive');
    const [oauthFolders, setOauthFolders] = useState<any[]>([]);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    
    const grantedScopes = globalSettings?.metadata?.googleDriveTokens?.scope || '';
    const isDriveConnected = grantedScopes.includes('drive');
    const isDocsConnected = grantedScopes.includes('documents');
    const isSheetsConnected = grantedScopes.includes('spreadsheets');
    const isCalendarConnected = grantedScopes.includes('calendar');
    const isContactsConnected = grantedScopes.includes('contacts');
    
    const isAnyConnected = isDriveConnected || isDocsConnected || isSheetsConnected || isCalendarConnected || isContactsConnected;

    const fetchOauthFolders = async () => {
        setLoadingFolders(true);
        try {
            const { data } = await api.get('/api/integrations/google/folders');
            if (data.folders) {
                setOauthFolders(data.folders);
            }
        } catch (e) {
            console.error('Failed to fetch folders', e);
        } finally {
            setLoadingFolders(false);
        }
    };

    useEffect(() => {
        if (isDriveConnected) {
            fetchOauthFolders();
        }
    }, [isDriveConnected]);

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        setIsCreatingFolder(true);
        try {
            await api.post('/api/integrations/google/folders', { name: newFolderName.trim() });
            toast.success('Folder created successfully');
            setNewFolderName('');
            await fetchOauthFolders();
        } catch (e) {
            toast.error('Failed to create folder');
        } finally {
            setIsCreatingFolder(false);
        }
    };

    const handleGoogleConnect = async () => {
        try {
            const { data } = await api.get(`/api/integrations/google/auth?service=${activeGoogleTab}`);
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (e) {
            toast.error('Failed to initiate Google connection');
        }
    };

    const handleGoogleDisconnect = async () => {
        try {
            await api.post('/api/integrations/google/disconnect');
            toast.success('Google Services disconnected');
            setOauthFolders([]);
            await refreshGlobalSettings(true);
        } catch (e) {
            toast.error('Failed to disconnect Google Services');
        }
    };

    const handleGoogleOAuthCallback = async (code: string) => {
        try {
            await api.post('/api/integrations/google/callback', { code });
            toast.success('Google Services connected successfully');
            await refreshGlobalSettings(true);
            fetchOauthFolders();
        } catch (e) {
            toast.error('Failed to connect Google Services');
        }
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
            window.history.replaceState({}, document.title, window.location.pathname);
            handleGoogleOAuthCallback(code);
        }
    }, []);

    return (
        <div className="space-y-6">
            <div className="card overflow-hidden bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 border-indigo-100/60 shadow-sm relative">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Globe className="w-48 h-48 text-indigo-900 transform rotate-12" />
                </div>

                <div className="p-8 border-b border-indigo-100/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100/80 rounded-2xl border border-indigo-200/50 shadow-sm">
                            <Globe className="w-6 h-6 text-indigo-700" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-indigo-900">Google Services</h2>
                            <p className="text-sm text-indigo-900/60 font-medium tracking-tight mt-0.5">Connect with Drive, Docs, and Sheets.</p>
                        </div>
                    </div>
                    <div>
                        {isAnyConnected ? (
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-100/80 text-emerald-800 text-[11px] font-black uppercase tracking-widest rounded-full border border-emerald-200/50 shadow-sm">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Connected
                                </span>
                                <button type="button" onClick={handleGoogleDisconnect} className="text-xs text-red-600/80 hover:text-red-600 hover:underline font-bold transition-colors">
                                    Disconnect All
                                </button>
                            </div>
                        ) : (
                            <span className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100/80 text-gray-500 text-[11px] font-black uppercase tracking-widest rounded-full border border-gray-200/50 shadow-sm">
                                Not Connected
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row min-h-[400px]">
                    {/* Sidebar Tabs */}
                    <div className="w-full lg:w-64 border-r border-gray-50 bg-gray-50/30 p-6 space-y-2">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveGoogleTab(tab.id as any)}
                                    className={clsx(
                                        "w-full flex items-center justify-between px-4 py-3 rounded-[24px] text-left transition-all group",
                                        activeGoogleTab === tab.id
                                            ? "bg-white shadow-sm border-2 border-gray-900"
                                            : "hover:bg-gray-100/50 border-2 border-transparent"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "p-2 rounded-xl transition-colors",
                                            activeGoogleTab === tab.id ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-500 group-hover:bg-white"
                                        )}>
                                            <tab.icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className={clsx("text-sm font-bold", activeGoogleTab === tab.id ? "text-gray-900" : "text-gray-600")}>{tab.label}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">{tab.desc}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={clsx("w-4 h-4 text-gray-300 transition-transform", activeGoogleTab === tab.id && "translate-x-1 text-indigo-400")} />
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-8 bg-white relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                {/* Drive Tab */}
                                {activeGoogleTab === 'drive' && (
                                    <motion.div 
                                        key="drive"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-6"
                                    >
                                        {isDriveConnected ? (
                                            <>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 mb-1">Google Drive Integration</h3>
                                                    <p className="text-sm text-gray-500 font-medium">Create folders and manage your connected Drive files.</p>
                                                </div>
                                                
                                                <form onSubmit={handleCreateFolder} className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="text" 
                                                    placeholder="New folder name..." 
                                                    value={newFolderName}
                                                    onChange={e => setNewFolderName(e.target.value)}
                                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium text-gray-900"
                                                />
                                            </div>
                                            <button 
                                                type="submit" 
                                                disabled={isCreatingFolder || !newFolderName.trim()}
                                                className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
                                            >
                                                {isCreatingFolder ? <LogoLoader className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                                                Create Folder
                                            </button>
                                        </form>

                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Available Folders</h4>
                                            {loadingFolders ? (
                                                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                                                    <LogoLoader className="w-6 h-6 animate-spin" />
                                                    <span className="text-sm font-bold tracking-tight">Fetching folders...</span>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {oauthFolders.slice(0, 10).map((f: any) => (
                                                        <div key={f.id} className="p-4 border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm hover:border-gray-200 transition-all rounded-2xl flex items-center gap-4 group cursor-default">
                                                            <div className="p-2.5 bg-white border border-gray-100 rounded-xl group-hover:scale-110 transition-transform">
                                                                <HardDrive className="w-5 h-5 text-indigo-500" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-bold text-gray-900 truncate">{f.name}</p>
                                                                <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{f.id}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                            </>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
                                                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl mb-2">
                                                    <HardDrive className="w-10 h-10 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 mb-1">Connect Google Drive</h3>
                                                    <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto mb-6">Sync files and folders directly from your Google Drive.</p>
                                                </div>
                                                <button onClick={handleGoogleConnect} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-md">
                                                    Connect Drive
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Docs Tab */}
                                {activeGoogleTab === 'docs' && (
                                    <motion.div 
                                        key="docs"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="h-full flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]"
                                    >
                                        {isDocsConnected ? (
                                            <>
                                                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl mb-2">
                                                    <FileText className="w-10 h-10 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 mb-1">Ready to sync documents</h3>
                                                    <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto">Google Docs integration is active. Future updates will allow importing and syncing documents with the Knowledge Base.</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl mb-2 opacity-50">
                                                    <FileText className="w-10 h-10 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 mb-1">Connect Google Docs</h3>
                                                    <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto mb-6">Sync your documents with the Knowledge Base.</p>
                                                </div>
                                                <button onClick={handleGoogleConnect} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-md">
                                                    Connect Docs
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                )}

                                {/* Sheets Tab */}
                                {activeGoogleTab === 'sheets' && (
                                    <motion.div 
                                        key="sheets"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="h-full flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]"
                                    >
                                        {isSheetsConnected ? (
                                            <>
                                                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl mb-2">
                                                    <Database className="w-10 h-10 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 mb-1">Ready to export data</h3>
                                                    <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto">Google Sheets integration is active. You can use this to sync analytical data and CRM contacts directly to Sheets.</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl mb-2 opacity-50">
                                                    <Database className="w-10 h-10 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 mb-1">Connect Google Sheets</h3>
                                                    <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto mb-6">Sync analytical data and CRM contacts directly to Sheets.</p>
                                                </div>
                                                <button onClick={handleGoogleConnect} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black hover:bg-emerald-700 transition-all shadow-md">
                                                    Connect Sheets
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                )}

                                {/* Calendar Tab */}
                                {activeGoogleTab === 'calendar' && (
                                    <motion.div 
                                        key="calendar"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="h-full flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]"
                                    >
                                        {isCalendarConnected ? (
                                            <>
                                                <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl mb-2">
                                                    <Calendar className="w-10 h-10 text-blue-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 mb-1">Schedule & Meetings Sync</h3>
                                                    <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto">Google Calendar integration is active. You can sync events, manage team availability, and schedule meetings.</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl mb-2 opacity-50">
                                                    <Calendar className="w-10 h-10 text-blue-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 mb-1">Connect Google Calendar</h3>
                                                    <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto mb-6">Sync events, manage team availability, and schedule meetings.</p>
                                                </div>
                                                <button onClick={handleGoogleConnect} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-md">
                                                    Connect Calendar
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                )}

                                {/* Contacts Tab */}
                                {activeGoogleTab === 'contacts' && (
                                    <motion.div 
                                        key="contacts"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="h-full flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]"
                                    >
                                        {isContactsConnected ? (
                                            <>
                                                <div className="p-6 bg-orange-50 border border-orange-100 rounded-3xl mb-2">
                                                    <Users className="w-10 h-10 text-orange-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 mb-1">Contacts Integration</h3>
                                                    <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto">Google Contacts integration is active. Future updates will allow importing your contacts directly into the CRM.</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-6 bg-orange-50 border border-orange-100 rounded-3xl mb-2 opacity-50">
                                                    <Users className="w-10 h-10 text-orange-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 mb-1">Connect Google Contacts</h3>
                                                    <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto mb-6">Import your contacts directly into the CRM.</p>
                                                </div>
                                                <button onClick={handleGoogleConnect} className="px-6 py-3 bg-orange-600 text-white rounded-2xl text-sm font-black hover:bg-orange-700 transition-all shadow-md">
                                                    Connect Contacts
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
            </div>
        </div>
    );
}
