"use client";

import React from 'react';
import { useGetPrivateCompanyProfileQuery } from '@/redux/api/companyApi';
import { EventsTab } from '@/app/dashboard/(company-hub-app)/_components/EventsTab';
import { Loader2 } from 'lucide-react';

export default function CompanyEventsPage() {
    const { data: profileResponse, isLoading } = useGetPrivateCompanyProfileQuery(undefined);
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const company = profileResponse?.data;

    if (!company) {
        return (
            <div className="p-8 text-center text-gray-500">
                Company profile not found.
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pb-12 w-full">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-screen">
                <EventsTab company={company} isPublicView={false} />
            </div>
        </div>
    );
}
