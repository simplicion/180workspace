import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: process.env.NODE_ENV === 'production' ? 1 : 5,
    userScalable: process.env.NODE_ENV !== 'production',
};

export const metadata: Metadata = {
    title: {
        default: '180workspace',
        template: '%s | 180workspace',
    },
    description: '180workspace - Enterprise workspace to manage company operations seamlessly.',
    keywords: ['Workspace', 'Company Management', 'Operations', '180workspace', 'ERP'],
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
            </head>
            <body className="font-sans antialiased" suppressHydrationWarning>
                <Providers>
                    {children}
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

