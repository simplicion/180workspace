'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Globe, ArrowRight, ChevronDown, Check, Search } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const TOP_FONTS = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
    'Poppins', 'Nunito', 'Raleway', 'Outfit', 'Merriweather',
];

const ALL_PAGES = [
    { id: 'home',         name: 'Home',             locked: true },
    { id: 'about',        name: 'About',            locked: false },
    { id: 'services',     name: 'Services',         locked: false },
    { id: 'portfolio',    name: 'Portfolio',        locked: false },
    { id: 'contact',      name: 'Contact',          locked: false },
    { id: 'terms',        name: 'Terms of Service', locked: false },
    { id: 'privacy',      name: 'Privacy Policy',   locked: false },
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
            <div onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 transition-colors">
                <span className="text-sm font-semibold text-gray-800" style={{ fontFamily: `"${value}", sans-serif` }}>{value}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-60">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fonts..." className="w-full text-xs pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                        {search.trim() === '' && <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">Popular Fonts</div>}
                        {filtered.length === 0 ? <div className="p-3 text-center text-xs text-gray-400">No fonts found</div> : filtered.map(font => (
                            <button key={font} type="button" onClick={() => { onChange(font); setOpen(false); setSearch(''); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${value === font ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`} style={{ fontFamily: `"${font}", sans-serif` }}>
                                {font}
                                {value === font && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                            </button>
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
        { id: `sec-home-hero-${ts}`, type: 'hero', data: { badge: 'Welcome', title: `Welcome to ${companyName}`, subtitle: 'Transform your business with our cutting-edge solutions.', buttonText: 'Get Started' } },
        { id: `sec-home-about-${ts}`, type: 'about', data: { title: 'About Us', content: 'We are a dedicated team providing top-notch services.', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800' } },
        { id: `sec-home-contact-${ts}`, type: 'contact', data: { title: 'Contact Us', subtitle: `Get in touch with us at ${companyEmail}.` } }
    ];
    if (pageType === 'about') return [
        { id: `sec-about-hero-${ts}`, type: 'hero', data: { badge: 'About Us', title: `Who We Are at ${companyName}`, subtitle: 'Learn more about our mission and values.', buttonText: 'Read Story' } },
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
    const isPrimary = websiteCount === 0;
    const baseDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
    const [rootDomain, setRootDomain] = useState(baseDomain);

    useEffect(() => {
        if (typeof window !== 'undefined' && (baseDomain === 'localhost' || baseDomain === '')) {
            setRootDomain(window.location.host.replace(/^.*localhost/, 'localhost'));
        }
    }, [baseDomain]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
    
    const displayCompanySlug = isPrimary 
        ? (companySlugInput || name.toLowerCase().replace(/[^a-z0-9]/g, '')) 
        : (companyData?.slug || 'yourcompany');

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
            whatsapp: { enabled: false, phone: '', position: 'bottom-right' },
        };

        try {
            setLoading(true);
            const res = await api.post('/api/websites', { 
                name: name.trim(), 
                slug, 
                config,
                companySlug: isPrimary ? displayCompanySlug : undefined
            });
            const created = res.data.website;
            toast.success('Website created!');
            onSuccess();
            handleClose();
            router.push(`/dashboard/advertising/${created.id}/edit`);
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Failed to create website');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setName(''); setFontFamily('Inter'); setPrimaryColor('#4f46e5');
        setEnabledPages(new Set(['home']));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                            <Globe className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Create New Website</h2>
                            <p className="text-xs text-gray-500">Set up your new landing page</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {/* Website Name */}
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Website Name</label>
                        <input type="text" required autoFocus placeholder="E.g. Summer Campaign 2024" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={name} onChange={e => setName(e.target.value)} />
                        
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 pl-1">
                            <Globe className="w-3 h-3 shrink-0 text-gray-300" />
                            <span className="font-mono flex items-center">
                                {companyData?.customDomain ? (
                                    isPrimary ? (
                                        <span className="text-indigo-600 font-semibold">https://{companyData.customDomain}</span>
                                    ) : (
                                        <><span className="text-gray-400">https://{companyData.customDomain}/</span><span className="text-indigo-600 font-semibold">{slug || 'website-name'}</span></>
                                    )
                                ) : (
                                    isPrimary ? (
                                        <>
                                            https://
                                            <input 
                                                type="text" 
                                                placeholder={name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourcompany'}
                                                className="bg-transparent border-b border-transparent hover:border-indigo-400 focus:border-indigo-500 text-indigo-600 font-semibold outline-none px-0.5 min-w-[50px] w-auto max-w-[120px] transition-colors" 
                                                value={companySlugInput} 
                                                onChange={e => setCompanySlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                                            />
                                            .{rootDomain}
                                        </>
                                    ) : (
                                        <><span className="text-gray-400">https://{displayCompanySlug}.{rootDomain}/</span><span className="text-indigo-600 font-semibold">{slug || 'website-name'}</span></>
                                    )
                                )}
                            </span>
                            {isPrimary && <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wider">Primary</span>}
                        </div>
                    </div>

                    {/* Font Family */}
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Font Family</label>
                        <FontPicker value={fontFamily} onChange={setFontFamily} />
                    </div>

                    {/* Brand Color */}
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Brand Color</label>
                        <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md cursor-pointer shrink-0">
                                <input type="color" className="absolute inset-0 w-full h-full scale-150 cursor-pointer" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                            </div>
                            <input type="text" className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                        </div>
                    </div>

                    {/* Pages */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400">Pages</label>
                            <span className="text-[10px] text-gray-400 font-medium">{enabledPages.size} selected</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {ALL_PAGES.map(page => {
                                const isOn = enabledPages.has(page.id);
                                return (
                                    <label key={page.id} className={`flex items-start gap-2 p-2.5 rounded-xl border transition-colors ${!page.locked ? 'cursor-pointer hover:border-indigo-300' : ''} ${isOn ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 bg-gray-50'}`}>
                                        <input
                                            type="checkbox"
                                            disabled={page.locked}
                                            checked={isOn}
                                            onChange={() => togglePage(page.id, page.locked)}
                                            className="w-4 h-4 mt-0.5 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                        />
                                        <div className="flex flex-col overflow-hidden">
                                            <span className={`text-xs font-semibold truncate ${isOn ? 'text-indigo-900' : 'text-gray-600'}`} title={page.name}>{page.name}</span>
                                            {page.locked && <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">Req</span>}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                    <button type="button" onClick={handleClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition-all">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading || !name.trim()} className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Create Website
                    </button>
                </div>
            </div>
        </div>
    );
}
