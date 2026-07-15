import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | Pitchin180',
  description: 'Log in to Pitchin180 to access your professional network, manage your company profile, and discover new opportunities.',
  openGraph: {
    title: 'Login | Pitchin180',
    description: 'Log in to Pitchin180 to access your professional network, manage your company profile, and discover new opportunities.',
    type: 'website',
  }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
