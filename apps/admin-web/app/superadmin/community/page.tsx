'use client';

import { useState, useEffect } from 'react';
import { 
    Globe, 
    Search, 
    Trash2, 
    ShieldAlert, 
    MessageSquare, 
    User, 
    Flag,
    CheckCircle2,
    X,
    Filter
} from 'lucide-react';
import axios from '@/lib/superadmin-api';

interface ForumPost {
    _id: string;
    id?: string;
    title: string;
    category: string;
    status: string;
    author: {
        name: string;
        companyName: string;
    };
    replyCount: number;
    createdAt: string;
}

export default function SuperAdminCommunity() {
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchPosts();
    }, [filter, searchQuery]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filter !== 'all') params.status = filter;
            if (searchQuery) params.search = searchQuery;
            
            const res = await axios.get('/superadmin/forum/posts', { params });
            setPosts(res.data);
        } catch (error) {
            console.error('Failed to fetch posts', error);
        } finally {
            setLoading(false);
        }
    };

    const deletePost = async (id: string) => {
        if (!confirm('Are you sure you want to remove this post?')) return;
        try {
            await axios.delete(`/superadmin/forum/posts/${id}`);
            fetchPosts();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Community Moderation</h1>
                    <p className="text-sm text-slate-500 font-medium tracking-wide">Monitor discussions and ensure a healthy environment</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {['all', 'flagged', 'active'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                    filter === f 
                                    ? 'bg-white text-slate-900 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search discussions or users..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>

                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400 animate-pulse font-medium">Loading discussions...</div>
                    ) : posts.length === 0 ? (
                        <div className="p-20 text-center">
                            <ShieldAlert className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900">No matching discussions</h3>
                            <p className="text-sm text-slate-500">Try adjusting your filters or search query</p>
                        </div>
                    ) : (
                        posts.map((post) => (
                            <div key={post.id} className="p-6 hover:bg-slate-50 transition-all flex items-center justify-between group">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded">{post.category}</span>
                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded ${
                                            post.status === 'flagged' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                                        }`}>
                                            {post.status}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {new Date(post.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 mb-1">{post.title}</h3>
                                    <div className="flex items-center gap-3 text-sm text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5" />
                                            {post.author.name} · <span className="text-xs opacity-75">{post.author.companyName}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            {post.replyCount} replies
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {post.status === 'flagged' && (
                                        <button className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Approve">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => deletePost(post.id)}
                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" 
                                        title="Remove Post"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
