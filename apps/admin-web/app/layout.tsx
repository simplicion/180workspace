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
                            style: { 
                                borderRadius: '14px', 
                                fontSize: '13px', 
                                fontWeight: 600,
                                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                border: '1px solid rgba(226, 232, 240, 0.8)',
                                padding: '12px 16px',
                                zIndex: 999999
                            },
                            success: { 
                                style: { 
                                    background: '#ffffff', 
                                    color: '#065f46', 
                                    border: '1px solid #a7f3d0' 
                                } 
                            },
                            error: { 
                                style: { 
                                    background: '#ffffff', 
                                    color: '#991b1b', 
                                    border: '1px solid #fecaca' 
                                } 
                            },
                            loading: {
                                style: {
                                    background: '#ffffff',
                                    color: '#1e293b',
                                    border: '1px solid #e2e8f0'
                                }
                            }
                        }}
                        containerStyle={{
                            top: 24,
                            right: 24,
                            zIndex: 999999,
                        }}
                    />
                </Providers>
            </body>
        </html>
    );
}


