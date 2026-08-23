import { ShieldCheck, Layout, Sparkles, User, Phone, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { BuilderElement } from '../../../../dashboard/(advertising-app)/advertising/[id]/edit/BuilderElement';

export default async function PublicWebsitePage({ 
    params 
}: { 
    params: Promise<{ domain: string; slug?: string | string[] }> 
}) {
    const { domain, slug } = await params;
    
    let website: any = null;
    let pixels: any[] = [];
    let error = '';

    try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const searchParams = new URLSearchParams();
        searchParams.append('domain', domain);
        if (slug) {
            const slugStr = Array.isArray(slug) ? slug.join('/') : slug;
            searchParams.append('slug', slugStr);
        }
        const targetUrl = `${apiBase}/api/public/websites/resolve?${searchParams.toString()}`;

        const res = await fetch(targetUrl, { next: { revalidate: 0 } });
        
        if (!res.ok) {
            throw new Error('Website not found');
        }

        const data = await res.json();
        website = data.website;
        pixels = data.pixels || [];
    } catch (err) {
        console.error('Failed to load website:', err);
        error = 'Website not found or inactive.';
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

    return (
        <div 
            className="min-h-screen bg-white font-sans text-gray-900 selection:bg-indigo-100" 
            style={{ 
                fontFamily: `"${config.typography?.body || brand?.fontFamily || 'Inter'}", sans-serif`,
                color: brand?.textColor || '#111827',
                backgroundColor: brand?.bgType === 'color' ? (brand.bgValue || colors.secondary || brand.secondaryColor) : (brand?.bgType === 'image' ? 'transparent' : colors.secondary),
                backgroundImage: brand?.bgType === 'image' && brand?.bgValue ? `url(${brand.bgValue})` : 'none',
                backgroundSize: 'cover',
                backgroundAttachment: 'fixed',
                backgroundPosition: 'center',
                '--primary': primaryColor,
                '--heading-font': config.typography?.heading || 'Inter'
            } as any}
        >
            <div className="w-full min-h-screen flex flex-col bg-transparent relative">
                <style dangerouslySetInnerHTML={{
                    __html: `@import url('https://fonts.googleapis.com/css2?family=${(config.typography?.body || brand?.fontFamily || 'Inter').replace(/ /g, '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap');`
                }} />
                {/* Global Head Scripts */}
                {brand.headScript && <div dangerouslySetInnerHTML={{ __html: brand.headScript }} />}

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
                    <main className="flex-1 w-full min-h-[50vh] bg-white flex flex-col">
                        {(currentPage?.sections || []).map((sec: any) => (
                            <BuilderElement key={sec.id} node={sec} brand={brand} isReadOnly={true} />
                        ))}
                    </main>
                ) : (
                    <div className="min-h-[50vh] flex items-center justify-center bg-white">
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

                {/* Global Body Scripts */}
                {brand.bodyScript && <div dangerouslySetInnerHTML={{ __html: brand.bodyScript }} />}
            </div>
        </div>
    );
}
