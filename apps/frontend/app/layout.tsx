import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import DesktopSplitView from '@/components/shared/DesktopSplitView';

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: process.env.NODE_ENV === 'production' ? 1 : 5,
    userScalable: process.env.NODE_ENV !== 'production',
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
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link
                    href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,300,400&display=swap"
                    rel="stylesheet"
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "WebSite",
                            name: "180workspace",
                            url: "https://180workspace.com",
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
                            url: "https://180workspace.com",
                            logo: "https://180workspace.com/black icon.svg",
                        })
                    }}
                />
            </head>
            <body className="font-sans antialiased" suppressHydrationWarning>
                <Providers>
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

