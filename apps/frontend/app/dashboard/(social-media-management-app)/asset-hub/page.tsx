'use client';

import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ExternalLink, Search, Plus, Trash2, Image as ImageIcon, Video, Folder, Link2 } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { AddAssetDrawer } from './_components/AddAssetDrawer';

interface SocialAsset {
    id: string;
    url: string;
    type: string;
    tags: string[];
    title?: string;
    description?: string;
    createdAt: string;
}

const CATEGORIES = [
    { key: 'all', label: 'All Assets' },
    { key: 'image', label: 'Images' },
    { key: 'video', label: 'Videos' },
    { key: 'folder', label: 'Folders' },
];

function getIcon(type: string) {
    if (type === 'image') return ImageIcon;
    if (type === 'video') return Video;
    if (type === 'folder') return Folder;
    return Link2;
}


export default function AssetHubPage() {
    const [assets, setAssets] = useState<SocialAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [showAdd, setShowAdd] = useState(false);

    function loadAssets() {
        setLoading(true);
        api.get('/api/social-media/assets', { params: { search } })
            .then(({ data }) => setAssets(data.assets || []))
            .catch(() => setAssets([]))
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadAssets(); }, [search]);

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to remove this linked asset?')) return;
        try {
            await api.delete(`/api/social-media/assets/${id}`);
            toast.success('Asset removed');
            setAssets(prev => prev.filter(a => a.id !== id));
        } catch { toast.error('Failed to remove asset'); }
    }

    const filtered = assets.filter(a => {
        if (activeCategory === 'all') return true;
        return a.type === activeCategory;
    });

    return (
        <div className="min-h-full">
            <AddAssetDrawer 
                isOpen={showAdd} 
                onClose={() => setShowAdd(false)} 
                onSuccess={() => { setShowAdd(false); loadAssets(); }} 
            />

            {/* Page Header */}
            <div className="page-header">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="page-title">Client Asset Hub</h1>
                        <p className="page-subtitle">Manage external media links (Drive, Dropbox) for your clients</p>
                    </div>
                    <button onClick={() => setShowAdd(true)} className="btn-primary shadow-md shadow-indigo-600/20">
                        <Plus className="w-4 h-4" /> Link External Asset
                    </button>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5 mt-2">
                <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search assets..." className="input pl-9 w-full"
                    />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {CATEGORIES.map(cat => (
                        <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                            className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                                activeCategory === cat.key
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600')}>
                            {cat.label}
                            {cat.key !== 'all' && (
                                <span className="ml-1.5 opacity-60 text-[10px]">
                                    ({assets.filter(a => a.type === cat.key).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-28">
                    <div className="flex flex-col items-center gap-3">
                        <LogoLoader className="w-9 h-9 animate-spin text-indigo-400" />
                        <p className="text-sm text-gray-400">Loading assets...</p>
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-28 text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                        <Link2 className="w-9 h-9 text-gray-200" />
                    </div>
                    <p className="text-gray-500 font-semibold text-lg mb-1">No assets found</p>
                    <p className="text-gray-400 text-sm mb-6">
                        Link your first Google Drive or Dropbox folder to get started
                    </p>
                    <button onClick={() => setShowAdd(true)} className="btn-primary">
                        <Plus className="w-4 h-4" /> Link Asset
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(asset => {
                        const Icon = getIcon(asset.type);
                        return (
                            <div key={asset.id} className="card p-5 hover:shadow-lg hover:shadow-gray-100 transition-all duration-200 group flex flex-col">
                                <div className="flex items-start gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 transition-colors duration-300">
                                        <Icon className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate leading-snug group-hover:text-indigo-600 transition-colors">
                                            {asset.title || 'Untitled Asset'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border bg-gray-50 text-gray-600 border-gray-100">
                                                {asset.type}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(asset.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {asset.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {asset.tags.map((tag, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-md font-medium">#{tag}</span>
                                        ))}
                                    </div>
                                )}

                                {asset.description && (
                                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{asset.description}</p>
                                )}

                                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-50">
                                    <a href={asset.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="Open External Link">
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <button onClick={() => handleDelete(asset.id)} className="ml-auto p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100" title="Remove">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
