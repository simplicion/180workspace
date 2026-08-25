import { LogoLoader } from "@workspace/ui";
import React, { useState } from 'react';
import BottomSheet from './BottomSheet';
import { Send, UserCircle2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { workspaceSocialApi } from "@/redux/api/workspaceSocialApi";

interface Reply {
  id: string;
  authorName: string;
  authorPhotoUrl?: string;
  content: string;
  createdAt: string;
  upvotes: string[];
}

interface CommentsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export default function CommentsBottomSheet({ isOpen, onClose, postId }: CommentsBottomSheetProps) {
  const { data: session } = useSession();
  const router = useRouter();
  
  const { data, isLoading: loading } = workspaceSocialApi.useGetPostRepliesQuery(postId, { skip: !isOpen });
  const replies = data?.replies || [];
  
  const [addPostCommentMutation] = workspaceSocialApi.useAddPostCommentMutation();
  
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!session) {
      router.push('/login');
      return;
    }

    setSubmitting(true);
    try {
      await addPostCommentMutation({ postId, content: newComment }).unwrap();
      setNewComment('');
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Comments">
      <div className="flex flex-col h-[60vh]">
        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <LogoLoader className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            replies.map(reply => (
              <div key={reply.id} className="flex gap-3">
                {reply.authorPhotoUrl ? (
                  <img src={reply.authorPhotoUrl} alt={reply.authorName} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    <UserCircle2 className="w-5 h-5" />
                  </div>
                )}
                <div className="flex flex-col bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-2">
                  <span className="text-[13px] font-semibold text-gray-900">{reply.authorName}</span>
                  <p className="text-sm text-gray-700 mt-1">{reply.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={session ? "Write a comment..." : "Login to comment"}
              className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </BottomSheet>
  );
}
