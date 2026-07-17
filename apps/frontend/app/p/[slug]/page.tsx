'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { CheckCircle2, ArrowRight, Mail, Phone, User, ShieldCheck, Layout, Sparkles } from 'lucide-react';

export default function PublicWebsitePage() {
    const { slug } = useParams();
    const [website, setWebsite] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    useEffect(() => {
        fetchWebsite();
    }, [slug]);

    const fetchWebsite = async () => {
        try {
            setLoading(true);
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            
            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
            const subdomain = isLocalhost
                ? (parts.length >= 2 && parts[parts.length - 1].split(':')[0] === 'localhost' ? parts[0] : null)
                : (parts.length > 2 ? parts[0] : null);

            const targetUrl = subdomain && !['www', 'ims', 'app'].includes(subdomain)
                ? `${window.location.protocol}//${subdomain}.${isLocalhost ? 'localhost:5000' : 'ims.com'}/api/public/websites/${slug}`
                : `${apiBase}/api/public/websites/${slug}`;

            const res = await axios.get(targetUrl);
            setWebsite(res.data.website);
            
            if (res.data.pixels) {
                res.data.pixels.forEach((pixel: any) => {
                    injectPixel(pixel);
                });
            }
        } catch (err) {
            console.error('Failed to load website:', err);
            setError('Website not found or inactive.');
        } finally {
            setLoading(false);
        }
    };

    const injectPixel = (pixel: any) => {
        try {
            if (pixel.type === 'facebook') {
                const script = document.createElement('script');
                script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${pixel.pixelId}');fbq('track', 'PageView');`;
                document.head.appendChild(script);
            }
        } catch (e) {
            console.error('Failed to inject pixel:', e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
            const subdomain = isLocalhost
                ? (parts.length >= 2 && parts[parts.length - 1].split(':')[0] === 'localhost' ? parts[0] : null)
                : (parts.length > 2 ? parts[0] : null);

            const targetUrl = subdomain && !['www', 'ims', 'app'].includes(subdomain)
                ? `${window.location.protocol}//${subdomain}.${isLocalhost ? 'localhost:5000' : 'ims.com'}/api/public/websites/${slug}/lead`
                : `${apiBase}/api/public/websites/${slug}/lead`;

            await axios.post(targetUrl, formData);
            setSubmitted(true);
            
            if (window.fbq) window.fbq('track', 'Lead');
        } catch (err) {
            alert('Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <LogoLoader className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error || !website) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="w-10 h-10 text-gray-300" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Website Unavailable</h1>
                <p className="text-gray-500 max-w-md">{error || 'The page you are looking for does not exist or has been moved.'}</p>
            </div>
        );
    }

    const config = website.config || {};
    const hero = config.hero || {};
    const colors = config.colors || { primary: '#4f46e5', secondary: '#ffffff', accent: '#10b981' };
    const primaryColor = colors.primary;
    const sections = config.sections || {};

    return (
        <div 
            className="min-h-screen bg-white font-sans text-gray-900 selection:bg-indigo-100" 
            style={{ 
                fontFamily: config.typography?.body || 'Inter',
                backgroundColor: colors.secondary,
                '--primary': primaryColor,
                '--heading-font': config.typography?.heading || 'Inter'
            } as any}
        >
            {/* Header */}
            <header className="px-6 py-8 flex justify-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-white font-black text-xl" style={{ backgroundColor: primaryColor }}>
                        {website.name[0]}
                    </div>
                    <span className="text-xl font-black tracking-tight">{website.name}</span>
                </div>
            </header>

            {/* Hero Section */}
            <main className="max-w-6xl mx-auto px-6 py-12 md:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest mb-8">
                            <Sparkles className="w-3.5 h-3.5" />
                            Special Offer Just For You
                        </div>
                        <h1 
                            className="text-4xl md:text-6xl font-black text-gray-900 leading-[1.1] mb-6"
                            style={{ fontFamily: 'var(--heading-font), sans-serif' }}
                        >
                            {hero.title || `Get Started with ${website.name} Today`}
                        </h1>
                        <p className="text-lg md:text-xl text-gray-500 mb-12 leading-relaxed">
                            {hero.subtitle || 'Transform your business with our cutting-edge solutions. Sign up below to get exclusive access and a free consultation.'}
                        </p>

                        <div className="hidden lg:block">
                            {submitted ? <SuccessMessage message={config.automation?.successMessage} /> : <LeadForm handleSubmit={handleSubmit} formData={formData} setFormData={setFormData} submitting={submitting} primaryColor={primaryColor} buttonText={hero.buttonText} />}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-100 border border-gray-100">
                            {hero.imageUrl ? (
                                <img src={hero.imageUrl} alt="Hero" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full aspect-video bg-gray-50 flex items-center justify-center">
                                    <Layout className="w-20 h-20 text-gray-200" />
                                </div>
                            )}
                        </div>
                        
                        <div className="lg:hidden mt-12">
                            {submitted ? <SuccessMessage message={config.automation?.successMessage} /> : <LeadForm handleSubmit={handleSubmit} formData={formData} setFormData={setFormData} submitting={submitting} primaryColor={primaryColor} buttonText={hero.buttonText} />}
                        </div>
                    </div>
                </div>
            </main>

            {/* Optional Sections */}
            {sections.benefits?.active && (
                <section className="bg-gray-50 py-24">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 
                                className="text-3xl md:text-4xl font-black text-gray-900 mb-4"
                                style={{ fontFamily: 'var(--heading-font), sans-serif' }}
                            >
                                {sections.benefits.title}
                            </h2>
                            <p className="text-gray-500 max-w-2xl mx-auto">Discover the advantages of working with the best in the industry.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {(sections.benefits.items?.length > 0 ? sections.benefits.items : [
                                { title: 'Premium Quality', desc: 'We deliver only the highest standard of service.', icon: 'ShieldCheck' },
                                { title: 'Expert Team', desc: 'Our professionals are leaders in their fields.', icon: 'User' },
                                { title: '24/7 Support', desc: 'We are always here when you need us most.', icon: 'Phone' }
                            ]).map((b: any, i: number) => {
                                const Icon = b.icon === 'ShieldCheck' ? ShieldCheck : b.icon === 'User' ? User : b.icon === 'Phone' ? Phone : ShieldCheck;
                                return (
                                    <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">{b.title}</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {sections.faq?.active && (
                <section className="py-24">
                    <div className="max-w-4xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 
                                className="text-3xl md:text-4xl font-black text-gray-900 mb-4"
                                style={{ fontFamily: 'var(--heading-font), sans-serif' }}
                            >
                                {sections.faq.title}
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {(sections.faq.items?.length > 0 ? sections.faq.items : [
                                { q: 'How do I get started?', a: 'Simply fill out the form above and our team will contact you within 24 hours.' },
                                { q: 'What is the pricing?', a: 'We offer competitive pricing tailored to your specific business needs.' },
                                { q: 'Do you offer a free trial?', a: 'Yes, we provide a 14-day risk-free trial for all new clients.' }
                            ]).map((f: any, i: number) => (
                                <div key={i} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                    <h4 className="font-bold text-gray-900 mb-2">{f.q}</h4>
                                    <p className="text-sm text-gray-500">{f.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <footer className="py-12 border-t border-gray-50 text-center">
                <p className="text-sm text-gray-400 font-medium">© {new Date().getFullYear()} {website.name}. All Rights Reserved.</p>
                <div className="mt-4 flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest font-black text-gray-300">
                    <span>Privacy Policy</span>
                    <span className="w-1 h-1 rounded-full bg-gray-200" />
                    <span>Terms of Service</span>
                </div>
            </footer>
        </div>
    );
}

function LeadForm({ handleSubmit, formData, setFormData, submitting, primaryColor, buttonText }: any) {
    return (
        <form onSubmit={handleSubmit} className="space-y-5 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-gray-100 text-left">
            <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        required
                        placeholder="John Doe"
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="email" 
                        required
                        placeholder="john@example.com"
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="tel" 
                        required
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>
            </div>

            <button 
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)' }}
            >
                {submitting ? (
                    <LogoLoader className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        {buttonText || 'Get Started Now'}
                        <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>
        </form>
    );
}

function SuccessMessage({ message }: { message?: string }) {
    return (
        <div className="text-center py-12 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-gray-100">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-500">{message || "We've received your request and will get back to you shortly."}</p>
        </div>
    );
}

declare global {
    interface Window {
        fbq: any;
    }
}
