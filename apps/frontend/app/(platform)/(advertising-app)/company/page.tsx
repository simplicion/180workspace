'use client';

import { useState } from 'react';
import { CompanyProfileUI } from '../_components/CompanyProfileUI';
import { useGetPrivateCompanyProfileQuery } from '@/redux/api/companyApi';

export default function CompanyHubPage() {
    const { data: companyDataResponse, isLoading, refetch } = useGetPrivateCompanyProfileQuery({});
    
    const companyData = companyDataResponse?.data || null; 

    return (
        <div className="w-full">
            <CompanyProfileUI 
                companyData={companyData}
                isLoading={isLoading}
                onProfileUpdate={refetch}
            />
        </div>
    );
}
