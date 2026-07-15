import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | Pitchin180',
  description: 'Create an account on Pitchin180 to start building your professional network, set up your company workspace, and unlock community features.',
  openGraph: {
    title: 'Sign Up | Pitchin180',
    description: 'Create an account on Pitchin180 to start building your professional network, set up your company workspace, and unlock community features.',
    type: 'website',
  }
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
