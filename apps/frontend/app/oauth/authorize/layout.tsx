import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in with 180 Identity',
  description: 'Fast, secure single sign-on powered by 180 Identity.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OAuthAuthorizeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white p-3 sm:p-4">
      {/* Background gradient decorative glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 w-full flex items-center justify-center">
        {children}
      </main>
    </div>
  );
}
