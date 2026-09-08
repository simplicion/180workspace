import type { Metadata } from 'next';
import { ShieldCheck, Layout, Sparkles, User, Phone, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { BuilderElement } from '@/app/(platform)/(advertising-app)/advertising/[id]/edit/BuilderElement';
import { CompanyProfileUI } from '@/app/(platform)/(company-hub-app)/_components/CompanyProfileUI';
import { ScriptInjector } from './_components/ScriptInjector';
import { FacebookPixel } from './_components/FacebookPixel';

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

async function resolveDomainData(domain: string, slug?: string | string[]) {
    const cleanDomain = decodeURIComponent(domain || '').split(':')[0].toLowerCase().trim();
    try {
        const candidateBases = [
            process.env.BACKEND_INTERNAL_URL,
            process.env.NODE_ENV === 'production' ? 'http://backend:4000' : null,
            process.env.NEXT_PUBLIC_BACKEND_URL,
            process.env.NEXT_PUBLIC_API_URL,
            'http://localhost:4004',
            'http://localhost:4002',
            'http://127.0.0.1:4004',
            'http://127.0.0.1:4002',
            'https://api.180workspace.com'
        ].filter(Boolean) as string[];

        const uniqueBases = Array.from(new Set(candidateBases));
        
        const searchParams = new URLSearchParams();
        searchParams.append('domain', cleanDomain);
        if (slug) {
            const slugStr = Array.isArray(slug) ? slug.join('/') : slug;
            searchParams.append('slug', slugStr);
        }

        for (const apiBase of uniqueBases) {
            try {
                const targetUrl = `${apiBase}/api/public/domains/resolve?${searchParams.toString()}`;
                const res = await fetch(targetUrl, { cache: 'no-store' });
                if (res.ok) {
                    return await res.json();
                }
            } catch (e) {
                // Try next base
            }
        }
        return null;
    } catch (err) {
        console.error('Failed to resolve domain:', err);
        return null;
    }
}

export async function generateMetadata({ 
    params 
}: { 
    params: Promise<{ domain: string; slug?: string | string[] }> 
}): Promise<Metadata> {
    const { domain, slug } = await params;
    const cleanDomain = decodeURIComponent(domain || '').split(':')[0].toLowerCase().trim();
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
        if (config.version !== 2) {
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
    const cleanDomain = decodeURIComponent(domain || '').split(':')[0].toLowerCase().trim();
    
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
            try {
                const incomingHeaders = await headers();
                const userAgent = incomingHeaders.get('user-agent') || '';
                const forwardedFor = incomingHeaders.get('x-forwarded-for') || '';
                const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '';
                const referer = incomingHeaders.get('referer') || '';

                const apiBase = process.env.BACKEND_INTERNAL_URL || 
                    (process.env.NODE_ENV === 'production' ? 'http://backend:4000' : null) ||
                    process.env.NEXT_PUBLIC_BACKEND_URL || 
                    process.env.NEXT_PUBLIC_API_URL || 
                    (process.env.NODE_ENV === 'development' ? 'http://localhost:4002' : 'https://api.180workspace.com');

                const searchParamsStr = slug ? `?subpath=${encodeURIComponent(Array.isArray(slug) ? slug.join('/') : slug)}` : '';
                const evalRes = await fetch(`${apiBase}/r/${linkSlug}${searchParamsStr}`, {
                    headers: {
                        'user-agent': userAgent,
                        'referer': referer,
                        // Cloudflare strictly rejects outbound public requests with cf-connecting-ip (Error 1000). Pass via real-ip/forwarded-for instead.
                        'true-client-ip': incomingHeaders.get('true-client-ip') || clientIp,
                        'x-client-ip': incomingHeaders.get('x-client-ip') || clientIp,
                        'x-real-ip': incomingHeaders.get('x-real-ip') || clientIp,
                        'x-forwarded-for': forwardedFor || clientIp,
                        'cf-ipcountry': incomingHeaders.get('cf-ipcountry') || '',
                        'cf-ipcity': incomingHeaders.get('cf-ipcity') || '',
                        'sec-ch-ua': incomingHeaders.get('sec-ch-ua') || '',
                        'sec-ch-ua-mobile': incomingHeaders.get('sec-ch-ua-mobile') || '',
                        'sec-ch-ua-platform': incomingHeaders.get('sec-ch-ua-platform') || '',
                        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    },
                    redirect: 'manual',
                    cache: 'no-store'
                });

                if (evalRes.status >= 300 && evalRes.status < 400) {
                    const location = evalRes.headers.get('location');
                    if (location) {
                        redirect(location);
                    }
                }

                const contentType = evalRes.headers.get('content-type') || '';
                if (contentType.includes('text/html')) {
                    const htmlText = await evalRes.text();
                    return (
                        <div 
                            className="w-full min-h-screen m-0 p-0 overflow-x-hidden" 
                            dangerouslySetInnerHTML={{ __html: htmlText }} 
                        />
                    );
                }

                const location = evalRes.headers.get('location');
                if (location) {
                    redirect(location);
                }
            } catch (err: any) {
                // If redirect was thrown by Next.js, let it propagate
                if (err.message === 'NEXT_REDIRECT' || err.digest?.includes('NEXT_REDIRECT') || String(err?.message || '').includes('NEXT_REDIRECT')) {
                    throw err;
                }
                console.error('[sites/TRAFFIC_LINK] In-place proxy error:', err);
                redirect(`/r/${linkSlug}`);
            }
        }
    }

    const currentSlug = slug ? `/${Array.isArray(slug) ? slug.join('/') : slug}` : '/';
    
    const config = website?.config || {};
    
    let currentPage;
    if (config.version !== 2) {
        if (currentSlug === '/') {
            currentPage = { isPublished: true, isEnabled: true, sections: config.sections || [] };
        }
    } else {
        currentPage = config.pages?.find((p: any) => p.slug === currentSlug);
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

    const hasDynamicSections = currentPage?.sections && currentPage.sections.length > 0;

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
            className="min-h-screen w-full max-w-full overflow-x-hidden font-sans text-gray-900 selection:bg-indigo-100" 
            style={{ 
                fontFamily: `"${config.typography?.body || brand?.fontFamily || 'Inter'}", sans-serif`,
                color: brand?.textColor || '#111827',
                backgroundColor: (currentPage?.bgType === 'image' ? 'transparent' : (currentPage?.bgValue || brand?.bgValue || '#ffffff')),
                backgroundImage: (currentPage?.bgType === 'image' && currentPage?.bgValue) ? `url(${currentPage.bgValue})` : (brand?.bgType === 'image' && brand?.bgValue ? `url(${brand.bgValue})` : 'none'),
                backgroundSize: 'cover',
                backgroundAttachment: 'fixed',
                backgroundPosition: 'center',
                '--primary': primaryColor,
                '--heading-font': config.typography?.heading || 'Inter'
            } as any}
        >
            {/* Site-Specific Schema.org JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
            />
            {faqJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
                />
            )}
            {productEntities.length > 0 && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(productEntities.length === 1 ? productEntities[0] : productEntities) }}
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

            <div className="w-full max-w-full min-h-screen flex flex-col bg-transparent relative overflow-x-hidden">
                <style dangerouslySetInnerHTML={{
                    __html: `
                        @import url('https://fonts.googleapis.com/css2?family=${(config.typography?.body || brand?.fontFamily || 'Inter').replace(/ /g, '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap');
                        
                        @media (max-width: 767px) {
                            /* Master Anti-Blowout Rule for all elements on mobile */
                            [data-element-type="section"],
                            [data-element-type="row"],
                            [data-element-type="column"],
                            [data-element-type="box"],
                            [data-element-type="text"],
                            [data-element-type="media"],
                            [data-element-type="button"] {
                                max-width: 100% !important;
                                min-width: 0 !important;
                                box-sizing: border-box !important;
                            }

                            [data-element-type="row"],
                            [data-element-type="box"].is-row-container {
                                display: flex !important;
                                flex-direction: column !important;
                                flex-wrap: wrap !important;
                            }
                            [data-element-type="column"] {
                                width: 100% !important;
                                flex: 1 1 100% !important;
                                flex-shrink: 1 !important;
                                padding-left: 1rem !important;
                                padding-right: 1rem !important;
                                margin-left: 0 !important;
                                margin-right: 0 !important;
                            }
                            [data-element-type="box"] {
                                flex-shrink: 1 !important;
                            }
                            [data-element-type="text"] {
                                overflow-wrap: break-word !important;
                                word-break: break-word !important;
                            }
                            [data-element-type="text"] h1,
                            [data-element-type="text"] h2 {
                                font-size: clamp(1.4rem, 5.5vw, 2.2rem) !important;
                                line-height: 1.25 !important;
                            }
                            [data-element-type="text"] h3,
                            [data-element-type="text"] h4 {
                                font-size: clamp(1.2rem, 4vw, 1.6rem) !important;
                                line-height: 1.3 !important;
                            }
                            [data-element-type="media"] img,
                            [data-element-type="media"] video {
                                height: auto !important;
                            }
                        }
                    `
                }} />
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
                        className={`flex flex-col md:flex-row items-center justify-between gap-6 group relative border-b border-black/5 ${config.header?.style?.isSticky !== false ? 'sticky top-0 z-40' : ''} transition-all`}
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
                        <a href="/" className="flex items-center gap-3">
                            {config.header?.logo && (
                                <img src={config.header.logo} alt={config.header?.title || website.name} style={{ height: config.header?.style?.logoHeight ? `${config.header.style.logoHeight}px` : '40px' }} className="w-auto object-contain" />
                            )}
                            <span className="text-xl font-black tracking-tight text-current" style={{ color: 'inherit' }}>
                                {brand?.companyName || config.header?.title || website?.name || 'Website Name'}
                            </span>
                        </a>

                        <nav className="flex flex-wrap justify-center items-center gap-6 text-sm font-bold opacity-80">
                            {(config.pages || [])
                                ?.filter((p: any) => (p.isPublished !== false && p.isEnabled !== false) && (!p.navVisibility || p.navVisibility === 'both' || p.navVisibility === 'header'))
                                .map((p: any) => (
                                    <a
                                        key={p.id}
                                        href={p.slug}
                                        className={`hover:opacity-100 transition-opacity py-1 ${currentSlug === p.slug ? 'border-b-2 border-current' : ''}`}
                                        style={{ color: 'inherit' }}
                                    >
                                        {p.name}
                                    </a>
                                ))}
                        </nav>
                    </header>
                )}

                {/* Dynamic Builder Content */}
                {hasDynamicSections ? (
                    <main className="flex-1 w-full max-w-full min-h-[50vh] flex flex-col overflow-x-hidden">
                        {(currentPage?.sections || []).filter((s: any) => s.type !== 'floating').map((sec: any) => (
                            <BuilderElement key={sec.id} node={sec} brand={brand} isReadOnly={true} />
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
                                            <div className="opacity-90">{brand?.address || '123 Business Avenue'}</div>
                                            <div className="opacity-90">{brand?.email || 'email@example.com'}</div>
                                            {brand?.phone && <div className="opacity-90">{brand.phone}</div>}
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
                {(currentPage?.sections || []).filter((s: any) => s.type === 'floating').map((sec: any) => (
                    <BuilderElement key={sec.id} node={sec} brand={brand} isReadOnly={true} />
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
