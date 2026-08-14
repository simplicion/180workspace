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

function PrimaryToggle({ isPrimary, onChange, loading }) {
    return (
        <button
            onClick={e => { e.stopPropagation(); onChange(!isPrimary); }}
            disabled={loading || isPrimary}
            title={isPrimary ? 'This is the primary website' : 'Set as primary'}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all focus:outline-none ${isPrimary ? 'bg-emerald-500 cursor-default' : 'bg-gray-200 hover:bg-gray-300 cursor-pointer'} ${loading ? 'opacity-50' : ''}`}
        >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${isPrimary ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
        </button>
    );
}

function ThreeDotMenu({ websiteId, onDelete }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const router = useRouter();

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                className="p-1.5 bg-white/90 backdrop-blur-md rounded-lg text-gray-500 hover:text-indigo-600 shadow-sm border border-white/50 transition-colors"
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
                        className="absolute top-full right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
                    >
                        <button
                            onClick={e => { e.stopPropagation(); setOpen(false); router.push(`/dashboard/advertising/${websiteId}/edit`); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                            <Edit3 className="w-4 h-4" />
                            Edit Website
                        </button>
                        <div className="h-px bg-gray-100 mx-2" />
                        <button
                            onClick={e => { e.stopPropagation(); setOpen(false); onDelete(); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
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
    const [primaryLoading, setPrimaryLoading] = useState(false);
    const router = useRouter();

    // ── Compute live URL ──────────────────────────────────────────────────────
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (process.env.NODE_ENV === 'production' ? 'yourdomain.com' : 'localhost:3002');
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
            setPrimaryLoading(true);
            await api.put(`/api/websites/${website.id}`, { isPrimary: true });
            toast.success('Set as primary website');
            onRefresh();
        } catch {
            toast.error('Failed to update');
        } finally {
            setPrimaryLoading(false);
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all overflow-hidden flex flex-col"
        >
            {/* Preview Area */}
            <div className="h-40 bg-gradient-to-br from-indigo-50 to-purple-50 relative overflow-hidden flex items-center justify-center">
                {website.config?.brand?.primaryColor ? (
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: website.config.brand.primaryColor }}>
                        <Globe className="w-8 h-8 text-white" />
                    </div>
                ) : (
                    <Globe className="w-12 h-12 text-indigo-200" />
                )}

                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${website.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-white'}`}>
                        {website.status === 'active' ? 'Active' : 'Paused'}
                    </span>
                </div>

                {/* Top-right controls: Primary toggle + 3-dot */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-white/50">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${website.isPrimary ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {website.isPrimary ? 'Primary' : 'Secondary'}
                        </span>
                        <PrimaryToggle isPrimary={website.isPrimary} onChange={handleSetPrimary} loading={primaryLoading} />
                    </div>
                    <ThreeDotMenu websiteId={website.id} onDelete={handleDelete} />
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col gap-3">
                {/* Name + Link */}
                <div>
                    <h3 className="font-bold text-gray-900 text-base group-hover:text-indigo-600 transition-colors truncate">{website.name}</h3>
                    <a
                        href={liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium mt-0.5 transition-colors group/link"
                    >
                        <span className="truncate max-w-[200px]">{displayUrl}</span>
                        <ArrowUpRight className="w-3 h-3 shrink-0 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    </a>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-50">
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Leads</p>
                        <p className="text-xl font-bold text-gray-900">{website.stats?.leads ?? 0}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Visits</p>
                        <p className="text-xl font-bold text-gray-900">{website.stats?.views ?? 0}</p>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3.5 bg-gray-50/60 border-t border-gray-100 flex items-center gap-2">
                <Link
                    href={`/dashboard/advertising/${website.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                >
                    View Details
                </Link>
                <Link
                    href={`/dashboard/advertising/${website.id}/edit`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 border border-transparent rounded-xl text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-sm"
                >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                </Link>
            </div>
        </motion.div>
    );
}
