'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Eye, EyeOff, Lock, Mail, User, ChevronRight, Info, Globe, Building2, Database, Rocket, Shield, Clock, X } from 'lucide-react';
import { useSettings } from '../../lib/settings-context';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { platform } = useSettings();

    // Step 1: Admin & Company Registration States
    const [companyName, setCompanyName] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [logo, setLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [registering, setRegistering] = useState(false);
    
    // Google Auth State
    const [googleTokenId, setGoogleTokenId] = useState<string | null>(null);

    // Step 2: DB Config States (Optional / Legacy fallback)
    const [setupToken, setSetupToken] = useState(searchParams.get('token') || '');
    const [dbUsername, setDbUsername] = useState('');
    const [dbPassword, setDbPassword] = useState('');
    const [dbInput, setDbInput] = useState('');
    const [isDbConnecting, setIsDbConnecting] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [useImsDatabase, setUseImsDatabase] = useState(false);

    // Flow control
    const isConfigStep = !!setupToken;

    const handleGoogleSuccess = (credentialResponse: any) => {
        if (!credentialResponse.credential) return;
        setGoogleTokenId(credentialResponse.credential);
        try {
            const decoded: any = jwtDecode(credentialResponse.credential);
            if (decoded.name) setName(decoded.name);
            if (decoded.email) setEmail(decoded.email);
            toast.success('Google authenticated! Tell us your Company Name to finish setup.', { duration: 5000, icon: '👋' });
        } catch (e) {
            toast.error('Failed to parse Google credential.');
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogo(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleRegisterCompany = async (e: FormEvent) => {
        e.preventDefault();
        setRegistering(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const formData = new FormData();
            
            let endpoint = '/api/setup/register-company';

            if (googleTokenId) {
                endpoint = '/api/setup/register-company-google';
                formData.append('companyName', companyName);
                formData.append('adminName', name);
                formData.append('tokenId', googleTokenId);
                if (logo) formData.append('logo', logo);
            } else {
                formData.append('companyName', companyName);
                formData.append('adminName', name);
                formData.append('adminEmail', email);
                formData.append('adminPassword', password);
                if (logo) formData.append('logo', logo);
            }

            const res = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Workspace registered successfully! Redirecting to setup...', { duration: 4000 });
                if (data.onboardingToken) {
                    router.replace(`/workspace-setup?onboardingToken=${data.onboardingToken}`);
                } else if (data.setupToken) {
                    setSetupToken(data.setupToken);
                    router.replace(`/signup?step=db_config&token=${data.setupToken}`);
                } else {
                    router.replace('/login');
                }
            } else {
                toast.error(data.error || 'Registration failed');
            }
        } catch (err: any) {
            toast.error('Network error during registration');
        } finally {
            setRegistering(false);
        }
    };

    const handleConnectDB = async (e: FormEvent) => {
        e.preventDefault();

        let correctedInput = dbInput;
        if (dbInput.includes('<db_password>') || dbInput.includes('<password>')) {
            if (dbPassword) {
                correctedInput = correctedInput.replace('<db_password>', dbPassword).replace('<password>', dbPassword);
                setDbInput(correctedInput);
                toast.success('🪄 Seeded your password into the connection string!');
            }
        }
        
        if (correctedInput.includes('<username>') || correctedInput.includes('<db_username>')) {
            if (dbUsername) {
                correctedInput = correctedInput.replace('<username>', dbUsername).replace('<db_username>', dbUsername);
                setDbInput(correctedInput);
            }
        }

        if (correctedInput.includes('<db_password>') || correctedInput.includes('<password>')) {
            toast.error('❌ Your connection string still has "<db_password>". Please replace it or enter a password above so we can fix it for you!');
            return;
        }

        const isUri = correctedInput.startsWith('mongodb+srv://') || correctedInput.startsWith('mongodb://');

        setIsDbConnecting(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const res = await fetch(`${apiUrl}/api/setup/configure-company`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    setupToken,
                    username: useImsDatabase ? '' : dbUsername,
                    password: useImsDatabase ? '' : dbPassword,
                    clusterUrl: (isUri || useImsDatabase) ? '' : correctedInput,
                    connectionString: (isUri && !useImsDatabase) ? correctedInput : '',
                    useImsDatabase
                }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success('Database connected successfully!', { icon: '🎉' });
                router.push(`/workspace-setup?onboardingToken=${data.onboardingToken}`);
            } else {
                toast.error(data.error || 'Connection failed');
            }
        } catch (err) {
            toast.error('Network error during configuration');
        } finally {
            setIsDbConnecting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* ── Left Column: Marketing Showcase ──────────────────────────────────── */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#0f172a] via-primary-dark to-[#0f172a] text-white p-12 flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50" />
                
                <div className="relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex items-center gap-3 mb-16"
                    >
                        {platform?.logo ? (
                            <img src={platform.logo} alt="Logo" className="w-12 h-12 bg-white rounded-xl shadow-lg border-2 border-white/20 p-1" />
                        ) : (
                            <img src="/white icon.svg" alt="Icon" className="w-12 h-12" />
                        )}
                        {platform?.platformName ? (
                            <span className="font-bold tracking-widest text-lg uppercase text-white">{platform.platformName}</span>
                        ) : (
                            <img src="/white text logo.svg" alt="PitchIn 180" className="h-8" />
                        )}
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="max-w-xl"
                    >
                        <h1 className="text-5xl font-extrabold leading-tight tracking-tight mb-6">
                            Start Building Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">Workspace.</span>
                        </h1>
                        <p className="text-lg text-gray-300 leading-relaxed mb-12">
                            Join thousands of companies scaling their operations effortlessly. Deploy your dedicated architecture instantly and get complete control over your data.
                        </p>

                        <div className="space-y-6">
                            {[
                                { icon: Rocket, title: "Instant Deployment", desc: "Your workspace is ready in seconds, fully isolated." },
                                { icon: Shield, title: "Data Sovereignty", desc: "Dedicated and private data models built for enterprise scale." },
                                { icon: Clock, title: "Zero Maintenance", desc: "We manage the infrastructure so you can focus on growth." }
                            ].map((feature, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.4 + (i * 0.1) }}
                                    className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center shadow-inner">
                                        <feature.icon className="w-6 h-6 text-blue-300" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-base">{feature.title}</h4>
                                        <p className="text-sm text-gray-300">{feature.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
                
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                    className="relative z-10 text-sm text-gray-500 font-medium"
                >
                    &copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span> {platform?.platformName || 'Platform'}. All rights reserved.
                </motion.div>
            </div>

            {/* ── Right Column: Signup Form ─────────────────────────────────────────── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 xl:p-24 relative overflow-y-auto">
                <div className="w-full max-w-md relative z-10">
                    
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
                        {platform?.logo ? (
                            <img src={platform.logo} alt="Logo" className="w-10 h-10 bg-white rounded-lg shadow-sm p-1" />
                        ) : (
                        <img src="/black icon.svg" alt="Icon" className="w-10 h-10" />
                        )}
                        {platform?.platformName ? (
                            <span className="font-bold text-xl text-gray-900">{platform.platformName}</span>
                        ) : (
                            <img src="/black text logo.svg" alt="PitchIn 180" className="h-6" />
                        )}
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                            {isConfigStep ? 'Database Configuration' : 'Create Workspace'}
                        </h2>
                        <p className="text-gray-500 font-medium text-sm">
                            {isConfigStep
                                ? 'Connect your database cluster'
                                : 'Initialize your management environment in seconds'}
                        </p>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        {isConfigStep ? (
                            <form onSubmit={handleConnectDB} className="space-y-5">
                                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-900 mb-6 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold mb-1.5 flex items-center gap-2">
                                                <Database className="w-4 h-4" /> Connect Database
                                            </p>
                                            <p className="text-blue-700/80 text-xs leading-relaxed max-w-[250px]">
                                                Link your dedicated database cluster to store your employees and tasks securely.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            suppressHydrationWarning
                                            onClick={() => setShowGuide(true)}
                                            className="shrink-0 text-[10px] text-blue-700 font-bold bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5"
                                        >
                                            <Info className="w-3.5 h-3.5" /> Guide
                                        </button>
                                    </div>
                                </div>

                                <div 
                                    onClick={() => setUseImsDatabase(!useImsDatabase)}
                                    className={clsx(
                                        "p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center justify-between group",
                                        useImsDatabase ? "border-blue-600 bg-blue-50 shadow-md ring-4 ring-blue-500/10" : "border-gray-200 bg-white hover:border-blue-300"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                            useImsDatabase ? "bg-blue-600 text-white shadow-inner" : "bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-700"
                                        )}>
                                            <Database className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className={clsx("text-sm font-bold", useImsDatabase ? "text-blue-900" : "text-gray-900")}>
                                                Use Platform DB
                                            </p>
                                            <p className="text-[11px] text-gray-500 font-medium">Shared, fully-managed infrastructure</p>
                                        </div>
                                    </div>
                                    <div className={clsx(
                                        "w-12 h-6 rounded-full relative transition-colors duration-300 shadow-inner",
                                        useImsDatabase ? "bg-blue-600" : "bg-gray-200"
                                    )}>
                                        <div className={clsx(
                                            "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300",
                                            useImsDatabase ? "translate-x-7" : "translate-x-1"
                                        )} />
                                    </div>
                                </div>

                                {!useImsDatabase && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
                                        <div className="relative group/input">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-primary transition-colors" />
                                            <input
                                                type="text"
                                                value={dbUsername}
                                                onChange={(e) => setDbUsername(e.target.value)}
                                                placeholder="Database Username"
                                                required
                                                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div className="relative group/input">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-primary transition-colors" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={dbPassword}
                                                onChange={(e) => setDbPassword(e.target.value)}
                                                placeholder="Database Password"
                                                required
                                                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-12 py-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1">
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        <div className="relative group/input">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-primary transition-colors" />
                                            <input
                                                type="text"
                                                value={dbInput}
                                                onChange={(e) => setDbInput(e.target.value)}
                                                placeholder="Cluster URL / Connection URI"
                                                required
                                                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isDbConnecting}
                                    suppressHydrationWarning
                                    className="w-full py-4 mt-4 rounded-2xl font-bold text-white bg-gray-900 hover:bg-black transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-gray-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isDbConnecting ? <LogoLoader className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                                    {isDbConnecting ? 'Connecting...' : 'Connect Database'}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                {/* Google Auth Shortcut */}
                                {!googleTokenId && (
                                    <div className="mb-6">
                                        <div className="w-full relative shadow-sm hover:shadow-md transition-shadow rounded overflow-hidden flex justify-center">
                                            <GoogleLogin 
                                                onSuccess={handleGoogleSuccess}
                                                onError={() => toast.error('Google Sign Up Failed')}
                                                useOneTap={false}
                                                theme="outline"
                                                size="large"
                                                text="signup_with"
                                                width="340"
                                                shape="pill"
                                            />
                                        </div>
                                        <div className="relative my-6">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-gray-200"></div>
                                            </div>
                                            <div className="relative flex justify-center text-sm">
                                                <span className="px-4 bg-gray-50 text-gray-400 font-medium uppercase tracking-wider text-xs">Or completely register via Email</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {googleTokenId && (
                                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex gap-3 text-emerald-800 mb-6 font-medium text-sm">
                                        <span className="text-xl">🙌</span>
                                        <div>
                                            Google Account successfully linked! Just tell us your workspace name and verify personal details to finalize.
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleRegisterCompany} className="space-y-4">
                                    <div className="flex justify-center mb-6">
                                        <label className="relative group cursor-pointer inline-block">
                                            <div className={clsx(
                                                "w-24 h-24 rounded-3xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all duration-300",
                                                logoPreview ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/50 shadow-sm"
                                            )}>
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                                                ) : (
                                                    <div className="flex flex-col items-center space-y-1.5 text-gray-400">
                                                        <Building2 className="w-7 h-7" />
                                                        <span className="text-[9px] font-bold tracking-widest leading-none">LOGO</span>
                                                    </div>
                                                )}
                                            </div>
                                            <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                        </label>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="relative group/input">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                                            <input
                                                type="text"
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                placeholder="Company Name"
                                                required
                                                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div className="relative group/input">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Admin Full Name"
                                                required
                                                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                                            />
                                        </div>

                                        {!googleTokenId && (
                                            <>
                                                <div className="relative group/input">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                                                    <input
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        placeholder="Admin Email Address"
                                                        required
                                                        className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                                                    />
                                                </div>
                                                <div className="relative group/input">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        placeholder="Secure Password"
                                                        required
                                                        className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-12 py-3.5 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                                                    />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1">
                                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                        
                                        {googleTokenId && (
                                            <div className="relative group/input">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    disabled
                                                    placeholder="Google Linked Email"
                                                    className="w-full bg-gray-100 border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-gray-500 text-sm font-medium cursor-not-allowed transition-all shadow-sm"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={registering}
                                        suppressHydrationWarning
                                        className="w-full py-4 mt-6 rounded-2xl font-bold text-white bg-gray-900 hover:bg-black transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-gray-900/20 disabled:opacity-70 disabled:cursor-not-allowed group"
                                    >
                                        {registering ? <LogoLoader className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                                        {registering ? 'Creating Workspace...' : 'Create Workspace'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </motion.div>

                    {!isConfigStep && (
                        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                            <p className="text-sm font-medium text-gray-500">
                                Already have an account?{' '}
                                <Link href="/login" className="text-primary hover:text-primary-dark font-bold transition-colors inline-flex items-center gap-0.5 hover:underline">
                                    Sign In here <ChevronRight className="w-4 h-4" />
                                </Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-3">
                                <Database className="w-6 h-6 text-emerald-600" /> Database Setup Guide
                            </h3>
                            <button onClick={() => setShowGuide(false)} title="Close Guide" aria-label="Close" className="text-gray-400 hover:text-gray-900 transition-colors p-2 bg-white rounded-full shadow-sm border border-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-8 bg-white">
                            <div className="space-y-2 text-sm text-gray-600">
                                <p><strong className="text-gray-900">1.</strong> All workspaces are powered by our dedicated high-performance PostgreSQL cluster.</p>
                                <p><strong className="text-gray-900">2.</strong> Your data is securely isolated by <code className="bg-gray-100 px-1 rounded">companyId</code>.</p>
                                <p><strong className="text-gray-900">3.</strong> No external configuration is needed to get started.</p>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button onClick={() => setShowGuide(false)} className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-lg">
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><LogoLoader className="w-8 h-8 animate-spin text-primary" /></div>}>
            <SignupForm />
        </Suspense>
    );
}

