'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, ExternalLink, Edit3, Trash2, MoreVertical, ArrowUpRight, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface WebsiteCardProps {
    website: any;
    companyData: any;
    onRefresh: () => void;
}

function ThreeDotMenu({ websiteId, onDelete, isPrimary, onSetPrimary }: any) {
    const [open, setOpen] = useState(false);
    const ref = useRef<any>(null);
    const router = useRouter();

    useEffect(() => {
        const handler = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                className="p-2 bg-white rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 transition-colors"
            >
                <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
                    >
                        <button
                            onClick={e => { e.stopPropagation(); setOpen(false); router.push(`/dashboard/advertising/${websiteId}/edit`); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                            <Edit3 className="w-4 h-4" />
                            Edit Website
                        </button>
                        {!isPrimary && (
                            <button
                                onClick={e => { e.stopPropagation(); setOpen(false); onSetPrimary(); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                            >
                                <Star className="w-4 h-4" />
                                Set as Primary
                            </button>
                        )}
                        <div className="h-px bg-gray-100 mx-2" />
                        <button
                            onClick={e => { e.stopPropagation(); setOpen(false); onDelete(); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function WebsiteCard({ website, companyData, onRefresh }: WebsiteCardProps) {
    const router = useRouter();

    // ── Compute live URL ──────────────────────────────────────────────────────
    const baseDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
    const [rootDomain, setRootDomain] = useState(baseDomain);

    useEffect(() => {
        if (typeof window !== 'undefined' && (baseDomain === 'localhost' || baseDomain === '')) {
            setRootDomain(window.location.host.replace(/^.*localhost/, 'localhost'));
        }
    }, [baseDomain]);

    const isLocal = rootDomain.includes('localhost');
    let liveUrl = `http${isLocal ? '' : 's'}://${companyData?.slug || 'company'}.${rootDomain}${website.isPrimary ? '' : `/${website.slug}`}`;
    if (companyData?.customDomain) {
        liveUrl = website.isPrimary
            ? `https://${companyData.customDomain}`
            : `https://${website.slug}.${companyData.customDomain}`;
    }
    const displayUrl = liveUrl.replace(/^https?:\/\//, '');

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSetPrimary = async () => {
        if (website.isPrimary) return;
        try {
            await api.put(`/api/websites/${website.id}`, { isPrimary: true });
            toast.success('Set as primary website');
            onRefresh();
        } catch {
            toast.error('Failed to update');
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${website.name}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/api/websites/${website.id}`);
            toast.success('Website deleted');
            onRefresh();
        } catch {
            toast.error('Failed to delete website');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:shadow-gray-200/50 transition-all flex flex-col md:flex-row items-center p-4 gap-4 md:gap-6"
        >
            {/* Logo area */}
            <div className="flex-shrink-0 relative">
                {website.config?.header?.logo ? (
                    <img src={website.config.header.logo} alt={website.name} className="w-16 h-16 rounded-2xl object-contain border border-gray-100 p-2 bg-white" />
                ) : website.config?.brand?.primaryColor ? (
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: website.config.brand.primaryColor }}>
                        <Globe className="w-8 h-8 text-white" />
                    </div>
                ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                        <Globe className="w-8 h-8 text-gray-400" />
                    </div>
                )}
            </div>

            {/* Name & Link */}
            <div className="flex-1 min-w-0 w-full flex flex-col">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors truncate">
                        {website.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${website.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {website.status === 'active' ? 'Active' : 'Paused'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${website.isPrimary ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                        {website.isPrimary ? 'Primary' : 'Secondary'}
                    </span>
                </div>
                <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors group/link w-fit"
                >
                    <span className="truncate max-w-sm">{displayUrl}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                </a>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between md:justify-start gap-8 md:gap-10 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 pl-0 md:pl-6 w-full md:w-auto">
                <div className="flex flex-col">
                    <p className="text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">Leads</p>
                    <p className="text-xl font-bold text-gray-900 leading-none">{website.stats?.leads ?? 0}</p>
                </div>
                <div className="flex flex-col">
                    <p className="text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">Visits</p>
                    <p className="text-xl font-bold text-gray-900 leading-none">{website.stats?.views ?? 0}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto pt-4 md:pt-0 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-100 md:ml-2">
                <Link
                    href={`/dashboard/advertising/${website.id}`}
                    className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm whitespace-nowrap"
                >
                    View Details
                </Link>
                <ThreeDotMenu websiteId={website.id} onDelete={handleDelete} isPrimary={website.isPrimary} onSetPrimary={handleSetPrimary} />
            </div>
        </motion.div>
    );
}
