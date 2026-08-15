'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Hash, Quote, PenTool, Copy, Trash2, Edit, Link2, ExternalLink, Image as ImageIcon, Video, Folder } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { LogoLoader } from "@workspace/ui";
import { CreateBankDrawer } from './_components/CreateBankDrawer';
import { AddAssetDrawer } from './_components/AddAssetDrawer';

type MainTab = 'linked_assets' | 'hashtag' | 'hook' | 'voice';

interface SavedBankItem {
    id: string;
    type: 'hashtag' | 'hook' | 'voice';
    name: string;
    content: string;
    tags: string[];
}

interface SocialAsset {
    id: string;
    url: string;
    type: string;
    tags: string[];
    title?: string;
    description?: string;
    createdAt: string;
}

function getIcon(type: string) {
    if (type === 'image') return ImageIcon;
    if (type === 'video') return Video;
    if (type === 'folder') return Folder;
    return Link2;
}

export default function SocialMediaAssetsPage() {
    const [activeTab, setActiveTab] = useState<MainTab>('linked_assets');
    const [search, setSearch] = useState('');
    
    // State for Banks
    const [banks, setBanks] = useState<SavedBankItem[]>([]);
    const [loadingBanks, setLoadingBanks] = useState(false);
    const [isCreateBankModalOpen, setIsCreateBankModalOpen] = useState(false);
    
    // State for Assets
    const [assets, setAssets] = useState<SocialAsset[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [isAddAssetDrawerOpen, setIsAddAssetDrawerOpen] = useState(false);

    // Filter categories for linked assets
    const [activeAssetCategory, setActiveAssetCategory] = useState('all');
    const ASSET_CATEGORIES = [
        { key: 'all', label: 'All Assets' },
        { key: 'image', label: 'Images' },
        { key: 'video', label: 'Videos' },
        { key: 'folder', label: 'Folders' },
    ];

    // Load data based on active tab
    useEffect(() => {
        if (activeTab === 'linked_assets') {
            loadAssets();
        } else {
            loadBanks();
        }
    }, [activeTab, search]);

    async function loadBanks() {
        try {
            setLoadingBanks(true);
            const { data } = await api.get('/api/social-media/saved-banks');
            if (data.success) {
                setBanks(data.banks);
            }
        } catch (error) {
            toast.error('Failed to load saved texts');
        } finally {
            setLoadingBanks(false);
        }
    }

    async function loadAssets() {
        try {
            setLoadingAssets(true);
            const { data } = await api.get('/api/social-media/assets', { params: { search } });
            setAssets(data.assets || []);
        } catch (error) {
            setAssets([]);
        } finally {
            setLoadingAssets(false);
        }
    }

    // Deletion handlers
    async function handleDeleteBank(id: string) {
        if (!confirm('Are you sure you want to delete this?')) return;
        try {
            await api.delete(`/api/social-media/saved-banks/${id}`);
            toast.success('Deleted successfully');
            loadBanks();
        } catch (error) {
            toast.error('Failed to delete');
        }
    }

    async function handleDeleteAsset(id: string) {
        if (!confirm('Are you sure you want to remove this linked asset?')) return;
        try {
            await api.delete(`/api/social-media/assets/${id}`);
            toast.success('Asset removed');
            setAssets(prev => prev.filter(a => a.id !== id));
        } catch { toast.error('Failed to remove asset'); }
    }

    function handleCopy(content: string) {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard');
    }

    // Filter logic
    const filteredBanks = banks.filter(b => b.type === activeTab && (b.name.toLowerCase().includes(search.toLowerCase()) || b.content.toLowerCase().includes(search.toLowerCase())));
    const filteredAssets = assets.filter(a => activeAssetCategory === 'all' || a.type === activeAssetCategory);

    return (
        <div className="min-h-full">
            {/* Page Header */}
            <div className="page-header">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="page-title">Social Media Assets</h1>
                        <p className="page-subtitle">Manage linked media, reusable hashtags, hooks, and brand voices</p>
                    </div>
                    <button 
                        onClick={() => activeTab === 'linked_assets' ? setIsAddAssetDrawerOpen(true) : setIsCreateBankModalOpen(true)} 
                        className="btn-primary shadow-md shadow-indigo-600/20"
                    >
                        <Plus className="w-4 h-4" /> 
                        {activeTab === 'linked_assets' ? 'Link External Asset' : `Create New ${activeTab === 'hashtag' ? 'Hashtag' : activeTab === 'hook' ? 'Hook' : 'Voice'}`}
                    </button>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="border-b border-gray-200 mt-2">
                <div className="flex gap-6">
                    {[
                        { id: 'linked_assets', label: 'Linked Assets', icon: Link2 },
                        { id: 'hashtag', label: 'Hashtags', icon: Hash },
                        { id: 'hook', label: 'Hooks', icon: Quote },
                        { id: 'voice', label: 'Brand Voice', icon: PenTool },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id as MainTab); setSearch(''); }}
                                className={clsx(
                                    'flex items-center gap-2 py-4 border-b-2 text-sm font-semibold transition-colors relative top-[1px]',
                                    isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Search & Sub-filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 mt-6">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={`Search ${activeTab.replace('_', ' ')}...`} className="input pl-9 w-full"
                    />
                </div>
                
                {activeTab === 'linked_assets' && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {ASSET_CATEGORIES.map(cat => (
                            <button key={cat.key} onClick={() => setActiveAssetCategory(cat.key)}
                                className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                                    activeAssetCategory === cat.key
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
                )}
            </div>

            {/* Content Area */}
            {activeTab === 'linked_assets' ? (
                // Linked Assets View
                loadingAssets ? (
                    <div className="flex items-center justify-center py-28">
                        <div className="flex flex-col items-center gap-3">
                            <LogoLoader className="w-9 h-9 animate-spin text-indigo-400" />
                            <p className="text-sm text-gray-400">Loading assets...</p>
                        </div>
                    </div>
                ) : filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-28 text-center bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                        <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                            <Link2 className="w-9 h-9 text-gray-300" />
                        </div>
                        <p className="text-gray-900 font-semibold text-lg mb-1">No assets found</p>
                        <p className="text-gray-500 text-sm mb-6">Link your first Google Drive or Dropbox folder to get started</p>
                        <button onClick={() => setIsAddAssetDrawerOpen(true)} className="btn-secondary">
                            Link External Asset
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredAssets.map(asset => {
                            const Icon = getIcon(asset.type);
                            return (
                                <div key={asset.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-indigo-200 hover:shadow-indigo-500/5 transition-all duration-200 group flex flex-col">
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
                                        <p className="text-xs text-gray-500 mt-3 line-clamp-2 leading-relaxed">{asset.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                                        <a href={asset.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-2 flex-1 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-indigo-600 transition-colors shadow-sm" title="Open External Link">
                                            <ExternalLink className="w-4 h-4" /> Open
                                        </a>
                                        <button onClick={() => handleDeleteAsset(asset.id)} className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 rounded-lg transition-colors shadow-sm" title="Remove">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                // Saved Banks View (Hashtags, Hooks, Voice)
                loadingBanks ? (
                    <div className="flex items-center justify-center py-28">
                        <div className="flex flex-col items-center gap-3">
                            <LogoLoader className="w-9 h-9 animate-spin text-indigo-400" />
                            <p className="text-sm text-gray-400">Loading saved texts...</p>
                        </div>
                    </div>
                ) : filteredBanks.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                        <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4">
                            {activeTab === 'hashtag' && <Hash className="w-6 h-6 text-gray-300" />}
                            {activeTab === 'hook' && <Quote className="w-6 h-6 text-gray-300" />}
                            {activeTab === 'voice' && <PenTool className="w-6 h-6 text-gray-300" />}
                        </div>
                        <h3 className="text-gray-900 font-semibold text-lg mb-1">No {activeTab}s found</h3>
                        <p className="text-sm text-gray-500 mb-6">Create your first saved {activeTab} to reuse across your posts.</p>
                        <button onClick={() => setIsCreateBankModalOpen(true)} className="btn-secondary mx-auto">Create New</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBanks.map(bank => (
                            <div key={bank.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all">
                                <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{bank.name}</h3>
                                        <div className="flex gap-1.5 mt-2 flex-wrap">
                                            {bank.tags.map((tag, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded-full font-medium">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteBank(bank.id)}
                                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-5 flex-1">
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{bank.content}</p>
                                </div>
                                <div className="p-4 bg-gray-50 border-t border-gray-100">
                                    <button 
                                        onClick={() => handleCopy(bank.content)}
                                        className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
                                    >
                                        <Copy className="w-4 h-4" /> Copy Content
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Drawers */}
            <AddAssetDrawer 
                isOpen={isAddAssetDrawerOpen} 
                onClose={() => setIsAddAssetDrawerOpen(false)} 
                onSuccess={() => { setIsAddAssetDrawerOpen(false); loadAssets(); }} 
            />

            <CreateBankDrawer
                isOpen={isCreateBankModalOpen}
                onClose={() => setIsCreateBankModalOpen(false)}
                activeTab={activeTab === 'linked_assets' ? 'hashtag' : activeTab} // Safely fallback if misclicked
                onSuccess={loadBanks}
            />
        </div>
    );
}
