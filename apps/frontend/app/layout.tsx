import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import DesktopSplitView from '@/components/shared/DesktopSplitView';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: process.env.NODE_ENV === 'production' ? 1 : 5,
    userScalable: process.env.NODE_ENV !== 'production',
    themeColor: "#ffffff",
};



export const metadata: Metadata = {
    title: {
        default: '180workspace - The Ultimate Business Operating System',
        template: '%s | 180workspace',
    },
    description: 'Replace dozens of fragmented tools. 180workspace allows you to manage your HR, CRM, Projects, Finances, and Media in a single, scalable platform.',
    keywords: ['Business Operating System', 'HR', 'CRM', 'Project Management', 'Finance Management', '180workspace', 'Unified Workspace', 'Team Collaboration'],
    authors: [{ name: '180workspace Team' }],
    robots: 'index, follow',
    manifest: "/manifest.json",
    applicationName: "180workspace",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "180workspace",
    },
    formatDetection: {
        telephone: false,
    }
};


export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/lib/authOptions');
    const { headers } = await import('next/headers');
    const session = await getServerSession(authOptions);

    const headersList = await headers();
    const host = (headersList.get('host') || '').toLowerCase();
    const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '').toLowerCase();
    const mainDomains = [
        '180workspace.com', 'www.180workspace.com', 'app.180workspace.com',
        rootDomain, `www.${rootDomain}`, `app.${rootDomain}`,
        'localhost', 'localhost:3000', 'localhost:3002'
    ].filter(Boolean);
    
    const isPlatformDomain = mainDomains.includes(host) || host.startsWith('app.') || host.startsWith('api.') || host === 'localhost:3000' || host === 'localhost:3002';

    return (
        <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
            <head>
                <link
                    href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,300,400&display=swap"
                    rel="stylesheet"
                />
                {isPlatformDomain && (
                    <>
                        <script
                            type="application/ld+json"
                            dangerouslySetInnerHTML={{
                                __html: JSON.stringify({
                                    "@context": "https://schema.org",
                                    "@type": "WebSite",
                                    name: "180workspace",
                                    url: `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || ''}`,
                                    description: "The ultimate business operating system for modern teams.",
                                })
                            }}
                        />
                        <script
                            type="application/ld+json"
                            dangerouslySetInnerHTML={{
                                __html: JSON.stringify({
                                    "@context": "https://schema.org",
                                    "@type": "Organization",
                                    name: "180workspace",
                                    url: `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || ''}`,
                                    logo: `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || ''}/black icon.svg`,
                                })
                            }}
                        />
                    </>
                )}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            if (typeof window !== 'undefined') {
                                window.addEventListener('error', function(e) {
                                    if (e && e.message && (e.message.indexOf('ChunkLoadError') !== -1 || e.message.indexOf('Loading chunk') !== -1)) {
                                        if (!sessionStorage.getItem('chunk_reload_lock')) {
                                            sessionStorage.setItem('chunk_reload_lock', '1');
                                            window.location.reload();
                                        }
                                    }
                                });
                                window.addEventListener('load', function() {
                                    setTimeout(function() {
                                        sessionStorage.removeItem('chunk_reload_lock');
                                    }, 3000);
                                });

                                document.addEventListener('click', function(e) {
                                    var btn = e.target.closest('button');
                                    if (btn && (btn.type === 'submit' || btn.classList.contains('btn-primary') || btn.textContent.toLowerCase().includes('save') || btn.textContent.toLowerCase().includes('add'))) {
                                        var container = btn.closest('form, [role="dialog"], [data-radix-popper-content-wrapper]') || document.body;
                                        container.classList.add('show-errors');
                                    }
                                }, true);
                                
                                document.addEventListener('invalid', function(e) {
                                    var container = e.target.closest('form, [role="dialog"]') || document.body;
                                    container.classList.add('show-errors');
                                }, true);
                            }
                        `
                    }}
                />
            </head>
            <body className="font-sans antialiased hidden-scrollbar" suppressHydrationWarning>
                <Providers session={session}>
                    <DesktopSplitView>
                        {children}
                    </DesktopSplitView>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: { borderRadius: '12px', fontSize: '14px', fontWeight: 500 },
                            success: { style: { background: '#ecfdf5', color: '#065f46', border: '1px solid #d1fae5' } },
                            error: { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fee2e2' } },
                        }}
                    />
                </Providers>
            </body>
        </html>
    );
}

