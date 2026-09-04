'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, RefreshCcw, Home } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
        if (
            typeof window !== 'undefined' &&
            (error?.name === 'ChunkLoadError' || error?.message?.includes('Loading chunk') || error?.message?.includes('ChunkLoadError'))
        ) {
            const lastReload = sessionStorage.getItem('last_chunk_reload');
            const now = Date.now();
            if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                sessionStorage.setItem('last_chunk_reload', String(now));
                window.location.reload();
            }
        }
    }, [error]);

    const handleRecovery = () => {
        if (typeof window !== 'undefined' && (error?.name === 'ChunkLoadError' || error?.message?.includes('chunk'))) {
            window.location.reload();
        } else {
            reset();
        }
    };

    return (
        <div className="min-h-screen bg-rose-50/30 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl border border-rose-100 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-rose-50 border border-rose-100 mb-6 shadow-sm">
                        <ShieldAlert className="w-10 h-10 text-rose-500" />
                    </div>
                    
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
                        System Error Occurred
                    </h1>
                    
                    <p className="text-sm text-gray-500 mb-8 max-w-[280px] leading-relaxed">
                        {error?.name === 'ChunkLoadError' || error?.message?.includes('chunk')
                            ? 'A new version of this page has been compiled. Please click below to refresh.'
                            : 'We apologize for the inconvenience. A runtime error has interrupted your session.'}
                    </p>

                    <div className="flex flex-col w-full gap-3">
                        <button
                            onClick={handleRecovery}
                            className="w-full py-4 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Attempt Recovery
                        </button>
                        <Link
                            href="/superadmin"
                            className="w-full py-4 rounded-xl font-semibold text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Home className="w-4 h-4" />
                            Return to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

