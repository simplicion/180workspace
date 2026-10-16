'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useSettings } from '../../lib/settings-context';
import { useAuth } from '../../lib/auth-context';
import api from '../../lib/api';
import { motion } from 'framer-motion';
import { use180Identity, OneEightyIdentityButton } from '@workspace/identity-sdk';

function SignupForm() {
    const { platform } = useSettings();
    const { setToken, setUser, setCompany } = useAuth();
    const { isOpeningIdentity } = use180Identity();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleIdentitySuccess = async (res: any) => {
        setLoading(true);
        let token = res?.token || (typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : null);
        let nextDestination: string | null = null;
        
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
                console.warn('[180 Identity] Code exchange failed:', exchangeErr);
            }
        }

        if (token) {
            try {
                localStorage.setItem('platform_auth_token', token);
                const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
                const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}`;
                document.cookie = `platform_auth_token=${token}${cookieFlags}`;

                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setToken(token);

                try {
                    const meRes = await api.get('/api/auth/me');
                    if (meRes.data?.user) {
                        setUser(meRes.data.user);
                        setCompany(meRes.data.company || null);
                    }
                } catch (_) {}

                toast.success('Workspace created successfully!');
                router.push(nextDestination || '/dashboard');
            } catch (err: any) {
                toast.error(err?.message || 'Authentication failed');
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
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
                            Create Your Sovereign Enterprise Workspace.
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-lg text-white/80 leading-relaxed font-normal"
                        >
                            Seamlessly register your organization using 180 Profile Sovereign Identity with automatic tenant provisioning.
                        </motion.p>
                    </div>
                </div>

                <div className="relative z-10 border-t border-white/10 pt-6">
                    <p className="text-xs text-white/40">Powered by 180 Core Sovereign Identity</p>
                </div>
            </div>

            {/* ── Right Column: Registration ───────────────────────────── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
                <div className="w-full max-w-md space-y-8">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            Register Workspace
                        </h2>
                        <p className="text-sm text-gray-500 mt-2 font-medium">
                            Create a new company workspace using your 180 Profile.
                        </p>
                    </div>

                    <div className="pt-4 space-y-4">
                        <OneEightyIdentityButton 
                            clientId={process.env.NEXT_PUBLIC_180_CLIENT_ID}
                            isProcessing={loading}
                            disabled={isOpeningIdentity || loading} 
                            text="Create Workspace with 180 Profile"
                            processingText="Provisioning workspace…"
                            onSuccess={handleIdentitySuccess}
                        />

                        <div className="text-center pt-2">
                            <p className="text-xs text-gray-400">
                                180 Identity sovereignly manages profile verification and multi-tenant credentials.
                            </p>
                        </div>
                    </div>

                    <div className="text-center border-t border-gray-100 pt-6">
                        <p className="text-sm text-gray-500 font-medium">
                            Already have an account?{' '}
                            <Link href="/login" className="text-primary hover:text-primary-dark font-bold hover:underline transition-colors ml-1">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><LogoLoader className="w-8 h-8 animate-spin text-primary" /></div>}>
            <SignupForm />
        </Suspense>
    );
}
