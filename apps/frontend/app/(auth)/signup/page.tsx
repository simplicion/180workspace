'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useSettings } from '@/lib/settings-context';
import { motion } from 'framer-motion';
import { signIn, useSession } from 'next-auth/react';
import api from '@/lib/api';

import { Users, Bot, FolderKanban, MessageSquare, Cloud, BarChart3, ArrowLeft } from 'lucide-react';
import { use180Identity, OneEightyIdentityButton } from '@workspace/identity-sdk';

export default function SignupFlow() {
    const { platform } = useSettings();
    const { data: session, status } = useSession();
    const { isOpeningIdentity } = use180Identity();
    const [loading, setLoading] = useState(false);

    // --- Resume if already logged in ---
    useEffect(() => {
        if (status === 'authenticated' && session?.user) {
            const user: any = session.user;
            if (user.isOnboardingComplete) {
                window.location.href = '/';
                return;
            }
            if (user.isFirstLogin === false) {
                window.location.href = '/workspace-setup';
                return;
            }
        }
    }, [status, session]);

    const handleIdentitySuccess = async (res: any) => {
        let token = res?.token || (typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : null);
        let nextDestination: string | null = null;
        
        // If an OAuth authorization code was provided, exchange it for a valid Workspace session token
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
            setLoading(true);
            try {
                localStorage.setItem('platform_auth_token', token);
                const isProd = window.location.protocol === 'https:';
                const is180 = window.location.hostname.endsWith('180workspace.com');
                const domainAttr = is180 ? '; domain=.180workspace.com' : '';
                const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}${domainAttr}`;
                document.cookie = `platform_auth_token=${token}${cookieFlags}`;
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                const result = await signIn('platform-token', { token, redirect: false });
                if (result?.ok) {
                    toast.success('Signed in successfully!');
                    window.location.href = nextDestination || '/';
                } else {
                    window.location.href = nextDestination || '/';
                }
            } catch (_) {
                window.location.href = nextDestination || '/';
            } finally {
                setLoading(false);
            }
        }
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

            {/* ── Signup Form Container ─────────────────────────────────────────── */}
            <div className="w-full max-w-md relative z-10 p-8 sm:p-10 my-12 overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-10">
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

                {/* ─── 1-CLICK 180 IDENTITY BUTTON (PRIMARY SOVEREIGN AUTH) ─── */}
                <div className="w-full max-w-md relative z-10 space-y-4">
                    <OneEightyIdentityButton 
                        clientId={process.env.NEXT_PUBLIC_180_CLIENT_ID}
                        isProcessing={loading}
                        disabled={isOpeningIdentity || loading} 
                        text="Create Workspace with 180 Profile"
                        processingText="Setting up your sovereign account…"
                        onSuccess={handleIdentitySuccess}
                    />

                    <div className="text-center">
                        <p className="text-xs text-gray-500">
                            By continuing, you agree to our Terms of Service & Privacy Policy. Powered by 180 Core Sovereign Identity.
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center border-t border-gray-200 pt-8 relative z-10 w-full max-w-md">
                    <p className="text-gray-600 text-sm font-medium">
                        Already have an account?{' '}
                        <Link href="/login" className="text-blue-600 font-bold hover:text-blue-800 transition-colors ml-1">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
