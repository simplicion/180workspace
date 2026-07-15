"use client";
import React from 'react';
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';

interface TabProps {
    company: any;
}

export function PostsTab({ company }: TabProps) {
    const posts = company.posts?.length > 0 ? company.posts : [];

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Latest Updates</h2>
                    <p className="text-sm text-gray-500 mt-1">Stay connected with our journey</p>
                </div>
            </div>

            <div className="space-y-6">
                {posts.map((post: any) => (
                    <div key={post.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                                    {post.author.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900">{post.author}</div>
                                    <div className="text-xs text-gray-500">{post.timeAgo}</div>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600 p-1">
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <p className="text-gray-800 text-sm md:text-base leading-relaxed mb-6">
                            {post.content}
                        </p>
                        
                        <div className="flex items-center space-x-6 border-t border-gray-100 pt-4">
                            <button className="flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                                <ThumbsUp className="h-4 w-4 mr-1.5" />
                                {post.likes} Likes
                            </button>
                            <button className="flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                                <MessageCircle className="h-4 w-4 mr-1.5" />
                                {post.comments} Comments
                            </button>
                            <button className="flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors ml-auto">
                                <Share2 className="h-4 w-4 mr-1.5" />
                                Share
                            </button>
                        </div>
                    </div>
                ))}
                
                {posts.length === 0 && (
                    <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No posts yet</h3>
                        <p className="text-gray-500 text-sm">Updates from this company will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
