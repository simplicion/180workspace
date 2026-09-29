import type { Metadata } from 'next';
import Script from 'next/script';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import '@/lib/api';

export const metadata: Metadata = {
  title: '180 Profile — Universal Identity, Security & Wallet',
  description: 'Manage your unified 180 Profile, prepaid wallet balance, top-ups, and developer authorizations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,300,400&display=swap"
          rel="stylesheet"
        />
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </head>
      <body className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-500/20 selection:text-blue-950">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
