'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
    CalendarDays, CheckCircle2, MessageSquare, Sparkles, Send, 
    ShieldCheck, Eye, Clock, Check, Layers, Smartphone, LayoutGrid,
    Instagram, Linkedin, Youtube, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { InstagramFeedPreview } from '@/app/(platform)/(social-media-management-app)/_components/previews/InstagramFeedPreview';
import { LinkedInPreview } from '@/app/(platform)/(social-media-management-app)/_components/previews/LinkedInPreview';
import { TikTokPreview } from '@/app/(platform)/(social-media-management-app)/_components/previews/TikTokPreview';
import { YouTubeShortsPreview } from '@/app/(platform)/(social-media-management-app)/_components/previews/YouTubeShortsPreview';

export default function PublicClientReviewPage() {
    const params = useParams();
    const token = params?.token as string;

    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [activeView, setActiveView] = useState<'feed' | 'calendar'>('feed');
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [commentText, setCommentText] = useState('');
    const [reviewerName, setReviewerName] = useState('');
    const [approving, setApproving] = useState(false);
    const [activePlatformPerPost, setActivePlatformPerPost] = useState<Record<string, string>>({});

    const loadSessionData = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/api/social-media/reviews/public/${token}`);
            if (data.success) {
                setSession(data.session);
                setPosts(data.posts || []);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to load review session');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) loadSessionData();
    }, [token]);

    const handleAddComment = async (postId: string) => {
        if (!commentText.trim()) return toast.error('Please type your feedback');
        try {
            await api.post(`/api/social-media/reviews/public/${token}/comments`, {
                postId,
                commentText,
                authorName: reviewerName || session?.client?.name || 'Client Reviewer',
                authorType: 'client'
            });
            toast.success('Feedback submitted to the agency team!');
            setCommentText('');
            loadSessionData();
        } catch (err: any) {
            toast.error('Failed to submit comment');
        }
    };

    const handleBatchApprove = async () => {
        if (!confirm('Are you sure you want to approve all posts in this calendar? This will schedule them for publishing.')) return;
        setApproving(true);
        try {
            const { data } = await api.post(`/api/social-media/reviews/public/${token}/approve-batch`, {
                clientNotes: `Approved by ${reviewerName || session?.client?.name || 'Client'}`
            });
            if (data.success) {
                toast.success('All posts approved successfully! Scheduled for publishing.', { duration: 5000 });
                loadSessionData();
            }
        } catch (err: any) {
            toast.error('Failed to approve calendar');
        } finally {
            setApproving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center animate-pulse mb-4 shadow-xl shadow-indigo-600/40">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg">Loading Content Review Portal...</h3>
                <p className="text-slate-400 text-sm mt-1">Fetching live previews and scheduled posts</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold">Invalid or Expired Link</h2>
                <p className="text-slate-400 text-sm max-w-md mt-2">
                    This review portal link is invalid or has expired. Please reach out to your agency account manager for a fresh link.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
                            180
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-white">{session.name}</h1>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    session.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                    {session.status.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Prepared for <span className="text-slate-200 font-semibold">{session.client?.name}</span> by {session.company?.name || 'Agency Team'}
                            </p>
                        </div>
                    </div>

                    {/* View Switcher & Approval Action */}
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
                            <button
                                onClick={() => setActiveView('feed')}
                                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all min-h-[36px] ${
                                    activeView === 'feed' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Smartphone className="w-3.5 h-3.5" /> Mobile Feed
                            </button>
                            <button
                                onClick={() => setActiveView('calendar')}
                                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all min-h-[36px] ${
                                    activeView === 'calendar' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> Calendar
                            </button>
                        </div>

                        {session.status !== 'approved' && (
                            <button
                                onClick={handleBatchApprove}
                                disabled={approving}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all min-h-[44px]"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Approve Entire Calendar ({posts.length} Posts)
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto p-6 md:p-8">
                {posts.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800">
                        <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h3 className="font-bold text-slate-300 text-lg">No Posts Scheduled for this Period</h3>
                        <p className="text-slate-500 text-xs mt-1">Your agency team is currently preparing the next batch of content.</p>
                    </div>
                ) : activeView === 'feed' ? (
                    /* FEED VIEW: Responsive Stream of Live Mockups */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {posts.map((post) => {
                            const postPlatform = activePlatformPerPost[post.id] || 'instagram';
                            const username = session.client?.name?.toLowerCase().replace(/\s+/g, '') || 'brand';

                            return (
                                <div key={post.id} className="bg-slate-900/80 rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl flex flex-col justify-between">
                                    <div>
                                        {/* Post Date & Status */}
                                        <div className="flex items-center justify-between mb-3 text-xs">
                                            <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>
                                                    {post.scheduledFor ? new Date(post.scheduledFor).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Flexible'}
                                                </span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                post.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                                            }`}>
                                                {post.status}
                                            </span>
                                        </div>

                                        {/* Per-Post Platform Preview Switcher */}
                                        <div className="flex items-center justify-center gap-1 p-1 bg-slate-950 rounded-xl mb-3 border border-slate-800">
                                            {[
                                                { id: 'instagram', label: 'Instagram', icon: Instagram },
                                                { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                                                { id: 'tiktok', label: 'TikTok', icon: Zap },
                                                { id: 'youtube', label: 'Shorts', icon: Youtube }
                                            ].map(p => {
                                                const Icon = p.icon;
                                                const isActive = postPlatform === p.id;
                                                return (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => setActivePlatformPerPost(prev => ({ ...prev, [post.id]: p.id }))}
                                                        className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                                                            isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        <Icon className="w-3 h-3" /> {p.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Live Platform Preview Mockup */}
                                        <div className="mb-4">
                                            {postPlatform === 'instagram' && (
                                                <InstagramFeedPreview
                                                    username={username}
                                                    caption={post.content}
                                                    finalVideoUrl={post.finalVideoUrl}
                                                    thumbnailUrl={post.thumbnailUrl}
                                                    mediaUrls={post.mediaUrls}
                                                    isReel={post.mediaType === 'video'}
                                                />
                                            )}

                                            {postPlatform === 'linkedin' && (
                                                <LinkedInPreview
                                                    authorName={session.client?.name || 'Company Page'}
                                                    content={post.content}
                                                    mediaUrls={post.mediaUrls || (post.finalVideoUrl ? [post.finalVideoUrl] : [])}
                                                    isPdfCarousel={post.mediaType === 'document'}
                                                />
                                            )}

                                            {postPlatform === 'tiktok' && (
                                                <TikTokPreview
                                                    creatorHandle={username}
                                                    caption={post.content}
                                                    mediaUrl={post.finalVideoUrl || post.mediaUrls?.[0]}
                                                    soundTitle="Original Sound - Verified Creator"
                                                />
                                            )}

                                            {postPlatform === 'youtube' && (
                                                <YouTubeShortsPreview
                                                    channelName={session.client?.name || 'Brand Channel'}
                                                    title={post.title || post.content.substring(0, 50)}
                                                    mediaUrl={post.finalVideoUrl || post.mediaUrls?.[0]}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Inline Feedback Section */}
                                    <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                                        {post.reviewComments && post.reviewComments.length > 0 && (
                                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                                {post.reviewComments.map((c: any) => (
                                                    <div key={c.id} className="text-xs bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                                                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                                            <span className="font-bold text-slate-300">{c.authorName}</span>
                                                            <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                        <p className="text-slate-200">{c.commentText}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add Comment Input */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={selectedPost?.id === post.id ? commentText : ''}
                                                onFocus={() => setSelectedPost(post)}
                                                onChange={e => {
                                                    setSelectedPost(post);
                                                    setCommentText(e.target.value);
                                                }}
                                                placeholder="Request edit or add comment..."
                                                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 min-h-[44px]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleAddComment(post.id)}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm min-h-[44px] flex items-center justify-center"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* CALENDAR VIEW */
                    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {posts.map(post => (
                                <div key={post.id} className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 space-y-2">
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span>{post.scheduledFor ? new Date(post.scheduledFor).toLocaleDateString() : 'Unscheduled'}</span>
                                        <span className="font-bold capitalize text-indigo-400">{post.mediaType}</span>
                                    </div>
                                    <h4 className="font-bold text-sm text-white line-clamp-1">{post.title || 'Untitled Post'}</h4>
                                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{post.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
