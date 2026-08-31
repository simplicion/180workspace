export interface BrandConfig {
    companyName: string;
    logoUrl?: string;
    brandColor?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
}
export interface DocumentTemplate {
    id: string;
    category: 'financial' | 'commercial' | 'legal' | 'hr' | 'operations' | 'contract' | 'offer_letter' | 'policy' | 'report' | 'other' | 'my_templates';
    title: string;
    description: string;
    isCustom?: boolean;
    blocks?: any[];
    documentDetails?: any;
}
export declare const DOCUMENT_TEMPLATES: DocumentTemplate[];
