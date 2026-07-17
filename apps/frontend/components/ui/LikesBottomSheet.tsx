import { LogoLoader } from "@workspace/ui";
import React, { useEffect, useState } from 'react';
import BottomSheet from './BottomSheet';
import { UserCircle2 } from 'lucide-react';

interface LikeUser {
  id: string;
  name: string;
  photoUrl?: string;
  headline?: string;
}

interface LikesBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export default function LikesBottomSheet({ isOpen, onClose, postId }: LikesBottomSheetProps) {
  const [users, setUsers] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      const fetchLikes = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/forum/posts/${postId}/likes`);
          if (res.ok) {
            const data = await res.json();
            setUsers(data.users || []);
          }
        } catch (err) {
          console.error("Failed to fetch likes", err);
        } finally {
          setLoading(false);
        }
      };
      fetchLikes();
    }
  }, [isOpen, postId]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Likes">
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center p-8">
            <LogoLoader className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No likes yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {users.map(user => (
              <div key={user.id} className="flex items-center gap-3">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    <UserCircle2 className="w-6 h-6" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                  {user.headline && (
                    <span className="text-[12px] text-gray-500 line-clamp-1">{user.headline}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
