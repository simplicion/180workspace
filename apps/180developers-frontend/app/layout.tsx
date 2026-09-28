import React from 'react';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: '180 Developer Platform | Sovereign Identity & OAuth 2.0 API',
  description:
    'Integrate 180 Identity into your web apps, mobile apps, and APIs. Universal 1-tap WhatsApp OTP, Google sign-in, RS256 JWKS tokens, and RFC 7636 PKCE.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('180_theme');
                if (!theme) {
                  theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col selection:bg-blue-600 selection:text-white antialiased transition-colors duration-200">
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-sm font-medium border border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 text-zinc-900 dark:text-zinc-100 shadow-xl backdrop-blur-md rounded-2xl',
            duration: 4000,
          }}
        />

        {/* Global Navigation Bar */}
        <Navbar />

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {children}
        </main>

        {/* Footer conforming to design system */}
        <footer className="border-t border-zinc-200 dark:border-white/10 bg-white dark:bg-black py-8 text-xs text-zinc-600 dark:text-zinc-500 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-zinc-900 dark:text-zinc-300">180 Identity Engine</span>
              <span>•</span>
              <span>OpenID Connect Core 1.0</span>
              <span>•</span>
              <span>RFC 7636 PKCE</span>
              <span>•</span>
              <span>Asymmetric RS256 JWKS</span>
            </div>
            <div>© {new Date().getFullYear()} 180 Workspace Ecosystem. All rights reserved.</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
