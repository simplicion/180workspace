import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | 180workspace',
  description: 'Create an account on 180workspace to start building your professional network, set up your company workspace, and unlock community features.',
  openGraph: {
    title: 'Sign Up | 180workspace',
    description: 'Create an account on 180workspace to start building your professional network, set up your company workspace, and unlock community features.',
    type: 'website',
  }
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
