'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useSettings } from '@/lib/settings-context';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, useSession } from 'next-auth/react';
import { jwtDecode } from 'jwt-decode';
import api from '@/lib/api';

// Steps
import AuthChoice from '@/app/(auth)/_components/AuthChoice';
import OtpVerification from '@/app/(auth)/_components/OtpVerification';
import PasswordSetup from '@/app/(auth)/_components/PasswordSetup';
import BasicProfile from '@/app/(auth)/_components/BasicProfile';
import { Rocket, Shield, Clock } from 'lucide-react';

export default function SignupFlow() {
    const router = useRouter();
    const { platform } = useSettings();
    const { data: session, status, update: updateSession } = useSession();

    const [step, setStep] = useState(1);
    
    // State to collect through the flow
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('');
    const [profile, setProfile] = useState<any>({});
    
    const [loading, setLoading] = useState(false);
    const [googleTokenId, setGoogleTokenId] = useState<string | null>(null);

    // --- Resume Onboarding if already logged in ---
    useEffect(() => {
        if (status === 'authenticated' && session?.user) {
            const user: any = session.user;
            if (user.isFirstLogin !== false && step < 4) {
                setEmail(user.email || '');
                setStep(4);
            }
        }
    }, [status, session, step]);

    // --- Step 1: Auth Choice ---
    useEffect(() => {
        const targetUrl = step >= 4 ? '/onboarding' : '/signup';
        // Only push if it's not already the current state to avoid infinite loops
        if (window.history.state?.step !== step) {
            window.history.pushState({ step }, '', targetUrl);
        }

        const handlePopState = (event: PopStateEvent) => {
            if (event.state && event.state.step) {
                setStep(event.state.step);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [step]);

    const handleGoogleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) return;
        setLoading(true);
        try {
            // Check if user already exists
            const authRes = await api.post('/api/auth/google', { tokenId: credentialResponse.credential });
            const { token, refreshToken } = authRes.data;
            if (token) {
                // User already exists, log them in
                localStorage.setItem('platform_auth_token', token);
                localStorage.setItem('platform_refresh_token', refreshToken);
                document.cookie = `platform_auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                await signIn('platform-token', { token, redirect: false });
                toast.success('Welcome back!');
                router.push('/dashboard');
                return;
            }
        } catch (err: any) {
            // New user via Google
            if (err?.response?.status === 404 || err?.response?.status === 401) {
                setGoogleTokenId(credentialResponse.credential);
                try {
                    const decoded: any = jwtDecode(credentialResponse.credential);
                    if (decoded.email) setEmail(decoded.email);
                    if (decoded.name) setProfile({ ...profile, name: decoded.name });
                    
                    // Skip OTP, go straight to password setup (or we could skip password too, but let's just go to Role)
                    // Wait, if they use Google, they don't need a password. 
                    // But if we want to enforce password setup, we go to step 3. 
                    // Let's go to step 3 for security if we want them to have a fallback password.
                    setStep(3);
                } catch (e) {
                    toast.error('Failed to parse Google credential.');
                }
            } else {
                toast.error(err?.response?.data?.error || 'Google Sign In failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = async (submittedEmail: string) => {
        setEmail(submittedEmail);
        setLoading(true);
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: submittedEmail })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('OTP sent to your email!');
                setStep(2); // Go to OTP verification
            } else {
                toast.error(data.message || 'Failed to send OTP');
                if (data.code === 'USER_EXISTS') {
                    router.push('/login');
                }
            }
        } catch (err) {
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    // --- Step 2: OTP Verification ---
    const handleVerifyOtp = async (otp: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Email verified!');
                setStep(3); // Go to Password setup
            } else {
                toast.error(data.message || 'Invalid OTP');
            }
        } catch (err) {
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    // --- Step 3: Password Setup ---
    const handleSetPassword = async (newPassword: string) => {
        setPassword(newPassword);
        setLoading(true);
        try {
            // First set password
            let res;
            if (googleTokenId) {
                res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: profile.name || 'User', email, password: newPassword, companyName: 'Onboarding' }),
                });
            } else {
                res = await fetch('/api/auth/set-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: newPassword })
                });
            }
            
            const data = await res.json();
            if (res.ok || data.success) {
                // Log them in so they get the JWT token
                await api.post('/api/auth/login', { email, password: newPassword }).then(authRes => {
                    const token = authRes.data.token;
                    localStorage.setItem('platform_auth_token', token);
                    document.cookie = `platform_auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                }).catch(e => console.error("Auto login failed", e));

                // Also establish NextAuth session
                await signIn('credentials', { email, password: newPassword, redirect: false });
                
                setStep(4); // Go to Role selection
            } else {
                toast.error(data.message || data.error || 'Failed to set password');
            }
        } catch (err) {
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    // --- Step 4: Basic Profile (Final) ---
    const handleProfileSubmit = async (profileData: any) => {
        setProfile({ ...profile, ...profileData });
        setLoading(true);
        try {
            const finalData = {
                email,
                role: 'ADMIN', // Implicit for 180workspace
                ...profile,
                ...profileData,
                interests: []
            };

            const res = await fetch('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData)
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Onboarding complete!');
                
                // Update session to reflect new role before redirecting
                await updateSession({ role: 'ADMIN', isOnboardingComplete: true, isFirstLogin: false });

                router.push('/workspace-setup');
            } else {
                toast.error(data.message || 'Failed to complete onboarding');
            }
        } catch (err) {
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* ── Left Column: Marketing Showcase ──────────────────────────────────── */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#0f172a] via-blue-900 to-[#0f172a] text-white p-12 flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl opacity-50" />
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
                            <span className="font-bold tracking-tight text-2xl text-white uppercase"><span className="text-blue-500">180</span>workspace</span>
                        )}
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="max-w-xl"
                    >
                        <h1 className="text-5xl font-extrabold leading-tight tracking-tight mb-6 flex items-center flex-wrap">
                            Join <span className="font-bold tracking-tight text-5xl text-white ml-4 mt-2"><span className="text-blue-500">180</span>workspace</span>.
                        </h1>
                        <p className="text-lg text-gray-300 leading-relaxed mb-12">
                            Connect with founders, investors, and top talent. Showcase your ideas, build your network, and shape the future.
                        </p>

                        <div className="space-y-6">
                            {[
                                { icon: Rocket, title: "Discover Startups", desc: "Find the next big thing before anyone else." },
                                { icon: Shield, title: "Secure Networking", desc: "Build meaningful connections safely." },
                                { icon: Clock, title: "Fast-Track Growth", desc: "Access mentors and resources instantly." }
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

            {/* ── Right Column: Interactive Form ─────────────────────────────────────────── */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 xl:p-24 relative overflow-y-auto min-h-screen">
                
                {/* Mobile Logo */}
                <div className="lg:hidden flex items-center justify-center gap-3 mb-10 absolute top-8">
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

                {/* Progress Indicators */}
                <div className="w-full max-w-md mb-8 flex justify-center gap-2">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-blue-600' : s < step ? 'w-4 bg-blue-300' : 'w-4 bg-gray-200'}`} />
                    ))}
                </div>

                {/* Render Current Step */}
                <div className="w-full max-w-md relative z-10">
                    <AnimatePresence mode="wait">
                        {step === 1 && <AuthChoice key="step1" onGoogleSuccess={handleGoogleSuccess} onEmailSubmit={handleEmailSubmit} googleLoading={loading} />}
                        {step === 2 && <OtpVerification key="step2" email={email} onVerify={handleVerifyOtp} isVerifying={loading} onBack={() => setStep(1)} onResend={() => handleEmailSubmit(email)} isResending={loading} />}
                        {step === 3 && <PasswordSetup key="step3" onSubmit={handleSetPassword} isSubmitting={loading} onBack={() => setStep(2)} />}
                        {step === 4 && <BasicProfile key="step4" onSubmit={handleProfileSubmit} isSubmitting={loading} onBack={() => setStep(3)} />}
                    </AnimatePresence>
                </div>

                {step === 1 && (
                    <div className="mt-8 text-center border-t border-gray-200 pt-8 relative z-10 w-full max-w-md">
                        <p className="text-gray-600 text-sm font-medium">
                            Already have an account?{' '}
                            <Link href="/login" className="text-blue-600 font-bold hover:text-blue-800 transition-colors ml-1">
                                Sign in
                            </Link>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
