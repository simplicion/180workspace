import { Metadata } from 'next';
import api from '@/lib/api';

type Props = {
    params: Promise<{ id: string }>
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    try {
        const { id } = await params;
        const apiBase = process.env.BACKEND_INTERNAL_URL || 
            (process.env.NODE_ENV === 'production' ? 'http://backend:4000' : null) || 
            process.env.NEXT_PUBLIC_BACKEND_URL || 
            process.env.NEXT_PUBLIC_API_URL || 
            (process.env.NODE_ENV === 'development' ? 'http://localhost:4002' : '');
        const res = await fetch(`${apiBase}/api/public/jobs/${id}`);
        const data = await res.json();
        
        if (!data || !data.job) {
            return {
                title: 'Job Not Found',
                description: 'The job posting you are looking for does not exist or has been removed.'
            };
        }

        const job = data.job;
        const companyName = job.company?.name || 'our company';

        return {
            title: `${job.title} at ${companyName}`,
            description: job.description?.substring(0, 160) || `Apply for the ${job.title} role at ${companyName}.`,
            openGraph: {
                title: `${job.title} at ${companyName}`,
                description: job.description?.substring(0, 160) || `Apply for the ${job.title} role at ${companyName}.`,
                images: job.company?.logoUrl ? [
                    {
                        url: job.company.logoUrl,
                        width: 800,
                        height: 600,
                        alt: `${companyName} logo`,
                    }
                ] : [],
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: `${job.title} at ${companyName}`,
                description: job.description?.substring(0, 160),
                images: job.company?.logoUrl ? [job.company.logoUrl] : [],
            },
        };
    } catch (error) {
        return {
            title: 'Job Application',
            description: 'Apply for this open position.'
        };
    }
}

export default function JobApplyLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>;
}
