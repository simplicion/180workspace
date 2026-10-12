'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { useSuperAdmin } from '../../../lib/superadmin-context';
import { LogoLoader } from '@workspace/ui';

export default function SuperAdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useSuperAdmin();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanEmail = email.trim();
        if (!cleanEmail || !password) {
            return toast.error('Please enter both email and password');
        }
        setLoading(true);
        try {
            const { data } = await saApi.post('/auth/login', { email: cleanEmail, password });
            toast.success(`Access granted. Welcome back!`);
            login(data.token, data.superAdmin);
            router.push('/superadmin');
        } catch (err: any) {
            toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Authentication rejected. Verify administrative credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
            <Toaster position="top-right" />

            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8">
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Admin Email"
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
                                autoComplete="email"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Master Password"
                                className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-md shadow-sky-600/20 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <LogoLoader className="w-4 h-4 animate-spin text-white" />
                                <span>Authenticating...</span>
                            </>
                        ) : (
                            <>
                                <span>Authenticate Command Access</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
