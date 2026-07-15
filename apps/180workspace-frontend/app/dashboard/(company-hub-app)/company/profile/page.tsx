"use client";

import React from 'react';
import { useGetPrivateCompanyProfileQuery } from '@redux/api/companyApi';
import { CompanyProfileUI } from '@/app/dashboard/(company-hub-app)/_components/CompanyProfileUI';

export default function CompanyProfilePage() {
    const { data: profileResponse, isLoading, isError, refetch } = useGetPrivateCompanyProfileQuery(undefined);
    
    return (
        <CompanyProfileUI 
            companyData={profileResponse?.data} 
            isLoading={isLoading} 
            isPublicView={false} 
            onProfileUpdate={refetch}
        />
    );
}


