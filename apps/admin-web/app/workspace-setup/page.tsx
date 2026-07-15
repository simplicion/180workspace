'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { useSettings } from '../../lib/settings-context';
import api from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, ArrowRight, CheckCircle2, Loader2, Sparkles, LayoutDashboard, FolderKanban, TrendingUp, Briefcase } from 'lucide-react';
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
    { id: 'agency', label: 'Creative Agency', icon: Sparkles, desc: 'Manage clients, projects, and creative assets.' },
    { id: 'saas', label: 'Tech & SaaS', icon: LayoutDashboard, desc: 'Product development, tracking, and subscriptions.' },
    { id: 'ecommerce', label: 'E-Commerce', icon: TrendingUp, desc: 'Assets, sales tracking, and customer support.' },
    { id: 'consulting', label: 'Consulting', icon: Briefcase, desc: 'Advisory, time tracking, and professional services.' },
    { id: 'general', label: 'General Business', icon: Building2, desc: 'Standard operations, team, and finance.' },
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

// Helper to determine recommended sub-modules
function getRecommendedModules(apps: string[], type: string) {
    const modules: string[] = [];
    apps.forEach(appId => {
        const sub = APP_MODULES[appId];
        if (sub) {
            // Logic based on company type or just enable most by default
            if (type === 'agency' && appId === 'projects') {
                modules.push('proj-active', 'proj-tasks', 'proj-time');
            } else if (type === 'saas' && appId === 'projects') {
                modules.push('proj-active', 'proj-tasks');
            } else {
                // Default: enable all sub-modules for enabled apps
                modules.push(...sub.map(m => m.id));
            }
        }
    });
    return modules;
}

import { Suspense } from 'react';

export default function WorkspaceSetupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
            <WorkspaceSetup />
        </Suspense>
    );
}

function WorkspaceSetup() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const onboardingToken = searchParams.get('onboardingToken');
    const { user, refreshUser, setToken, setUser, setCompany } = useAuth();
    const { company, platform, refreshSettings } = useSettings();

    const [step, setStep] = useState(1);
    const [companyType, setCompanyType] = useState('general');
    const [teamSize, setTeamSize] = useState('2-10');
    const [enabledApps, setEnabledApps] = useState<string[]>([]);
    const [enabledModules, setEnabledModules] = useState<string[]>([]);
    const [expandedApp, setExpandedApp] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isCheckingDB, setIsCheckingDB] = useState(true);

    // Guard: Check if database is configured before allowing onboarding
    useEffect(() => {
        const checkDBStatus = async () => {
            try {
                const { data } = await api.get('/api/setup/status');
                if (data.success && !data.isConfigured) {
                    toast.error('System database not connected. Redirecting to configuration...');
                    setTimeout(() => {
                        router.replace('/superadmin/settings');
                    }, 2000);
                } else {
                    setIsCheckingDB(false);
                }
            } catch (error) {
                console.error('Failed to check DB status:', error);
                setIsCheckingDB(false);
            }
        };

        checkDBStatus();
    }, [router]);

    // Initial load recommendations
    const recommendedApps = getRecommendedApps(companyType);

    const handleNext = () => {
        if (step === 2) {
            // Advancing to app selection, preset recommended apps & modules
            const apps = getRecommendedApps(companyType);
            setEnabledApps(apps);
            setEnabledModules(getRecommendedModules(apps, companyType));
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const toggleApp = (appId: string, isCore: boolean) => {
        if (isCore) return;
        setEnabledApps(prev => {
            const isNowEnabled = !prev.includes(appId);
            const newApps = isNowEnabled ? [...prev, appId] : prev.filter(id => id !== appId);

            // If enabling, also enable recommended sub-modules
            if (isNowEnabled) {
                const recommended = getRecommendedModules([appId], companyType);
                setEnabledModules(m => [...new Set([...m, ...recommended])]);
                setExpandedApp(appId); // Auto-expand when enabled
            } else {
                // If disabling, remove associated sub-modules
                const subIds = APP_MODULES[appId]?.map(m => m.id) || [];
                setEnabledModules(m => m.filter(id => !subIds.includes(id)));
            }
            return newApps;
        });
    };

    const toggleModule = (modId: string, parentAppId: string) => {
        setEnabledModules(prev => {
            const isNowEnabled = !prev.includes(modId);
            if (isNowEnabled && !enabledApps.includes(parentAppId)) {
                setEnabledApps(a => [...a, parentAppId]);
            }
            return isNowEnabled ? [...prev, modId] : prev.filter(id => id !== modId);
        });
    };

    const completeSetup = async () => {
        setSaving(true);
        try {
            const { data } = await api.put('/api/auth/complete-workspace-setup', {
                companyType,
                teamSize,
                enabledApps,
                enabledModules
            }, {
                headers: onboardingToken ? { 'x-onboarding-token': onboardingToken } : {}
            });

            if (data.token && data.refreshToken) {
                // Auto-login logic
                localStorage.setItem('platform_auth_token', data.token);
                localStorage.setItem('platform_refresh_token', data.refreshToken);

                // Set cookie so Next.js middleware can read it
                document.cookie = `platform_auth_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

                setToken(data.token);
                setUser(data.user);
                setCompany(data.company);
                api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            }

            await refreshSettings();
            await refreshUser();
            setStep(4); // Success screen is now step 4
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to complete setup');
        } finally {
            setSaving(false);
        }
    };

    const navigateToDashboard = () => {
        router.replace('/dashboard');
    };

    // Ensure only admins with firstLogin true see this, OR if we have an onboardingToken
    if (isCheckingDB || (!onboardingToken && (!user || user.role !== 'admin' || !user.isFirstLogin))) {
        // Render nothing while checking or if unauthorized, layout will redirect them away if they force navigate here
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-gray-50/50 to-white pointer-events-none" />

            <div className="max-w-3xl w-full mx-auto">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-6">
                        <span className="text-white font-black text-2xl">{company?.companyName?.[0]?.toUpperCase() || 'I'}</span>
                    </div>
                    <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
                        Welcome to {company?.companyName || 'your modern workspace'}
                    </h2>
                    <p className="mt-3 text-lg text-gray-500 max-w-xl mx-auto">
                        Let&apos;s personalize your experience. We&apos;ll set up the tools and modules that best fit your business.
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative min-h-[500px]">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-8 sm:p-12 h-full flex flex-col"
                            >
                                <h3 className="text-xl font-bold text-gray-900 mb-6">How would you describe your company?</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                    {COMPANY_TYPES.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setCompanyType(type.id)}
                                            className={clsx(
                                                "p-4 rounded-2xl border-2 text-left transition-all duration-200",
                                                companyType === type.id
                                                    ? "border-indigo-600 bg-indigo-50/50 shadow-md ring-4 ring-indigo-500/10"
                                                    : "border-gray-100 hover:border-indigo-200 hover:bg-gray-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={clsx(
                                                    "p-2 rounded-xl",
                                                    companyType === type.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
                                                )}>
                                                    <type.icon className="w-5 h-5" />
                                                </div>
                                                <span className={clsx("font-bold", companyType === type.id ? "text-indigo-900" : "text-gray-700")}>
                                                    {type.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">{type.desc}</p>
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

                        {step === 2 && (
                            <motion.div
                                key="step2"
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

                        {step === 3 && (
                            <motion.div
                                key="step3"
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

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 max-h-[500px] overflow-y-auto pr-2 pb-4">
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

                                <div className="mt-auto flex justify-between items-center bg-gray-50 -mx-8 sm:-mx-12 -mb-8 sm:-mb-12 p-6 sm:p-8 border-t border-gray-100">
                                    <div className="flex flex-col text-left">
                                        <p className="text-xs font-bold text-gray-900">{enabledApps.length} Apps Selected</p>
                                        <p className="text-[10px] text-gray-500">Essential features automatically enabled</p>
                                    </div>
                                    <button onClick={completeSetup} disabled={saving} className="btn-primary shadow-lg shadow-indigo-500/20 px-8 py-3 h-auto text-base">
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                                        <span>{saving ? "Saving..." : "Start Using IMS"}</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}


                        {step === 4 && (
                            <motion.div
                                key="step4"
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

                {step < 4 && (
                    <div className="mt-8 flex justify-center items-center gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={clsx("h-1.5 rounded-full transition-all duration-300", step >= i ? "w-8 bg-indigo-600" : "w-4 bg-gray-200")} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
