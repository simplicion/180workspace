import { ReactNode } from 'react';
import { VoiceforceGlobalBanner } from './_components/VoiceforceGlobalBanner';

export const metadata = {
  title: '180 Voiceforce | Autonomous AI Voice Employees',
  description: 'Autonomous AI voice employees for customer calling, appointments, and order confirmation in 180workspace.'
};

export default function VoiceforceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-h-screen text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <VoiceforceGlobalBanner />
        {children}
      </div>
    </div>
  );
}
