'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../lib/auth-context';
import { useSettings } from '../../lib/settings-context';
import api from '../../lib/api';
import { motion } from 'framer-motion';
import { use180Identity, OneEightyIdentityButton } from '@workspace/identity-sdk';

function LoginForm() {
    const { user, isLoading, refreshUser, setToken, setUser, setCompany } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { platform, isLoading: settingsLoading } = useSettings();
    const { isOpeningIdentity } = use180Identity();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // ── Auto-login: redirect already-authenticated users ─────────────────────
    useEffect(() => {
        if (!isLoading && user) {
            const returnUrl = searchParams.get('returnUrl');
            router.replace(returnUrl ? decodeURIComponent(returnUrl) : '/dashboard');
        }
    }, [isLoading, user, router, searchParams]);

    const handleIdentitySuccess = async (res: any) => {
        setIsLoggingIn(true);
        let token = res?.token || (typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : null);
        let nextDestination: string | null = null;
        
        // If an OAuth authorization code was provided, exchange it with backend
        if (res?.code) {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';
                let callbackRes = await fetch(`${apiUrl}/api/v1/auth/180-identity/callback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: res.code,
                        redirectUri: typeof window !== 'undefined' ? window.location.origin + '/oauth/callback' : undefined,
                    }),
                });

                if (!callbackRes.ok) {
                    callbackRes = await fetch(`${apiUrl}/api/auth/180-identity/callback`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code: res.code,
                            redirectUri: typeof window !== 'undefined' ? window.location.origin + '/oauth/callback' : undefined,
                        }),
                    });
                }

                if (callbackRes.ok) {
                    const data = await callbackRes.json();
                    if (data?.accessToken) {
                        token = data.accessToken;
                    }
                    if (data?.redirectUrl) {
                        nextDestination = data.redirectUrl;
                    }
                }
            } catch (exchangeErr) {
                console.warn('[180 Identity] Code exchange failed, falling back to sovereign token:', exchangeErr);
            }
        }

        if (token) {
            try {
                localStorage.setItem('platform_auth_token', token);
                const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
                const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost';
                const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}`;
                document.cookie = `platform_auth_token=${token}${cookieFlags}`;

                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setToken(token);

                // Fetch user info
                try {
                    const meRes = await api.get('/api/auth/me');
                    if (meRes.data?.user) {
                        setUser(meRes.data.user);
                        setCompany(meRes.data.company || null);
                    }
                } catch (_) {}

                toast.success('Signed in successfully!');
                const returnUrl = searchParams.get('returnUrl');
                const target = returnUrl ? decodeURIComponent(returnUrl) : (nextDestination || '/dashboard');
                router.push(target);
            } catch (err: any) {
                toast.error(err?.message || 'Authentication failed');
            } finally {
                setIsLoggingIn(false);
            }
        } else {
            setIsLoggingIn(false);
        }
    };

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
                        <span className="font-bold text-2xl tracking-tight">
                            {platform?.platformName ? (
                                <>{platform.platformName} <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold ml-2">Console</span></>
                            ) : (
                                <>180<span className="text-blue-400">workspace</span> <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold ml-2">Console</span></>
                            )}
                        </span>
                    </motion.div>

                    <div className="space-y-6 max-w-lg">
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-4xl font-extrabold tracking-tight leading-tight"
                        >
                            Enterprise Operations & Workspace Control.
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-lg text-white/80 leading-relaxed font-normal"
                        >
                            Sign in with your sovereign 180 Profile to manage organization governance, telemetry, and platform configurations.
                        </motion.p>
                    </div>
                </div>

                <div className="relative z-10 border-t border-white/10 pt-6">
                    <p className="text-xs text-white/40">Powered by 180 Core Sovereign Identity</p>
                </div>
            </div>

            {/* ── Right Column: 180 Identity Auth ───────────────────────────── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
                <div className="w-full max-w-md space-y-8">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            Sign in to Console
                        </h2>
                        <p className="text-sm text-gray-500 mt-2 font-medium">
                            Authenticate securely with your sovereign 180 Identity.
                        </p>
                    </div>

                    <div className="pt-4">
                        <OneEightyIdentityButton 
                            clientId={process.env.NEXT_PUBLIC_180_CLIENT_ID}
                            isProcessing={isLoggingIn}
                            disabled={isOpeningIdentity || isLoggingIn} 
                            text="Sign in with 180 Profile"
                            processingText="Verifying identity…"
                            onSuccess={handleIdentitySuccess}
                        />
                    </div>

                    <div className="text-center pt-4">
                        <p className="text-xs text-gray-400">
                            Session management, password recovery, and multi-factor authentication are handled sovereignly by 180 Identity.
                        </p>
                    </div>
                </div>
            </div>
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
