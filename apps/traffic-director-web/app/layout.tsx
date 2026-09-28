import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '180 Traffic Director | Sovereign Edge Traffic Engine',
  description:
    'Enterprise-grade edge traffic routing, dynamic landing pages, safe-page reverse proxying, and hardware bot shielding for performance advertisers.',
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
      <body className={`${inter.className} min-h-screen bg-slate-50 dark:bg-black text-gray-900 dark:text-zinc-100 antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200`}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'text-sm font-medium border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 text-gray-900 dark:text-zinc-100 shadow-xl backdrop-blur-md rounded-2xl',
          }}
        />
        {children}
      </body>
    </html>
  );
}

