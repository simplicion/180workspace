'use client';
import { Drawer } from "@/components/ui/Drawer";

import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import { FileText, Edit2, Download, HardDrive, Search, LayoutTemplate } from 'lucide-react';
import { DOCUMENT_TEMPLATES, DocumentTemplate, BrandConfig } from './templatesData';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useSettings } from '@/lib/settings-context';
import { useRouter } from 'next/navigation';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
    financial: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    commercial: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    legal: 'bg-amber-50 text-amber-700 border-amber-100',
    hr: 'bg-purple-50 text-purple-700 border-purple-100',
    operations: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    contract: 'bg-blue-50 text-blue-700 border-blue-100',
    offer_letter: 'bg-purple-50 text-purple-700 border-purple-100',
    policy: 'bg-amber-50 text-amber-700 border-amber-100',
    report: 'bg-rose-50 text-rose-700 border-rose-100',
    my_templates: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    other: 'bg-gray-50 text-gray-600 border-gray-100',
};

const CATEGORIES = [
    { key: 'all', label: 'All Templates' },
    { key: 'financial', label: 'Financial & Invoicing' },
    { key: 'commercial', label: 'Commercial & Sales' },
    { key: 'legal', label: 'Legal & NDAs' },
    { key: 'hr', label: 'HR & Letters' },
    { key: 'operations', label: 'Operations & SOWs' },
    { key: 'my_templates', label: 'My Saved Templates' },
];

interface TemplatesListDrawerProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function TemplatesListDrawer({
    onClose,
    onSuccess,
}: TemplatesListDrawerProps) {
    const router = useRouter();
    const [filterCat, setFilterCat] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const { settings } = useSettings();

    // Build brand config from settings
    const brand: BrandConfig = {
        companyName: settings?.companyName || 'Your Company',
        logoUrl: settings?.logoUrl || '',
        brandColor: settings?.themeColor || '#4f46e5',
        email: settings?.emailFrom || '',
    };

    const driveConfigured = settings?.storageMode === 'google_drive' && !!settings?.googleDriveServiceAccount;

    const [customTemplates, setCustomTemplates] = useState<any[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    useEffect(() => {
        const fetchCustomTemplates = async () => {
            setLoadingTemplates(true);
            try {
                const res = await api.get('/api/v1/workspace-tools/documents?category=Template');
                if (res.data?.success && res.data.documents) {
                    const parsedTemplates = res.data.documents.map((a: any) => {
                        let content: any = null;
                        try { content = JSON.parse(a.content); } catch (e) {}
                        return {
                            id: a.id,
                            category: 'my_templates',
                            title: a.title || a.name,
                            description: 'Custom saved template',
                            isCustom: true,
                            blocks: a.contentBlocks || content?.blocks || [],
                            documentDetails: a.variables || content?.documentDetails || null,
                        };
                    });
                    setCustomTemplates(parsedTemplates);
                }
            } catch (err) {
                console.error("Failed to fetch custom templates", err);
            } finally {
                setLoadingTemplates(false);
            }
        };
        fetchCustomTemplates();
    }, []);

    const allTemplates = [...customTemplates, ...DOCUMENT_TEMPLATES];
    const filtered = allTemplates.filter(t => {
        const matchCat = filterCat === 'all' || t.category === filterCat;
        const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });

    return (
        <Drawer open={true} onClose={onClose} title="20 Production Templates Matrix" position="right" size="w-full md:w-2/3 lg:w-1/2">
            <div className="flex bg-white rounded-2xl w-full flex-col shadow-2xl h-full min-h-[80vh]">

                {/* Header Subtitle & Search */}
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0 flex flex-wrap items-center justify-between gap-4">
                    <p className="text-xs text-gray-500">
                        {allTemplates.length} professionally formatted, production-ready templates
                    </p>
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search templates by title or keywords..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 px-6 py-3 border-b border-gray-50 flex-wrap flex-shrink-0">
                    {CATEGORIES.map(c => (
                        <button key={c.key} onClick={() => setFilterCat(c.key)}
                            className={clsx('px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border',
                                filterCat === c.key
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600')}>
                            {c.label}
                            {c.key !== 'all' && (
                                <span className="ml-1.5 opacity-70">
                                    ({allTemplates.filter(t => t.category === c.key).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Brand preview bar */}
                <div className="flex items-center gap-3 px-6 py-2.5 bg-indigo-50 border-b border-indigo-100 flex-shrink-0">
                    {brand.logoUrl ? (
                        <img src={brand.logoUrl} alt="logo" className="w-6 h-6 rounded-md object-contain" />
                    ) : (
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-black" style={{ background: brand.brandColor }}>
                            {brand.companyName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="text-xs text-indigo-700 font-medium">
                        All templates will auto-inject <strong>{brand.companyName}</strong> branding, logo, sign-off blocks, and client variables.
                    </span>
                </div>

                {/* Grid */}
                <div className="flex-1 p-6 bg-gray-50 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                        {filtered.map(t => {
                            const badgeColor = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.other;
                            return (
                                <div 
                                    key={t.id} 
                                    onClick={() => {
                                        onClose();
                                        router.push('/document-editor?templateId=' + t.id);
                                    }}
                                    className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer group flex flex-col"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
                                            <FileText className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                                        </div>
                                        <span className={clsx('text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border', badgeColor)}>
                                            {t.category.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1.5 group-hover:text-indigo-600 transition-colors">
                                        {t.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 leading-relaxed flex-1 mb-4">{t.description}</p>
                                    
                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                            <Edit2 className="w-3.5 h-3.5" /> Use Template →
                                        </span>
                                        {t.documentDetails?.totalAmount && (
                                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                ₹{t.documentDetails.totalAmount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Drawer>
    );
}
