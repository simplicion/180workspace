'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSettings } from '@/lib/settings-context';
import { AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SystemSetupStatus() {
    const { settings, isLoading } = useSettings();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (isLoading) return null;

    const unconfiguredServices = [
        { label: 'Email Automation', key: 'email', isConfigured: settings?.smtpHost && settings?.lastEmailTestStatus === 'success' },
        { label: 'AI Insights', key: 'ai', isConfigured: settings?.aiProvider !== 'none' && settings?.lastAiTestStatus === 'success' },
        {
            label: 'Google Drive Storage',
            key: 'storage',
            isConfigured: settings?.storageMode === 'cloudinary' || (settings?.storageMode === 'google_drive' && settings?.lastStorageTestStatus === 'success')
        }
    ].filter(s => !s.isConfigured);

    if (unconfiguredServices.length === 0) return null;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors relative"
                title="System Setup Pending"
            >
                <AlertCircle className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unconfiguredServices.length}
                </span>
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        {/* Mobile Overlay / Bottom Sheet Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 sm:hidden"
                            onClick={() => setOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="fixed bottom-0 left-0 right-0 z-50 p-5 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:absolute sm:bottom-auto sm:top-full sm:right-0 sm:left-auto sm:mt-3 sm:w-80 sm:rounded-2xl sm:shadow-xl sm:border sm:border-gray-100"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 hidden sm:flex">
                                    <Info className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-sm font-bold text-gray-900">Complete System Setup</h3>
                                        <button onClick={() => setOpen(false)} className="sm:hidden p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-[12px] text-gray-500 mb-3">To unlock full capabilities like automated reporting, AI analysis, and cloud storage, please configure:</p>
                                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                                        {unconfiguredServices.map(s => (
                                            <Link 
                                                key={s.key} 
                                                href="/dashboard/settings" 
                                                onClick={() => setOpen(false)}
                                                className="text-[12px] font-bold text-gray-700 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-all text-center"
                                            >
                                                {s.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
