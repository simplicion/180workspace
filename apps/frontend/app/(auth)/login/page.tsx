'use client';

import { LogoLoader, AILogoIcon, Button } from "@workspace/ui";
import { useState, FormEvent, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, Key, Globe, X, CheckCircle2, Zap, ShieldCheck, BarChart3, ArrowRight, Users, Bot, FolderKanban, MessageSquare, Cloud, ArrowLeft, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import api from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useAuth } from '@/lib/auth-context';
import { use180Identity } from '@workspace/identity-sdk';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { platform } = useSettings();
    const { data: session, status } = useSession();
    const { user: authUser, isLoading: authLoading } = useAuth();
    const { launch180Identity, isOpeningIdentity } = use180Identity();
    const user = session?.user;
    const isLoading = status === "loading";

    // Traditional & Fallback State
    const [showDirectLogin, setShowDirectLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    // Forgot Password state
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);
    const [forgotNotEligible, setForgotNotEligible] = useState<boolean | null>(null);

    // ── Auto-login: redirect already-authenticated users ─────────────────────
    useEffect(() => {
        if (searchParams?.get('clearSession') === 'true') {
            localStorage.removeItem('platform_auth_token');
            localStorage.removeItem('platform_refresh_token');
            sessionStorage.removeItem('platform_init_data');
            signOut({ redirect: false });
            return;
        }

        const localToken = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : null;

        if (!isLoading && user) {
            if (localToken && typeof document !== 'undefined') {
                const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
                const is180 = typeof window !== 'undefined' && window.location.hostname.endsWith('180workspace.com');
                const domainAttr = is180 ? '; domain=.180workspace.com' : '';
                const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}${domainAttr}`;
                document.cookie = `platform_auth_token=${localToken}${cookieFlags}`;
            } else if (!localToken) {
                signOut({ redirect: false });
                return;
            }

            if (!(user as any).isOnboardingComplete) {
                if ((user as any).isFirstLogin === false) {
                    router.replace('/workspace-setup');
                } else {
                    router.replace('/signup');
                }
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
    }, [isLoading, user, router, searchParams]);

    // ── Auto-login: Sync platform_auth_token to NextAuth if missing ───────
    useEffect(() => {
        if (searchParams?.get('clearSession') === 'true') return;
        const localToken = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : null;
        if (!isLoading && !authLoading && !user && authUser && localToken) {
            signIn('platform-token', { token: localToken, redirect: false }).then((result) => {
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
    }, [isLoading, authLoading, user, authUser, searchParams]);

    const localToken = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : null;
    const isUserFullyOnboarded = user && ((user as any).isOnboardingComplete === true);
    const isRedirectingAuthenticatedUser = !isLoading && !!user && isUserFullyOnboarded && !!localToken && searchParams?.get('clearSession') !== 'true';

    if (isRedirectingAuthenticatedUser) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center gap-4 text-white">
                <LogoLoader className="w-10 h-10 animate-spin text-purple-400" />
                <p className="text-sm font-semibold text-zinc-400 tracking-wide">
                    Redirecting to your sovereign workspace…
                </p>
            </div>
        );
    }

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setGoogleLoading(true);
        try {
            const authRes = await api.post('/api/auth/google', { tokenId: credentialResponse.credential });
            const { token: googleAuthToken, refreshToken } = authRes.data;
            if (googleAuthToken) {
                localStorage.setItem('platform_auth_token', googleAuthToken);
                if (refreshToken) localStorage.setItem('platform_refresh_token', refreshToken);
                const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
                const is180 = typeof window !== 'undefined' && window.location.hostname.endsWith('180workspace.com');
                const domainAttr = is180 ? '; domain=.180workspace.com' : '';
                const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}${domainAttr}`;
                document.cookie = `platform_auth_token=${googleAuthToken}${cookieFlags}`;
                api.defaults.headers.common['Authorization'] = `Bearer ${googleAuthToken}`;
                
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
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const authRes = await api.post('/api/auth/login', { email, password });
            const { token: authToken, refreshToken } = authRes.data;
            if (authToken) {
                localStorage.setItem('platform_auth_token', authToken);
                if (refreshToken) localStorage.setItem('platform_refresh_token', refreshToken);
                const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
                const is180 = typeof window !== 'undefined' && window.location.hostname.endsWith('180workspace.com');
                const domainAttr = is180 ? '; domain=.180workspace.com' : '';
                const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}${domainAttr}`;
                document.cookie = `platform_auth_token=${authToken}${cookieFlags}`;
                api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
            }

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
            const errorMessage = err?.response?.data?.error || err?.response?.data?.message || 'Login failed. Please check your credentials.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
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
        <div className="min-h-screen bg-[#070709] text-zinc-100 flex items-center justify-center relative overflow-hidden px-4 selection:bg-purple-500/30">
            {/* Ambient Nebula Gradients */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-purple-600/15 via-indigo-600/15 to-pink-500/10 blur-[130px] rounded-full pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

            {/* Back to Home Button */}
            <Link href={process.env.NEXT_PUBLIC_MARKETING_URL || '/'} className="absolute top-6 left-6 z-50">
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center gap-2 bg-zinc-900/80 backdrop-blur-md border border-white/10 text-zinc-300 px-4 py-2.5 rounded-full shadow-lg hover:border-purple-500/40 text-xs font-semibold transition-all duration-300 group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Overview</span>
                </motion.button>
            </Link>

            {/* ── Main Unified 180 Profile Sign-In Card ─────────────────────────── */}
            <div className="w-full max-w-md relative z-10 my-10">
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="glass-panel bg-[#101012]/90 border border-white/10 rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-2xl space-y-7"
                >
                    {/* Brand Header */}
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-[1px] mx-auto shadow-xl shadow-purple-500/25">
                            <div className="w-full h-full bg-[#101012] rounded-2xl flex items-center justify-center p-3">
                                <AILogoIcon className="w-full h-full text-purple-400 animate-pulse" />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-center gap-1.5 font-bold tracking-tight text-2xl text-white">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400">
                                    180
                                </span>
                                <span>workspace</span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                                Enterprise Sovereign Intelligence & Work Graph
                            </p>
                        </div>
                    </div>

                    {/* ─── 1-CLICK 180 IDENTITY / 180 PROFILE MODAL LAUNCHER ─── */}
                    <div className="space-y-4">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-300 group-hover:blur-md animate-pulse"></div>
                            
                            <button
                                type="button"
                                disabled={isOpeningIdentity}
                                onClick={launch180Identity}
                                className="relative w-full rounded-2xl p-[1px] bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer shadow-xl"
                            >
                                <div className="w-full bg-[#0d0d10] hover:bg-[#141419] rounded-[15px] px-5 py-4 flex items-center justify-between transition-colors">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                                            180
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-white flex items-center gap-2">
                                                <span>Continue with 180 Profile</span>
                                                <span className="flex h-2 w-2 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-zinc-400 font-medium">
                                                1-Click Sovereign Identity • WhatsApp OTP
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-purple-500/20 flex items-center justify-center text-white transition-colors">
                                        {isOpeningIdentity ? (
                                            <LogoLoader className="w-4 h-4 animate-spin text-purple-400" />
                                        ) : (
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-purple-300" />
                                        )}
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Sovereign Feature Highlights */}
                        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-zinc-400">
                            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.04] flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Zero-Trust Auth</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.04] flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>180 Pay Unified</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── Expandable Alternative & Direct Login ─── */}
                    <div className="border-t border-white/[0.08] pt-4 space-y-4">
                        <button
                            type="button"
                            onClick={() => setShowDirectLogin(!showDirectLogin)}
                            className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 cursor-pointer"
                        >
                            <span>Need Google or Admin Password Sign In?</span>
                            {showDirectLogin ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <AnimatePresence>
                            {showDirectLogin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-4 overflow-hidden pt-2"
                                >
                                    {/* Google Auth Fallback */}
                                    <div className="flex justify-center">
                                        {googleLoading ? (
                                            <div className="flex justify-center items-center py-2.5 border border-white/10 rounded-xl bg-zinc-900 w-full">
                                                <LogoLoader className="w-4 h-4 animate-spin text-purple-400" />
                                            </div>
                                        ) : (
                                            <div className="w-full relative shadow-sm rounded-xl overflow-hidden flex justify-center">
                                                <GoogleLogin 
                                                    onSuccess={handleGoogleSuccess}
                                                    onError={() => toast.error('Google Auth Failed')}
                                                    useOneTap={false}
                                                    use_fedcm_for_prompt={false}
                                                    theme="filled_black"
                                                    size="large"
                                                    text="continue_with"
                                                    shape="pill"
                                                    width="360"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative my-3 flex items-center justify-center">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-white/[0.06]"></div>
                                        </div>
                                        <span className="relative px-3 bg-[#101012] text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                            Or Direct Admin Credentials
                                        </span>
                                    </div>

                                    {/* Traditional Form */}
                                    <form onSubmit={handleLogin} className="space-y-3">
                                        <div className="relative group/input">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within/input:text-purple-400 transition-colors" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="admin@company.com"
                                                required
                                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all shadow-inner"
                                            />
                                        </div>

                                        <div className="relative group/input">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within/input:text-purple-400 transition-colors" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all shadow-inner"
                                            />
                                            <button
                                                type="button"
                                                title={showPassword ? 'Hide password' : 'Show password'}
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => { setShowForgotModal(true); setForgotEmail(email); }}
                                                className="text-[11px] text-zinc-400 hover:text-purple-400 transition-colors"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            {loading ? <LogoLoader className="w-3.5 h-3.5 animate-spin text-white" /> : <ArrowRight className="w-3.5 h-3.5" />}
                                            <span>{loading ? 'Authenticating...' : 'Sign In with Credentials'}</span>
                                        </Button>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer Links */}
                    <div className="pt-2 text-center text-[11px] text-zinc-500 space-y-2">
                        <p>
                            Don&apos;t have a workspace yet?{' '}
                            <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-semibold hover:underline">
                                Create Workspace
                            </Link>
                        </p>
                        <div className="flex items-center justify-center gap-4 text-zinc-600">
                            <Link href="https://docs.180workspace.com" target="_blank" className="hover:text-zinc-400">Docs</Link>
                            <span>•</span>
                            <Link href="https://developers.180workspace.com" target="_blank" className="hover:text-zinc-400">Developers</Link>
                            <span>•</span>
                            <Link href="https://profile.180workspace.com" target="_blank" className="hover:text-zinc-400">180 Profile</Link>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ── Forgot Password Modal ─────────────────────────── */}
            <AnimatePresence>
                {showForgotModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-md bg-black/70"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            className="relative z-10 bg-[#101012] rounded-3xl shadow-2xl w-full max-w-md p-7 border border-white/10 overflow-hidden text-zinc-100"
                        >
                            <button onClick={closeForgotModal} title="Close" aria-label="Close" className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors p-1 rounded-full hover:bg-zinc-800">
                                <X className="w-4 h-4" />
                            </button>

                            {!forgotSent ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                            <Key className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Forgot Password?</h3>
                                        <p className="text-xs text-zinc-400">Enter your admin email and we&apos;ll send you a temporary access code.</p>
                                    </div>
                                    <form onSubmit={handleForgotPassword} className="space-y-4">
                                        <div className="relative group/input">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within/input:text-purple-400 transition-colors" />
                                            <input
                                                type="email"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                placeholder="admin@company.com"
                                                required
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all"
                                            />
                                        </div>

                                        {forgotNotEligible && (
                                            <div className="p-3 bg-red-500/10 text-red-400 text-xs rounded-xl border border-red-500/20">
                                                Self-service password reset is restricted to Admin accounts. If you are an employee, please use 180 Profile or contact your workspace admin.
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={forgotLoading || !forgotEmail}
                                            className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                                        >
                                            {forgotLoading ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : 'Retrieve Password'}
                                        </Button>
                                    </form>
                                </div>
                            ) : (
                                <div className="text-center py-4 space-y-3">
                                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        <CheckCircle2 className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Check Your Inbox</h3>
                                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                                        If <strong>{forgotEmail}</strong> is registered, password instructions have been dispatched.
                                    </p>
                                    <Button onClick={closeForgotModal} className="mt-4 w-full py-2.5 rounded-xl font-bold text-xs text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors">
                                        Back to Sign In
                                    </Button>
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
        <Suspense fallback={<div className="min-h-screen bg-[#070709] flex items-center justify-center"><LogoLoader className="w-8 h-8 animate-spin text-purple-500" /></div>}>
            <LoginForm />
        </Suspense>
    );
}
