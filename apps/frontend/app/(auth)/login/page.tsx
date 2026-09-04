'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, FormEvent, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, Key, Globe, X, CheckCircle2, Zap, ShieldCheck, BarChart3, ArrowRight, Users, Bot, FolderKanban, MessageSquare, Cloud, ArrowLeft } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import api from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useAuth } from '@/lib/auth-context';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { platform, isLoading: settingsLoading } = useSettings();
    const { data: session, status } = useSession();
    const { user: authUser, isLoading: authLoading, token } = useAuth();
    const user = session?.user;
    const isLoading = status === "loading";

    // ── All hooks declared unconditionally at the top (Rules of Hooks) ───────
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    // MFA state
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaToken, setMfaToken] = useState('');

    // Forgot Password state
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);
    const [forgotNotEligible, setForgotNotEligible] = useState<boolean | null>(null);
    // ─────────────────────────────────────────────────────────────────────────

    // ── Auto-login: redirect already-authenticated users ─────────────────────
    useEffect(() => {
        if (!isLoading && user) {
            if (searchParams?.get('clearSession') === 'true') {
                signOut({ redirect: false }).then(() => {
                    router.replace('/login');
                });
                return;
            }

            // Ensure platform_auth_token cookie is synced if available
            const localToken = localStorage.getItem('platform_auth_token') || (session as any)?.platformToken || token;
            if (localToken && typeof document !== 'undefined') {
                const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
                const is180 = typeof window !== 'undefined' && window.location.hostname.endsWith('180workspace.com');
                const domainAttr = is180 ? '; domain=.180workspace.com' : '';
                const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}${domainAttr}`;
                document.cookie = `platform_auth_token=${localToken}${cookieFlags}`;
                if (!localStorage.getItem('platform_auth_token')) {
                    localStorage.setItem('platform_auth_token', localToken);
                }
            } else if (!localToken) {
                // NextAuth has a stale session but we have no backend token; clear it to avoid loops
                signOut({ redirect: false });
                return;
            }

            if ((user as any).isFirstLogin !== false && !(user as any).isOnboardingComplete) {
                // If onboarding is incomplete, redirect them to /signup so they can complete it.
                router.replace('/signup');
                return;
            }

            const rawReturnUrl = searchParams?.get('returnUrl') || searchParams?.get('from');
            const target = rawReturnUrl ? decodeURIComponent(rawReturnUrl) : '/';
            if (target === '/login' || target.startsWith('/login?')) {
                window.location.href = '/';
            } else {
                window.location.href = target;
            }
        }
    }, [isLoading, user, token, router, searchParams]);

    // ── Auto-login: Sync platform_auth_token to NextAuth if missing ───────
    useEffect(() => {
        if (!isLoading && !authLoading && !user && authUser && token) {
            // User is authenticated in backend but NextAuth session is missing
            signIn('platform-token', { token, redirect: false }).then((result) => {
                if (result?.ok) {
                    const rawReturnUrl = searchParams?.get('returnUrl') || searchParams?.get('from');
                    const target = rawReturnUrl ? decodeURIComponent(rawReturnUrl) : '/';
                    if (target === '/login' || target.startsWith('/login?')) {
                        window.location.href = '/';
                    } else {
                        window.location.href = target;
                    }
                }
            });
        }
    }, [isLoading, authLoading, user, authUser, token, searchParams]);

    // While the auth context or settings context is resolving, show a spinner
    // so the login form never flickers on screen for logged-in users.
    // However, if they haven't finished onboarding, we let them see the form so they can switch accounts.
    const isUserFullyOnboarded = user && ((user as any).isFirstLogin === false || (user as any).isOnboardingComplete === true);
    const shouldShowSpinner = isLoading || authLoading || isUserFullyOnboarded || settingsLoading;
    if (shouldShowSpinner) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
                <LogoLoader className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-semibold text-gray-400 tracking-wide">
                    {user ? 'Redirecting…' : 'Checking session…'}
                </p>
            </div>
        );
    }
    // ─────────────────────────────────────────────────────────────────────────

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setGoogleLoading(true);
        try {
            // 1. Authenticate with Express Backend to get platform_auth_token
            const authRes = await api.post('/api/auth/google', { tokenId: credentialResponse.credential });
            const { token: googleAuthToken, refreshToken } = authRes.data;
            if (googleAuthToken) {
                localStorage.setItem('platform_auth_token', googleAuthToken);
                localStorage.setItem('platform_refresh_token', refreshToken);
                const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
                const is180 = typeof window !== 'undefined' && window.location.hostname.endsWith('180workspace.com');
                const domainAttr = is180 ? '; domain=.180workspace.com' : '';
                const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}${domainAttr}`;
                document.cookie = `platform_auth_token=${googleAuthToken}${cookieFlags}`;
                api.defaults.headers.common['Authorization'] = `Bearer ${googleAuthToken}`;
                
                // 2. Authenticate with NextAuth using the platform-token provider
                const result = await signIn('platform-token', { 
                    token: googleAuthToken,
                    redirect: false 
                });

                if (result?.error) {
                    toast.error(result.error);
                } else if (result?.ok) {
                    toast.success('Logged in successfully!');
                    const rawReturnUrl = searchParams?.get('returnUrl') || searchParams?.get('from');
                    const target = rawReturnUrl ? decodeURIComponent(rawReturnUrl) : '/';
                    if (target === '/login' || target.startsWith('/login?')) {
                        window.location.href = '/';
                    } else {
                        window.location.href = target;
                    }
                }
            }
        } catch (err: any) {
            const errorMessage = err?.response?.data?.error || err?.message || 'Google login failed';
            toast.error(errorMessage);
            if (err?.response?.status === 404 || err?.response?.status === 401 || errorMessage.includes("We couldn't find an account")) {
                setTimeout(() => {
                    router.push('/signup');
                }, 1000);
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Authenticate with Express Backend first to get platform_auth_token
            const authRes = await api.post('/api/auth/login', { email, password });
            const { token: authToken, refreshToken } = authRes.data;
            if (authToken) {
                localStorage.setItem('platform_auth_token', authToken);
                localStorage.setItem('platform_refresh_token', refreshToken);
                const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
                const is180 = typeof window !== 'undefined' && window.location.hostname.endsWith('180workspace.com');
                const domainAttr = is180 ? '; domain=.180workspace.com' : '';
                const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}${domainAttr}`;
                document.cookie = `platform_auth_token=${authToken}${cookieFlags}`;
                api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
            }

            // 2. Authenticate with NextAuth
            const result = await signIn('platform-token', { 
                token: authToken,
                redirect: false 
            });
            
            if (result?.error) {
                toast.error(result.error);
                return;
            }
            
            if (result?.ok) {
                toast.success('Logged in successfully!');
                const rawReturnUrl = searchParams?.get('returnUrl') || searchParams?.get('from');
                const target = rawReturnUrl ? decodeURIComponent(rawReturnUrl) : '/';
                if (target === '/login' || target.startsWith('/login?')) {
                    window.location.href = '/';
                } else {
                    window.location.href = target;
                }
            }
        } catch (err: any) {
            console.error('Login error:', err);
            if (err?.message === 'Network Error' || !err?.response) {
                toast.error('Cannot connect to backend server. Please verify the backend is running on port 4002.');
            } else {
                const errorMessage = err?.response?.data?.error || err?.response?.data?.message || 'Login failed. Please check your credentials.';
                toast.error(errorMessage);
                if (err?.response?.status === 404 || err?.response?.status === 401 || errorMessage.includes("We couldn't find an account")) {
                    setTimeout(() => {
                        router.push('/signup');
                    }, 1000);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleMFA = async (e: FormEvent) => {
        e.preventDefault();
        toast.error('MFA via NextAuth is under construction.');
    };

    const handleForgotPassword = async (e: FormEvent) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotNotEligible(null);
        try {
            const eligRes = await api.get(`/api/auth/check-forgot-eligibility?email=${encodeURIComponent(forgotEmail)}`);
            if (!eligRes.data.eligible) {
                setForgotNotEligible(true);
                setForgotLoading(false);
                return;
            }
            await api.post('/api/auth/forgot-password', { email: forgotEmail });
            setForgotSent(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Something went wrong. Please try again.');
        } finally {
            setForgotLoading(false);
        }
    };

    const closeForgotModal = () => {
        setShowForgotModal(false);
        setForgotSent(false);
        setForgotEmail('');
        setForgotNotEligible(null);
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
            {/* Full Page Blue Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f61a_1px,transparent_1px),linear-gradient(to_bottom,#3b82f61a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            
            {/* Subtle blue orbs for depth */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

            {/* Large Logo Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <img src="/black icon.svg" alt="Watermark" className="w-[32rem] h-[32rem]" />
            </div>

            {/* ── Back to Landing Page Button ─────────────────────────── */}
            <Link href={process.env.NEXT_PUBLIC_MARKETING_URL || '/'} className="absolute top-6 left-6 z-50">
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200 text-slate-700 px-4 py-2.5 rounded-full shadow-sm hover:shadow text-sm font-bold transition-all duration-300 group"
                >
                    <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
                    <span>Back</span>
                </motion.button>
            </Link>

            {/* Floating Workspace Icons */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
                <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[15%] left-[15%] opacity-30">
                    <Users className="w-12 h-12 text-blue-600" />
                </motion.div>
                <motion.div animate={{ y: [0, 25, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-[20%] right-[20%] opacity-20">
                    <Bot className="w-16 h-16 text-indigo-600" />
                </motion.div>
                <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[25%] left-[20%] opacity-30">
                    <FolderKanban className="w-14 h-14 text-purple-600" />
                </motion.div>
                <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute bottom-[20%] right-[15%] opacity-25">
                    <BarChart3 className="w-12 h-12 text-blue-500" />
                </motion.div>
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} className="absolute top-[45%] left-[8%] opacity-20">
                    <MessageSquare className="w-10 h-10 text-indigo-500" />
                </motion.div>
                <motion.div animate={{ y: [0, 15, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2.5 }} className="absolute top-[60%] right-[8%] opacity-30">
                    <Cloud className="w-14 h-14 text-purple-500" />
                </motion.div>
            </div>

            {/* ── Login Form Container ─────────────────────────────────────────── */}
            <div className="w-full max-w-md relative z-10 p-8 sm:p-10 my-12">
                
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-10">
                        {platform?.logo ? (
                            <img src={platform.logo} alt="Logo" className="w-10 h-10 bg-white rounded-lg shadow-sm p-1" />
                        ) : (
                            <img src="/black icon.svg" alt="Icon" className="w-10 h-10" />
                        )}
                        {platform?.name ? (
                            <span className="font-bold text-xl text-gray-900">{platform.name}</span>
                        ) : (
                            <span className="font-bold tracking-tight text-xl text-gray-900"><span className="text-blue-600">180</span>workspace</span>
                        )}
                    </div>

                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome Back</h2>
                    </div>

                    {/* Google Auth */}
                    {!mfaRequired && (
                        <div className="mb-6">
                            {googleLoading ? (
                                <div className="flex justify-center items-center py-2.5 border border-gray-200 rounded-lg bg-gray-50 w-full mb-6">
                                    <LogoLoader className="w-5 h-5 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="w-full relative shadow-sm hover:shadow-md transition-shadow rounded overflow-hidden flex justify-center">
                                    <GoogleLogin 
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => toast.error('Google Auth Failed')}
                                        useOneTap={false}
                                        use_fedcm_for_prompt={false}
                                        theme="outline"
                                        size="large"
                                        text="continue_with"
                                        width="340"
                                        shape="pill"
                                    />
                                </div>
                            )}

                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-gray-50 text-gray-400 font-medium uppercase tracking-wider text-xs">Or continue with email</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {!mfaRequired ? (
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-4">
                                <div className="relative group/input">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-primary transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="jane.doe@company.com"
                                        required
                                        className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                    />
                                </div>

                                <div className="relative group/input">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within/input:text-primary transition-colors" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-12 py-3.5 text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { setShowForgotModal(true); setForgotEmail(email); }}
                                        className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors hover:underline"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed group"
                            >
                                {loading ? <LogoLoader className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                {loading ? 'Authenticating...' : 'Sign In'}
                            </motion.button>

                            <p className="text-center text-sm text-gray-500 font-medium pt-4">
                                Don&apos;t have an account?{' '}
                                <button type="button" onClick={() => router.push('/signup')} className="text-primary hover:text-primary-dark font-bold hover:underline transition-colors">
                                    Sign Up
                                </button>
                            </p>
                        </form>
                    ) : (
                        <motion.form 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onSubmit={handleMFA} 
                            className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
                        >
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                                    <ShieldCheck className="w-8 h-8 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Security Check</h2>
                                <p className="text-gray-500 text-sm mt-2">Enter the verification code from your authenticator app</p>
                            </div>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={mfaToken}
                                    onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 placeholder-gray-300 text-center text-3xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || mfaToken.length !== 6}
                                className="w-full py-4 rounded-2xl font-bold text-white bg-primary hover:bg-primary-dark transition-all duration-300 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <LogoLoader className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Identity'}
                            </button>
                            <button type="button" onClick={() => setMfaRequired(false)} className="w-full text-gray-400 hover:text-gray-600 text-sm font-semibold transition-colors">
                                Cancel
                            </button>
                        </motion.form>
                    )}
                </div>

            {/* ── Forgot Password Modal ─────────────────────────── */}
            <AnimatePresence>
                {showForgotModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm bg-gray-900/40"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative z-10 bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 border border-gray-100 overflow-hidden"
                        >
                            <button onClick={closeForgotModal} title="Close" aria-label="Close" className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                                <X className="w-5 h-5" />
                            </button>

                            {!forgotSent ? (
                                <>
                                    <div className="mb-6">
                                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 mb-4 border border-amber-100">
                                            <Key className="w-6 h-6 text-amber-500" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900">Forgot Password?</h3>
                                        <p className="text-sm text-gray-500 mt-2">Enter your admin email and we&apos;ll send you a new temporary password.</p>
                                    </div>
                                    <form onSubmit={handleForgotPassword} className="space-y-5">
                                        <div className="relative group/input">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-primary transition-colors" />
                                            <input
                                                type="email"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                placeholder="admin@company.com"
                                                required
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            />
                                        </div>

                                        {forgotNotEligible && (
                                            <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-100">
                                                Self-service password reset is restricted to Admin or Manager accounts. If you are an employee, please contact your administrator.
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={forgotLoading || !forgotEmail}
                                            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {forgotLoading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Retrieve Password'}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Check Your Inbox</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                                        If <strong>{forgotEmail}</strong> is registered, a new temporary password has been sent.
                                    </p>
                                    <button onClick={closeForgotModal} className="mt-8 w-full py-3 rounded-xl font-bold text-sm text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors">
                                        Back to Login
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><LogoLoader className="w-8 h-8 animate-spin text-primary" /></div>}>
            <LoginForm />
        </Suspense>
    );
}
