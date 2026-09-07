"use client";

import { Suspense } from 'react';
import { BusinessBrainTabs } from '../_components/BusinessBrainTabs';
import { UniversalSkeleton } from '@workspace/ui';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function VoiceforceBrainPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 max-w-7xl mx-auto pb-16 p-6">
          <UniversalSkeleton className="w-48 h-8 rounded-xl" />
          <UniversalSkeleton className="w-full h-44 rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UniversalSkeleton className="h-64 rounded-3xl" />
            <UniversalSkeleton className="h-64 rounded-3xl" />
          </div>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-16 p-4 md:p-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/voiceforce"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Voiceforce Dashboard</span>
          </Link>

          <span className="text-[11px] font-semibold text-gray-400">
            180workspace • Universal Enterprise Brain
          </span>
        </div>

        {/* Brain Component */}
        <BusinessBrainTabs />
      </div>
    </Suspense>
  );
}
