'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LogoLoader } from '@workspace/ui';

function OAuthAuthorizeRedirect() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const authServerUrl = process.env.NEXT_PUBLIC_180_AUTH_URL || 'https://profile.180workspace.com';
        const query = searchParams ? searchParams.toString() : '';
        const targetUrl = `${authServerUrl}/oauth/authorize${query ? `?${query}` : ''}`;
        window.location.href = targetUrl;
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
            <LogoLoader className="w-10 h-10 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-gray-500 tracking-wide">
                Redirecting to 180 Identity…
            </p>
        </div>
    );
}

export default function AuthorizePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <LogoLoader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <OAuthAuthorizeRedirect />
        </Suspense>
    );
}
