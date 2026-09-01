'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Globe, ArrowRight, ChevronDown, Check, Search, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { FeatureLock } from '@workspace/ui';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const TOP_FONTS = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
    'Poppins', 'Nunito', 'Raleway', 'Outfit', 'Merriweather',
];

const ALL_PAGES = [
    { id: 'home',         name: 'Home',             locked: true },
];

function FontPicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [allFonts, setAllFonts] = useState(TOP_FONTS);
    const ref = useRef(null);

    useEffect(() => {
        fetch('https://api.fontsource.org/v1/fonts')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const fetched = data.map(f => f.family);
                    setAllFonts(Array.from(new Set([...TOP_FONTS, ...fetched])).sort());
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = search.trim() === '' ? TOP_FONTS : allFonts.filter(f => f.toLowerCase().includes(search.toLowerCase())).slice(0, 50);

    return (
        <div className="relative" ref={ref}>
            <div onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors">
                <span className="text-sm font-medium text-gray-800" style={{ fontFamily: `"${value}", sans-serif` }}>{value}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden flex flex-col max-h-60">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fonts..." className="w-full text-xs pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                        {search.trim() === '' && <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Popular Fonts</div>}
                        {filtered.length === 0 ? <div className="p-3 text-center text-xs text-gray-400">No fonts found</div> : filtered.map(font => (
                            <div
                                key={font}
                                onClick={() => { onChange(font); setOpen(false); setSearch(''); }}
                                className={`px-3 py-2 text-sm rounded-md cursor-pointer flex items-center justify-between ${font === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                <span style={{ fontFamily: `"${font}", sans-serif` }}>{font}</span>
                                {font === value && <Check className="w-4 h-4" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const getInitialSectionsForPage = (pageType: string, companyData: any = null) => {
    const ts = Date.now();
    const companyName = companyData?.name || 'Your Company Name';
    const companyEmail = companyData?.email || 'hello@yourcompany.com';
    const companyAddress = companyData?.address || 'Your Company Address';
    const companyPhone = companyData?.phone || '+1 234 567 8900';
    
    if (pageType === 'home') return [
        { id: `sec-home-hero-${ts}`, type: 'hero', data: { badge: 'Welcome`, title: `Welcome to ${companyName}`, subtitle: `Transform your business with our cutting-edge solutions.', buttonText: 'Get Started' } },
        { id: `sec-home-about-${ts}`, type: 'about', data: { title: 'About Us', content: 'We are a dedicated team providing top-notch services.', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800' } },
        { id: `sec-home-contact-${ts}`, type: 'contact', data: { title: 'Contact Us', subtitle: `Get in touch with us at ${companyEmail}.` } }
    ];
    if (pageType === 'about') return [
        { id: `sec-about-hero-${ts}`, type: 'hero', data: { badge: 'About Us`, title: `Who We Are at ${companyName}`, subtitle: `Learn more about our mission and values.', buttonText: 'Read Story' } },
        { id: `sec-about-about-${ts}`, type: 'about', data: { title: 'Our Journey', content: 'Founded with a simple vision: to deliver excellence and build trust.', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800' } }
    ];
    if (pageType === 'services') return [
        { id: `sec-srv-hero-${ts}`, type: 'hero', data: { badge: 'Services', title: 'Professional Services', subtitle: 'Tailored solutions for your business needs.', buttonText: 'View Details' } }
    ];
    if (pageType === 'portfolio') return [
        { id: `sec-pt-hero-${ts}`, type: 'hero', data: { badge: 'Portfolio', title: 'Our Work', subtitle: 'Explore our latest projects and case studies.', buttonText: 'View Work' } }
    ];
    if (pageType === 'contact') return [
        { id: `sec-cnt-hero-${ts}`, type: 'hero', data: { badge: 'Contact', title: 'Get In Touch', subtitle: 'Have questions? We are here to help.', buttonText: 'Send Message' } },
        { id: `sec-cnt-contact-${ts}`, type: 'contact', data: { title: 'Contact Us', subtitle: `Reach out to us at ${companyEmail} or call us at ${companyPhone}. We are located at ${companyAddress}.` } }
    ];
    if (pageType === 'terms') return [
        { id: `sec-terms-text-${ts}`, type: 'text', data: { content: `<h1>Terms and Conditions</h1><p>Please read these terms and conditions carefully before using services provided by ${companyName}.</p>` } }
    ];
    if (pageType === 'privacy') return [
        { id: `sec-priv-text-${ts}`, type: 'text', data: { content: `<h1>Privacy Policy</h1><p>We at ${companyName} value your privacy and protect your personal data in accordance with modern standards.</p>` } }
    ];
    return [];
};

export default function CreateWebsiteModal({ isOpen, onClose, onSuccess, websiteCount = 0, companyData }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [fontFamily, setFontFamily] = useState('Inter');
    const [primaryColor, setPrimaryColor] = useState('#4f46e5');
    const [enabledPages, setEnabledPages] = useState(new Set(['home']));
    const [companySlugInput, setCompanySlugInput] = useState('');

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const baseDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
    const [rootDomain, setRootDomain] = useState(baseDomain);
    
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [checkingSlug, setCheckingSlug] = useState(false);
    const [slugError, setSlugError] = useState('');

    const [billingInfo, setBillingInfo] = useState<any>(null);
    const [loadingBilling, setLoadingBilling] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && (baseDomain === 'localhost' || baseDomain === '')) {
            setRootDomain(window.location.host.replace(/^.*localhost/, 'localhost'));
        }
    }, [baseDomain]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Fetch billing info to check website limits
            const checkLimit = async () => {
                setLoadingBilling(true);
                try {
                    const res = await api.get('/api/v1/platform-billing');
                    setBillingInfo(res.data);
                } catch (err) {
                    console.error('Failed to fetch billing info', err);
                } finally {
                    setLoadingBilling(false);
                }
            };
            checkLimit();
        } else {
            document.body.style.overflow = 'unset';
            setBillingInfo(null);
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);
    
    useEffect(() => {
        const checkSlugAvailability = async () => {
            if (!slug) {
                setSlugAvailable(null);
                setSlugError('');
                return;
            }

            setCheckingSlug(true);
            setSlugError('');
            try {
                const res = await api.get('/api/websites/check-slug', {
                    params: { slug }
                });
                
                if (res.data.available) {
                    setSlugAvailable(true);
                } else {
                    setSlugAvailable(false);
                    setSlugError(res.data.reason || 'This URL is already taken.');
                }
            } catch (err) {
                setSlugAvailable(false);
                setSlugError('Failed to check availability.');
            } finally {
                setCheckingSlug(false);
            }
        };

        const timer = setTimeout(checkSlugAvailability, 500);
        return () => clearTimeout(timer);
    }, [slug]);

    const togglePage = (id, locked) => {
        if (locked) return;
        setEnabledPages(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) { toast.error('Please enter a website name'); return; }

        const pages = ALL_PAGES.map(p => ({
            id: p.id, name: p.name,
            slug: p.id === 'home' ? '/' : `/${p.id}`,
            isEnabled: enabledPages.has(p.id),
            sections: enabledPages.has(p.id) ? getInitialSectionsForPage(p.id, companyData) : [],
        }));

        const config = {
            brand: { primaryColor, fontFamily, textColor: '#111827', accentColor: '#10b981', headerFooterTheme: 'light' },
            pages,
        };

        try {
            setLoading(true);
            const res = await api.post('/api/websites', { 
                name: name.trim(), 
                slug, 
                config
            });
            const created = res.data.website;
            toast.success('Website created!');
            onSuccess();
            handleClose();
            router.push(`/advertising/${created.id}/edit`);
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Failed to create website');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setName(''); setFontFamily('Inter'); setPrimaryColor('#4f46e5'); setCompanySlugInput('');
        setEnabledPages(new Set(['home']));
        setSlugAvailable(null); setSlugError('');
        onClose();
    };

    const isLimitReached = billingInfo && 
        (billingInfo.currentSubscription?.plan?.maxWebsites !== undefined) &&
        (billingInfo.currentSubscription?.plan?.maxWebsites !== -1) &&
        (billingInfo.activeWebsitesCount >= billingInfo.currentSubscription?.plan?.maxWebsites);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 leading-tight">Create New Website</h2>
                            <p className="text-xs text-gray-500">Set up your new landing page</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loadingBilling ? (
                    <div className="flex-1 flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                ) : isLimitReached ? (
                    <div className="flex-1 overflow-y-auto p-5">
                        <FeatureLock 
                            title="Website Limit Reached"
                            description={`Your current plan allows up to ${billingInfo.currentSubscription?.plan?.maxWebsites} websites. Upgrade to create more.`}
                        />
                    </div>
                ) : (
                    <>
                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {/* Website Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Website Name</label>
                                <input type="text" required autoFocus placeholder="E.g. Summer Campaign 2024" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" value={name} onChange={e => setName(e.target.value)} />
                                
                                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
                                    <Globe className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-mono flex items-center">
                                        <span className="text-gray-400">https://</span>
                                        <span className="text-indigo-600 font-medium">{slug || 'website-name'}</span>
                                        <span className="text-gray-400">.{rootDomain}</span>
                                    </span>
                                    
                                    <div className="ml-2 flex items-center">
                                        {checkingSlug && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                                        {!checkingSlug && slugAvailable === true && (
                                            <div className="flex items-center gap-1 text-emerald-600 font-medium">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>Available</span>
                                            </div>
                                        )}
                                        {!checkingSlug && slugAvailable === false && (
                                            <div className="flex items-center gap-1 text-red-500 font-medium" title={slugError}>
                                                <XCircle className="w-3.5 h-3.5" />
                                                <span>Unavailable</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {!checkingSlug && slugAvailable === false && slugError && (
                                    <p className="mt-1.5 text-xs text-red-500 font-medium">{slugError}</p>
                                )}
                            </div>

                            {/* Font Family */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Font Family</label>
                                <FontPicker value={fontFamily} onChange={setFontFamily} />
                            </div>

                            {/* Brand Color */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand Color</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-9 h-9 rounded-md overflow-hidden border border-gray-300 shadow-sm cursor-pointer shrink-0">
                                        <input type="color" className="absolute inset-0 w-full h-full scale-150 cursor-pointer" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                                    </div>
                                    <input type="text" className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors uppercase" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
                            <button type="button" onClick={handleClose} className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">Cancel</button>
                            <button onClick={handleSubmit} disabled={loading || !name.trim() || checkingSlug || slugAvailable === false} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                                Create Website
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
