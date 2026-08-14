'use client';

import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
// import { motion } from 'framer-motion';
const motion = {
    h1: 'h1',
    p: 'p',
    div: 'div',
    button: 'button',
    nav: 'nav',
    section: 'section',
    span: 'span'
} as any;
import { Globe, ArrowRight, ShieldCheck, Zap, Users, LayoutDashboard, ChevronRight, Star, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../lib/settings-context';
import { useAuth } from '../lib/auth-context';

export default function HomePage() {
    const router = useRouter();
    const { company, platform, settings } = useSettings();
    const { user, isLoading } = useAuth();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Standardized Subdomain Detection
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const parts = hostname.split('.');
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const subdomain = isLocalhost
        ? (parts.length > 1 && parts[parts.length - 1].split(':')[0] === 'localhost' ? parts[0] : null)
        : (parts.length > 2 ? parts[0] : null);

    const activeSubdomain = subdomain && !['www', 'ims', 'api', 'admin', 'app', 'localhost'].includes(subdomain) ? subdomain : null;

    // ── Auto-login: send authenticated users straight to the dashboard ───────
    useEffect(() => {
        if (typeof window !== 'undefined' && !activeSubdomain && window.location.pathname === '/') {
            if (!isLoading) {
                // If auth resolved and user is already logged in, skip login page
                router.replace(user ? '/superadmin' : '/superadmin/login');
            }
        }
    }, [activeSubdomain, router, user, isLoading]);

    if (!activeSubdomain) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <LogoLoader className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }


    const branding = company || platform;
    const brandingName = company?.companyName || platform?.name || '180workspace';
    const brandingLogo = company?.companyLogo || platform?.logo;
    const brandingTagline = company?.tagline || platform?.tagline || 'Intelligent Management System';
    const brandingEmail = company?.companyEmail || platform?.email;
    const brandingPhone = company?.phoneNumber || platform?.phone;
    const brandingAddress = company?.address || platform?.address;

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-primary/20">
            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-gray-100 py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            {brandingLogo ? (
                                <img src={brandingLogo} alt={brandingName} className="w-6 h-6 object-contain" />
                            ) : (
                                <span className="text-white font-bold text-xl">{brandingName?.[0] || 'I'}</span>
                            )}
                        </div>
                        <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                            {brandingName}
                        </span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-500">
                        <a href="#features" className="hover:text-primary transition-colors">Features</a>
                        <a href="#about" className="hover:text-primary transition-colors">About</a>
                        <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
                    </div>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <button
                                onClick={() => router.push('/superadmin')}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center gap-2"
                            >
                                Go to Admin Panel
                                <LayoutDashboard className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => window.location.href = `${window.location.origin}/superadmin/login`}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center gap-2"
                            >
                                Sign In to Portal
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[120px] -z-10" />

                <div className="max-w-7xl mx-auto px-6 text-center lg:text-left flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest"
                        >
                            <Star className="w-3.5 h-3.5 fill-primary" />
                            Premium Workspace Experience
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-6xl lg:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight"
                        >
                            Elevate Your <span className="text-primary italic">Business</span> with {brandingName}
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-gray-500 max-w-2xl leading-relaxed"
                        >
                            {brandingTagline}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-wrap justify-center lg:justify-start gap-4"
                        >
                            {user ? (
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="group px-8 py-4 rounded-2xl bg-gray-900 text-white font-bold text-lg hover:bg-gray-800 shadow-2xl shadow-gray-200 transition-all flex items-center gap-3"
                                >
                                    Go to Dashboard
                                    <LayoutDashboard className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => window.location.href = `${window.location.origin}/login?subdomain=${activeSubdomain}`}
                                    className="group px-8 py-4 rounded-2xl bg-gray-900 text-white font-bold text-lg hover:bg-gray-800 shadow-2xl shadow-gray-200 transition-all flex items-center gap-3"
                                >
                                    Get Started
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                            <button className="px-8 py-4 rounded-2xl bg-white border-2 border-gray-100 text-gray-600 font-bold text-lg hover:border-primary/20 hover:text-primary transition-all">
                                View Demo
                            </button>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center justify-center lg:justify-start gap-8 pt-8"
                        >
                            <div className="flex flex-col items-center lg:items-start">
                                <span className="text-2xl font-black text-gray-900">500+</span>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Active Users</span>
                            </div>
                            <div className="h-8 w-px bg-gray-100" />
                            <div className="flex flex-col items-center lg:items-start">
                                <span className="text-2xl font-black text-gray-900">99.9%</span>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Uptime</span>
                            </div>
                            <div className="h-8 w-px bg-gray-100" />
                            <div className="flex flex-col items-center lg:items-start">
                                <span className="text-2xl font-black text-gray-900">4.9/5</span>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Rating</span>
                            </div>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="flex-1 relative"
                    >
                        <div className="relative z-10 bg-white p-4 rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] border border-gray-100">
                            <div className="bg-gray-50 rounded-[2rem] overflow-hidden aspect-[4/3] flex items-center justify-center relative group">
                                {(branding as any)?.previewImage ? (
                                    <img src={(branding as any).previewImage} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                ) : (
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                                            <LayoutDashboard className="w-10 h-10 text-primary" />
                                        </div>
                                        <p className="text-gray-400 font-bold tracking-tight">Enterprise Workspace Preview</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-8">
                                    <div className="flex items-center gap-3 text-white">
                                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold">Encrypted End-to-End</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating elements */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-700" />
                    </motion.div>
                </div>
            </section>

            {/* Features Preview */}
            <section id="features" className="py-24 bg-gray-50/50 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Engineered for Excellence</h2>
                        <p className="text-lg text-gray-500 leading-relaxed">Powerful tools designed to simplify complex operational tasks and drive team productivity to new heights.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { title: 'Real-time Intelligence', desc: 'Monitor your operations with live data and smart insights.', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
                            { title: 'Team Collaboration', desc: 'Connect your workforce with seamless communication tools.', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                            { title: 'Enterprise Security', desc: 'Bank-grade encryption protecting your sensitive company data.', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                viewport={{ once: true }}
                                className="p-10 rounded-[2.5rem] bg-white border border-gray-100 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all group"
                            >
                                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                                </div>
                                <h3 className="text-xl font-bold mb-4 tracking-tight">{feature.title}</h3>
                                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About / CTA */}
            <section id="about" className="py-24 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="bg-gray-900 rounded-[3rem] p-12 lg:p-24 relative overflow-hidden flex flex-col lg:flex-row items-center gap-16">
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />

                        <div className="flex-1 space-y-8 relative z-10">
                            <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight">Ready to transform how you <span className="text-primary italic">manage</span> your business?</h2>
                            <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
                                Join thousands of progressive companies using our platform to centralize their operations, boost efficiency, and scale with confidence.
                            </p>
                            <div className="grid grid-cols-2 gap-6 pt-4">
                                {['Smart Analytics', 'Automated Workflows', 'Client Portals', 'Data Governance'].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-white font-bold">
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex-shrink-0 relative z-10">
                            <button
                                onClick={() => {
                                    if (user) {
                                        router.push('/superadmin');
                                    } else {
                                        window.location.href = `${window.location.origin}/superadmin/login`;
                                    }
                                }}
                                className="px-8 py-4 rounded-2xl font-bold text-lg text-white bg-primary hover:bg-primary-dark shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0 transition-all duration-200 flex items-center gap-4 group"
                            >
                                {user ? 'Go to Admin Panel' : 'Get Started Now'}
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="contact" className="py-20 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 justify-center md:justify-start">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <span className="text-white font-bold text-lg">{brandingName?.[0] || 'I'}</span>
                            </div>
                            <span className="text-lg font-black tracking-tight">{brandingName}</span>
                        </div>
                        <p className="text-sm text-gray-400 font-medium leading-relaxed">
                            Empowering modern enterprises with the world&apos;s most intuitive management ecosystem.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <h4 className="font-black text-sm uppercase tracking-widest text-gray-900">Platform</h4>
                        <ul className="space-y-4 text-sm font-semibold text-gray-500">
                            <li><a href="#" className="hover:text-primary transition-colors">Dashboard</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Modules</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Security</a></li>
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <h4 className="font-black text-sm uppercase tracking-widest text-gray-900">Legal</h4>
                        <ul className="space-y-4 text-sm font-semibold text-gray-500">
                            <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">GDPR</a></li>
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <h4 className="font-black text-sm uppercase tracking-widest text-gray-900">Connect</h4>
                        <div className="flex items-center gap-4 justify-center md:justify-start">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"><Globe className="w-5 h-5" /></div>
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"><Users className="w-5 h-5" /></div>
                        </div>
                        {brandingEmail && <p className="text-sm text-gray-400 font-bold">{brandingEmail}</p>}
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-gray-50 text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em]">
                        &copy; {new Date().getFullYear()} {brandingName} &bull; All Rights Reserved &bull; Secure Enterprise Instance
                    </p>
                </div>
            </footer>
        </div>
    );
}

