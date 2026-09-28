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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-black text-zinc-100 antialiased selection:bg-blue-600 selection:text-white p-4 sm:p-6 overflow-hidden">
      {/* Atmospheric Glow (matching marketing home page hero) */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-indigo-500/20 via-violet-500/15 to-transparent blur-[130px] rounded-full z-0"
        aria-hidden="true"
      />

      {/* Grid Pattern with Radial Vignette Mask (exact marketing home page pattern) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-70"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.07) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, #000 50%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, #000 50%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Foreground Container */}
      <main className="relative z-10 w-full flex items-center justify-center">
        {children}
      </main>
    </div>
  );
}
