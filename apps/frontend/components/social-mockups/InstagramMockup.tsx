import React from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';

interface InstagramMockupProps {
    username: string;
    avatarUrl?: string;
    mediaUrl?: string;
    content: string;
    likes?: number;
}

export function InstagramMockup({ username, avatarUrl, mediaUrl, content, likes = 124 }: InstagramMockupProps) {
    return (
        <div className="max-w-[400px] w-full bg-white border border-gray-200 rounded-sm font-sans">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600" />
                        )}
                    </div>
                    <span className="font-semibold text-sm text-gray-900">{username}</span>
                </div>
                <MoreHorizontal className="w-5 h-5 text-gray-900" />
            </div>

            {/* Media */}
            <div className="w-full aspect-square bg-gray-100 relative overflow-hidden flex items-center justify-center">
                {mediaUrl ? (
                    <img src={mediaUrl} alt="Post media" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-gray-400 flex flex-col items-center gap-2">
                        <span className="text-sm">External Drive Asset</span>
                        <span className="text-xs text-gray-500">(Preview not available in mockup)</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                        <Heart className="w-6 h-6 text-gray-900" />
                        <MessageCircle className="w-6 h-6 text-gray-900" />
                        <Send className="w-6 h-6 text-gray-900" />
                    </div>
                    <Bookmark className="w-6 h-6 text-gray-900" />
                </div>
                
                <p className="font-semibold text-sm text-gray-900 mb-1">{likes.toLocaleString()} likes</p>
                
                <div className="text-sm text-gray-900 leading-snug break-words">
                    <span className="font-semibold mr-2">{username}</span>
                    {content}
                </div>
            </div>
        </div>
    );
}
