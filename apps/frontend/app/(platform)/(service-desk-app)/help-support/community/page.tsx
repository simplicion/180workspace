'use client';

import { LogoLoader } from "@workspace/ui";
import React, { useState } from 'react';
import { MessageSquare, Users, TrendingUp, ThumbsUp, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useGetPostsQuery, useToggleLikeMutation } from '@/redux/api/communityApi';

export default function CommunityPage() {
    const { data: postsData, isLoading, isError } = useGetPostsQuery({ limit: 10, sort: 'trending' });
    const [toggleLike] = useToggleLikeMutation();

    const posts = postsData?.data?.posts || [];

    const handleLike = async (e: React.MouseEvent, postId: string) => {
        e.preventDefault();
        try {
            await toggleLike(postId).unwrap();
        } catch (error) {
            console.error('Failed to toggle like', error);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <Link href='/help-support' className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        Back to Help & Support
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Community Forum</h1>
                    <p className="text-gray-500 mt-2">Connect, share ideas, and learn from other 180workspace users.</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                    New Discussion
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                                <span>Trending Discussions</span>
                            </h3>
                        </div>
                        <div className="p-0">
                            <div className="divide-y divide-gray-100">
                                {isLoading && (
                                    <div className="p-12 flex justify-center items-center">
                                        <LogoLoader className="w-8 h-8 animate-spin text-gray-400" />
                                    </div>
                                )}
                                
                                {isError && (
                                    <div className="p-12 text-center">
                                        <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                                            <AlertCircle className="h-6 w-6 text-red-400" />
                                        </div>
                                        <h3 className="text-sm font-medium text-gray-900">Failed to load discussions</h3>
                                        <p className="mt-1 text-sm text-gray-500">Please try again later.</p>
                                    </div>
                                )}

                                {!isLoading && !isError && posts.length === 0 && (
                                    <div className="p-12 text-center text-gray-500">
                                        No discussions found. Be the first to start one!
                                    </div>
                                )}

                                {!isLoading && !isError && posts.map((post: any) => (
                                    <div key={post._id} className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 mr-4">
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {post.hashtags?.map((tag: string) => (
                                                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                                <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{post.content || post.title}</h3>
                                                <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                                                    <span>By {post.author?.name || 'Anonymous'}</span>
                                                    <span>•</span>
                                                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end space-y-2 shrink-0">
                                                <div className="flex items-center text-gray-500 text-sm">
                                                    <MessageSquare className="h-4 w-4 mr-1" /> {post.metrics?.replies || 0}
                                                </div>
                                                <button onClick={(e) => handleLike(e, post._id)} className="flex items-center text-gray-500 text-sm hover:text-blue-600 transition-colors">
                                                    <ThumbsUp className="h-4 w-4 mr-1" /> {post.metrics?.likes || 0}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                            <h3 className="text-base font-semibold text-blue-900 flex items-center space-x-2">
                                <Users className="h-5 w-5" />
                                <span>Top Contributors</span>
                            </h3>
                        </div>
                        <div className="p-4">
                            <div className="space-y-4">
                                {['Sarah J.', 'Mike T.', 'Elena R.', 'David W.'].map((name, i) => (
                                    <div key={i} className="flex items-center space-x-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">{name}</div>
                                            <div className="text-xs text-gray-500">{120 - (i * 20)} points</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

