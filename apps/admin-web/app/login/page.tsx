'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, FormEvent, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, Key, Globe, X, CheckCircle2, Zap, ShieldCheck, BarChart3, ArrowRight } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { useSettings } from '../../lib/settings-context';
import api from '../../lib/api';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';

function LoginForm() {
    const { login, loginWithGoogle, user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { platform, isLoading: settingsLoading } = useSettings();

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
            const returnUrl = searchParams.get('returnUrl');
            router.replace(returnUrl ? decodeURIComponent(returnUrl) : '/dashboard');
        }
    }, [isLoading, user, router, searchParams]);

    // While the auth context or settings context is resolving, show a spinner
    // so the login form never flickers on screen for logged-in users.
    if (isLoading || user || settingsLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
                <LogoLoader className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-semibold text-gray-400 tracking-wide">
                    {user ? 'Redirecting to your dashboard…' : 'Checking session…'}
                </p>
            </div>
        );
    }
    // ─────────────────────────────────────────────────────────────────────────

    const handleGoogleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) return;
        setGoogleLoading(true);
        try {
            const result = await loginWithGoogle(credentialResponse.credential);
            handlePostLoginRedirect(result.company, result.user);
        } catch (err: any) {
            toast.error(err?.message || 'Google login failed');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await login(email, password);
            if (result.mfaRequired) {
                setMfaRequired(true);
                toast.success('Enter your 6-digit authenticator code');
            } else {
                handlePostLoginRedirect(result.company, result.user);
            }
        } catch (err: any) {
            if (err.setupToken) {
                toast('Redirecting to complete your workspace setup...', { icon: '⚙️' });
                router.push(`/signup?step=db_config&token=${err.setupToken}`);
                return;
            }
            if (err.onboardingRequired && err.onboardingToken) {
                // If it's an error from the backend saying onboarding is required, 
                // we should still check if this user is an admin or not if we have the user info.
                // But normally this error happens for regular logins where the backend blocks the token.
                // For Google login, the backend doesn't block it anymore, it passes through.
                toast('Redirecting to complete workspace onboarding...', { icon: '🚀' });
                router.push(`/workspace-setup?onboardingToken=${err.onboardingToken}`);
                return;
            }
            const errorMessage = err?.response?.data?.error || err?.message;
            if (!err?.response && (err?.message?.includes('Network Error') || err?.message?.includes('timeout'))) {
                toast.error('Unable to connect to the server. Please check your internet connection or the server status.', { duration: 6000 });
            } else {
                toast.error(errorMessage || 'Login failed. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleMFA = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await login(email, password, mfaToken);
            handlePostLoginRedirect(result.company, result.user);
        } catch (err: any) {
            toast.error(err?.message || err?.response?.data?.error || 'Invalid MFA code');
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

    const handlePostLoginRedirect = (company?: any, user?: any) => {
        const companyName = company?.name || company?.companyName;
        if (companyName) {
            toast.success(`Welcome back to ${companyName}!`, { icon: '👋', duration: 5000 });
        }

        const isAdmin = ['admin', 'manager'].includes(user?.role || '') || user?.roles?.includes('admin') || user?.roles?.includes('manager');

        // Only enforce onboarding/setup for admins
        if (isAdmin) {
            if (company && !company.databaseConfigured && company.setupToken) {
                router.push(`/signup?step=db_config&token=${company.setupToken}`);
                return;
            }
            if (company && company.isOnboardingComplete === false && company.onboardingToken) {
                router.push(`/workspace-setup?onboardingToken=${company.onboardingToken}`);
                return;
            }
        }

        const returnUrl = searchParams.get('returnUrl');
        api.post('/api/attendance/auto-checkin').catch(() => {});
        router.push(returnUrl ? decodeURIComponent(returnUrl) : '/dashboard');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* ── Left Column: Marketing Showcase ──────────────────────────────────── */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary to-[#0f172a] text-white p-12 flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-primary-dark/50 rounded-full blur-3xl" />
                
                <div className="relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex items-center gap-3 mb-16"
                    >
                        {platform?.logo ? (
                            <img src={platform.logo} alt="Logo" className="w-12 h-12 bg-white rounded-xl shadow-lg border-2 border-white/20 p-1" />
                        ) : (
                            <img src="/white icon.svg" alt="Icon" className="w-12 h-12" />
                        )}
                        {platform?.name ? (
                            <span className="font-bold tracking-widest text-lg uppercase text-white">{platform.name}</span>
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
                            Launch Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-300">Intelligence.</span>
                        </h1>
                        <p className="text-lg text-blue-100/80 leading-relaxed mb-12">
                            The enterprise-grade management system designed to scale with your workspace. Experience seamless HR, project management, and real-time insights in one unified dashboard.
                        </p>

                        <div className="space-y-6">
                            {[
                                { icon: Zap, title: "AI-Powered Automation", desc: "Reduce manual effort with smart workflows." },
                                { icon: ShieldCheck, title: "Enterprise Security", desc: "Bank-level encryption and secure tenant isolation." },
                                { icon: BarChart3, title: "Real-time Insights", desc: "Live analytics to drive data-backed decisions." }
                            ].map((feature, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.4 + (i * 0.1) }}
                                    className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm"
                                >
                                    <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                                        <feature.icon className="w-6 h-6 text-emerald-300" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">{feature.title}</h4>
                                        <p className="text-sm text-blue-100/60">{feature.desc}</p>
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
                    className="relative z-10 text-sm text-blue-100/40"
                >
                    &copy; {new Date().getFullYear()} {platform?.name || '180workspace'}. All rights reserved.
                </motion.div>
            </div>

            {/* ── Right Column: Login Form ─────────────────────────────────────────── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 xl:p-24 relative bg-gray-50">
                <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

                <div className="w-full max-w-md relative z-10">
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
                        {platform?.logo ? (
                            <img src={platform.logo} alt="Logo" className="w-10 h-10 bg-white rounded-lg shadow-sm p-1" />
                        ) : (
                        <img src="/black icon.svg" alt="Icon" className="w-10 h-10" />
                        )}
                        {platform?.name ? (
                            <span className="font-bold text-xl text-gray-900">{platform.name}</span>
                        ) : (
                            <img src="/black text logo.svg" alt="PitchIn 180" className="h-6" />
                        )}
                    </div>

                    <div className="text-center lg:text-left mb-10">
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Welcome Back</h2>
                        <p className="text-gray-500 font-medium">Please enter your credentials to access your workspace.</p>
                    </div>

                    {/* Google Auth */}
                    {!mfaRequired && (
                        <div className="mb-6">
                            {googleLoading ? (
                                <div className="flex justify-center items-center py-2.5 border border-gray-200 rounded-lg bg-gray-50 w-full mb-6">
                                    <LogoLoader className="w-5 h-5 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="w-full relative shadow-sm hover:shadow-md transition-shadow rounded overflow-hidden">
                                    <GoogleLogin 
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => toast.error('Google Auth Failed')}
                                        useOneTap={false}
                                        use_fedcm_for_prompt={false}
                                        theme="outline"
                                        size="large"
                                        text="continue_with"
                                        width="100%"
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

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-gray-900 hover:bg-black transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-gray-900/20 disabled:opacity-70 disabled:cursor-not-allowed group"
                            >
                                {loading ? <LogoLoader className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                {loading ? 'Authenticating...' : 'Sign In'}
                            </button>

                            <p className="text-center text-sm text-gray-500 font-medium pt-4">
                                Don&apos;t have an account?{' '}
                                <button type="button" onClick={() => router.push('/signup')} className="text-primary hover:text-primary-dark font-bold hover:underline transition-colors">
                                    Register Workspace
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
                                            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gray-900 hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
