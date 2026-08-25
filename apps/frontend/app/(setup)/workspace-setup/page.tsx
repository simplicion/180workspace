'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useSettings } from '@/lib/settings-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, ArrowRight, CheckCircle2, Sparkles, LayoutDashboard, TrendingUp, Briefcase, Globe, Info, Target, FileText, UploadCloud, X, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { APPS_CONFIG } from '@/lib/module-map';
import { LocationSearch } from '@/components/ui/LocationSearch';
import CustomSelect from '@/components/ui/CustomSelect';
import { locationService, FormattedLocation } from '@/lib/location-service';
import api from '@/lib/api';
import { SubscriptionPlan } from '@/components/shared/SubscriptionPlan';
const INDUSTRIES = [
    { label: 'Technology', value: 'Technology' },
    { label: 'Healthcare', value: 'Healthcare' },
    { label: 'Finance', value: 'Finance' },
    { label: 'Education', value: 'Education' },
    { label: 'Retail', value: 'Retail' },
    { label: 'Manufacturing', value: 'Manufacturing' },
    { label: 'Real Estate', value: 'Real Estate' },
    { label: 'Consulting', value: 'Consulting' },
    { label: 'Other', value: 'Other' },
];

const STARTUP_STAGES = [
    { value: 'Idea', label: 'Idea Stage' },
    { value: 'MVP', label: 'MVP / Prototype' },
    { value: 'Beta', label: 'Beta / Launching' },
    { value: 'Revenue', label: 'Early Revenue' },
    { value: 'Scaling', label: 'Scaling / Growth' },
];

const TEAM_SIZES = [
    { value: '1', label: 'Just me' },
    { value: '2-10', label: '2 - 10' },
    { value: '11-50', label: '11 - 50' },
    { value: '51-200', label: '51 - 200' },
    { value: '200+', label: '200+' },
];

// Helper to determine recommended apps based on company type
function getRecommendedApps(type: string) {
    const core = ['system', 'communications', 'workspace-tools']; // Always needed (some are core/hidden)
    switch (type) {
        case 'agency': return [...core, 'projects', 'crm', 'finance'];
        case 'saas': return [...core, 'projects', 'insights', 'hr'];
        case 'ecommerce': return [...core, 'crm', 'finance', 'insights'];
        case 'consulting': return [...core, 'projects', 'finance', 'crm'];
        default: return [...core, 'projects', 'hr', 'finance'];
    }
}

function getRecommendedModules(apps: string[], type: string) {
    const modules: string[] = [];
    apps.forEach(appId => {
        const app = APPS_CONFIG.find(a => a.id === appId);
        if (app && app.modules) {
            if (type === 'agency' && appId === 'projects') {
                modules.push('projects', 'tasks', 'timetracking');
            } else if (type === 'saas' && appId === 'projects') {
                modules.push('projects', 'tasks');
            } else {
                modules.push(...app.modules.map(m => m.id));
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
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    
    // Step 1: Text inputs
    const [companyName, setCompanyName] = useState('');
    const [website, setWebsite] = useState('');
    const [oneLineDescription, setOneLineDescription] = useState('');
    
    // Currency 
    const [currency, setCurrency] = useState('USD');
    const [currencySymbol, setCurrencySymbol] = useState('$');
    
    const [slug, setSlug] = useState('');
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [isCheckingSlug, setIsCheckingSlug] = useState(false);

    // Location
    const [locationInput, setLocationInput] = useState('');
    const [country, setCountry] = useState('');

    useEffect(() => {
        // Auto-detect location and currency
        locationService.getCurrentLocation().then(loc => {
            if (loc) {
                setLocationInput(loc.address);
                setCountry(loc.country);
                setCurrency(loc.currencyCode);
                setCurrencySymbol(loc.currencySymbol);
            }
        });
    }, []);

    useEffect(() => {
        if (!companyName.trim()) {
            setSlug('');
            setSlugAvailable(null);
            return;
        }
        
        const generatedSlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        setSlug(generatedSlug);
        
        // Wait until there's a reasonable slug length before checking
        if (!generatedSlug || generatedSlug.length < 3) {
            setSlugAvailable(null);
            setIsCheckingSlug(false);
            return;
        }

        setIsCheckingSlug(true);
        setSlugAvailable(null);

        const controller = new AbortController();

        const timeoutId = setTimeout(async () => {
            try {
                const res = await fetch(`/api/check-company?slug=${generatedSlug}`, {
                    signal: controller.signal
                });
                const data = await res.json();
                setSlugAvailable(data.available);
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    setSlugAvailable(null);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsCheckingSlug(false);
                }
            }
        }, 1500); // 1.5 second debounce

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [companyName]);

    // Step 2: Industry & Stage
    const [industry, setIndustry] = useState('saas');
    const [startupStage, setStartupStage] = useState('Idea');
    
    // Step 3: Team
    const [teamSize, setTeamSize] = useState('2-10');
    
    // Step 4: Apps
    const [enabledApps, setEnabledApps] = useState<string[]>([]);
    const [enabledModules, setEnabledModules] = useState<string[]>([]);
    
    // Logo Upload State
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    
    const logoInputRef = useRef<HTMLInputElement>(null);

    const [saving, setSaving] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

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
        if (step === 2) {
            // Advancing to app selection, preset core apps and default apps
            const defaultApps = ['projects', 'workspace-tools', 'communications'];
            const coreApps = ['system'];
            
            const appsToEnable = [...coreApps, ...defaultApps];
            
            setEnabledApps(appsToEnable);
            setEnabledModules(getRecommendedModules(appsToEnable, industry));
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const toggleApp = (appId: string, isCore: boolean) => {
        const defaultApps = ['projects', 'workspace-tools', 'communications'];
        const coreApps = ['system'];
        const excludedFromCustomCount = [...defaultApps, ...coreApps];

        if (isCore || defaultApps.includes(appId) || coreApps.includes(appId)) {
            toast.error("This app is essential and cannot be removed.");
            return;
        }

        // Kickstart plan: 5 total apps = 3 default + 2 custom. (Core 'system' is excluded from this limit)
        const customAppLimit = 2; // 2 custom slots

        setEnabledApps(prev => {
            const isNowEnabled = !prev.includes(appId);
            const customAppCount = prev.filter(id => !excludedFromCustomCount.includes(id)).length;
            
            if (isNowEnabled && customAppCount >= customAppLimit) {
                setShowUpgradeModal(true);
                return prev;
            }
            const newApps = isNowEnabled ? [...prev, appId] : prev.filter(id => id !== appId);

            if (isNowEnabled) {
                const recommended = getRecommendedModules([appId], industry);
                setEnabledModules(m => [...new Set([...m, ...recommended])]);
            } else {
                const appConfig = APPS_CONFIG.find(a => a.id === appId);
                const subIds = appConfig?.modules.map(m => m.id) || [];
                setEnabledModules(m => m.filter(id => !subIds.includes(id)));
            }
            return newApps;
        });
    };

    const completeSetup = async () => {
        setSaving(true);
        setLoadingMessage('Initializing setup...');
        try {
            let uploadedLogoUrl = '';
            
            if (logoFile) {
                setLoadingMessage('Uploading your logo...');
                const form = new FormData();
                form.append('file', logoFile);
                form.append('folder', 'companyLogo');
                try {
                    const uploadRes = await api.post('/api/files/upload', form);
                    if (uploadRes.data?.document?.fileUrl) {
                        uploadedLogoUrl = uploadRes.data.document.fileUrl;
                    }
                } catch (uploadError) {
                    console.error("Logo upload failed", uploadError);
                }
            }

            setLoadingMessage('Collecting apps & configuring workspace...');
            const res = await api.put('/api/auth/complete-workspace-setup', {
                companyName,
                slug,
                website,
                oneLineDescription,
                industry,
                startupStage,
                teamSize,
                enabledApps,
                enabledModules,
                currency,
                currencySymbol,
                country,
                logoUrl: uploadedLogoUrl
            });

            const data = res.data;
            if (data.success) {
                setLoadingMessage('Activating modules...');
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
                
                setLoadingMessage('Setting up dashboard...');
                await new Promise(resolve => setTimeout(resolve, 800)); // allow user to read the message and see smooth transition
                
                window.location.href = '/';
                // Do not set saving to false here to prevent the loading UI from flashing before navigation
            } else {
                if (res.status === 401) {
                    toast.error(data.error || 'Session invalid. Logging out...');
                    setTimeout(() => signOut({ callbackUrl: '/login' }), 2000);
                } else {
                    toast.error(data.error || 'Failed to complete setup');
                }
                setSaving(false);
                setLoadingMessage('');
            }
        } catch (error: any) {
            if (error.response?.data?.error) {
                toast.error(error.response.data.error);
            } else {
                toast.error('Network error during workspace setup');
            }
            setSaving(false);
            setLoadingMessage('');
        }
    };

    const navigateToDashboard = async () => {
        window.location.href = '/';
    };

    if (isSessionLoading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><LogoLoader className="w-8 h-8 animate-spin text-indigo-500" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-gray-50/50 to-white pointer-events-none" />

            <div className="max-w-4xl w-full mx-auto my-auto relative">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-4 p-2 border border-gray-100">
                        <img src="/black icon.svg" alt="Icon" className="w-8 h-8" />
                    </div>
                    <h2 className="mt-2 text-2xl font-extrabold text-gray-900 tracking-tight">
                        Setup Your Workspace
                    </h2>
                    <p className="mt-2 text-base text-gray-500 max-w-xl mx-auto">
                        Tell us about your startup to personalize your experience.
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative min-h-[600px] flex flex-col">
                    <AnimatePresence mode="wait">
                        {saving && (
                            <motion.div
                                key="loading-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
                            >
                                <div className="w-24 h-24 mb-6 relative flex items-center justify-center">
                                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                                    <motion.div 
                                        className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent"
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    />
                                    <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center shadow-sm relative z-10">
                                        <img src="/black icon.svg" alt="Icon" className="w-8 h-8" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Creating Workspace</h3>
                                <div className="flex flex-col items-center space-y-3">
                                    <motion.p 
                                        key={loadingMessage}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-indigo-600 font-medium"
                                    >
                                        {loadingMessage || 'Setting up...'}
                                    </motion.p>
                                    <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div 
                                            className="h-full bg-indigo-500 rounded-full"
                                            animate={{ x: ["-100%", "100%"] }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        
                        {step === 1 && !saving && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-6 sm:p-8 h-full flex flex-col"
                            >
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h3>
                                
                                <div className="space-y-4 mb-6 pr-2 flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={companyName}
                                                    onChange={(e) => setCompanyName(e.target.value)}
                                                    placeholder="Acme Corp"
                                                    className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="mt-2 text-xs flex items-center">
                                                <span className="text-gray-500">URL: </span>
                                                <span className="font-medium text-gray-900 ml-1 truncate max-w-[120px] sm:max-w-[160px]">
                                                    {slug || 'acme'}
                                                </span>
                                                <span className="text-gray-900">.{(platform as any)?.domain || process.env.NEXT_PUBLIC_ROOT_DOMAIN || (typeof window !== 'undefined' ? window.location.host.replace(/^(app|admin)\./, '') : '')}</span>
                                                {slug && (
                                                    <div className="ml-2 flex items-center shrink-0">
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
                                                    className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">One-line Description</label>
                                        <div className="relative">
                                            <FileText className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
                                            <textarea
                                                value={oneLineDescription}
                                                onChange={(e) => setOneLineDescription(e.target.value)}
                                                placeholder="We are building the next generation of..."
                                                rows={2}
                                                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Company Location & Currency</label>
                                        <LocationSearch 
                                            value={locationInput}
                                            onChange={(loc) => {
                                                setLocationInput(loc.address);
                                                setCountry(loc.country);
                                                setCurrency(loc.currencyCode);
                                                setCurrencySymbol(loc.currencySymbol);
                                            }}
                                        />
                                        <div className="mt-2 text-sm flex items-center text-gray-500">
                                            <span>Primary Currency: </span>
                                            <span className="font-bold text-gray-900 ml-1 px-2 py-0.5 bg-gray-100 rounded-md">
                                                {currency} ({currencySymbol})
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 flex justify-end border-t border-gray-100 bg-white relative z-10 shrink-0">
                                    <button 
                                        onClick={handleNext} 
                                        disabled={!companyName.trim() || isCheckingSlug || slugAvailable === false}
                                        className={clsx("btn-primary space-x-2 transition-all", (!companyName.trim() || isCheckingSlug || slugAvailable === false) && "opacity-50 cursor-not-allowed")}
                                    >
                                        <span>Next Step</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && !saving && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-6 sm:p-8 h-full flex flex-col relative overflow-hidden"
                            >
                                {/* Aesthetic background gradients */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none transform -translate-x-1/2 translate-y-1/2" />
                                
                                <button onClick={handleBack} className="text-sm font-medium text-gray-400 hover:text-gray-600 mb-2 w-max relative z-10">&larr; Back</button>
                                
                                <div className="relative z-10 text-center mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Company Details</h3>
                                    <p className="text-sm text-gray-500">Make it yours. Upload a logo and tell us about your startup.</p>
                                </div>
                                
                                <div className="flex-1 flex flex-col gap-5 relative z-10">
                                    {/* Logo Upload - Center Stage */}
                                    <div className="flex flex-col items-center justify-center">
                                        <input 
                                            type="file" 
                                            ref={logoInputRef} 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const file = e.target.files[0];
                                                    setLogoFile(file);
                                                    setLogoPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                        <div className="relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                            {logoPreview ? (
                                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-xl overflow-hidden ring-2 ring-indigo-50">
                                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null); if (logoInputRef.current) logoInputRef.current.value = ''; }}
                                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-all backdrop-blur-sm rounded-full"
                                                    >
                                                        <X className="w-6 h-6 mb-1" />
                                                        <span className="text-[10px] font-medium uppercase tracking-wider">Remove</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all shadow-sm ring-4 ring-white">
                                                    <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 mb-2 group-hover:scale-110 transition-transform duration-300" />
                                                    <span className="text-[10px] sm:text-xs font-semibold">Upload Logo</span>
                                                </div>
                                            )}
                                            {/* decorative sparkles around logo if empty */}
                                            {!logoPreview && (
                                                <>
                                                    <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-indigo-300 animate-pulse" />
                                                    <Sparkles className="absolute -bottom-1 -left-3 w-4 h-4 text-blue-300 animate-pulse delay-150" />
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Fields */}
                                    <div className="bg-white/60 backdrop-blur-md border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                                        <div className="relative z-[60]">
                                            <CustomSelect
                                                label="Select Industry"
                                                value={industry}
                                                onChange={(e: any) => setIndustry(e.target.value)}
                                                options={INDUSTRIES}
                                                searchable={true}
                                                creatable={true}
                                                placeholder="e.g. Technology"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative z-[50]">
                                                <CustomSelect
                                                    label="Startup Stage"
                                                    value={startupStage}
                                                    onChange={(e: any) => setStartupStage(e.target.value)}
                                                    options={STARTUP_STAGES}
                                                    placeholder="Select stage"
                                                />
                                            </div>
                                            <div className="relative z-[40]">
                                                <CustomSelect
                                                    label="Team Size"
                                                    value={teamSize}
                                                    onChange={(e: any) => setTeamSize(e.target.value)}
                                                    options={TEAM_SIZES}
                                                    placeholder="Select team size"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 flex justify-end border-t border-gray-100 bg-white relative z-10 shrink-0">
                                    <button onClick={handleNext} className="btn-primary px-8 py-3 rounded-xl shadow-lg shadow-indigo-500/25 space-x-2 text-base font-semibold flex items-center justify-center hover:-translate-y-0.5 transition-all w-full sm:w-auto">
                                        <span>Next Step</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && !saving && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-6 sm:p-8 h-full flex flex-col relative"
                            >
                                <button onClick={handleBack} disabled={saving} className="text-sm font-medium text-gray-400 hover:text-gray-600 mb-2 w-max">&larr; Back</button>

                                <div className="mb-4 text-center">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-1">Select Your Apps</h3>
                                    <p className="text-sm text-gray-500">Pick the modules you need. You can always add more later.</p>
                                </div>

                                <div className="flex-1 overflow-y-auto -mx-2 px-2 pb-2 custom-scrollbar mb-4 min-h-0">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-2">
                                    {/* Static Core System Card */}
                                    <div className="relative overflow-hidden border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50/30 rounded-2xl p-4 flex flex-col cursor-default shadow-sm group">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-100 rounded-bl-full opacity-50" />
                                        <div className="absolute top-3 right-3 text-indigo-500">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-white shadow-sm text-indigo-600 ring-1 ring-indigo-100 relative z-10">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-gray-900 text-sm mb-1 relative z-10">Core System</h4>
                                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-auto leading-relaxed relative z-10">Essential dashboard & settings modules.</p>
                                        <div className="mt-3 relative z-10">
                                            <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">Required</span>
                                        </div>
                                    </div>

                                    {(() => {
                                        const coreApps = ['projects', 'workspace-tools', 'communications'];
                                        const sortedApps = [...APPS_CONFIG].sort((a, b) => {
                                            const aIsCore = coreApps.includes(a.id);
                                            const bIsCore = coreApps.includes(b.id);
                                            if (aIsCore && !bIsCore) return -1;
                                            if (!aIsCore && bIsCore) return 1;
                                            return 0;
                                        });
                                        return sortedApps.map(app => {
                                            const isEnabled = enabledApps.includes(app.id);
                                            const isLocked = coreApps.includes(app.id);
                                            const isRecommended = recommendedApps.includes(app.id);
                                            const Icon = app.icon;

                                            return (
                                            <div 
                                                key={app.id}
                                                onClick={() => toggleApp(app.id, false)}
                                                className={clsx(
                                                    "relative overflow-hidden rounded-2xl p-4 flex flex-col cursor-pointer transition-all duration-300 group",
                                                    isEnabled 
                                                        ? "border-2 border-indigo-500 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 shadow-md transform scale-[1.02]" 
                                                        : "border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm"
                                                )}
                                            >
                                                {/* Selection Checkmark */}
                                                <div className="absolute top-3 right-3 z-10">
                                                    <div className={clsx(
                                                        "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300",
                                                        isEnabled ? "bg-indigo-500 text-white scale-100" : "bg-gray-100 text-gray-300 scale-90 group-hover:scale-100"
                                                    )}>
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    </div>
                                                </div>

                                                <div className={clsx(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors duration-300 relative z-10",
                                                    isEnabled ? "bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100" : "bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                                                )}>
                                                    <Icon className="w-5 h-5" />
                                                </div>

                                                <h4 className={clsx("font-bold text-sm mb-1 relative z-10 transition-colors", isEnabled ? "text-indigo-950" : "text-gray-900")}>{app.name}</h4>
                                                <p className="text-[11px] text-gray-500 line-clamp-2 mt-auto leading-relaxed relative z-10">{app.description}</p>

                                                {isLocked && (
                                                    <div className="mt-3 relative z-10">
                                                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-md ring-1 ring-gray-200">Required</span>
                                                    </div>
                                                )}
                                                {isRecommended && !isEnabled && !isLocked && (
                                                    <div className="mt-3 relative z-10">
                                                        <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-md ring-1 ring-blue-100">Recommended</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                        });
                                    })()}
                                    </div>
                                </div>

                                <div className="mt-auto flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-5 sm:p-6 border-t border-gray-100 rounded-b-3xl">
                                    <div className="flex flex-col text-center sm:text-left w-full sm:w-auto">
                                        <p className="text-sm font-bold text-gray-900">
                                            {enabledApps.filter(id => id !== 'system').length} Apps Selected
                                            <span className="font-normal text-gray-500 ml-1">
                                                ({enabledApps.filter(id => !['projects', 'workspace-tools', 'communications', 'system'].includes(id)).length}/2 custom)
                                            </span>
                                        </p>
                                        <p className="text-xs text-gray-500">3 default apps + up to 2 custom apps on your plan.</p>
                                    </div>
                                    <button onClick={completeSetup} disabled={saving} className="btn-primary shadow-lg shadow-indigo-500/25 px-8 py-3 h-auto text-base font-semibold w-full sm:w-auto flex justify-center items-center hover:-translate-y-0.5 transition-all rounded-xl">
                                        {saving ? <LogoLoader className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                                        <span>{saving ? "Creating Workspace..." : "Complete Setup"}</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}




                        {step === 4 && !saving && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-6 sm:p-8 h-full flex flex-col items-center justify-center text-center"
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

                {/* Upgrade Modal */}
                {showUpgradeModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900">Custom App Limit Reached</h3>
                                <button onClick={() => setShowUpgradeModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 text-gray-600">
                                <p className="mb-4">You are currently on the <span className="font-semibold text-gray-900">Kickstart Plan</span> which gives you access to <span className="font-semibold text-gray-900">5 apps</span> total.</p>
                                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Core System</span>
                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-medium">Not counted</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Default Apps (Projects, Communications, Workspace Tools)</span>
                                        <span className="font-semibold text-gray-900">3</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Custom Apps</span>
                                        <span className="font-semibold text-gray-900">2</span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                                        <span className="font-semibold text-gray-900">Total</span>
                                        <span className="font-bold text-indigo-600">5 apps</span>
                                    </div>
                                </div>
                                <p className="text-sm">After creating the workspace, you can <span className="font-semibold text-indigo-600">upgrade your plan</span> to unlock more apps.</p>
                            </div>
                            <div className="p-6 pt-0 flex justify-end">
                                <button 
                                    onClick={() => setShowUpgradeModal(false)}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                                >
                                    Got it
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
}
