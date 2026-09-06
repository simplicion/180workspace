'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogoLoader } from '@workspace/ui';

export default function SettingsIndexPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'ai') {
            router.replace('/settings/ai');
        } else if (tab === 'wallet' || tab === 'billing') {
            router.replace('/settings/wallet');
        } else if (tab) {
            router.replace(`/settings/system-configs?tab=${tab}`);
        } else {
            router.replace('/settings/system-configs');
        }
    }, [router, searchParams]);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <LogoLoader className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    );
}
