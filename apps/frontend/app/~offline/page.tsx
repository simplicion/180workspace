'use client';

import { WifiOff, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 select-none">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <WifiOff className="w-10 h-10 text-gray-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">You are offline</h1>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    It looks like you've lost your internet connection. 180workspace requires an active connection to sync your data.
                </p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Try again
                    </button>
                    <Link 
                        href="/"
                        className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors"
                    >
                        Go to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
