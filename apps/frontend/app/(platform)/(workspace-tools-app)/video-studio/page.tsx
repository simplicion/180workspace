"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Film } from "lucide-react";

export default function VideoStudioRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/media-editor");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 animate-pulse">
        <Film className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">Opening 180 Media Studio...</h2>
        <p className="text-xs text-gray-400 mt-1">Redirecting to your dedicated media editor suite.</p>
      </div>
      <a
        href="/media-editor"
        className="text-xs text-indigo-400 hover:text-indigo-300 underline font-semibold"
      >
        Click here if not redirected automatically
      </a>
    </div>
  );
}
