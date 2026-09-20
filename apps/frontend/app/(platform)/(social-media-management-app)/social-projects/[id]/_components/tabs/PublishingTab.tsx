'use client';

import React, { useState, useEffect } from 'react';
import { 
    Send, Clock, CheckCircle2, AlertTriangle, RefreshCw, 
    ExternalLink, Instagram, Linkedin, Youtube, Film, Eye
} from 'lucide-react';
import { socialProjectService, SocialProject } from '@/lib/services/social-project.service';
import { UniversalSkeleton } from '@workspace/ui';
import toast from 'react-hot-toast';

interface PublishingTabProps {
    project: SocialProject;
    onSelectPost: (post: any) => void;
}

export const PublishingTab: React.FC<PublishingTabProps> = ({ project, onSelectPost }) => {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [retryingId, setRetryingId] = useState<string | null>(null);

    const loadPosts = async () => {
        try {
            setLoading(true);
            const data = await socialProjectService.getPosts({ projectId: project.id });
            setPosts(data);
        } catch (err) {
            toast.error('Failed to load publishing queue');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, [project.id]);

    const handlePublishNow = async (postId: string) => {
        try {
            toast.loading('Publishing across platform variants...', { id: 'pub' });
            const result = await socialProjectService.publishPostNow(postId);
            if (result.success) {
                toast.success(result.message || 'Post published!', { id: 'pub' });
            } else {
                toast.error(result.message || 'Publishing failed', { id: 'pub' });
            }
            loadPosts();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Publishing failed', { id: 'pub' });
        }
    };

    const handleRetryVariant = async (postId: string, platform: string) => {
        setRetryingId(`${postId}-${platform}`);
        try {
            const result = await socialProjectService.retryVariant(postId, platform);
            toast.success(result.message || `Retried ${platform} successfully!`);
            loadPosts();
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.message || 'Retry failed');
        } finally {
            setRetryingId(null);
        }
    };

    if (loading) {
        return <UniversalSkeleton type="table" />;
    }

    return (
        <div className="space-y-6">
            <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Publishing Queue & Dispatch Telemetry
                    </h3>
                    <p className="text-xs text-slate-500">
                        Monitor scheduled posts, confirmed live platform links, and failure recovery states.
                    </p>
                </div>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-16 p-6 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
                    <Send className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Posts in Queue</h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Approved posts will appear here for scheduled publishing.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map(post => {
                        const publishedLinks = post.publishedLinks || {};
                        const hasPublished = Object.keys(publishedLinks).length > 0;
                        const hasFailed = post.status === 'failed' || post.status === 'partially_published';

                        return (
                            <div
                                key={post.id}
                                className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 space-y-4 shadow-sm"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                                                post.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' :
                                                post.status === 'partially_published' ? 'bg-amber-500/10 text-amber-500' :
                                                post.status === 'failed' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {post.status.replace('_', ' ')}
                                            </span>
                                            {post.scheduledFor && (
                                                <span className="text-xs text-slate-400">
                                                    Scheduled: {new Date(post.scheduledFor).toLocaleString()}
                                                </span>
                                            )}
                                        </div>

                                        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                            {post.title || post.content?.slice(0, 50) || 'Untitled Post'}
                                        </h4>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {post.status !== 'published' && (
                                            <button
                                                onClick={() => handlePublishNow(post.id)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                                <span>Publish Now</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onSelectPost(post)}
                                            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition"
                                        >
                                            Edit Post
                                        </button>
                                    </div>
                                </div>

                                {/* Platform Live Links / Variant Status */}
                                {hasPublished && (
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3 flex-wrap">
                                        <span className="text-xs font-semibold text-slate-400">Live Links:</span>
                                        {Object.entries(publishedLinks).map(([platform, link]: [string, any]) => (
                                            <a
                                                key={platform}
                                                href={link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:underline"
                                            >
                                                <span className="capitalize">{platform}</span>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
