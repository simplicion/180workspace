import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

interface SavePostButtonProps {
  postId: string;
  initialSaved?: boolean;
}

export default function SavePostButton({ postId, initialSaved = false }: SavePostButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!session) {
      router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    setSaved(!saved); // Optimistic UI
    setLoading(true);

    try {
      const res = await fetch(`/api/forum/posts/${postId}/save`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(data.saved);
      } else {
        // Revert on error
        setSaved(!saved);
      }
    } catch (err) {
      console.error('Failed to toggle save', err);
      setSaved(!saved);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleSave}
      disabled={loading}
      className={clsx(
        "p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50",
        saved ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
      )}
    >
      <Bookmark className={clsx("w-[18px] h-[18px]", saved && "fill-current")} />
    </button>
  );
}
