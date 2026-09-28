'use client';

import { useEffect } from 'react';
import { useSearchParams, useParams } from 'next/navigation';

export default function OAuthCallbackCatchAll() {
  const searchParams = useSearchParams();
  const params = useParams();

  useEffect(() => {
    const slug = Array.isArray(params?.slug) ? params.slug.join('/') : String(params?.slug || '');
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';

    if (slug.includes('social') || slug.includes('180social')) {
      const target = isDev ? `http://localhost:3007/#/oauth-callback${qs}` : `https://social.180workspace.com/#/oauth-callback${qs}`;
      window.location.replace(target);
      return;
    }

    // Default fallback to 180 Workspace dashboard
    window.location.replace(`/${qs}`);
  }, [params, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <div className="w-8 h-8 border-3 border-white/20 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}
