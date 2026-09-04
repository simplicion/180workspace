'use client';

// Super Admin Authentication Portal - Ultra Clean Light Enterprise Edition
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Shield, 
    Eye, 
    EyeOff, 
    Lock, 
    Mail, 
    KeyRound, 
    Database, 
    Cpu, 
    Layers, 
    ArrowRight, 
    ExternalLink, 
    Sparkles, 
    Fingerprint, 
    ShieldCheck, 
    Terminal
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { useSuperAdmin } from '../../../lib/superadmin-context';
import { useSettings } from '../../../lib/settings-context';
import { LogoLoader } from '@workspace/ui';

export default function SuperAdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [rememberSession, setRememberSession] = useState(true);
    const [loading, setLoading] = useState(false);
    const { login } = useSuperAdmin();
    const { platform } = useSettings();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanEmail = email.trim();
        if (!cleanEmail || !password) {
            return toast.error('Please enter both administrative email and password');
        }
        setLoading(true);
        try {
            const { data } = await saApi.post('/auth/login', { email: cleanEmail, password });
            toast.success(`Access granted. Welcome back, ${data.superAdmin.name || 'Admin'}!`);
            login(data.token, data.superAdmin);
            router.push('/superadmin');
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Authentication rejected. Verify administrative credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-50/70 text-slate-900 flex flex-col lg:flex-row relative overflow-hidden font-sans selection:bg-sky-500/20 selection:text-sky-800">
            <Toaster position="top-right" />

            {/* Ambient Dynamic Background Glows (Light Mode) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[55vw] h-[55vw] rounded-full bg-sky-400/10 blur-[130px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[55vw] h-[55vw] rounded-full bg-indigo-500/10 blur-[140px]" />
                <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[35vw] h-[35vw] rounded-full bg-purple-500/5 blur-[120px]" />
                {/* SVG Subtle Blueprint Grid Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c70d_1px,transparent_1px),linear-gradient(to_bottom,#0284c70d_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-80" />
            </div>

            {/* LEFT PANE: Visual Showcase & Telemetry Center (Desktop: 58% Width) */}
            <div className="hidden lg:flex lg:w-[58%] xl:w-[60%] flex-col justify-between p-12 xl:p-16 relative z-10 border-r border-slate-200/80 bg-white/60 backdrop-blur-md">
                {/* Brand & Security Status Header */}
                <div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                            {platform?.logo ? (
                                <img 
                                    src={platform.logo} 
                                    alt="Logo" 
                                    className="w-10 h-10 rounded-2xl object-contain bg-white shadow-xs p-1.5 border border-slate-200" 
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 border border-sky-400/30">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div>
                                <h2 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
                                    {platform?.platformName || '180workspace'}
                                    <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 font-mono">
                                        Core
                                    </span>
                                </h2>
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    Cloud Infrastructure Command
                                </p>
                            </div>
                        </div>

                        {/* Live Gateway Health Indicator */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 font-medium shadow-2xs">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700">Gateway: Active</span>
                            <span className="text-[10px] font-mono text-emerald-600 font-semibold pl-1.5 border-l border-emerald-200">4.1ms</span>
                        </div>
                    </div>

                    {/* Headline Hero Section */}
                    <div className="mt-14 xl:mt-18 max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-sky-700 text-xs font-bold uppercase tracking-widest mb-5">
                            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                            Platform Orchestration & Governance
                        </div>
                        <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                            Unified Enterprise <br />
                            <span className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Multi-Tenant Control
                            </span>
                        </h1>
                        <p className="mt-4 text-sm xl:text-base text-slate-600 leading-relaxed font-normal">
                            Centralized command center for automated workspace provisioning, subscription lifecycle management, dynamic feature gating, and database cluster isolation.
                        </p>
                    </div>

                    {/* Live Telemetry Showcase Grid */}
                    <div className="mt-8 xl:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                        {/* Tile 1: Infrastructure Isolation */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-sky-300 transition-all group">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 group-hover:scale-105 transition-transform">
                                    <Database className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    HEALTHY
                                </span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">PostgreSQL Multi-Tenant</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Automated schema isolation with zero-downtime tenant migration capabilities.
                            </p>
                        </div>

                        {/* Tile 2: Zero-Trust Security */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all group">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-105 transition-transform">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                    TLS 1.3
                                </span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">Cryptographic Audit Ledger</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Immutable administrative event tracking with IP actor tracing and instant revocation.
                            </p>
                        </div>

                        {/* Tile 3: Feature Flag Engine */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-purple-300 transition-all group">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 group-hover:scale-105 transition-transform">
                                    <Layers className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                    REAL-TIME
                                </span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">Runtime Feature Gating</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Dynamic rollouts, beta environment tagging, and instant kill switches across all tenants.
                            </p>
                        </div>

                        {/* Tile 4: High-Throughput Dispatcher */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all group">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-105 transition-transform">
                                    <Cpu className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    0 LAG
                                </span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">Asynchronous Telemetry</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Continuous metric stream aggregating tenant MRR, seats, and active infrastructure load.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Left Footer */}
                <div className="mt-10 pt-6 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-slate-500 font-semibold">Build: v2.4.0-cloud-admin</span>
                        <span>•</span>
                        <span>SOC 2 Type II Compliant</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px] font-semibold">End-to-End Encrypted</span>
                    </div>
                </div>
            </div>

            {/* RIGHT PANE: Authentication Terminal (Desktop: 42% Width, Full-Height Focus) */}
            <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 relative z-10 bg-white/95 backdrop-blur-2xl">
                {/* Top Quick Actions */}
                <div className="flex items-center justify-between mb-8 lg:mb-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-widest">
                        <Terminal className="w-3.5 h-3.5 text-sky-600" />
                        Root Access Portal
                    </div>

                    <a
                        href="http://localhost:3000"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-sky-600 transition-colors p-2 rounded-xl hover:bg-slate-100"
                        title="Go to main tenant portal"
                    >
                        <span>Tenant Platform</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>

                {/* Main Login Form Container */}
                <div className="w-full max-w-md mx-auto my-auto py-8">
                    {/* Security Badge & Form Title */}
                    <div className="mb-8 text-center lg:text-left">
                        <div className="inline-flex lg:hidden w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 items-center justify-center shadow-lg shadow-sky-500/20 mb-4 border border-sky-400/30">
                            <Shield className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Command Authentication
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
                            Enter authorized super admin credentials to establish root management session.
                        </p>
                    </div>

                    {/* High-Security Warning Pill */}
                    <div className="p-3.5 bg-sky-50/80 border border-sky-200/90 rounded-2xl mb-6 flex items-start gap-3 shadow-2xs">
                        <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700 mt-0.5 shrink-0 border border-sky-200">
                            <Fingerprint className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-sky-900 leading-relaxed font-medium">
                            <strong className="text-sky-950 font-bold">Restricted Zone:</strong> All session operations, database diagnostics, and tenant modifications are recorded.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                Administrator Identity
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-600 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="simplicion.com@gmail.com"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all shadow-2xs font-medium"
                                    autoComplete="email"
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Master Credential
                                </label>
                                <span className="text-[11px] font-mono text-slate-400 font-semibold">AES-256</span>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-600 transition-colors" />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all shadow-2xs font-mono tracking-wider"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                    title={showPw ? "Hide password" : "Show password"}
                                >
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Session Checkbox */}
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rememberSession}
                                    onChange={e => setRememberSession(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 bg-white text-sky-600 focus:ring-sky-500 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-slate-600 hover:text-slate-800">
                                    Preserve active session for 12h
                                </span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:via-blue-600 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2.5 group cursor-pointer"
                            >
                                {loading ? (
                                    <>
                                        <LogoLoader className="w-4 h-4 animate-spin text-white" />
                                        <span>Verifying Cryptographic Identity...</span>
                                    </>
                                ) : (
                                    <>
                                        <KeyRound className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                        <span>Authenticate Command Access</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Bottom Protocol Footer */}
                <div className="pt-6 border-t border-slate-200 text-center lg:text-left flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <p>© 2026 {platform?.platformName || '180workspace'} Core Architecture</p>
                    <div className="flex items-center gap-4 text-[11px] font-semibold">
                        <span className="text-slate-600">Identity: Root Auth</span>
                        <span>•</span>
                        <span className="text-slate-600">Environment: Production</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
