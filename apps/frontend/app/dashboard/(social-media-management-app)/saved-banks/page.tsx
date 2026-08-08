'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Hash, Quote, PenTool, Copy, Trash2, Edit } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type BankType = 'hashtag' | 'hook' | 'voice';

interface SavedBankItem {
    id: string;
    type: BankType;
    name: string;
    content: string;
    tags: string[];
}

const MOCK_BANKS: SavedBankItem[] = [
    { id: '1', type: 'hashtag', name: 'B2B SaaS Growth', content: '#b2bsaas #growthmarketing #saasstartup #founder #techstartup', tags: ['B2B', 'SaaS'] },
    { id: '2', type: 'hook', name: 'Problem-Agitate-Solve', content: 'Tired of losing hours to manual data entry? 🛑\nEvery week, founders waste 10+ hours on tasks a simple automation could fix.\nHere is how we solved it in 3 steps: 👇', tags: ['LinkedIn', 'Educational'] },
    { id: '3', type: 'voice', name: 'Authoritative yet approachable', content: 'Use short sentences. Avoid jargon. Speak directly to the reader using "you" and "your". End with a clear call to action.', tags: ['Brand Guidelines'] },
];

export default function SavedBanksPage() {
    const [activeTab, setActiveTab] = useState<BankType>('hashtag');
    const [search, setSearch] = useState('');
    const [banks, setBanks] = useState<SavedBankItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', content: '', tags: '' });

    const filtered = banks.filter(b => b.type === activeTab && (b.name.toLowerCase().includes(search.toLowerCase()) || b.content.toLowerCase().includes(search.toLowerCase())));

    useEffect(() => {
        loadBanks();
    }, []);

    async function loadBanks() {
        try {
            setLoading(true);
            const { data } = await api.get('/social-media/saved-banks');
            if (data.success) {
                setBanks(data.banks);
            }
        } catch (error) {
            toast.error('Failed to load saved banks');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this?')) return;
        try {
            await api.delete(`/social-media/saved-banks/${id}`);
            toast.success('Deleted successfully');
            loadBanks();
        } catch (error) {
            toast.error('Failed to delete');
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            await api.post('/social-media/saved-banks', {
                type: activeTab,
                name: createForm.name,
                content: createForm.content,
                tags: createForm.tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            toast.success('Created successfully');
            setIsCreateModalOpen(false);
            setCreateForm({ name: '', content: '', tags: '' });
            loadBanks();
        } catch (error) {
            toast.error('Failed to create');
        }
    }

    function handleCopy(content: string) {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard');
    }

    return (
        <div className="min-h-full">
            <div className="page-header">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="page-title">Saved Banks</h1>
                        <p className="page-subtitle">Manage reusable hashtags, hooks, and brand voices</p>
                    </div>
                    <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary shadow-md shadow-indigo-600/20">
                        <Plus className="w-4 h-4" /> Create New
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6 mt-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search banks..." className="input pl-9 w-full"
                    />
                </div>
                
                <div className="flex items-center p-1 bg-gray-100 rounded-lg">
                    {[
                        { id: 'hashtag', label: 'Hashtags', icon: Hash },
                        { id: 'hook', label: 'Hooks', icon: Quote },
                        { id: 'voice', label: 'Brand Voice', icon: PenTool },
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as BankType)}
                                className={clsx(
                                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                                    activeTab === tab.id
                                        ? 'bg-white text-indigo-700 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-4 shadow-sm">
                        {activeTab === 'hashtag' && <Hash className="w-6 h-6 text-gray-400" />}
                        {activeTab === 'hook' && <Quote className="w-6 h-6 text-gray-400" />}
                        {activeTab === 'voice' && <PenTool className="w-6 h-6 text-gray-400" />}
                    </div>
                    <h3 className="text-gray-900 font-semibold mb-1">No {activeTab}s found</h3>
                    <p className="text-sm text-gray-500 mb-4">Create your first saved {activeTab} to reuse across your posts.</p>
                    <button onClick={() => setIsCreateModalOpen(true)} className="btn-secondary mx-auto">Create New</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(bank => (
                        <div key={bank.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col hover:border-indigo-200 transition-colors">
                            <div className="p-4 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{bank.name}</h3>
                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                        {bank.tags.map((tag, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded-full font-medium">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors">
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(bank.id)}
                                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 flex-1">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{bank.content}</p>
                            </div>
                            <div className="p-3 bg-gray-50 border-t border-gray-100">
                                <button 
                                    onClick={() => handleCopy(bank.content)}
                                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    <Copy className="w-4 h-4" /> Copy Content
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New {activeTab}</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input required value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} className="input w-full" placeholder={`E.g. SaaS ${activeTab === 'hashtag' ? 'Hashtags' : 'Hook'}`} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                                <textarea required value={createForm.content} onChange={e => setCreateForm({...createForm, content: e.target.value})} className="input w-full min-h-[100px]" placeholder={`Enter your ${activeTab} content...`} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                                <input value={createForm.tags} onChange={e => setCreateForm({...createForm, tags: e.target.value})} className="input w-full" placeholder="B2B, SaaS, Growth" />
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
