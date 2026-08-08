'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useSettings } from '@/lib/settings-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, ArrowRight, CheckCircle2, Sparkles, LayoutDashboard, TrendingUp, Briefcase, Globe, Info, Target, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { ALL_APPS } from '@/lib/module-map';

// Detailed mapping of sub-modules (screens) for each app
const APP_MODULES: Record<string, { id: string; name: string; desc: string }[]> = {
    crm: [
        { id: 'crm-leads', name: 'Leads & Prospects', desc: 'Track potential customers and sales pipeline.' },
        { id: 'crm-accounts', name: 'Company Accounts', desc: 'Manage B2B relationships and hierarchies.' },
        { id: 'crm-contacts', name: 'Contact Directory', desc: 'Centralized database for all business contacts.' },
        { id: 'crm-deals', name: 'Deal Management', desc: 'Close opportunities and track revenue state.' },
        { id: 'crm-automation', name: 'Sales Automation', desc: 'Automate follow-ups and repetitive tasks.' },
        { id: 'crm-ai', name: 'AI Insights', desc: 'Predictive analytics and lead scoring.' },
    ],
    projects: [
        { id: 'proj-active', name: 'Active Projects', desc: 'High-level project tracking and timelines.' },
        { id: 'proj-tasks', name: 'Task Boards', desc: 'Kanban and list views for team tasks.' },
        { id: 'proj-time', name: 'Time Sheets', desc: 'Track billable hours and team productivity.' },
        { id: 'proj-goals', name: 'Milestones', desc: 'Set and monitor high-level project goals.' },
    ],
    hr: [
        { id: 'hr-directory', name: 'Team Directory', desc: 'Access employee profiles and files.' },
        { id: 'hr-attendance', name: 'Attendance & Time', desc: 'Monitor check-ins, shifts, and hours.' },
        { id: 'hr-payroll', name: 'Payroll & Salary', desc: 'Automate salary processing and invoices.' },
        { id: 'hr-recruitment', name: 'Recruitment', desc: 'Manage job postings and candidate funnel.' },
        { id: 'hr-performance', name: 'Reviews & Feedback', desc: 'Track team performance and growth.' },
        { id: 'hr-leaves', name: 'Leaves Management', desc: 'Track employee time off and vacations.' },
        { id: 'hr-holidays', name: 'Holidays', desc: 'Manage company-wide public holidays.' },
    ],
    finance: [
        { id: 'fin-invoices', name: 'Invoicing', desc: 'Create and send professional invoices.' },
        { id: 'fin-expenses', name: 'Expense Tracking', desc: 'Monitor company spending and reimbursements.' },
        { id: 'fin-reports', name: 'Financial Reports', desc: 'P&L statements and balance sheets.' },
    ],
};

const COMPANY_TYPES = [
    { id: 'agency', label: 'Creative Agency', icon: Sparkles, desc: 'Design, Marketing, Web3' },
    { id: 'saas', label: 'Tech & SaaS', icon: LayoutDashboard, desc: 'Software, AI, App Development' },
    { id: 'ecommerce', label: 'E-Commerce', icon: TrendingUp, desc: 'Retail, D2C, Marketplaces' },
    { id: 'consulting', label: 'Consulting', icon: Briefcase, desc: 'Finance, Legal, Advisory' },
    { id: 'general', label: 'General Business', icon: Building2, desc: 'Other Industries' },
];

const STARTUP_STAGES = [
    { id: 'Idea', label: 'Idea Stage' },
    { id: 'MVP', label: 'MVP / Prototype' },
    { id: 'Beta', label: 'Beta / Launching' },
    { id: 'Revenue', label: 'Early Revenue' },
    { id: 'Scaling', label: 'Scaling / Growth' },
];

const TEAM_SIZES = [
    { id: '1', label: 'Just me' },
    { id: '2-10', label: '2 - 10' },
    { id: '11-50', label: '11 - 50' },
    { id: '51-200', label: '51 - 200' },
    { id: '200+', label: '200+' },
];

// Helper to determine recommended apps based on company type
function getRecommendedApps(type: string) {
    const core = ['system', 'collaboration', 'documents']; // Always needed
    switch (type) {
        case 'agency': return [...core, 'projects', 'crm', 'finance'];
        case 'saas': return [...core, 'projects', 'analytics', 'hr'];
        case 'ecommerce': return [...core, 'crm', 'finance', 'analytics'];
        case 'consulting': return [...core, 'projects', 'finance', 'crm'];
        default: return [...core, 'projects', 'hr', 'finance'];
    }
}

function getRecommendedModules(apps: string[], type: string) {
    const modules: string[] = [];
    apps.forEach(appId => {
        const sub = APP_MODULES[appId];
        if (sub) {
            if (type === 'agency' && appId === 'projects') {
                modules.push('proj-active', 'proj-tasks', 'proj-time');
            } else if (type === 'saas' && appId === 'projects') {
                modules.push('proj-active', 'proj-tasks');
            } else {
                modules.push(...sub.map(m => m.id));
            }
        }
    });
    return modules;
}

import { Suspense } from 'react';

export default function WorkspaceSetupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
            <WorkspaceSetup />
        </Suspense>
    );
}

function WorkspaceSetup() {
    const router = useRouter();
    const { data: session, status, update: updateSession } = useSession();
    
    const isSessionLoading = status === 'loading';

    const { platform } = useSettings();

    const [step, setStep] = useState(1);
    
    // Step 1: Text inputs
    const [companyName, setCompanyName] = useState('');
    const [website, setWebsite] = useState('');
    const [oneLineDescription, setOneLineDescription] = useState('');
    
    const [slug, setSlug] = useState('');
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [isCheckingSlug, setIsCheckingSlug] = useState(false);

    useEffect(() => {
        if (!companyName.trim()) {
            setSlug('');
            setSlugAvailable(null);
            return;
        }
        
        const generatedSlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        setSlug(generatedSlug);
        
        if (!generatedSlug) {
            setSlugAvailable(null);
            return;
        }

        setIsCheckingSlug(true);
        setSlugAvailable(null);

        const timeoutId = setTimeout(async () => {
            try {
                const res = await fetch(`/api/check-company?slug=${generatedSlug}`);
                const data = await res.json();
                setSlugAvailable(data.available);
            } catch (err) {
                setSlugAvailable(null);
            } finally {
                setIsCheckingSlug(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [companyName]);

    // Step 2: Industry & Stage
    const [industry, setIndustry] = useState('saas');
    const [startupStage, setStartupStage] = useState('Idea');
    
    // Step 3: Team
    const [teamSize, setTeamSize] = useState('2-10');
    
    // Step 4: Apps
    const [enabledApps, setEnabledApps] = useState<string[]>([]);
    const [enabledModules, setEnabledModules] = useState<string[]>([]);
    
    const [saving, setSaving] = useState(false);

    // Initial load recommendations
    const recommendedApps = getRecommendedApps(industry);

    const handleNext = () => {
        if (step === 1) {
            if (!companyName.trim()) {
                toast.error("Company name is required.");
                return;
            }
            if (slugAvailable === false) {
                toast.error("Company URL is already taken. Please try another name.");
                return;
            }
        }
        if (step === 3) {
            // Advancing to app selection, preset recommended apps & modules
            const apps = getRecommendedApps(industry);
            setEnabledApps(apps);
            setEnabledModules(getRecommendedModules(apps, industry));
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const toggleApp = (appId: string, isCore: boolean) => {
        if (isCore) return;
        setEnabledApps(prev => {
            const isNowEnabled = !prev.includes(appId);
            const newApps = isNowEnabled ? [...prev, appId] : prev.filter(id => id !== appId);

            if (isNowEnabled) {
                const recommended = getRecommendedModules([appId], industry);
                setEnabledModules(m => [...new Set([...m, ...recommended])]);
            } else {
                const subIds = APP_MODULES[appId]?.map(m => m.id) || [];
                setEnabledModules(m => m.filter(id => !subIds.includes(id)));
            }
            return newApps;
        });
    };

    const completeSetup = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/auth/complete-workspace-setup', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyName,
                    slug,
                    website,
                    oneLineDescription,
                    industry,
                    startupStage,
                    teamSize,
                    enabledApps,
                    enabledModules
                })
            });

            const data = await res.json();
            if (res.ok) {
                if (data.platformToken) {
                    localStorage.setItem('platform_auth_token', data.platformToken);
                }
                await updateSession({
                    companyId: data.companyId || (session?.user as any)?.companyId,
                    role: data.role || (session?.user as any)?.role,
                    isOnboardingComplete: true,
                    companySlug: data.companySlug,
                    companyCustomDomain: data.companyCustomDomain,
                });
                setStep(5); // Success screen is now step 5
            } else if (res.status === 401) {
                toast.error(data.error || 'Session invalid. Logging out...');
                setTimeout(() => signOut({ callbackUrl: '/login' }), 2000);
            } else {
                toast.error(data.error || 'Failed to complete setup');
            }
        } catch (error: any) {
            toast.error('Network error during workspace setup');
        } finally {
            setSaving(false);
        }
    };

    const navigateToDashboard = async () => {
        window.location.href = '/dashboard';
    };

    if (isSessionLoading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-gray-50/50 to-white pointer-events-none" />

            <div className="max-w-3xl w-full mx-auto relative">
                {step < 5 && (
                    <button
                        onClick={() => {
                            window.location.href = '/dashboard';
                        }}
                        className="absolute top-0 left-0 flex items-center text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium z-10"
                    >
                        <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
                        Go to <span className="font-bold tracking-tight text-gray-900 inline-block mx-1">{platform?.platformName || <><span className="text-blue-600">180</span>workspace</>}</span> App
                    </button>
                )}
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-6 p-2 border border-gray-100">
                        <img src="/black icon.svg" alt="Icon" className="w-12 h-12" />
                    </div>
                    <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
                        Setup Your Workspace
                    </h2>
                    <p className="mt-3 text-lg text-gray-500 max-w-xl mx-auto">
                        Tell us about your startup to personalize your experience.
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative min-h-[550px]">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-8 sm:p-12 h-full flex flex-col"
                            >
                                <h3 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h3>
                                
                                <div className="space-y-6 mb-8 max-h-[350px] overflow-y-auto pr-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Startup Name *</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                placeholder="Acme Corp"
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="mt-2 text-sm flex items-center">
                                            <span className="text-gray-500">Your workspace URL: </span>
                                            <span className="font-medium text-gray-900 ml-1">
                                                {slug || 'acme'}.{(platform as any)?.domain || process.env.NEXT_PUBLIC_ROOT_DOMAIN || (typeof window !== 'undefined' ? window.location.host.replace(/^(app|admin)\./, '') : '')}
                                            </span>
                                            {slug && (
                                                <div className="ml-2 flex items-center">
                                                    {isCheckingSlug ? (
                                                        <span className="text-gray-400 text-xs">Checking...</span>
                                                    ) : slugAvailable ? (
                                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <span className="text-red-500 text-xs font-medium">Not available</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Website (Optional)</label>
                                        <div className="relative">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="url"
                                                value={website}
                                                onChange={(e) => setWebsite(e.target.value)}
                                                placeholder="https://acme.com"
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">One-line Description</label>
                                        <div className="relative">
                                            <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                            <textarea
                                                value={oneLineDescription}
                                                onChange={(e) => setOneLineDescription(e.target.value)}
                                                placeholder="We are building the next generation of..."
                                                rows={3}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto flex justify-end">
                                    <button onClick={handleNext} className="btn-primary space-x-2">
                                        <span>Next Step</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-8 sm:p-12 h-full flex flex-col"
                            >
                                <button onClick={handleBack} className="text-sm font-medium text-gray-400 hover:text-gray-600 mb-6 w-max">&larr; Back</button>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 max-h-[350px] overflow-y-auto pr-2">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Select Industry</h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {COMPANY_TYPES.map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setIndustry(type.id)}
                                                    className={clsx(
                                                        "p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3",
                                                        industry === type.id
                                                            ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                                                            : "border-gray-100 hover:border-indigo-200 hover:bg-gray-50"
                                                    )}
                                                >
                                                    <div className={clsx("p-2 rounded-lg", industry === type.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500")}>
                                                        <type.icon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className={clsx("font-bold text-sm", industry === type.id ? "text-indigo-900" : "text-gray-700")}>{type.label}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Startup Stage</h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {STARTUP_STAGES.map(stage => (
                                                <button
                                                    key={stage.id}
                                                    onClick={() => setStartupStage(stage.id)}
                                                    className={clsx(
                                                        "p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3",
                                                        startupStage === stage.id
                                                            ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                                                            : "border-gray-100 hover:border-indigo-200 hover:bg-gray-50"
                                                    )}
                                                >
                                                    <div className={clsx("p-2 rounded-lg", startupStage === stage.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500")}>
                                                        <Target className="w-4 h-4" />
                                                    </div>
                                                    <span className={clsx("font-bold text-sm", startupStage === stage.id ? "text-indigo-900" : "text-gray-700")}>{stage.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto flex justify-end">
                                    <button onClick={handleNext} className="btn-primary space-x-2">
                                        <span>Next Step</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-8 sm:p-12 h-full flex flex-col"
                            >
                                <button onClick={handleBack} className="text-sm font-medium text-gray-400 hover:text-gray-600 mb-6 w-max">&larr; Back</button>
                                <h3 className="text-xl font-bold text-gray-900 mb-6">What&apos;s your team size?</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                                    {TEAM_SIZES.map(size => (
                                        <button
                                            key={size.id}
                                            onClick={() => setTeamSize(size.id)}
                                            className={clsx(
                                                "py-4 px-6 rounded-2xl border-2 text-center transition-all duration-200 font-bold",
                                                teamSize === size.id
                                                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-md ring-4 ring-indigo-500/10"
                                                    : "border-gray-100 text-gray-600 hover:border-indigo-200 hover:bg-gray-50"
                                            )}
                                        >
                                            <Users className={clsx("w-6 h-6 mx-auto mb-2", teamSize === size.id ? "text-indigo-600" : "text-gray-400")} />
                                            {size.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-auto flex justify-end">
                                    <button onClick={handleNext} className="btn-primary space-x-2">
                                        <span>Next Step</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-8 sm:p-12 h-full flex flex-col"
                            >
                                <button onClick={handleBack} disabled={saving} className="text-sm font-medium text-gray-400 hover:text-gray-600 mb-6 w-max">&larr; Back</button>

                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Select Your Apps</h3>
                                    <p className="text-sm text-gray-500">Enable the apps your team needs. You can change this later in settings.</p>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 max-h-[300px] overflow-y-auto pr-2 pb-4">
                                    {ALL_APPS.map(app => {
                                        const isEnabled = enabledApps.includes(app.id);
                                        const isCore = app.core;
                                        const isRecommended = recommendedApps.includes(app.id);
                                        const Icon = app.icon;

                                        return (
                                            <button
                                                key={app.id}
                                                onClick={() => toggleApp(app.id, isCore || false)}
                                                disabled={isCore}
                                                className={clsx(
                                                    "relative p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all duration-200 group text-center",
                                                    isEnabled 
                                                        ? "border-indigo-600 bg-indigo-50/50 shadow-md ring-4 ring-indigo-500/10" 
                                                        : "border-gray-100 bg-white hover:border-indigo-200 hover:bg-gray-50"
                                                )}
                                            >
                                                {isEnabled && (
                                                    <div className="absolute top-3 right-3 text-indigo-600">
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </div>
                                                )}
                                                
                                                {isCore && (
                                                    <span className="absolute top-2 left-2 text-[8px] font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase tracking-wider">Required</span>
                                                )}
                                                
                                                {isRecommended && !isCore && !isEnabled && (
                                                    <span className="absolute top-2 left-2 text-[8px] font-black px-1.5 py-0.5 rounded bg-green-100 text-green-700 uppercase tracking-wider">Suggested</span>
                                                )}

                                                <div className={clsx(
                                                    "p-3 rounded-xl transition-colors duration-200",
                                                    isEnabled ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                                                )}>
                                                    <Icon className="w-8 h-8" />
                                                </div>
                                                
                                                <div>
                                                    <span className={clsx("block font-bold text-sm", isEnabled ? "text-indigo-900" : "text-gray-700")}>
                                                        {app.name}
                                                    </span>
                                                    <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{app.description}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-auto flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 -mx-8 sm:-mx-12 -mb-8 sm:-mb-12 p-6 sm:p-8 border-t border-gray-100">
                                    <div className="flex flex-col text-center sm:text-left w-full sm:w-auto">
                                        <p className="text-xs font-bold text-gray-900">{enabledApps.length} Apps Selected</p>
                                        <p className="text-[10px] text-gray-500">Essential features automatically enabled</p>
                                    </div>
                                    <button onClick={completeSetup} disabled={saving} className="btn-primary shadow-lg shadow-indigo-500/20 px-8 py-3 h-auto text-base w-full sm:w-auto flex justify-center items-center">
                                        {saving ? <LogoLoader className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                                        <span>{saving ? "Saving..." : "Start Using Workspace"}</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}


                        {step === 5 && (
                            <motion.div
                                key="step5"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-8 sm:p-16 h-full flex flex-col items-center justify-center text-center min-h-[500px]"
                            >
                                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8 relative">
                                    <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20" />
                                    <CheckCircle2 className="w-12 h-12 text-green-600 relative z-10" />
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-4">You&apos;re all set!</h3>
                                <p className="text-lg text-gray-500 max-w-md mx-auto mb-10 leading-relaxed">
                                    Your {platform?.platformName || 'system'} workspace has been configured and optimized for your team. You can invite members and adjust settings anytime from the dashboard.
                                </p>
                                <button onClick={navigateToDashboard} className="btn-primary px-10 py-4 h-auto text-lg shadow-xl shadow-indigo-500/30 hover:scale-105 transition-transform duration-300">
                                    Go to Dashboard
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {step < 5 && (
                    <div className="mt-8 flex justify-center items-center gap-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={clsx("h-1.5 rounded-full transition-all duration-300", step >= i ? "w-8 bg-indigo-600" : "w-4 bg-gray-200")} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
