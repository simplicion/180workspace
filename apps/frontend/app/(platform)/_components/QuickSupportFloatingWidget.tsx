'use client';

import React, { useState } from 'react';
import { LifeBuoy, Sparkles, MessageSquareWarning } from 'lucide-react';
import { QuickSupportDrawer, QuickSupportSubmissionData } from '@workspace/ui';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { usePathname } from 'next/navigation';

export function QuickSupportFloatingWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, company } = useAuth();
    const pathname = usePathname();

    const handleSubmit = async (data: QuickSupportSubmissionData) => {
        try {
            const res = await api.post('/api/v1/settings/support/quick', data);
            if (res.data) {
                return {
                    success: true,
                    ticketId: res.data.ticketId || res.data.ticket?.id,
                    message: res.data.message
                };
            }
            return { success: false, message: 'No response from support server' };
        } catch (err: any) {
            console.error('Quick support submission error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to submit report';
            return { success: false, message: errorMsg };
        }
    };

    const resolvedUserName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined);
    const resolvedCompanyName = company?.name || (user as any)?.companyName || undefined;

    return (
        <>
            {/* Launcher button (Fixed on bottom right, directly below AI Copilot) */}
            {!isOpen && (
                <div className="fixed bottom-6 right-6 z-40">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white shadow-xl shadow-indigo-500/25 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group border border-white/20"
                        title="Quick Support & Bug Reporter (Paste Screenshots directly)"
                        aria-label="Open Quick Support & Issue Reporter"
                    >
                        <LifeBuoy className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                    </button>
                </div>
            )}

            {/* Quick Support Drawer */}
            <QuickSupportDrawer
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSubmit={handleSubmit}
                userContext={{
                    name: resolvedUserName,
                    email: user?.email || undefined,
                    companyName: resolvedCompanyName,
                    role: user?.role || undefined
                }}
                customRouteUrl={pathname}
            />
        </>
    );
}

export default QuickSupportFloatingWidget;
