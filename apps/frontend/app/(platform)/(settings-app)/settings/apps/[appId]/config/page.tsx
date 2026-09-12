'use client';


import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, LayoutGrid, Settings, Info, CheckCircle2, 
    XCircle, Sparkles, Key, Globe, Database
} from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import { APPS_CONFIG } from '@/lib/module-map';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

// App-specific details (what it does, use cases)
const APP_DETAILS: Record<string, { overview: string; useCases: string[] }> = {
    crm: {
        overview: 'CRM & Sales centralizes your entire customer lifecycle — from lead capture and pipeline management to contract signing and revenue tracking. It provides a unified view of every prospect and client across all stages.',
        useCases: ['Track inbound leads from web forms and emails', 'Manage a visual sales pipeline with deal stages', 'Generate quotes and send contracts within the platform', 'Forecast monthly and quarterly revenue']
    },
    projects: {
        overview: 'Projects & Tasks gives your operations team full visibility into ongoing work. Assign tasks, track time, set milestones, and ensure every project stays on schedule.',
        useCases: ['Manage multiple projects with Kanban or list views', 'Assign tasks to team members with due dates', 'Track time spent per project for billing purposes', 'View milestone progress on executive dashboards']
    },
    hr: {
        overview: 'Human Resources manages the complete employee lifecycle — hiring, onboarding, attendance, leave, payroll, and performance reviews in a single connected system.',
        useCases: ['Maintain a digital employee directory with org charts', 'Track daily attendance and generate timesheets', 'Automate monthly payroll calculations', 'Run performance review cycles with 360-degree feedback']
    },
    finance: {
        overview: 'Finance & Analytics consolidates your financial operations and business intelligence — issue invoices, track expenses, manage vendor bills, process salaries, monitor real-time cash flow, and visualize platform-wide analytics & reports in one place.',
        useCases: ['Issue and track invoices to clients', 'Record and categorize company expenses', 'Process monthly salaries linked from HR data', 'Generate comprehensive financial & operational reports', 'Analyze real-time business performance & website traffic']
    },
    assets: {
        overview: 'Assets tracks your company\'s digital and infrastructure assets. Keep a real-time ledger of domains, servers, and other digital property.',
        useCases: ['Track company laptops, phones, and equipment', 'Record asset depreciation and maintenance schedules']
    },
    insights: {
        overview: 'Insights & Analytics provides executives and managers with data-driven visibility across every department. Generate pre-built and custom reports on any metric.',
        useCases: ['View unified dashboards across CRM, HR, and Finance', 'Generate and export monthly business reports', 'Set KPI targets and track performance over time']
    },
    tools: {
        overview: 'Workspace Tools brings productivity and communication directly into 180workspace. Chat, schedule meetings, manage documents, and delegate tasks without switching apps.',
        useCases: ['Real-time internal chat between team members', 'Schedule and host video meetings in-browser', 'Store and collaborate on company documents', 'Use the AI Assistant for contextual Q&A across data']
    },
    advertising: {
        overview: 'Advertising lets you create dynamic landing pages, track ad performance with pixel integrations, and monitor campaign statistics — all from within the 180workspace.',
        useCases: ['Build and publish landing pages for ad campaigns', 'Configure Facebook, Google, and custom pixel tracking', 'Monitor campaign performance and conversion rates']
    },
    jobhunter: {
        overview: 'Job Hunter AI automates your job search with AI-powered matching, application tracking, and candidate profile management.',
        useCases: ['Discover relevant job postings matched to your profile', 'Track application status across multiple platforms', 'Build and optimize your candidate profile with AI insights']
    },
    integrations: {
        overview: 'Custom Integrations lets you connect external tools and services to your 180workspace. Set up webhook endpoints to push data out, generate API keys for external access, or connect popular tools like Slack and GitHub.',
        useCases: ['Register webhook URLs to receive real-time event notifications', 'Generate scoped API keys for external systems to access your 180workspace data', 'Connect third-party tools like Slack, GitHub, or Zapier', 'Monitor and manage all active integrations in one place']
    }
};

export default function AppConfigPage() {
    const params = useParams();
    const appId = params?.appId;
    const router = useRouter();
    const { company, settings, refreshSettings } = useSettings();
    
    const [activeTab, setActiveTab] = useState<'modules' | 'configs' | 'details'>('modules');
    
    const app = APPS_CONFIG.find(a => a.id === (appId as string));
    const appDetails = APP_DETAILS[appId as string];

    const [enabledModules, setEnabledModules] = useState<string[]>([]);
    const [enabledApps, setEnabledApps] = useState<string[]>([]);
    const [isInstalling, setIsInstalling] = useState(false);

    useEffect(() => {
        if (company) {
            setEnabledModules(company.enabledModules || []);
            setEnabledApps(company.enabledApps || []);
        }
    }, [company]);

    const isAppEnabled = enabledApps.includes(appId as string);

    if (!app) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900">App Not Found</h1>
                <button onClick={() => router.back()} className="mt-4 text-indigo-600 font-bold">Go Back</button>
            </div>
        );
    }

    const handleToggleModule = async (moduleId: string) => {
        const newModules = enabledModules.includes(moduleId)
            ? enabledModules.filter(id => id !== moduleId)
            : [...enabledModules, moduleId];
        
        setEnabledModules(newModules);
        try {
            await api.patch('/api/company-config/modules', { modules: newModules });
            toast.success('Module updated');
            refreshSettings(true);
        } catch (error) {
            toast.error('Failed to update module');
        }
    };

    const hasGlobalAI = !!(settings?.aiProvider || (settings as any)?.openaiKey);
    const hasGlobalFinance = !!((settings as any)?.bankName || (settings as any)?.payoutAccount);
    const enabledCount = app.modules.filter(m => enabledModules.includes(m.id)).length;

    const handleToggleApp = async () => {
        const isEnabling = !isAppEnabled;
        setIsInstalling(true);
        
        if (isEnabling) {
            await new Promise(res => setTimeout(res, 1200));
        }

        const moduleIds = app.modules.map(m => m.id);
        const newApps = isEnabling ? [...enabledApps, app.id] : enabledApps.filter(id => id !== app.id);
        let newModules = [...enabledModules];
        if (isEnabling) {
            newModules = Array.from(new Set([...newModules, ...moduleIds]));
        } else {
            newModules = newModules.filter(id => !moduleIds.includes(id));
        }

        setEnabledApps(newApps);
        setEnabledModules(newModules);

        try {
            await Promise.all([
                api.patch('/api/company-config/apps', { apps: newApps }),
                api.patch('/api/company-config/modules', { modules: newModules })
            ]);
            toast.success(isEnabling ? `${app.name} installed successfully` : `${app.name} uninstalled`);
            refreshSettings(true);
        } catch (error: any) {
            toast.error('Failed to update app status');
            if (company) {
                setEnabledApps(company.enabledApps || []);
                setEnabledModules(company.enabledModules || []);
            }
        } finally {
            setIsInstalling(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/settings/apps')}
                        className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-gray-100"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={clsx(
                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                            isAppEnabled ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-gray-100 text-gray-500"
                        )}>
                            <app.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">App Config</span>
                                <h1 className="text-2xl font-black text-gray-900">{app.name}</h1>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                                <p className="text-sm text-gray-500 font-medium">{enabledCount} of {app.modules.length} modules enabled</p>
                                <div className="flex items-center gap-1.5">
                                    <div className={clsx(
                                        "w-1.5 h-1.5 rounded-full",
                                        isAppEnabled ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                                    )} />
                                    <span className={clsx(
                                        "text-[10px] font-bold uppercase tracking-wider",
                                        isAppEnabled ? "text-emerald-600" : "text-gray-400"
                                    )}>
                                        {isAppEnabled ? 'Installed' : 'Not Installed'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Install / Uninstall Button */}
                <button
                    onClick={handleToggleApp}
                    disabled={isInstalling}
                    className={clsx(
                        "px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
                        isInstalling && "opacity-70 cursor-wait",
                        isAppEnabled
                            ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                            : "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                    )}
                >
                    {isInstalling ? (
                        <>
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                <Settings className="w-4 h-4" />
                            </motion.div>
                            {isAppEnabled ? 'Uninstalling...' : 'Installing...'}
                        </>
                    ) : isAppEnabled ? (
                        'Uninstall App'
                    ) : (
                        'Install App'
                    )}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex p-1.5 bg-gray-100/70 rounded-2xl w-fit">
                {[
                    { id: 'modules', label: 'Modules', icon: LayoutGrid },
                    { id: 'configs', label: 'Configs', icon: Settings },
                    { id: 'details', label: 'Details', icon: Info },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                            activeTab === tab.id 
                                ? "bg-white text-indigo-600 shadow-sm" 
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 min-h-[400px]">
                <AnimatePresence mode="wait">

                    {/* ─── Modules Tab ─── */}
                    {activeTab === 'modules' && (
                        <motion.div 
                            key="modules"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            {app.modules.map((mod) => {
                                const active = enabledModules.includes(mod.id);
                                return (
                                    <div 
                                        key={mod.id}
                                        className={clsx(
                                            "flex items-center justify-between p-5 rounded-3xl border transition-all duration-300",
                                            active ? "bg-indigo-50/40 border-indigo-100 shadow-sm" : "bg-gray-50 border-gray-100"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                                                active ? "bg-white text-indigo-600 shadow-sm" : "bg-gray-200 text-gray-400"
                                            )}>
                                                {active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">{mod.name}</h4>
                                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">ID: {mod.id}</p>
                                            </div>
                                        </div>
                                        {isAppEnabled && (
                                            <button 
                                                onClick={() => handleToggleModule(mod.id)}
                                                className={clsx(
                                                    "relative w-12 h-6 rounded-full transition-all duration-300",
                                                    active ? "bg-indigo-600" : "bg-gray-300"
                                                )}
                                            >
                                                <div className={clsx(
                                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                                    active ? "left-7" : "left-1"
                                                )} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}

                    {/* ─── Configs Tab ─── */}
                    {activeTab === 'configs' && (
                        <motion.div 
                            key="configs"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="p-5 bg-amber-50 border border-amber-100 rounded-3xl flex gap-3">
                                <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-amber-900 text-sm">Smart Configuration</h4>
                                    <p className="text-xs text-amber-700/80 font-medium">This app automatically picks up globally configured credentials. No duplicate setup needed.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* AI Service row */}
                                <div className="p-5 rounded-2xl border border-gray-100 flex items-center justify-between hover:border-indigo-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                            <Key className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">AI Service</h4>
                                            <p className="text-xs text-gray-500">OpenAI, Gemini, Claude API keys</p>
                                        </div>
                                    </div>
                                    {hasGlobalAI ? (
                                        <div className="text-right">
                                            <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Configured
                                            </span>
                                            <p className="text-[10px] text-gray-400 mt-1 italic">Using Global Configuration</p>
                                        </div>
                                    ) : (
                                        <Link href='/settings/system-configs' className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                                            Setup Globally
                                        </Link>
                                    )}
                                </div>

                                {/* Domain / Visibility */}
                                <div className="p-5 rounded-2xl border border-gray-100 flex items-center justify-between hover:border-indigo-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                            <Globe className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">Domain & Public Access</h4>
                                            <p className="text-xs text-gray-500">Visibility and custom URL settings</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-lg">System Default</span>
                                </div>

                                {/* Finance (only for relevant apps) */}
                                {(app.id === 'finance' || app.id === 'crm' || app.id === 'hr') && (
                                    <div className="p-5 rounded-2xl border border-gray-100 flex items-center justify-between hover:border-indigo-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                                <Database className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">Finance & Payments</h4>
                                                <p className="text-xs text-gray-500">Bank accounts and payout rules</p>
                                            </div>
                                        </div>
                                        {hasGlobalFinance ? (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Configured
                                            </span>
                                        ) : (
                                            <Link href='/settings?tab=finance' className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all">
                                                Configure Finance
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 text-center">
                                <Link href='/settings/system-configs' className="text-sm font-bold text-indigo-600 hover:underline underline-offset-2">
                                    View all System Configs →
                                </Link>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── Details Tab ─── */}
                    {activeTab === 'details' && (
                        <motion.div 
                            key="details"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            {/* Overview */}
                            <div>
                                <h2 className="text-lg font-black text-gray-900">About {app.name}</h2>
                                <p className="text-gray-500 mt-2 leading-relaxed font-medium">
                                    {appDetails?.overview || `${app.name} is a core module of the 180workspace architecture: ${app.description}`}
                                </p>
                            </div>

                            {/* Use Cases */}
                            {appDetails?.useCases && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-4">Common Use Cases</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {appDetails.useCases.map((uc, i) => (
                                            <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-gray-700 font-medium">{uc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Module List */}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Modules in this App ({app.modules.length})</p>
                                <div className="flex flex-wrap gap-2">
                                    {app.modules.map(mod => (
                                        <span key={mod.id} className={clsx(
                                            "px-3 py-1.5 rounded-xl text-xs font-bold border",
                                            enabledModules.includes(mod.id) 
                                                ? "bg-indigo-50 text-indigo-700 border-indigo-100" 
                                                : "bg-gray-50 text-gray-500 border-gray-100"
                                        )}>
                                            {mod.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Hero Banner */}
                            <div className="p-6 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl text-white shadow-xl shadow-indigo-100 overflow-hidden relative">
                                <h4 className="font-bold mb-1 relative z-10">When enabled, modules appear in your sidebar</h4>
                                <p className="text-sm text-white/80 relative z-10">All users with the correct role will see the navigation items for this app automatically.</p>
                                <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10">
                                    <app.icon className="w-32 h-32" />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
