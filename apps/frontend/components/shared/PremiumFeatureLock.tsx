'use client';

import { useState, useEffect } from 'react';
import { LogoLoader } from "@workspace/ui";
import { Lock } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function PremiumFeatureLock({ children }: { children: React.ReactNode }) {
    const [currentPlan, setCurrentPlan] = useState<string | null>(null);
    const [loadingPlan, setLoadingPlan] = useState(true);

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const res = await api.get('/api/v1/platform-billing');
                setCurrentPlan(res.data?.currentSubscription?.Plan?.planName || 'Unknown');
            } catch (err) {
                console.error('Failed to fetch plan', err);
            } finally {
                setLoadingPlan(false);
            }
        };
        fetchPlan();
    }, []);

    if (loadingPlan) {
        return (
            <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 p-8 flex items-center justify-center min-h-[400px]">
                <LogoLoader className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!currentPlan || currentPlan === 'Unknown' || currentPlan.toLowerCase() === 'kickstart') {
        return (
            <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Premium Feature Locked</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mt-2">
                        This configuration requires an active premium subscription. Upgrade your workspace to unlock this capability.
                    </p>
                </div>
                <Link href="/dashboard/settings/platform-billing" className="btn-primary mt-4">
                    Upgrade Plan
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}
