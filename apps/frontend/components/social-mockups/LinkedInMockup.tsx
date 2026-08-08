import React from 'react';
import { ThumbsUp, MessageSquare, Repeat2, Send, Globe, MoreHorizontal } from 'lucide-react';

interface LinkedInMockupProps {
    username: string;
    avatarUrl?: string;
    headline?: string;
    mediaUrl?: string;
    content: string;
    likes?: number;
    comments?: number;
}

export function LinkedInMockup({ username, avatarUrl, headline = "Marketing Specialist", mediaUrl, content, likes = 42, comments = 5 }: LinkedInMockupProps) {
    return (
        <div className="max-w-[500px] w-full bg-white border border-gray-200 rounded-lg font-sans overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between p-4">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-300" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm text-gray-900 leading-tight">{username}</span>
                        <span className="text-xs text-gray-500 leading-tight mt-0.5">{headline}</span>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <span>1h</span>
                            <span>•</span>
                            <Globe className="w-3 h-3" />
                        </div>
                    </div>
                </div>
                <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </div>

            {/* Content */}
            <div className="px-4 pb-3">
                <p className="text-sm text-gray-900 leading-normal whitespace-pre-wrap">
                    {content}
                </p>
            </div>

            {/* Media */}
            {mediaUrl ? (
                <div className="w-full aspect-video bg-gray-100 border-y border-gray-100">
                    <img src={mediaUrl} alt="Post media" className="w-full h-full object-cover" />
                </div>
            ) : (
                <div className="w-full aspect-video bg-gray-50 border-y border-gray-100 flex items-center justify-center">
                    <div className="text-gray-400 flex flex-col items-center gap-2">
                        <span className="text-sm">External Drive Asset</span>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <ThumbsUp className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span>{likes}</span>
                </div>
                <span>{comments} comments</span>
            </div>

            {/* Actions */}
            <div className="px-4 py-1 flex items-center justify-between">
                <button className="flex items-center justify-center gap-2 py-3 px-2 flex-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                    <ThumbsUp className="w-5 h-5" />
                    <span className="text-sm font-medium">Like</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-3 px-2 flex-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-sm font-medium">Comment</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-3 px-2 flex-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                    <Repeat2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Repost</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-3 px-2 flex-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                    <Send className="w-5 h-5" />
                    <span className="text-sm font-medium">Send</span>
                </button>
            </div>
        </div>
    );
}
