'use client';

import React from 'react';
import { MessageSquare, Users, TrendingUp, ThumbsUp, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const discussions = [
    { id: 1, title: 'Best practices for organizing team workflows', author: 'Sarah J.', replies: 24, likes: 45, category: 'Best Practices', time: '2h ago' },
    { id: 2, title: 'Feature request: Custom dashboard widgets', author: 'Mike T.', replies: 12, likes: 89, category: 'Feature Requests', time: '5h ago' },
    { id: 3, title: 'How do you handle client onboarding?', author: 'Elena R.', replies: 34, likes: 56, category: 'General Discussion', time: '1d ago' },
];

export default function CommunityPage() {
    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/dashboard/help-support" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4">
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
                                {discussions.map((discussion) => (
                                    <div key={discussion.id} className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mb-2">
                                                    {discussion.category}
                                                </span>
                                                <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{discussion.title}</h3>
                                                <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                                                    <span>By {discussion.author}</span>
                                                    <span>•</span>
                                                    <span>{discussion.time}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end space-y-2">
                                                <div className="flex items-center text-gray-500 text-sm">
                                                    <MessageSquare className="h-4 w-4 mr-1" /> {discussion.replies}
                                                </div>
                                                <div className="flex items-center text-gray-500 text-sm">
                                                    <ThumbsUp className="h-4 w-4 mr-1" /> {discussion.likes}
                                                </div>
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
