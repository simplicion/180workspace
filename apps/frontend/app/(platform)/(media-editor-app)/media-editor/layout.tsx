import { ReactNode } from 'react';
import { DesktopOnlyGate } from '@/components/shared/DesktopOnlyGate';

export const metadata = {
  title: '180 Media Studio | Autonomous Video Production Engine',
  description: 'Deterministic local-first video editor, AI Creative Director, and high-performance GPU compositor in 180workspace.'
};

/**
 * All media processing (FFmpeg, GPU compositing, export, local media files) runs in the desktop app only.
 * In a browser this whole route renders the "download the app" wall instead of the editor.
 */
export default function MediaEditorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-h-screen text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DesktopOnlyGate featureName="Video editing" deepLinkPath="media-editor" backHref="/dashboard">
          {children}
        </DesktopOnlyGate>
      </div>
    </div>
  );
}
