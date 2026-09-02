'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, ExternalLink, Trash2, MoreVertical, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal, DomainManagerModal } from '@workspace/ui';

interface WebsiteCardProps {
    website: any;
    companyData: any;
    onRefresh: () => void;
}

function ThreeDotMenu({ websiteId, liveUrl, onOpenDomain, onDelete }: any) {
    const [open, setOpen] = useState(false);
    const ref = useRef<any>(null);

    useEffect(() => {
        const handler = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                className="p-2 bg-white rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 transition-colors shadow-xs"
                title="More Actions"
            >
                <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -4 }}
                        className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-gray-100 shadow-xl p-1.5 z-20"
                    >
                        <Link
                            href={`/advertising/${websiteId}/edit`}
                            onClick={() => setOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                            <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                            <span>Edit Design</span>
                        </Link>
                        <button
                            onClick={() => { setOpen(false); onOpenDomain(); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                            <Globe className="w-3.5 h-3.5 text-gray-400" />
                            <span>Domain Settings</span>
                        </button>
                        <a
                            href={liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                            <span>Preview Live</span>
                        </a>
                        <div className="h-px bg-gray-100 my-1" />
                        <button
                            onClick={() => { setOpen(false); onDelete(); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Website</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function WebsiteCard({ website, companyData, onRefresh }: WebsiteCardProps) {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (typeof window !== 'undefined' ? window.location.host : 'localhost:3000');
    const isLocal = rootDomain.includes('localhost');
    let liveUrl = website.customDomain
        ? `https://${website.customDomain}`
        : `http${isLocal ? '' : 's'}://${website.slug}.${rootDomain}`;
    
    const displayUrl = liveUrl.replace(/^https?:\/\//, '');

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);

    const [timeRange, setTimeRange] = useState('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const calculateViews = () => {
        if (timeRange === 'all') return website.stats?.views ?? 0;
        
        const viewsByDate = website.stats?.viewsByDate || {};
        let total = 0;
        
        const now = new Date();
        const formatDate = (d: Date) => d.toISOString().slice(0, 10);
        const todayStr = formatDate(now);
        
        let startStr = '';
        if (timeRange === 'today') {
            startStr = todayStr;
        } else if (timeRange === 'week') {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            startStr = formatDate(d);
        } else if (timeRange === 'month') {
            const d = new Date();
            d.setMonth(d.getMonth() - 1);
            startStr = formatDate(d);
        }

        if (timeRange === 'custom') {
            if (!customStart || !customEnd) return 0;
            Object.keys(viewsByDate).forEach(dateStr => {
                if (dateStr >= customStart && dateStr <= customEnd) {
                    total += viewsByDate[dateStr];
                }
            });
            return total;
        }

        Object.keys(viewsByDate).forEach(dateStr => {
            if (dateStr >= startStr) {
                total += viewsByDate[dateStr];
            }
        });
        return total;
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/api/websites/${website.id}`);
            toast.success('Website deleted');
            setShowDeleteConfirm(false);
            onRefresh();
        } catch {
            toast.error('Failed to delete website');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:shadow-gray-200/50 transition-all flex flex-col md:flex-row items-center p-4 gap-4 md:gap-6"
            >
                {/* Logo area - clickable to edit */}
                <Link href={`/advertising/${website.id}/edit`} className="flex-shrink-0 relative cursor-pointer" title="Open Website Editor">
                    {website.config?.header?.logo ? (
                        <img src={website.config.header.logo} alt={website.name} className="w-16 h-16 rounded-2xl object-contain border border-gray-100 p-2 bg-white hover:border-indigo-200 transition-colors" />
                    ) : website.config?.brand?.primaryColor ? (
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: website.config.brand.primaryColor }}>
                            <Globe className="w-8 h-8 text-white" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 hover:border-indigo-200 transition-colors">
                            <Globe className="w-8 h-8 text-gray-400" />
                        </div>
                    )}
                </Link>

                {/* Name & Link */}
                <div className="flex-1 min-w-0 w-full flex flex-col">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link href={`/advertising/${website.id}/edit`}>
                            <h3 className="font-bold text-gray-900 text-lg hover:text-indigo-600 transition-colors truncate cursor-pointer">
                                {website.name}
                            </h3>
                        </Link>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                        <a
                            href={liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-indigo-600 truncate flex items-center gap-1"
                        >
                            <span>{displayUrl}</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2 md:ml-auto">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        website.isPublished 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                        {website.isPublished ? 'Published' : 'Draft'}
                    </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 pl-0 md:pl-6 w-full md:w-auto">
                    <div className="flex flex-col items-start gap-1">
                        <select 
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="text-[11px] text-gray-400 uppercase tracking-widest font-bold bg-transparent border-none p-0 cursor-pointer focus:ring-0 outline-none"
                        >
                            <option value="today">Visits Today</option>
                            <option value="week">Visits Last Week</option>
                            <option value="month">Visits Last Month</option>
                            <option value="all">Total Visits</option>
                            <option value="custom">Custom Range</option>
                        </select>
                        
                        <div className="flex items-end gap-2">
                            <p className="text-xl font-bold text-gray-900 leading-none">{calculateViews()}</p>
                        </div>

                        {timeRange === 'custom' && (
                            <div className="flex gap-1 items-center text-xs mt-1">
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-1.5 py-1 border border-gray-200 rounded text-gray-600" />
                                <span className="text-gray-400">-</span>
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-1.5 py-1 border border-gray-200 rounded text-gray-600" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions - Direct Access */}
                <div className="flex items-center justify-end gap-2 w-full md:w-auto pt-4 md:pt-0 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-100 md:ml-2">
                    <button
                        onClick={() => setIsDomainModalOpen(true)}
                        title="Domain Settings"
                        className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-xs flex items-center justify-center cursor-pointer"
                    >
                        <Globe className="w-4 h-4" />
                    </button>
                    <a
                        href={liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview Live"
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-xs"
                    >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                        <span>Preview</span>
                    </a>
                    <Link
                        href={`/advertising/${website.id}/edit`}
                        title="Edit Website"
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-xs"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Website</span>
                    </Link>
                    <ThreeDotMenu 
                        websiteId={website.id} 
                        liveUrl={liveUrl}
                        onOpenDomain={() => setIsDomainModalOpen(true)}
                        onDelete={() => setShowDeleteConfirm(true)} 
                    />
                </div>
            </motion.div>

            {/* Domain Manager Modal */}
            <DomainManagerModal 
                isOpen={isDomainModalOpen} 
                onClose={() => setIsDomainModalOpen(false)} 
                targetType="ADVERTISING_WEBSITE"
                targetId={website.id}
                targetName={website.name}
                initialDomain={website.customDomain || (website.slug ? `${website.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost'}` : null)}
                onDomainSaved={() => onRefresh()}
                onDomainRemoved={() => onRefresh()}
            />

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Website"
                message={`Are you sure you want to delete "${website.name}"? All landing pages, assets, and analytics will be permanently removed.`}
                confirmText="Delete Website"
                cancelText="Cancel"
                loading={isDeleting}
                variant="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </>
    );
}

export { WebsiteCard };
