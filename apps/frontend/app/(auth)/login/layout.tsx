import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | 180workspace',
  description: 'Log in to 180workspace to access your professional network, manage your company profile, and discover new opportunities.',
  openGraph: {
    title: 'Login | 180workspace',
    description: 'Log in to 180workspace to access your professional network, manage your company profile, and discover new opportunities.',
    type: 'website',
  }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
