"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, CreditCard } from 'lucide-react';
import api from '@/lib/api';
import { LogoLoader } from "@workspace/ui";
import { SubscriptionPlan } from '@/components/shared/SubscriptionPlan';
import { signOut } from 'next-auth/react';

export default function SubscriptionExpiredPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        api.get('/api/v1/platform-billing/plans')
            .then(res => setPlans(res.data.plans || []))
            .catch(err => console.error("Failed to load plans", err))
            .finally(() => setLoading(false));
    }, []);

    const handleSelectPlan = (planId: string) => {
        // Implement checkout flow for selecting a new plan
        alert(`Redirecting to checkout for plan ${planId}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-4xl space-y-8">
                <div className="text-center">
                    <ShieldAlert className="mx-auto h-16 w-16 text-red-500 mb-4" />
                    <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Subscription Inactive</h2>
                    <p className="mt-4 text-lg text-gray-500">
                        Your workspace subscription has expired or is inactive. To restore access to your workspace tools and data, please choose a plan below.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <LogoLoader className="w-10 h-10 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {plans.map(plan => (
                            <SubscriptionPlan
                                key={plan.id}
                                id={plan.id}
                                name={plan.planName}
                                description={`Unlock premium features for ${plan.planName.toLowerCase()}`}
                                price={plan.price}
                                currencySymbol="$"
                                features={plan.features || []}
                                isPopular={plan.planName.toLowerCase().includes('pro')}
                                isSelected={false}
                                onSelect={() => handleSelectPlan(plan.id)}
                                buttonText="Subscribe Now"
                            />
                        ))}
                    </div>
                )}

                <div className="mt-12 text-center text-sm">
                    <p className="text-gray-500">
                        Want to use a different account?{' '}
                        <button onClick={() => signOut({ callbackUrl: '/login' })} className="font-medium text-indigo-600 hover:text-indigo-500">
                            Sign out
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
