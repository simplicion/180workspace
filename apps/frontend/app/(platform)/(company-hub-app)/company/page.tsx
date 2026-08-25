'use client';

import { useState } from 'react';
import { CompanyProfileUI } from '../_components/CompanyProfileUI';

export default function CompanyHubPage() {
    const [isLoading, setIsLoading] = useState(false);
    
    // We can fetch data here later. For now, pass null or mock data.
    // CompanyProfileUI handles fallback to default data when companyData is null/undefined
    const companyData = null; 

    return (
        <div className="w-full">
            <CompanyProfileUI 
                companyData={companyData}
                isLoading={isLoading}
            />
        </div>
    );
}
