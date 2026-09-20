'use client';

import React, { useState, useEffect } from 'react';
import { 
    Layers, Plus, Search, Filter, Film, Image as ImageIcon, 
    CheckCircle2, Clock, MoreVertical, Edit3, Send, Sparkles, ChevronRight
} from 'lucide-react';
import { socialProjectService, SocialProject } from '@/lib/services/social-project.service';
import { UniversalSkeleton } from '@workspace/ui';
import toast from 'react-hot-toast';

interface ContentListTabProps {
    project: SocialProject;
    onSelectPost: (post: any) => void;
    onCreateContent: () => void;
}

export const ContentListTab: React.FC<ContentListTabProps> = ({ project, onSelectPost, onCreateContent }) => {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const loadPosts = async () => {
        try {
            setLoading(true);
            const data = await socialProjectService.getPosts({
                projectId: project.id,
                status: statusFilter !== 'all' ? statusFilter : undefined
            });
            setPosts(data);
        } catch (err) {
            toast.error('Failed to load project posts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, [project.id, statusFilter]);

    const filtered = posts.filter(p => 
        !search || (p.title?.toLowerCase().includes(search.toLowerCase()) || p.content?.toLowerCase().includes(search.toLowerCase()))
    );

    if (loading) {
        return <UniversalSkeleton type="table" />;
    }

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search posts & scripts..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100/70 dark:bg-slate-800/70 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-slate-900 dark:text-slate-100"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-700 dark:text-slate-300"
                    >
                        <option value="all">All Statuses</option>
                        <option value="draft">Drafts</option>
                        <option value="in_editing">In Editing</option>
                        <option value="in_review">In Review</option>
                        <option value="approved">Approved</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                    </select>

                    <button
                        onClick={onCreateContent}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Post</span>
                    </button>
                </div>
            </div>

            {/* Posts Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 p-6 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
                    <Layers className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Content Items Found</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Start by drafting a new script or generating content ideas.</p>
                    <button
                        onClick={onCreateContent}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
                    >
                        Create Content
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(post => (
                        <div
                            key={post.id}
                            onClick={() => onSelectPost(post)}
                            className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500 cursor-pointer transition shadow-sm flex flex-col justify-between group"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md uppercase">
                                        v{post.versionNumber || 1}
                                    </span>
                                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                                        post.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                        post.status === 'published' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                                    }`}>
                                        {post.status.replace('_', ' ')}
                                    </span>
                                </div>

                                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition line-clamp-1">
                                    {post.title || 'Untitled Creative Item'}
                                </h4>

                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mt-2 mb-4">
                                    {post.content}
                                </p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                                <span className="capitalize">{post.mediaType || 'Video'}</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-1 transition flex items-center gap-1">
                                    <span>Details</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
