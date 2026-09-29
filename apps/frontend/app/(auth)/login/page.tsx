'use client';

import { LogoLoader } from "@workspace/ui";
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Users, Bot, FolderKanban, MessageSquare, Cloud, ArrowLeft } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import { motion } from 'framer-motion';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useAuth } from '@/lib/auth-context';
import { use180Identity, OneEightyIdentityButton } from '@workspace/identity-sdk';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { platform } = useSettings();
    const { data: session, status } = useSession();
    const { user: authUser, isLoading: authLoading } = useAuth();
    const { isOpeningIdentity } = use180Identity();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const user = session?.user;
    const isLoading = status === "loading";

    // ── Handle 180 Profile Identity Success ──────────────────────────────
    const handleIdentitySuccess = async (res: any) => {
        setIsLoggingIn(true);
        const token = res?.token || (typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : null);
        if (token) {
            try {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('platform_auth_token', token);
                    const isProd = window.location.protocol === 'https:';
                    const is180 = window.location.hostname.endsWith('180workspace.com');
                    const domainAttr = is180 ? '; domain=.180workspace.com' : '';
                    const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}${domainAttr}`;
                    document.cookie = `platform_auth_token=${token}${cookieFlags}`;
                }

                const result = await signIn('platform-token', { token, redirect: false });
                if (result?.ok) {
                    const rawReturnUrl = searchParams?.get('returnUrl') || searchParams?.get('from');
                    const target = rawReturnUrl ? decodeURIComponent(rawReturnUrl) : '/';
                    if (target === '/login' || target.startsWith('/login?')) {
                        window.location.href = '/';
                    } else {
                        window.location.href = target;
                    }
                } else {
                    window.location.href = '/';
                }
            } catch (_) {
                window.location.href = '/';
            }
        }
    };

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
        if (!isLoading && !user && localToken) {
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
    }, [isLoading, user, searchParams]);

    const localToken = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : null;
    const isUserFullyOnboarded = user && ((user as any).isOnboardingComplete === true);
    const isRedirectingAuthenticatedUser = !isLoading && !!user && isUserFullyOnboarded && !!localToken && searchParams?.get('clearSession') !== 'true';

    if (isRedirectingAuthenticatedUser) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
                <LogoLoader className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-sm font-semibold text-gray-400 tracking-wide">
                    Redirecting to your workspace…
                </p>
            </div>
        );
    }

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

            {/* ── Back Button: takes user directly to 180workspace.com ─────────────────────────── */}
            <a href={process.env.NEXT_PUBLIC_MARKETING_URL || 'https://180workspace.com'} className="absolute top-6 left-6 z-50">
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200 text-slate-700 px-4 py-2.5 rounded-full shadow-sm hover:shadow text-sm font-bold transition-all duration-300 group cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
                    <span>Back</span>
                </motion.button>
            </a>

            {/* Floating Workspace Icons */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
                <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[15%] left-[15%] opacity-30">
                    <Users className="w-12 h-12 text-blue-600" />
                </motion.div>
                <motion.div animate={{ y: [0, 25, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-[20%] right-[20%] opacity-20">
                    <Bot className="w-16 h-16 text-indigo-600" />
                </motion.div>
                <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[25%] left-[20%] opacity-30">
                    <FolderKanban className="w-14 h-14 text-blue-600" />
                </motion.div>
                <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute bottom-[20%] right-[15%] opacity-25">
                    <BarChart3 className="w-12 h-12 text-blue-500" />
                </motion.div>
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} className="absolute top-[45%] left-[8%] opacity-20">
                    <MessageSquare className="w-10 h-10 text-indigo-500" />
                </motion.div>
                <motion.div animate={{ y: [0, 15, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2.5 }} className="absolute top-[60%] right-[8%] opacity-30">
                    <Cloud className="w-14 h-14 text-sky-500" />
                </motion.div>
            </div>

            {/* ── Login Form Container ─────────────── */}
            <div className="w-full max-w-md relative z-10 p-8 sm:p-10 my-12 overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    {platform?.logo ? (
                        <img src={platform.logo} alt="Logo" className="w-10 h-10 bg-white rounded-lg shadow-sm p-1" />
                    ) : (
                        <img src="/black icon.svg" alt="Icon" className="w-10 h-10" />
                    )}
                    {platform?.platformName ? (
                        <span className="font-bold text-xl text-gray-900">{platform.platformName}</span>
                    ) : (
                        <span className="font-bold tracking-tight text-xl text-gray-900"><span className="text-blue-600">180</span>workspace</span>
                    )}
                </div>

                {/* ─── 1-CLICK 180 IDENTITY BUTTON (ONLY AUTH METHOD) ─── */}
                <div className="w-full">
                    <OneEightyIdentityButton 
                        clientId={process.env.NEXT_PUBLIC_180_CLIENT_ID || '180_client_5cc136397553836e34eb37ce22d13a53'}
                        isProcessing={isLoggingIn}
                        disabled={isOpeningIdentity || isLoggingIn} 
                        onSuccess={handleIdentitySuccess}
                    />
                </div>

                {/* Footer — Create Workspace Link */}
                <div className="mt-8 text-center border-t border-gray-200 pt-6 relative z-10 w-full max-w-md">
                    <p className="text-gray-600 text-sm font-medium">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-blue-600 font-bold hover:text-blue-800 transition-colors ml-1">
                            Create Workspace
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><LogoLoader className="w-8 h-8 animate-spin text-blue-600" /></div>}>
            <LoginForm />
        </Suspense>
    );
}
