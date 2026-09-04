'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogoLoader } from '@workspace/ui';

export default function ReleaseNotesRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/help-support#release-notes');
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
            <LogoLoader className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500 font-medium">Redirecting to Help & Support Release Notes...</p>
        </div>
    );
}
