import type { Metadata } from 'next';
import { cache } from 'react';
import { ShieldCheck } from 'lucide-react';
import { CompanyProfileUI } from '@/app/(platform)/(advertising-app)/_components/CompanyProfileUI';
import { ResponsiveStyles, SITE_ROOT_CLASS, SITE_CONTAINER_NAME, BREAKPOINT_MAX } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/responsive-styles';
import { ScriptInjector } from './_components/ScriptInjector';
import { FacebookPixel } from './_components/FacebookPixel';
import { SiteElement } from './_components/SiteElement';
import { SiteMobileNav, type SiteNavLink } from './_components/SiteMobileNav';

import { migrateLegacySection } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/ElementFactory';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

function sanitizeVerificationToken(token?: string): string {
    if (!token || typeof token !== 'string') return '';
    let clean = token.trim();
    const metaMatch = clean.match(/content=["']([^"']+)["']/i);
    if (metaMatch && metaMatch[1]) {
        return metaMatch[1].trim();
    }
    clean = clean.replace(/^google-site-verification\s*=\s*/i, '').trim();
    clean = clean.replace(/^["']|["']$/g, '').trim();
    return clean;
}

function sanitizeGaMeasurementId(id?: string): string {
    if (!id || typeof id !== 'string') return '';
    let clean = id.trim();
    const gMatch = clean.match(/\b(G-[A-Za-z0-9]+)\b/);
    if (gMatch && gMatch[1]) return gMatch[1].trim();
    const uaMatch = clean.match(/\b(UA-\d+-\d+)\b/);
    if (uaMatch && uaMatch[1]) return uaMatch[1].trim();
    return clean.replace(/[^A-Za-z0-9-_]/g, '');
}

const RESOLVE_TIMEOUT_MS = 3000;

/** Backend bases from env only (plus the docker-internal service name in production). */
function backendBases(): string[] {
    const bases = [
        process.env.BACKEND_INTERNAL_URL,
        process.env.NODE_ENV === 'production' ? 'http://backend:4000' : null,
        process.env.NEXT_PUBLIC_BACKEND_URL,
        process.env.NEXT_PUBLIC_API_URL,
    ]
        .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
        .map((v) => v.trim().replace(/\/+$/, ''));
    return Array.from(new Set(bases));
}

async function fetchResolve(apiBase: string, query: string, signal: AbortSignal): Promise<any> {
    const res = await fetch(`${apiBase}/api/public/domains/resolve?${query}`, { cache: 'no-store', signal });
    if (!res.ok) throw new Error(`resolve ${res.status}`);
    return res.json();
}

/**
 * Resolves a domain/slug to its registry payload. Cached per request (metadata + page share one call);
 * all configured bases are tried in parallel, first success wins, each attempt is aborted after 3s.
 */
const resolveDomainCached = cache(async (cleanDomain: string, slugStr: string): Promise<any | null> => {
    const bases = backendBases();
    if (bases.length === 0) {
        console.error('[sites] No backend URL configured (BACKEND_INTERNAL_URL / NEXT_PUBLIC_BACKEND_URL / NEXT_PUBLIC_API_URL).');
        return null;
    }
    const searchParams = new URLSearchParams();
    searchParams.append('domain', cleanDomain);
    if (slugStr) searchParams.append('slug', slugStr);
    const query = searchParams.toString();

    const controllers = bases.map(() => new AbortController());
    const timers = controllers.map((c) => setTimeout(() => c.abort(), RESOLVE_TIMEOUT_MS));
    try {
        return await Promise.any(bases.map((base, i) => fetchResolve(base, query, controllers[i].signal)));
    } catch {
        return null;
    } finally {
        timers.forEach(clearTimeout);
        controllers.forEach((c) => c.abort());
    }
});

function cleanDomainParam(domain: string): string {
    let decoded = domain || '';
    try { decoded = decodeURIComponent(decoded); } catch { /* malformed escape: use as-is */ }
    return decoded.split(':')[0].toLowerCase().trim();
}

function resolveDomainData(domain: string, slug?: string | string[]) {
    const cleanDomain = cleanDomainParam(domain);
    const slugStr = slug ? (Array.isArray(slug) ? slug.join('/') : slug) : '';
    return resolveDomainCached(cleanDomain, slugStr);
}

/** JSON for <script type="application/ld+json"> without allowing `</script>` breakouts. */
const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

/** Font weights actually used by the page (plus the defaults the shell uses). */
function collectFontWeights(nodes: any[]): number[] {
    const weights = new Set<number>([400, 600, 700, 900]);
    const visit = (list: any[]) => {
        for (const n of list || []) {
            if (!n || typeof n !== 'object') continue;
            for (const s of [n.style, n.responsive?.tablet, n.responsive?.mobile]) {
                const w = s?.fontWeight;
                if (w === 'bold' || w === 'bolder') weights.add(700);
                else if (w !== undefined && w !== null && /^[1-9]00$/.test(String(w))) weights.add(Number(w));
            }
            if (Array.isArray(n.children)) visit(n.children);
        }
    };
    visit(nodes);
    return Array.from(weights).sort((a, b) => a - b);
}

function googleFontHref(families: string[], weights: number[]): string | null {
    const clean = Array.from(new Set(families.map((f) => (f || '').trim()).filter((f) => /^[A-Za-z0-9 ]+$/.test(f))));
    if (clean.length === 0) return null;
    const fam = clean.map((f) => `family=${f.replace(/ /g, '+')}:wght@${weights.join(';')}`).join('&');
    return `https://fonts.googleapis.com/css2?${fam}&display=swap`;
}

export async function generateMetadata({ 
    params 
}: { 
    params: Promise<{ domain: string; slug?: string | string[] }> 
}): Promise<Metadata> {
    const { domain, slug } = await params;
    const cleanDomain = cleanDomainParam(domain);
    const data = await resolveDomainData(domain, slug);

    if (!data) {
        return {
            title: { absolute: 'Page Not Found' },
            description: 'The requested page was not found.',
            openGraph: {
                title: 'Page Not Found',
                description: 'The requested page was not found.',
                type: 'website'
            },
            robots: { index: false, follow: false }
        };
    }

    if (data.type === 'COMPANY_PROFILE') {
        const company = data.payload || {};
        const title = company.name ? `${company.name} - Profile` : 'Company Profile';
        return {
            title: { absolute: title },
            description: company.description || `Official profile of ${company.name || 'Company'}.`,
            icons: company.logo ? { icon: company.logo, apple: company.logo } : undefined,
            openGraph: {
                title,
                description: company.description,
                images: company.logo ? [company.logo] : [],
                type: 'website'
            }
        };
    }

    if (data.type === 'TRAFFIC_LINK') {
        const link = data.payload || {};
        const title = link.name || cleanDomain;
        const fallbackUrl = link.fallbackUrl || '';
        let targetOrigin = '';
        try {
            if (fallbackUrl) {
                const u = new URL(fallbackUrl);
                targetOrigin = `${u.protocol}//${u.host}`;
            }
        } catch (e) {}

        const faviconUrl = targetOrigin 
            ? `/r/_proxy/asset?url=${encodeURIComponent(targetOrigin + '/favicon.ico')}` 
            : '/favicon.ico';

        return {
            title: { absolute: title },
            description: `Official website of ${title}`,
            icons: {
                icon: faviconUrl,
                shortcut: faviconUrl,
                apple: faviconUrl,
            },
            openGraph: {
                title,
                description: `Official website of ${title}`,
                siteName: title,
                type: 'website'
            }
        };
    }

    if (data.type === 'ADVERTISING_WEBSITE') {
        const website = data.payload || {};
        const config = website.config || {};
        const currentSlug = slug ? `/${Array.isArray(slug) ? slug.join('/') : slug}` : '/';
        
        let currentPage: any = null;
        if (config.version !== 2 && !Array.isArray(config.pages)) {
            if (currentSlug === '/') {
                currentPage = { name: 'Home', sections: config.sections || [] };
            }
        } else {
            currentPage = config.pages?.find((p: any) => p.slug === currentSlug) || config.pages?.[0];
        }

        const brandName = config.brand?.companyName || config.header?.title || website.name || 'Website';
        const seo = config.seo || {};
        
        // Page specific or fallback SEO
        const pageTitle = currentPage?.metaTitle || 
                         currentPage?.seo?.metaTitle || 
                         (currentPage?.name && currentPage.name !== 'Home' ? `${currentPage.name} | ${brandName}` : (seo.metaTitle || brandName));
        
        const pageDesc = currentPage?.metaDescription || 
                        currentPage?.seo?.metaDescription || 
                        seo.metaDescription || 
                        `Welcome to ${brandName}. Learn more about our products and services.`;

        const keywords = currentPage?.keywords || seo.keywords || [];
        const rawKeywords = Array.isArray(keywords) ? keywords : typeof keywords === 'string' ? keywords.split(',').map((k: string) => k.trim()) : [];

        // Favicon resolution (never uses 180workspace favicon)
        const faviconUrl = seo.favicon || config.brand?.favicon || config.header?.logo || '/favicon.ico';
        
        // OpenGraph Image resolution
        const ogImage = currentPage?.ogImage || seo.ogImage || config.header?.logo;
        const ogImages = ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: pageTitle }] : [];

        // Canonical URL
        const canonicalUrl = `https://${cleanDomain}${currentSlug === '/' ? '' : currentSlug}`;

        // Indexing permissions
        const isIndexable = seo.allowIndexing !== false && currentPage?.isNoIndex !== true && currentPage?.isPublished !== false;

        // Google Site Verification Token Sanitization
        const cleanGoogleVerification = sanitizeVerificationToken(seo.googleVerification);

        return {
            title: { absolute: pageTitle }, // Completely removes any root SaaS layout template suffix
            description: pageDesc,
            keywords: rawKeywords.length > 0 ? rawKeywords : undefined,
            applicationName: brandName,
            icons: {
                icon: faviconUrl,
                shortcut: faviconUrl,
                apple: faviconUrl,
            },
            openGraph: {
                title: pageTitle,
                description: pageDesc,
                url: canonicalUrl,
                siteName: brandName,
                images: ogImages,
                type: 'website',
                locale: 'en_US',
            },
            twitter: {
                card: 'summary_large_image',
                title: pageTitle,
                description: pageDesc,
                images: ogImage ? [ogImage] : [],
            },
            alternates: {
                canonical: canonicalUrl,
            },
            robots: {
                index: isIndexable,
                follow: isIndexable,
                googleBot: {
                    index: isIndexable,
                    follow: isIndexable,
                    'max-video-preview': -1,
                    'max-image-preview': 'large',
                    'max-snippet': -1,
                }
            },
            verification: cleanGoogleVerification ? {
                google: cleanGoogleVerification,
                other: {
                    'google-site-verification': cleanGoogleVerification,
                }
            } : undefined,
            other: cleanGoogleVerification ? {
                'google-site-verification': cleanGoogleVerification,
            } : undefined
        };
    }

    return {
        title: { absolute: 'Website' },
    };
}

export default async function PublicWebsitePage({ 
    params 
}: { 
    params: Promise<{ domain: string; slug?: string | string[] }> 
}) {
    const { domain, slug } = await params;
    const cleanDomain = cleanDomainParam(domain);
    
    let registryData: any = null;
    let website: any = null;
    let pixels: any[] = [];
    let error = '';

    try {
        const data = await resolveDomainData(domain, slug);
        if (!data) {
            throw new Error('Domain not found');
        }

        registryData = data;
        
        if (data.type === 'ADVERTISING_WEBSITE') {
            website = data.payload;
            pixels = data.pixels || [];
        }
    } catch (err) {
        console.error('Failed to resolve domain:', err);
        error = 'Page not found or inactive.';
    }

    if (registryData?.type === 'COMPANY_PROFILE') {
        return <CompanyProfileUI companyData={registryData.payload} isLoading={false} isPublicView={true} />;
    }

    if (registryData?.type === 'TRAFFIC_LINK') {
        const linkSlug = registryData.payload?.slug;
        if (linkSlug) {
            const subpathStr = slug ? `?subpath=${encodeURIComponent(Array.isArray(slug) ? slug.join('/') : slug)}` : '';
            redirect(`/r/${linkSlug}${subpathStr}`);
        }
    }

    const currentSlug = slug ? `/${Array.isArray(slug) ? slug.join('/') : slug}` : '/';
    
    const config = website?.config || {};
    
    let currentPage;
    if (config.version !== 2 && !Array.isArray(config.pages)) {
        if (currentSlug === '/') {
            currentPage = { isPublished: true, isEnabled: true, sections: config.sections || [] };
        }
    } else {
        currentPage = config.pages?.find((p: any) => p.slug === currentSlug);
    }
    // Legacy section types (hero/services/about/contact…) have no renderer: convert them to element trees.
    if (currentPage && Array.isArray(currentPage.sections)) {
        currentPage = { ...currentPage, sections: currentPage.sections.filter(Boolean).map((s: any) => migrateLegacySection(s, '$')) };
    }

    const isPagePublished = currentPage ? (currentPage.isPublished !== false && currentPage.isEnabled !== false) : false;

    if (error || !website || !currentPage || !isPagePublished) {
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

    const colors = config.colors || { primary: '#4f46e5', secondary: '#ffffff', accent: '#10b981' };
    const primaryColor = colors.primary;
    
    let brand = config.brand;
    if (!brand) {
        brand = config.colors ? { 
            primaryColor: config.colors.primary, 
            secondaryColor: config.colors.secondary, 
            textColor: '#111827', 
            headingFont: 'Inter', 
            bodyFont: 'Inter', 
            bgType: 'color', 
            bgValue: '#ffffff' 
        } : { 
            primaryColor: '#4f46e5', 
            secondaryColor: '#ffffff', 
            textColor: '#111827', 
            headingFont: 'Inter', 
            bodyFont: 'Inter', 
            bgType: 'color', 
            bgValue: '#ffffff' 
        };
    }
    const getHeaderFooterStyles = (b: any) => {
        const theme = b.headerFooterTheme || 'light';
        const customTextColor = b.headerFooterTextColor;
        let styles: any;
        
        if (theme === 'dark') {
            styles = { backgroundColor: '#111827', color: customTextColor || '#ffffff' };
        } else if (theme === 'brand') {
            styles = { backgroundColor: b.primaryColor || '#4f46e5', color: customTextColor || '#ffffff' };
        } else {
            styles = { backgroundColor: 'rgba(255, 255, 255, 0.8)', color: customTextColor || 'inherit' };
        }
        
        if (b.fontFamily) {
            styles.fontFamily = `"${b.fontFamily}", sans-serif`;
        }
        
        return styles;
    };
    const hfStyles = getHeaderFooterStyles(brand);

    const pageSections: any[] = Array.isArray(currentPage?.sections) ? currentPage.sections.filter((s: any) => s && typeof s === 'object') : [];
    const hasDynamicSections = pageSections.length > 0;
    const bodyFont = config.typography?.body || brand?.fontFamily || 'Inter';
    const headingFont = config.typography?.heading || bodyFont;
    const fontHref = googleFontHref([bodyFont, headingFont], collectFontWeights(pageSections));
    const hasBgImage = (currentPage?.bgType === 'image' && !!currentPage?.bgValue) || (brand?.bgType === 'image' && !!brand?.bgValue);
    const navPages = (config.pages || []).filter((p: any) => (p.isPublished !== false && p.isEnabled !== false) && (!p.navVisibility || p.navVisibility === 'both' || p.navVisibility === 'header'));
    const navLinks: SiteNavLink[] = navPages.map((p: any) => ({ id: String(p.id ?? p.slug), name: String(p.name ?? ''), href: String(p.slug || '/'), active: currentSlug === p.slug }));

    const seo = config.seo || {};
    const brandName = brand?.companyName || config.header?.title || website.name || 'Website';
    const siteUrl = `https://${cleanDomain}`;
    const pageUrl = `https://${cleanDomain}${currentSlug === '/' ? '' : currentSlug}`;

    const websiteJsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": brandName,
        "url": siteUrl,
        "description": currentPage?.metaDescription || seo.metaDescription || `Official website of ${brandName}.`
    };

    const organizationJsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": brandName,
        "url": siteUrl,
        ...(config.header?.logo ? { "logo": config.header.logo } : {}),
        ...(brand?.email ? { "email": brand.email } : {}),
        ...(brand?.phone ? { "telephone": brand.phone } : {})
    };

    // Extract FAQs for FAQPage Schema if any FAQ element exists
    let faqEntities: any[] = [];
    let productEntities: any[] = [];
    if (currentPage?.sections) {
        const scanElements = (elements: any[]) => {
            for (const el of elements || []) {
                if (el.type === 'faq' && el.data?.items && Array.isArray(el.data.items)) {
                    for (const item of el.data.items) {
                        if (item.question && item.answer) {
                            faqEntities.push({
                                "@type": "Question",
                                "name": item.question,
                                "acceptedAnswer": {
                                    "@type": "Answer",
                                    "text": item.answer
                                }
                            });
                        }
                    }
                }
                if (el.type === 'grid' && el.data?.cards && Array.isArray(el.data.cards)) {
                    for (const card of el.data.cards) {
                        if (card.title) {
                            productEntities.push({
                                "@context": "https://schema.org",
                                "@type": "Product",
                                "name": card.title,
                                "description": card.description || card.desc || card.title,
                                ...(card.image ? { "image": card.image } : {}),
                                ...(card.price ? {
                                    "offers": {
                                        "@type": "Offer",
                                        "price": String(card.price).replace(/[^0-9.]/g, '') || "0",
                                        "priceCurrency": "USD",
                                        "availability": "https://schema.org/InStock"
                                    }
                                } : {})
                            });
                        }
                    }
                }
                if (el.children && Array.isArray(el.children)) {
                    scanElements(el.children);
                }
            }
        };
        scanElements(currentPage.sections);
    }

    const faqJsonLd = faqEntities.length > 0 ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqEntities
    } : null;

    return (
        <div 
            className={`${SITE_ROOT_CLASS} ${hasBgImage ? 'site-bg-fixed' : ''} min-h-screen w-full max-w-full overflow-x-clip font-sans text-gray-900 selection:bg-indigo-100`} 
            style={{ 
                fontFamily: `"${bodyFont}", sans-serif`,
                color: brand?.textColor || '#111827',
                backgroundColor: (currentPage?.bgType === 'image' ? 'transparent' : (currentPage?.bgValue || brand?.bgValue || '#ffffff')),
                backgroundImage: (currentPage?.bgType === 'image' && currentPage?.bgValue) ? `url(${currentPage.bgValue})` : (brand?.bgType === 'image' && brand?.bgValue ? `url(${brand.bgValue})` : 'none'),
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                '--primary': primaryColor,
                '--heading-font': config.typography?.heading || 'Inter'
            } as any}
        >
            {/* Fonts (hoisted to <head> by React): preconnect + stylesheet, only the weights in use */}
            {fontHref && (
                <>
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                    <link rel="stylesheet" href={fontHref} precedence="default" />
                </>
            )}

            {/* Site-Specific Schema.org JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLd(organizationJsonLd) }}
            />
            {faqJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd) }}
                />
            )}
            {productEntities.length > 0 && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: jsonLd(productEntities.length === 1 ? productEntities[0] : productEntities) }}
                />
            )}

            {/* Search Engine Verification */}
            {(() => {
                const cleanToken = sanitizeVerificationToken(seo.googleVerification);
                return cleanToken ? (
                    <meta name="google-site-verification" content={cleanToken} />
                ) : null;
            })()}

            {/* Google Analytics 4 (gtag.js) */}
            {(() => {
                const cleanGa = sanitizeGaMeasurementId(seo.gaMeasurementId);
                return cleanGa ? (
                    <>
                        <script async src={`https://www.googletagmanager.com/gtag/js?id=${cleanGa}`} />
                        <script
                            dangerouslySetInnerHTML={{
                                __html: `
                                    window.dataLayer = window.dataLayer || [];
                                    function gtag(){dataLayer.push(arguments);}
                                    gtag('js', new Date());
                                    gtag('config', '${cleanGa}', {
                                        page_path: window.location.pathname,
                                    });
                                `
                            }}
                        />
                    </>
                ) : null;
            })()}

            <div className="w-full max-w-full min-h-screen flex flex-col bg-transparent relative overflow-x-clip">
                {/* Shell rules: mobile nav toggle + iOS-safe background (fixed attachment only on large pointer screens) */}
                <style dangerouslySetInnerHTML={{
                    __html: `.site-nav-toggle{display:none}`
                        + `@container ${SITE_CONTAINER_NAME} (max-width: ${BREAKPOINT_MAX.mobile}px){.site-nav-desktop{display:none}.site-nav-toggle{display:inline-flex}}`
                        + `.site-bg-fixed{background-attachment:fixed}`
                        + `@media (max-width: ${BREAKPOINT_MAX.tablet}px), (hover: none), (pointer: coarse){.site-bg-fixed{background-attachment:scroll}}`
                }} />
                {/* Compiled per-node responsive styles (same compiler as the editor canvas) */}
                <ResponsiveStyles nodes={pageSections} brand={brand} includeRoot={true} />
                {/* Dedicated Facebook Pixels */}
                {pixels && pixels.length > 0 && <FacebookPixel pixels={pixels} />}

                {/* Global Head Scripts (SSR + Client Injection) */}
                {brand.headScript && (
                    <>
                        <div 
                            style={{ display: 'none' }}
                            dangerouslySetInnerHTML={{ __html: brand.headScript }} 
                        />
                        <ScriptInjector html={brand.headScript} position="head" />
                    </>
                )}

                {/* Universal Form Iframe Auto-Resize Listener */}
                <script dangerouslySetInnerHTML={{ __html: `
                    window.addEventListener('message', function(e) {
                        if (!e.data || e.data.type !== '180workspace:form:resize' || !e.data.height) return;
                        var iframes = document.querySelectorAll('iframe');
                        for (var i = 0; i < iframes.length; i++) {
                            try {
                                if (iframes[i].contentWindow === e.source) {
                                    iframes[i].style.height = e.data.height + 'px';
                                    iframes[i].style.overflow = 'visible';
                                    iframes[i].setAttribute('scrolling', 'no');
                                    break;
                                }
                            } catch(ex) {}
                        }
                    });
                `}} />

                {/* Header */}
                {config.header?.enabled !== false && currentPage?.showHeader !== false && (
                    <header
                        className={`flex flex-row items-center justify-between gap-4 group border-b border-black/5 ${config.header?.style?.isSticky !== false ? 'sticky top-0 z-40' : 'relative'} transition-all`}
                        style={{
                            backgroundColor: config.header?.style?.backgroundColor || hfStyles.backgroundColor,
                            color: config.header?.style?.color || hfStyles.color,
                            backdropFilter: 'blur(12px)',
                            paddingTop: config.header?.style?.paddingTop || (config.header?.style?.paddingY !== undefined ? `${config.header.style.paddingY}rem` : '1.5rem'),
                            paddingBottom: config.header?.style?.paddingBottom || (config.header?.style?.paddingY !== undefined ? `${config.header.style.paddingY}rem` : '1.5rem'),
                            paddingLeft: config.header?.style?.paddingLeft || (config.header?.style?.paddingX !== undefined ? `${config.header.style.paddingX}rem` : '1.5rem'),
                            paddingRight: config.header?.style?.paddingRight || (config.header?.style?.paddingX !== undefined ? `${config.header.style.paddingX}rem` : '1.5rem'),
                        }}
                    >
                        <a href="/" className="flex items-center gap-3 min-w-0">
                            {config.header?.logo && (
                                <img src={config.header.logo} alt={config.header?.title || website.name} style={{ height: config.header?.style?.logoHeight ? `${config.header.style.logoHeight}px` : '40px' }} className="w-auto object-contain" />
                            )}
                            <span className="text-xl font-black tracking-tight text-current truncate" style={{ color: 'inherit' }}>
                                {brand?.companyName || config.header?.title || website?.name || 'Website Name'}
                            </span>
                        </a>

                        {navLinks.length > 0 && (
                            <nav aria-label="Main" className="site-nav-desktop flex flex-wrap justify-end items-center gap-6 text-sm font-bold opacity-80">
                                {navLinks.map((l) => (
                                    <a
                                        key={l.id}
                                        href={l.href}
                                        aria-current={l.active ? 'page' : undefined}
                                        className={`hover:opacity-100 transition-opacity py-1 ${l.active ? 'border-b-2 border-current' : ''}`}
                                        style={{ color: 'inherit' }}
                                    >
                                        {l.name}
                                    </a>
                                ))}
                            </nav>
                        )}
                        <SiteMobileNav
                            links={navLinks}
                            backgroundColor={config.header?.style?.backgroundColor || hfStyles.backgroundColor}
                            color={config.header?.style?.color || hfStyles.color}
                        />
                    </header>
                )}

                {/* Dynamic Builder Content */}
                {hasDynamicSections ? (
                    <main className="flex-1 w-full max-w-full min-h-[50vh] flex flex-col overflow-x-clip">
                        {pageSections.filter((s: any) => s.type !== 'floating').map((sec: any, i: number) => (
                            <SiteElement key={sec.id ?? i} node={sec} brand={brand} />
                        ))}
                    </main>
                ) : (
                    <div className="min-h-[50vh] flex items-center justify-center">
                        <p className="text-gray-500">This page has no content yet.</p>
                    </div>
                )}

                {/* Footer */}
                {config.footer?.enabled !== false && currentPage?.showFooter !== false && (
                    <footer 
                        className="border-t border-black/10 transition-all"
                        style={{
                            backgroundColor: config.footer?.style?.backgroundColor || hfStyles.backgroundColor,
                            color: config.footer?.style?.color || hfStyles.color,
                            backdropFilter: 'blur(12px)',
                            paddingTop: config.footer?.style?.paddingTop || (config.footer?.style?.paddingY !== undefined ? `${config.footer.style.paddingY}rem` : '3rem'),
                            paddingBottom: config.footer?.style?.paddingBottom || (config.footer?.style?.paddingY !== undefined ? `${config.footer.style.paddingY}rem` : '3rem'),
                            paddingLeft: config.footer?.style?.paddingLeft || (config.footer?.style?.paddingX !== undefined ? `${config.footer.style.paddingX}rem` : '1.5rem'),
                            paddingRight: config.footer?.style?.paddingRight || (config.footer?.style?.paddingX !== undefined ? `${config.footer.style.paddingX}rem` : '1.5rem'),
                        }}
                    >
                        {(() => {
                            const footerLinks = config.pages?.filter((p: any) => (p.isPublished !== false && p.isEnabled !== false) && p.id !== 'privacy' && p.id !== 'terms' && (!p.navVisibility || p.navVisibility === 'both' || p.navVisibility === 'footer')) || [];
                            const legalLinks = config.pages?.filter((p: any) => (p.isPublished !== false && p.isEnabled !== false) && (p.id === 'privacy' || p.id === 'terms') && (!p.navVisibility || p.navVisibility === 'both' || p.navVisibility === 'footer')) || [];
                            
                            const chunkArray = (arr: any[], size: number) => {
                                return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                                    arr.slice(i * size, i * size + size)
                                );
                            };
                            const footerLinkChunks = chunkArray(footerLinks, 4);

                            return (
                                <div className="max-w-4xl mx-auto flex flex-wrap justify-between gap-10 text-left mb-12">
                                    <div className="flex flex-col flex-1 min-w-[200px] max-w-sm">
                                        {config.header?.logo && (
                                            <div className="mb-4">
                                                <img src={config.header.logo} alt={config.header?.title || website.name} className="h-10 w-auto object-contain" />
                                            </div>
                                        )}
                                        <h4 className="font-bold mb-4 opacity-90 text-current" style={{ color: 'inherit' }}>Company</h4>
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap text-current" style={{ color: 'inherit' }}>
                                            <div className="font-semibold">{brand?.companyName || config.header?.title || website.name}</div>
                                            {brand?.address && <div className="opacity-90">{brand.address}</div>}
                                            {brand?.email && (
                                                <div className="opacity-90">
                                                    <a href={`mailto:${brand.email}`} className="hover:underline" style={{ color: 'inherit' }}>{brand.email}</a>
                                                </div>
                                            )}
                                            {brand?.phone && (
                                                <div className="opacity-90">
                                                    <a href={`tel:${String(brand.phone).replace(/[^+0-9]/g, '')}`} className="hover:underline" style={{ color: 'inherit' }}>{brand.phone}</a>
                                                </div>
                                            )}
                                            {brand?.twitter && (
                                                <div className="opacity-90 mt-1">
                                                    <a href={brand.twitter} target="_blank" rel="noopener noreferrer" className="hover:underline">Twitter</a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-10">
                                        {footerLinkChunks.length > 0 && footerLinkChunks.map((chunk, index) => (
                                            <div className="flex flex-col min-w-[120px]" key={`footer-links-${index}`}>
                                                <h4 className="font-bold mb-4 opacity-90 text-current" style={{ color: 'inherit' }}>{index === 0 ? 'Links' : '\u00A0'}</h4>
                                                <nav className="flex flex-col gap-3 text-sm opacity-80 font-medium animate-none">
                                                    {chunk.map((p: any) => (
                                                        <a key={p.id} href={p.slug} className="text-left hover:opacity-100 transition-opacity text-current" style={{ color: 'inherit' }}>{p.name}</a>
                                                    ))}
                                                </nav>
                                            </div>
                                        ))}
                                        {legalLinks.length > 0 && (
                                            <div className="flex flex-col min-w-[120px]">
                                                <h4 className="font-bold mb-4 opacity-90 text-current" style={{ color: 'inherit' }}>Legal</h4>
                                                <nav className="flex flex-col gap-3 text-sm opacity-80 font-medium animate-none">
                                                    {legalLinks.map((p: any) => (
                                                        <a key={p.id} href={p.slug} className="text-left hover:opacity-100 transition-opacity text-current" style={{ color: 'inherit' }}>{p.name}</a>
                                                    ))}
                                                </nav>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                        <div className="text-center pt-8 border-t border-current/20 flex flex-col items-center justify-center w-full">
                            <div className="w-full max-w-lg mx-auto flex justify-center">
                                <div className="text-sm opacity-60 font-medium text-current text-center" style={{ color: 'inherit' }}>
                                    {config.footer?.copyright || `© ${new Date().getFullYear()} ${brand?.companyName || config.header?.title || website.name}. All Rights Reserved.`}
                                </div>
                            </div>
                        </div>
                    </footer>
                )}

                {/* Screen Sticky / Floating Elements Overlay */}
                {pageSections.filter((s: any) => s.type === 'floating').map((sec: any, i: number) => (
                    <SiteElement key={sec.id ?? i} node={sec} brand={brand} />
                ))}

                {/* Global Body Scripts (SSR + Client Injection) */}
                {brand.bodyScript && (
                    <>
                        <div 
                            style={{ display: 'none' }}
                            dangerouslySetInnerHTML={{ __html: brand.bodyScript }} 
                        />
                        <ScriptInjector html={brand.bodyScript} position="body" />
                    </>
                )}
            </div>
        </div>
    );
}
