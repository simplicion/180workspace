'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, RefreshCcw, Home, LifeBuoy, Copy, Check, Eye } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const isActuallyDev = process.env.NODE_ENV === 'development';
    const [showDevView, setShowDevView] = useState(isActuallyDev);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
        
        // Auto-recover from ChunkLoadError (usually happens when a new version is deployed)
        if (error?.message?.includes('ChunkLoadError') || error?.message?.includes('Loading chunk')) {
            const reloaded = sessionStorage.getItem('chunk_reload');
            if (reloaded !== 'true') {
                sessionStorage.setItem('chunk_reload', 'true');
                window.location.reload();
            } else {
                // If it still fails after reload, show the error and clear the flag for the future
                sessionStorage.removeItem('chunk_reload');
            }
        }
    }, [error]);

    const handleCopy = () => {
        const errorText = `Error: ${error.message}\nDigest: ${error.digest || 'N/A'}\nStack:\n${error.stack || 'N/A'}`;
        navigator.clipboard.writeText(errorText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            {/* Ambient Backgrounds */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div 
                role="alert" 
                aria-live="assertive"
                className="max-w-lg w-full bg-white/70 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/50 dark:border-gray-800/50 p-10 text-center relative z-10 flex flex-col"
            >
                {isActuallyDev && (
                    <button 
                        onClick={() => setShowDevView(!showDevView)}
                        className="absolute top-4 right-4 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        {showDevView ? 'Preview Prod' : 'Show Dev Error'}
                    </button>
                )}

                <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 mb-8 mx-auto shadow-sm">
                    <ShieldAlert className="w-12 h-12 text-red-500" aria-hidden="true" />
                </div>
                
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
                    {showDevView ? 'Development Error' : 'Oops! Something went wrong.'}
                </h1>
                
                {showDevView ? (
                    <div className="mb-10 text-left bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800/30 overflow-hidden relative group">
                        <button 
                            onClick={handleCopy}
                            className="absolute top-3 right-3 p-1.5 rounded-md bg-white/50 dark:bg-black/20 text-red-600 dark:text-red-400 hover:bg-white dark:hover:bg-black/40 transition-colors border border-red-200/50 dark:border-red-800/50 backdrop-blur-sm"
                            title="Copy Error"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-2 pr-8 truncate">
                            {error.message || 'Unknown Error'}
                        </p>
                        {error.digest && (
                            <p className="text-xs text-red-500 dark:text-red-300 font-mono mb-2">
                                Digest: {error.digest}
                            </p>
                        )}
                        {error.stack && (
                            <pre className="text-[10px] text-red-500/80 dark:text-red-300/80 font-mono overflow-auto max-h-32 hide-scrollbar">
                                {error.stack}
                            </pre>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center mb-10 text-center">
                        <p className="text-base text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                            We are facing an issue.
                        </p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            href="/"
                            className="w-full py-3.5 rounded-xl font-semibold text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                        >
                            <Home className="w-4 h-4" />
                            Home
                        </Link>
                        <Link
                            href="/support"
                            className="w-full py-3.5 rounded-xl font-semibold text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                        >
                            <LifeBuoy className="w-4 h-4" />
                            Help Center
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
