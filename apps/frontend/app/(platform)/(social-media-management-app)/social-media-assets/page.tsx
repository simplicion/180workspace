'use client';

import { useState, useEffect } from 'react';
import { 
    Search, Plus, Hash, Quote, Sparkles, Copy, Trash2, Edit, Link2, 
    ExternalLink, Image as ImageIcon, Video, Folder, Clock, ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { LogoLoader } from "@workspace/ui";
import { CreateBankDrawer } from './_components/CreateBankDrawer';
import { AddAssetDrawer } from './_components/AddAssetDrawer';
import { BrandVoiceManager } from './_components/BrandVoiceManager';
import { EvergreenQueueManager } from './_components/EvergreenQueueManager';
import { ConnectedAccountsManager } from './_components/ConnectedAccountsManager';

type MainTab = 'accounts' | 'voice' | 'evergreen' | 'linked_assets' | 'hashtag' | 'hook';

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
    const [activeTab, setActiveTab] = useState<MainTab>('accounts');
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
        } else if (activeTab === 'hashtag' || activeTab === 'hook') {
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
        <div className="min-h-full space-y-6">
            {/* Page Header */}
            <div className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                            Social Media Assets & Brand Hub
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Manage connected zero-cost channels, Brand Voice DNA, weekly evergreen queues, and asset banks.
                        </p>
                    </div>

                    {(activeTab === 'linked_assets' || activeTab === 'hashtag' || activeTab === 'hook') && (
                        <button 
                            onClick={() => activeTab === 'linked_assets' ? setIsAddAssetDrawerOpen(true) : setIsCreateBankModalOpen(true)} 
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all min-h-[44px]"
                        >
                            <Plus className="w-4 h-4" /> 
                            {activeTab === 'linked_assets' ? 'Link External Asset' : `Create New ${activeTab === 'hashtag' ? 'Hashtag' : 'Hook'}`}
                        </button>
                    )}
                </div>
            </div>

            {/* Main Tabs Navigation */}
            <div className="border-b border-gray-200/80 dark:border-gray-800">
                <div className="flex gap-2 sm:gap-6 overflow-x-auto pb-1">
                    {[
                        { id: 'accounts', label: 'Connected Channels', icon: ShieldCheck },
                        { id: 'voice', label: 'Brand Voice DNA', icon: Sparkles },
                        { id: 'evergreen', label: 'Evergreen Queues', icon: Clock },
                        { id: 'linked_assets', label: 'Linked Media', icon: Link2 },
                        { id: 'hashtag', label: 'Hashtag Bank', icon: Hash },
                        { id: 'hook', label: 'Hook Bank', icon: Quote },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id as MainTab); setSearch(''); }}
                                className={clsx(
                                    'flex items-center gap-2 py-3 px-3.5 border-b-2 text-sm font-semibold transition-all whitespace-nowrap min-h-[44px]',
                                    isActive 
                                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-bold' 
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300'
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab 1: Connected Channels */}
            {activeTab === 'accounts' && (
                <ConnectedAccountsManager />
            )}

            {/* Tab 2: Brand Voice Fingerprint */}
            {activeTab === 'voice' && (
                <BrandVoiceManager />
            )}

            {/* Tab 3: Evergreen Queues */}
            {activeTab === 'evergreen' && (
                <EvergreenQueueManager />
            )}

            {/* Tab 4, 5, 6: Media & Bank Assets */}
            {(activeTab === 'linked_assets' || activeTab === 'hashtag' || activeTab === 'hook') && (
                <>
                    {/* Search & Sub-filters */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={search} 
                                onChange={e => setSearch(e.target.value)}
                                placeholder={`Search ${activeTab.replace('_', ' ')}...`} 
                                className="w-full pl-9 pr-4 py-2.5 bg-white/80 dark:bg-slate-900/80 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        
                        {activeTab === 'linked_assets' && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {ASSET_CATEGORIES.map(cat => (
                                    <button 
                                        key={cat.key} 
                                        onClick={() => setActiveAssetCategory(cat.key)}
                                        className={clsx('px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border min-h-[36px]',
                                            activeAssetCategory === cat.key
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-white/80 dark:bg-slate-900/80 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-indigo-300 hover:text-indigo-600')}>
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
                        loadingAssets ? (
                            <div className="flex items-center justify-center py-28">
                                <div className="flex flex-col items-center gap-3">
                                    <LogoLoader className="w-9 h-9 animate-spin text-indigo-400" />
                                    <p className="text-sm text-gray-400">Loading assets...</p>
                                </div>
                            </div>
                        ) : filteredAssets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-28 text-center backdrop-blur-md bg-white/60 dark:bg-black/60 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                                <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 shadow-sm flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
                                    <Link2 className="w-9 h-9" />
                                </div>
                                <p className="text-gray-900 dark:text-gray-100 font-bold text-lg mb-1">No linked media found</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm">
                                    Link your first Google Drive, Dropbox, or Cloudflare R2 folder to start staging footage.
                                </p>
                                <button onClick={() => setIsAddAssetDrawerOpen(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20">
                                    Link External Asset
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredAssets.map(asset => {
                                    const Icon = getIcon(asset.type);
                                    return (
                                        <div key={asset.id} className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-900 dark:text-gray-100 truncate leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                            {asset.title || 'Untitled Asset'}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                                                                {asset.type}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                {new Date(asset.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {asset.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-3">
                                                        {asset.tags.map((tag, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-[10px] rounded-md font-medium">#{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                                {asset.description && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 line-clamp-2 leading-relaxed">{asset.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                                <a href={asset.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-2 flex-1 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors min-h-[40px]" title="Open External Link">
                                                    <ExternalLink className="w-3.5 h-3.5" /> Open
                                                </a>
                                                <button onClick={() => handleDeleteAsset(asset.id)} className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-gray-200 dark:border-gray-800 rounded-xl transition-colors min-h-[40px]" title="Remove">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        // Saved Banks View (Hashtags, Hooks)
                        loadingBanks ? (
                            <div className="flex items-center justify-center py-28">
                                <div className="flex flex-col items-center gap-3">
                                    <LogoLoader className="w-9 h-9 animate-spin text-indigo-400" />
                                    <p className="text-sm text-gray-400">Loading saved texts...</p>
                                </div>
                            </div>
                        ) : filteredBanks.length === 0 ? (
                            <div className="text-center py-20 backdrop-blur-md bg-white/60 dark:bg-black/60 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                                    {activeTab === 'hashtag' && <Hash className="w-7 h-7" />}
                                    {activeTab === 'hook' && <Quote className="w-7 h-7" />}
                                </div>
                                <h3 className="text-gray-900 dark:text-gray-100 font-bold text-lg mb-1">No {activeTab}s saved</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                                    Create reusable {activeTab} groups to insert into your posts with one click.
                                </p>
                                <button onClick={() => setIsCreateBankModalOpen(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20">
                                    Create New
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredBanks.map(bank => (
                                    <div key={bank.id} className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-indigo-300 dark:hover:border-indigo-700 transition-all justify-between">
                                        <div>
                                            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between bg-gray-50/50 dark:bg-slate-900/50">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{bank.name}</h3>
                                                    <div className="flex gap-1.5 mt-2 flex-wrap">
                                                        {bank.tags.map((tag, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] rounded-full font-medium">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button 
                                                        onClick={() => handleDeleteBank(bank.id)}
                                                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-5">
                                                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{bank.content}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-gray-800">
                                            <button 
                                                onClick={() => handleCopy(bank.content)}
                                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm min-h-[40px]"
                                            >
                                                <Copy className="w-3.5 h-3.5" /> Copy Content
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </>
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
                activeTab={activeTab === 'linked_assets' ? 'hashtag' : activeTab as any}
                onSuccess={loadBanks}
            />
        </div>
    );
}
